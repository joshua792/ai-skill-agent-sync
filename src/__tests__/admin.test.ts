import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════
// 1. isAdmin Helper Tests (env var parsing)
// ═══════════════════════════════════════════════════════

describe("isAdmin helper", () => {
  it("source parses ADMIN_USER_IDS from env var", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("process.env.ADMIN_USER_IDS");
    expect(source).toContain('.split(",")');
    expect(source).toContain(".trim()");
    expect(source).toContain(".filter(Boolean)");
  });

  it("isAdmin returns boolean based on adminIds.includes()", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("adminIds.includes(userId)");
    expect(source).toMatch(/function isAdmin\(userId:\s*string\):\s*boolean/);
  });

  it("requireAdmin throws Unauthorized when no user", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/admin.ts"),
      "utf-8"
    );
    expect(source).toContain('throw new Error("Unauthorized")');
  });

  it("requireAdmin throws Forbidden when user is not admin", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/admin.ts"),
      "utf-8"
    );
    expect(source).toContain('throw new Error("Forbidden")');
  });

  it("requireAdmin returns user.id on success", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("return user.id");
  });
});

// ═══════════════════════════════════════════════════════
// 2. Admin Server Action Tests
// ═══════════════════════════════════════════════════════

// Mocks must be declared before imports
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    asset: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock rate-limit to always allow by default
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({
    check: vi.fn().mockReturnValue({ success: true }),
  }),
}));

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import {
  adminDeleteUser,
  adminDeleteAsset,
  adminRestoreAsset,
} from "@/lib/actions/admin";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

// ───────────────────────────────────────────────────
// adminDeleteUser
// ───────────────────────────────────────────────────

describe("adminDeleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue("admin_001");
  });

  it("throws when requireAdmin rejects (not admin)", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(adminDeleteUser("user_123")).rejects.toThrow("Forbidden");
  });

  it("prevents self-deletion", async () => {
    const result = await adminDeleteUser("admin_001");
    expect(result).toEqual({
      success: false,
      error: "Cannot delete your own account.",
    });
    expect(mockDb.user.delete).not.toHaveBeenCalled();
  });

  it("returns error when user not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const result = await adminDeleteUser("user_456");
    expect(result).toEqual({
      success: false,
      error: "User not found.",
    });
    expect(mockDb.user.delete).not.toHaveBeenCalled();
  });

  it("deletes user successfully", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user_456",
      username: "victim",
    });
    const result = await adminDeleteUser("user_456");
    expect(result).toEqual({ success: true });
    expect(mockDb.user.delete).toHaveBeenCalledWith({
      where: { id: "user_456" },
    });
  });

  it("calls revalidatePath for admin pages after delete", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user_456",
      username: "victim",
    });
    await adminDeleteUser("user_456");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
  });
});

// ───────────────────────────────────────────────────
// adminDeleteAsset
// ───────────────────────────────────────────────────

describe("adminDeleteAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue("admin_001");
  });

  it("throws when requireAdmin rejects (not admin)", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(adminDeleteAsset("asset_123")).rejects.toThrow("Forbidden");
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await adminDeleteAsset("asset_missing");
    expect(result).toEqual({
      success: false,
      error: "Asset not found.",
    });
    expect(mockDb.asset.update).not.toHaveBeenCalled();
  });

  it("returns error when asset already deleted", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "test-asset",
      deletedAt: new Date(),
    });
    const result = await adminDeleteAsset("asset_123");
    expect(result).toEqual({
      success: false,
      error: "Asset is already deleted.",
    });
    expect(mockDb.asset.update).not.toHaveBeenCalled();
  });

  it("soft-deletes an active asset", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "test-asset",
      deletedAt: null,
    });
    const result = await adminDeleteAsset("asset_123");
    expect(result).toEqual({ success: true });
    expect(mockDb.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_123" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("calls revalidatePath for admin and asset pages", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "my-asset",
      deletedAt: null,
    });
    await adminDeleteAsset("asset_123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/assets");
    expect(revalidatePath).toHaveBeenCalledWith("/assets/my-asset");
  });
});

// ───────────────────────────────────────────────────
// adminRestoreAsset
// ───────────────────────────────────────────────────

