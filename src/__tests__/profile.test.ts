import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════
// 1. updateProfileSchema — Validation Tests
// ═══════════════════════════════════════════════════════

import { updateProfileSchema } from "@/lib/validations/user";

describe("updateProfileSchema", () => {
  describe("displayName", () => {
    it("accepts a valid display name", () => {
      const result = updateProfileSchema.safeParse({ displayName: "Alice" });
      expect(result.success).toBe(true);
    });

    it("accepts empty string (clears the field)", () => {
      const result = updateProfileSchema.safeParse({ displayName: "" });
      expect(result.success).toBe(true);
    });

    it("accepts 100 characters (max boundary)", () => {
      const result = updateProfileSchema.safeParse({
        displayName: "a".repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it("rejects 101 characters (over max)", () => {
      const result = updateProfileSchema.safeParse({
        displayName: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("is optional (can be omitted)", () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("bio", () => {
    it("accepts a valid bio", () => {
      const result = updateProfileSchema.safeParse({
        bio: "I build AI tools.",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string (clears the field)", () => {
      const result = updateProfileSchema.safeParse({ bio: "" });
      expect(result.success).toBe(true);
    });

    it("accepts 280 characters (max boundary)", () => {
      const result = updateProfileSchema.safeParse({
        bio: "b".repeat(280),
      });
      expect(result.success).toBe(true);
    });

    it("rejects 281 characters (over max)", () => {
      const result = updateProfileSchema.safeParse({
        bio: "b".repeat(281),
      });
      expect(result.success).toBe(false);
    });

    it("is optional (can be omitted)", () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("combined fields", () => {
    it("accepts both fields together", () => {
      const result = updateProfileSchema.safeParse({
        displayName: "Alice",
        bio: "I build AI tools.",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (both optional)", () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects non-string displayName", () => {
      const result = updateProfileSchema.safeParse({ displayName: 123 });
      expect(result.success).toBe(false);
    });

    it("rejects non-string bio", () => {
      const result = updateProfileSchema.safeParse({ bio: true });
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
// 2. updateProfile Server Action Tests
// ═══════════════════════════════════════════════════════

// Mocks must be declared before imports
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    },
    asset: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateProfile } from "@/lib/actions/user";

const mockCurrentUser = currentUser as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockClerkUser = {
  id: "user_123",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.jpg",
  emailAddresses: [{ emailAddress: "test@example.com" }],
};

function setAuthenticated() {
  mockCurrentUser.mockResolvedValue(mockClerkUser);
}

function setUnauthenticated() {
  mockCurrentUser.mockResolvedValue(null);
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticated();
    mockDb.user.findUnique.mockResolvedValue({
      id: "user_123",
      username: "testuser",
      displayName: "Test User",
      bio: null,
    });
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    const fd = makeFormData({ displayName: "Alice" });
    await expect(updateProfile(fd)).rejects.toThrow("Unauthorized");
  });

  it("updates displayName successfully", async () => {
    const fd = makeFormData({ displayName: "New Name", bio: "" });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: "New Name",
        bio: null,
      },
    });
  });

  it("updates bio successfully", async () => {
    const fd = makeFormData({ displayName: "", bio: "I build AI tools." });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: null,
        bio: "I build AI tools.",
      },
    });
  });

  it("updates both fields together", async () => {
    const fd = makeFormData({ displayName: "Alice", bio: "Hello world" });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: "Alice",
        bio: "Hello world",
      },
    });
  });

  it("converts empty strings to null in DB", async () => {
    const fd = makeFormData({ displayName: "", bio: "" });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: null,
        bio: null,
      },
    });
  });

  it("trims whitespace from values", async () => {
    const fd = makeFormData({ displayName: "  Alice  ", bio: "  Hello  " });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: "Alice",
        bio: "Hello",
      },
    });
  });

  it("converts whitespace-only strings to null", async () => {
    const fd = makeFormData({ displayName: "   ", bio: "   " });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        displayName: null,
        bio: null,
      },
    });
  });

  it("returns validation error for displayName over 100 chars", async () => {
    const fd = makeFormData({
      displayName: "a".repeat(101),
      bio: "",
    });
    const result = await updateProfile(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("100");
    }
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("returns validation error for bio over 280 chars", async () => {
    const fd = makeFormData({
      displayName: "",
      bio: "b".repeat(281),
    });
    const result = await updateProfile(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("280");
    }
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("returns error when user not found in DB", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ displayName: "Alice", bio: "" });
    const result = await updateProfile(fd);

    expect(result).toEqual({ success: false, error: "User not found" });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("calls revalidatePath for settings and profile", async () => {
    const fd = makeFormData({ displayName: "Alice", bio: "" });
    await updateProfile(fd);

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/profile/testuser");
  });

  it("calls requireUser which upserts user record", async () => {
    const fd = makeFormData({ displayName: "Alice", bio: "" });
    await updateProfile(fd);

    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_123" },
        create: expect.objectContaining({
          id: "user_123",
          username: "testuser",
        }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════
// 3. Webhook displayName Contract Tests
// ═══════════════════════════════════════════════════════

describe("Clerk webhook displayName contract", () => {
  it("webhook update clause does NOT include displayName", async () => {
    // Read the webhook source to verify the contract
    // The update clause should NOT include displayName so users can
    // override it in Settings without Clerk overwriting it.
    const fs = await import("fs");
    const path = await import("path");
    const webhookSource = fs.readFileSync(
      path.resolve("src/app/api/webhooks/clerk/route.ts"),
      "utf-8"
    );

    // Find the update block in the upsert call
    const upsertMatch = webhookSource.match(
      /update:\s*\{([^}]+)\}/s
    );
    expect(upsertMatch).not.toBeNull();

    const updateBlock = upsertMatch![1];
    // displayName should NOT appear as a property in the update block
    // It may appear in a comment, so check for actual property assignment
    const lines = updateBlock.split("\n").filter(
      (line) => !line.trim().startsWith("//")
    );
    const updateProperties = lines.join("\n");
    expect(updateProperties).not.toMatch(/^\s*displayName/m);
  });

  it("webhook create clause DOES include displayName", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const webhookSource = fs.readFileSync(
      path.resolve("src/app/api/webhooks/clerk/route.ts"),
      "utf-8"
    );

    // Find the create block in the upsert call
    const createMatch = webhookSource.match(
      /create:\s*\{([^}]+)\}/s
    );
    expect(createMatch).not.toBeNull();

    const createBlock = createMatch![1];
    expect(createBlock).toContain("displayName");
  });
});

// ═══════════════════════════════════════════════════════
// 4. Profile Integration Contracts
// ═══════════════════════════════════════════════════════

describe("Profile integration contracts", () => {
  it("updateProfileSchema fields match FormData keys in updateProfile action", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const actionSource = fs.readFileSync(
      path.resolve("src/lib/actions/user.ts"),
      "utf-8"
    );

    // Schema keys
    const schemaShape = updateProfileSchema.shape;
    const schemaKeys = Object.keys(schemaShape);
    expect(schemaKeys.sort()).toEqual(["bio", "displayName"]);

    // Verify the action extracts these same keys from FormData
    for (const key of schemaKeys) {
      expect(actionSource).toContain(`formData.get("${key}")`);
    }
  });

  it("updateProfile action uses requireUser() for auth", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const actionSource = fs.readFileSync(
      path.resolve("src/lib/actions/user.ts"),
      "utf-8"
    );

    expect(actionSource).toContain("requireUser()");
    expect(actionSource).toContain('"use server"');
  });

  it("updateProfile action applies rate limiting", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const actionSource = fs.readFileSync(
      path.resolve("src/lib/actions/user.ts"),
      "utf-8"
    );

    expect(actionSource).toContain("profileLimiter");
    expect(actionSource).toContain("rateLimit");
    expect(actionSource).toContain("Rate limit exceeded");
  });
});
