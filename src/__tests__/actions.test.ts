import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (vi.mock calls are hoisted — no external refs allowed) ───

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("slugify", () => ({
  default: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { upsert: vi.fn().mockResolvedValue({}), delete: vi.fn() },
    asset: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({ slug: "test-asset" }),
    },
    assetVersion: { create: vi.fn(), findFirst: vi.fn() },
    download: { create: vi.fn() },
    userMachine: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    machineSyncState: { upsert: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}));

// ─── Imports (after mocks) ───

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  deleteAsset,
  downloadAsset,
  forkAsset,
  publishVersion,
  updateAsset,
} from "@/lib/actions/asset";
import {
  registerMachine,
  deleteMachine,
  syncAssetToMachine,
  markAssetSynced,
} from "@/lib/actions/machine";

// Cast db methods to vi.fn for easy mocking in tests
const mockDb = db as unknown as {
  user: { upsert: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  assetVersion: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  download: { create: ReturnType<typeof vi.fn> };
  userMachine: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  machineSyncState: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

// ─── Mock user helper ───

const mockClerkUser = {
  id: "user_123",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.jpg",
  emailAddresses: [{ emailAddress: "test@example.com" }],
};

function setAuthenticatedUser(overrides: Record<string, unknown> = {}) {
  (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    ...mockClerkUser,
    ...overrides,
  });
}

function setUnauthenticated() {
  (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

// ─── Sample asset for reuse ───

const sampleAsset = {
  id: "asset_1",
  slug: "test-asset",
  name: "Test Asset",
  description: "A test asset",
  type: "SKILL",
  primaryPlatform: "CLAUDE_CODE",
  compatiblePlatforms: [],
  category: "OTHER",
  tags: ["test"],
  license: "MIT",
  licenseText: null,
  storageType: "INLINE",
  installScope: "PROJECT",
  content: "# Test",
  primaryFileName: "SKILL.md",
  visibility: "PUBLIC",
  currentVersion: "1.0.0",
  downloadCount: 5,
  forkCount: 0,
  forkedFromId: null,
  authorId: "user_other",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ═══════════════════════════════════════════════════════
// Asset Actions
// ═══════════════════════════════════════════════════════

describe("forkAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
    // generateUniqueSlug mock: first findUnique returns null (slug is available)
    mockDb.asset.findUnique.mockResolvedValue(null);
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await forkAsset("nonexistent");
    expect(result).toEqual({ success: false, error: "Asset not found" });
  });

  it("returns error when asset is soft-deleted", async () => {
    // First call: requireUser → upsert. Then findUnique for the asset.
    mockDb.asset.findUnique
      .mockResolvedValueOnce(null) // generateUniqueSlug won't be called yet
      .mockResolvedValueOnce({ ...sampleAsset, deletedAt: new Date() });

    // Reset so we have fresh mock
    mockDb.asset.findUnique.mockReset();
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, deletedAt: new Date() });

    const result = await forkAsset("asset_1");
    expect(result).toEqual({ success: false, error: "Asset not found" });
  });

  it("returns error when asset is private", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, visibility: "PRIVATE" });
    const result = await forkAsset("asset_1");
    expect(result).toEqual({ success: false, error: "Cannot fork a private asset" });
  });

  it("returns error when forking own asset", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    const result = await forkAsset("asset_1");
    expect(result).toEqual({ success: false, error: "Cannot fork your own asset" });
  });

  it("succeeds for public asset by another user", async () => {
    // findUnique is called multiple times: for the source asset and for slug uniqueness check
    mockDb.asset.findUnique
      .mockResolvedValueOnce({ ...sampleAsset, authorId: "user_other" }) // source asset lookup
      .mockResolvedValueOnce(null); // slug availability check

    const result = await forkAsset("asset_1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.slug).toBeDefined();
    }
    expect(mockDb.$transaction).toHaveBeenCalled();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    await expect(forkAsset("asset_1")).rejects.toThrow("Unauthorized");
  });
});

describe("deleteAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await deleteAsset("nonexistent");
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("returns error when not owner", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "someone_else" });
    const result = await deleteAsset("asset_1");
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("succeeds with soft delete", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    const result = await deleteAsset("asset_1");
    expect(result).toEqual({ success: true });
    expect(mockDb.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "asset_1" },
        data: { deletedAt: expect.any(Date) },
      })
    );
  });
});

describe("updateAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ name: "New Name" });
    const result = await updateAsset("nonexistent", fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("returns error when asset is deleted", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      ...sampleAsset,
      authorId: "user_123",
      deletedAt: new Date(),
    });
    const fd = makeFormData({ name: "New Name" });
    const result = await updateAsset("asset_1", fd);
    expect(result).toEqual({ success: false, error: "Cannot update a deleted asset" });
  });
});