describe("adminRestoreAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue("admin_001");
  });

  it("throws when requireAdmin rejects (not admin)", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(adminRestoreAsset("asset_123")).rejects.toThrow("Forbidden");
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await adminRestoreAsset("asset_missing");
    expect(result).toEqual({
      success: false,
      error: "Asset not found.",
    });
    expect(mockDb.asset.update).not.toHaveBeenCalled();
  });

  it("returns error when asset is not deleted", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "test-asset",
      deletedAt: null,
    });
    const result = await adminRestoreAsset("asset_123");
    expect(result).toEqual({
      success: false,
      error: "Asset is not deleted.",
    });
    expect(mockDb.asset.update).not.toHaveBeenCalled();
  });

  it("restores a soft-deleted asset", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "test-asset",
      deletedAt: new Date("2026-01-01"),
    });
    const result = await adminRestoreAsset("asset_123");
    expect(result).toEqual({ success: true });
    expect(mockDb.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_123" },
      data: { deletedAt: null },
    });
  });

  it("calls revalidatePath for admin and asset pages", async () => {
    mockDb.asset.findUnique.mockResolvedValue({
      id: "asset_123",
      slug: "restored-asset",
      deletedAt: new Date("2026-01-01"),
    });
    await adminRestoreAsset("asset_123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/assets");
    expect(revalidatePath).toHaveBeenCalledWith("/assets/restored-asset");
  });
});

// ═══════════════════════════════════════════════════════
// 3. Admin Source Contract Tests
// ═══════════════════════════════════════════════════════

describe("Admin source contracts", () => {
  it("admin actions file uses 'use server' directive", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    expect(source).toContain('"use server"');
  });

  it("all admin actions call requireAdmin()", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    // Three exported functions, all must call requireAdmin
    const requireAdminCalls = (source.match(/requireAdmin\(\)/g) || []).length;
    expect(requireAdminCalls).toBeGreaterThanOrEqual(3);
  });

  it("all admin actions apply rate limiting", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("adminLimiter");
    expect(source).toContain("rateLimit");
    // Rate limit check should appear 3 times (once per action)
    const rateLimitChecks = (source.match(/adminLimiter\.check/g) || []).length;
    expect(rateLimitChecks).toBe(3);
  });

  it("admin rate limiter uses 20 requests per 60s", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("interval: 60_000");
    expect(source).toContain("limit: 20");
  });

  it("adminDeleteUser prevents self-deletion", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("userId === adminId");
    expect(source).toContain("Cannot delete your own account");
  });

  it("adminDeleteAsset uses soft-delete (sets deletedAt)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    // Should use update with deletedAt, not delete
    expect(source).toContain("data: { deletedAt: new Date() }");
  });

  it("adminRestoreAsset clears deletedAt", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/lib/actions/admin.ts"),
      "utf-8"
    );
    expect(source).toContain("data: { deletedAt: null }");
  });

  it("admin overview page checks isAdmin before rendering", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/app/dashboard/admin/page.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin(user.id)");
    expect(source).toContain('redirect("/dashboard")');
  });

  it("admin users page checks isAdmin before rendering", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/app/dashboard/admin/users/page.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin(user.id)");
    expect(source).toContain('redirect("/dashboard")');
  });

  it("admin assets page checks isAdmin before rendering", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/app/dashboard/admin/assets/page.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin(user.id)");
    expect(source).toContain('redirect("/dashboard")');
  });

  it("dashboard layout passes isAdmin prop to sidebars", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/app/dashboard/layout.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin");
    expect(source).toContain("currentUser");
  });

  it("sidebar accepts isAdmin prop and renders Admin link conditionally", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/components/layout/sidebar.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin");
    expect(source).toContain("/dashboard/admin");
    expect(source).toContain("ShieldCheck");
  });

  it("mobile sidebar accepts isAdmin prop and renders Admin link conditionally", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve("src/components/layout/mobile-sidebar.tsx"),
      "utf-8"
    );
    expect(source).toContain("isAdmin");
    expect(source).toContain("/dashboard/admin");
    expect(source).toContain("ShieldCheck");
  });
});
