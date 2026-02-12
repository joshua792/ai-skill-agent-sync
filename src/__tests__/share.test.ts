import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendShareNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { upsert: vi.fn().mockResolvedValue({}) },
    asset: { findUnique: vi.fn() },
    assetShare: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// ─── Imports ───

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendShareNotification } from "@/lib/email";
import { shareAsset, revokeShare, getAssetShares } from "@/lib/actions/share";
import { shareAssetSchema, revokeShareSchema } from "@/lib/validations/share";

const mockDb = db as unknown as {
  user: { upsert: ReturnType<typeof vi.fn> };
  asset: { findUnique: ReturnType<typeof vi.fn> };
  assetShare: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockClerkUser = {
  id: "user_123",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.jpg",
  emailAddresses: [{ emailAddress: "owner@example.com" }],
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

const sampleAsset = {
  id: "asset_1",
  slug: "test-asset",
  name: "Test Asset",
  visibility: "SHARED",
  authorId: "user_123",
  deletedAt: null,
};

// ═══════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════

describe("shareAssetSchema", () => {
  it("accepts valid input", () => {
    const result = shareAssetSchema.safeParse({
      assetId: "abc123",
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const result = shareAssetSchema.safeParse({
      assetId: "abc123",
      email: "User@Example.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = shareAssetSchema.safeParse({
      assetId: "abc123",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty assetId", () => {
    const result = shareAssetSchema.safeParse({
      assetId: "",
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = shareAssetSchema.safeParse({
      assetId: "abc123",
    });
    expect(result.success).toBe(false);
  });
});

describe("revokeShareSchema", () => {
  it("accepts valid shareId", () => {
    const result = revokeShareSchema.safeParse({ shareId: "share_1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty shareId", () => {
    const result = revokeShareSchema.safeParse({ shareId: "" });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// shareAsset action
// ═══════════════════════════════════════════════════════

describe("shareAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    const fd = makeFormData({ assetId: "a1", email: "test@example.com" });
    await expect(shareAsset(fd)).rejects.toThrow("Unauthorized");
  });

  it("returns error for invalid email", async () => {
    const fd = makeFormData({ assetId: "a1", email: "bad" });
    const result = await shareAsset(fd);
    expect(result.success).toBe(false);
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ assetId: "a1", email: "test@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("returns error when not the asset owner", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "someone_else" });
    const fd = makeFormData({ assetId: "a1", email: "test@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });

  it("returns error when asset is not SHARED visibility", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, visibility: "PUBLIC" });
    const fd = makeFormData({ assetId: "a1", email: "test@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({
      success: false,
      error: "Only assets with Shared visibility can be shared by email",
    });
  });

  it("returns error when sharing with yourself", async () => {
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    const fd = makeFormData({ assetId: "a1", email: "owner@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({ success: false, error: "You cannot share an asset with yourself" });
  });

  it("returns error for duplicate share", async () => {
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    mockDb.assetShare.findUnique.mockResolvedValue({ id: "existing" });
    const fd = makeFormData({ assetId: "a1", email: "other@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({
      success: false,
      error: "This asset has already been shared with that email",
    });
  });

  it("succeeds and creates share record", async () => {
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    mockDb.assetShare.findUnique.mockResolvedValue(null);
    mockDb.assetShare.create.mockResolvedValue({
      id: "share_1",
      token: "tok_abc",
      assetId: "asset_1",
      email: "other@example.com",
    });

    const fd = makeFormData({ assetId: "a1", email: "other@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({ success: true });
    expect(mockDb.assetShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: "a1",
          email: "other@example.com",
          sharedBy: "user_123",
        }),
      })
    );
  });

  it("calls sendShareNotification on success", async () => {
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    mockDb.assetShare.findUnique.mockResolvedValue(null);
    mockDb.assetShare.create.mockResolvedValue({
      id: "share_1",
      token: "tok_abc",
    });

    const fd = makeFormData({ assetId: "a1", email: "other@example.com" });
    await shareAsset(fd);

    expect(sendShareNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "other@example.com",
        assetName: "Test Asset",
      })
    );
  });

  it("returns error when asset is deleted", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, deletedAt: new Date() });
    const fd = makeFormData({ assetId: "a1", email: "test@example.com" });
    const result = await shareAsset(fd);
    expect(result).toEqual({ success: false, error: "Asset not found or not authorized" });
  });
});

// ═══════════════════════════════════════════════════════
// revokeShare action
// ═══════════════════════════════════════════════════════

describe("revokeShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    await expect(revokeShare("share_1")).rejects.toThrow("Unauthorized");
  });

  it("returns error when share not found", async () => {
    mockDb.assetShare.findUnique.mockResolvedValue(null);
    const result = await revokeShare("share_1");
    expect(result).toEqual({ success: false, error: "Share not found or not authorized" });
  });

  it("returns error when not the asset owner", async () => {
    mockDb.assetShare.findUnique.mockResolvedValue({
      id: "share_1",
      asset: { authorId: "someone_else", slug: "test" },
    });
    const result = await revokeShare("share_1");
    expect(result).toEqual({ success: false, error: "Share not found or not authorized" });
  });

  it("succeeds when owner revokes", async () => {
    mockDb.assetShare.findUnique.mockResolvedValue({
      id: "share_1",
      asset: { authorId: "user_123", slug: "test" },
    });
    const result = await revokeShare("share_1");
    expect(result).toEqual({ success: true });
    expect(mockDb.assetShare.delete).toHaveBeenCalledWith({ where: { id: "share_1" } });
  });
});

// ═══════════════════════════════════════════════════════
// getAssetShares action
// ═══════════════════════════════════════════════════════

describe("getAssetShares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedUser();
  });

  it("returns empty when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await getAssetShares("a1");
    expect(result).toEqual([]);
  });

  it("returns empty when not the owner", async () => {
    mockDb.asset.findUnique.mockResolvedValue({ ...sampleAsset, authorId: "someone_else" });
    const result = await getAssetShares("a1");
    expect(result).toEqual([]);
  });

  it("returns shares when owner", async () => {
    mockDb.asset.findUnique.mockResolvedValue(sampleAsset);
    mockDb.assetShare.findMany.mockResolvedValue([
      { id: "s1", email: "a@b.com", createdAt: new Date("2026-01-01") },
      { id: "s2", email: "c@d.com", createdAt: new Date("2026-01-02") },
    ]);
    const result = await getAssetShares("a1");
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("a@b.com");
    expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