describe("publishVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error for duplicate version", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    mockDb.assetVersion.findFirst.mockResolvedValue({ id: "existing" });

    const fd = makeFormData({
      assetId: "asset_1",
      version: "1.0.0",
      changelog: "Initial release",
    });
    const result = await publishVersion(fd);
    expect(result).toEqual({ success: false, error: "This version already exists" });
  });

  it("succeeds for new version", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    mockDb.assetVersion.findFirst.mockResolvedValue(null);

    const fd = makeFormData({
      assetId: "asset_1",
      version: "2.0.0",
      changelog: "Major update",
    });
    const result = await publishVersion(fd);
    expect(result).toEqual({ success: true });
    expect(mockDb.$transaction).toHaveBeenCalled();
  });
});

describe("downloadAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when asset not found", async () => {
    setAuthenticatedUser();
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await downloadAsset("nonexistent", "1.0.0");
    expect(result).toEqual({ success: false, error: "Asset not found" });
  });

  it("succeeds and creates download record", async () => {
    setAuthenticatedUser();
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    const result = await downloadAsset("asset_1", "1.0.0");
    expect(result).toEqual({ success: true });
    expect(mockDb.$transaction).toHaveBeenCalled();
  });

  it("works when unauthenticated (null userId)", async () => {
    setUnauthenticated();
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    const result = await downloadAsset("asset_1", "1.0.0");
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// Machine Actions
// ═══════════════════════════════════════════════════════

describe("registerMachine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("succeeds with valid input", async () => {
    const fd = makeFormData({ name: "My Laptop", machineIdentifier: "my-laptop-01" });
    const result = await registerMachine(fd);
    expect(result).toEqual({ success: true });
    expect(mockDb.userMachine.create).toHaveBeenCalled();
  });

  it("returns friendly error on P2002 duplicate", async () => {
    mockDb.userMachine.create.mockRejectedValueOnce({ code: "P2002" });
    const fd = makeFormData({ name: "My Laptop", machineIdentifier: "my-laptop-01" });
    const result = await registerMachine(fd);
    expect(result).toEqual({
      success: false,
      error: "A machine with this identifier already exists",
    });
  });

  it("returns validation error for invalid identifier", async () => {
    const fd = makeFormData({ name: "Test", machineIdentifier: "invalid id!" });
    const result = await registerMachine(fd);
    expect(result.success).toBe(false);
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    const fd = makeFormData({ name: "Test", machineIdentifier: "test" });
    await expect(registerMachine(fd)).rejects.toThrow("Unauthorized");
  });
});

describe("deleteMachine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error when machine not found", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue(null);
    const result = await deleteMachine("nonexistent");
    expect(result).toEqual({ success: false, error: "Machine not found or not authorized" });
  });

  it("returns error when not owner", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "someone_else" });
    const result = await deleteMachine("m1");
    expect(result).toEqual({ success: false, error: "Machine not found or not authorized" });
  });

  it("succeeds when owner", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    const result = await deleteMachine("m1");
    expect(result).toEqual({ success: true });
    expect(mockDb.userMachine.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});

describe("syncAssetToMachine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error when machine not authorized", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "someone_else" });
    const fd = makeFormData({ machineId: "m1", assetId: "a1" });
    const result = await syncAssetToMachine(fd);
    expect(result).toEqual({ success: false, error: "Machine not found or not authorized" });
  });

  it("returns error when asset not found", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    mockDb.asset.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ machineId: "m1", assetId: "a1" });
    const result = await syncAssetToMachine(fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("returns error when asset is deleted", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123", deletedAt: new Date() });
    const fd = makeFormData({ machineId: "m1", assetId: "a1" });
    const result = await syncAssetToMachine(fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("succeeds with valid machine and asset", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    const fd = makeFormData({ machineId: "m1", assetId: "a1" });
    const result = await syncAssetToMachine(fd);
    expect(result).toEqual({ success: true });
    expect(mockDb.$transaction).toHaveBeenCalled();
  });
});

describe("markAssetSynced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns error when machine not authorized", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "someone_else" });
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    const result = await markAssetSynced("m1", "a1");
    expect(result).toEqual({ success: false, error: "Machine not found or not authorized" });
  });

  it("returns error when asset not found", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await markAssetSynced("m1", "a1");
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("succeeds with valid inputs", async () => {
    mockDb.userMachine.findUnique.mockResolvedValue({ id: "m1", userId: "user_123" });
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "user_123" });
    const result = await markAssetSynced("m1", "a1");
    expect(result).toEqual({ success: true });
    expect(mockDb.$transaction).toHaveBeenCalled();
  });
});
