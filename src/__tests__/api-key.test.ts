import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Mocks (vi.mock calls are hoisted) ────────────────

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({
    check: () => ({ success: true, remaining: 99 }),
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { upsert: vi.fn().mockResolvedValue({}) },
    userMachine: { findFirst: vi.fn() },
    apiKey: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  generateApiKey,
  hashApiKey,
  validateApiKeyFormat,
  API_KEY_PREFIX,
} from "@/lib/api-key";
import { createApiKeySchema, revokeApiKeySchema } from "@/lib/validations/api-key";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  listApiKeys,
} from "@/lib/actions/api-key";

const mockDb = db as unknown as {
  user: { upsert: ReturnType<typeof vi.fn> };
  userMachine: { findFirst: ReturnType<typeof vi.fn> };
  apiKey: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockCurrentUser = currentUser as ReturnType<typeof vi.fn>;

function setAuthenticated() {
  mockCurrentUser.mockResolvedValue({
    id: "user_123",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    imageUrl: "https://example.com/avatar.jpg",
    emailAddresses: [{ emailAddress: "test@example.com" }],
  });
}

function setUnauthenticated() {
  mockCurrentUser.mockResolvedValue(null);
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

// ═══════════════════════════════════════════════════════
// API Key Generation & Hashing
// ═══════════════════════════════════════════════════════

describe("generateApiKey", () => {
  it("returns key with avk_ prefix", () => {
    const { raw } = generateApiKey();
    expect(raw.startsWith("avk_")).toBe(true);
  });

  it("returns raw key of correct length (avk_ + 32 chars)", () => {
    const { raw } = generateApiKey();
    expect(raw.length).toBe(36); // 4 prefix + 32 random
  });

  it("returns prefix as first 8 chars of raw key", () => {
    const { raw, prefix } = generateApiKey();
    expect(prefix).toBe(raw.slice(0, 8));
  });

  it("returns hash that matches hashApiKey(raw)", () => {
    const { raw, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(raw));
  });

  it("generates unique keys on each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashApiKey", () => {
  it("produces consistent SHA-256 hash", () => {
    const key = "avk_testkey12345678901234567890ab";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different keys", () => {
    const a = hashApiKey("avk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1");
    const b = hashApiKey("avk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2");
    expect(a).not.toBe(b);
  });

  it("returns a 64-char hex string", () => {
    const hash = hashApiKey("avk_testkey12345678901234567890ab");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("validateApiKeyFormat", () => {
  it("accepts valid keys", () => {
    const { raw } = generateApiKey();
    expect(validateApiKeyFormat(raw)).toBe(true);
  });

  it("rejects keys without avk_ prefix", () => {
    expect(validateApiKeyFormat("xyz_12345678901234567890123456789012")).toBe(false);
  });

  it("rejects keys that are too short", () => {
    expect(validateApiKeyFormat("avk_short")).toBe(false);
  });

  it("rejects keys that are too long", () => {
    expect(validateApiKeyFormat("avk_" + "a".repeat(40))).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateApiKeyFormat("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════

describe("createApiKeySchema", () => {
  it("accepts valid input", () => {
    const result = createApiKeySchema.safeParse({ name: "My Key" });
    expect(result.success).toBe(true);
  });

  it("accepts input with all optional fields", () => {
    const result = createApiKeySchema.safeParse({
      name: "My Key",
      machineId: "machine_123",
      expiresInDays: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createApiKeySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = createApiKeySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects expiresInDays < 1", () => {
    const result = createApiKeySchema.safeParse({ name: "Key", expiresInDays: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects expiresInDays > 365", () => {
    const result = createApiKeySchema.safeParse({ name: "Key", expiresInDays: 400 });
    expect(result.success).toBe(false);
  });
});

describe("revokeApiKeySchema", () => {
  it("accepts valid keyId", () => {
    const result = revokeApiKeySchema.safeParse({ keyId: "key_123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty keyId", () => {
    const result = revokeApiKeySchema.safeParse({ keyId: "" });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// Server Actions
// ═══════════════════════════════════════════════════════

describe("createApiKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    await expect(createApiKeyAction(makeFormData({ name: "Key" }))).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("succeeds with valid input and returns raw key", async () => {
    setAuthenticated();
    const result = await createApiKeyAction(makeFormData({ name: "My CLI Key" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.key).toMatch(/^avk_/);
      expect(result.key.length).toBe(36);
    }
    expect(mockDb.apiKey.create).toHaveBeenCalled();
  });

  it("returns error for empty name", async () => {
    setAuthenticated();
    const result = await createApiKeyAction(makeFormData({ name: "" }));
    expect(result.success).toBe(false);
  });

  it("verifies machine ownership when machineId provided", async () => {
    setAuthenticated();
    mockDb.userMachine.findFirst.mockResolvedValue(null);
    const result = await createApiKeyAction(
      makeFormData({ name: "Key", machineId: "machine_999" })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Machine not found");
  });

  it("stores hashed key, not raw key", async () => {
    setAuthenticated();
    await createApiKeyAction(makeFormData({ name: "Key" }));
    const createCall = mockDb.apiKey.create.mock.calls[0][0];
    expect(createCall.data.hashedKey).toMatch(/^[0-9a-f]{64}$/);
    expect(createCall.data.hashedKey).not.toMatch(/^avk_/);
  });

  it("sets expiresAt when expiresInDays provided", async () => {
    setAuthenticated();
    await createApiKeyAction(makeFormData({ name: "Key", expiresInDays: "30" }));
    const createCall = mockDb.apiKey.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    const diff = createCall.data.expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });

  it("sets expiresAt to null when expiresInDays not provided", async () => {
    setAuthenticated();
    await createApiKeyAction(makeFormData({ name: "Key" }));
    const createCall = mockDb.apiKey.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeNull();
  });
});

describe("revokeApiKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    await expect(revokeApiKeyAction(makeFormData({ keyId: "key_1" }))).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns error when key not found", async () => {
    setAuthenticated();
    mockDb.apiKey.findFirst.mockResolvedValue(null);
    const result = await revokeApiKeyAction(makeFormData({ keyId: "key_1" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("API key not found");
  });

  it("returns error when key already revoked", async () => {
    setAuthenticated();
    mockDb.apiKey.findFirst.mockResolvedValue({
      id: "key_1",
      revokedAt: new Date(),
    });
    const result = await revokeApiKeyAction(makeFormData({ keyId: "key_1" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("API key already revoked");
  });

  it("succeeds for valid owned key", async () => {
    setAuthenticated();
    mockDb.apiKey.findFirst.mockResolvedValue({
      id: "key_1",
      revokedAt: null,
    });
    const result = await revokeApiKeyAction(makeFormData({ keyId: "key_1" }));
    expect(result.success).toBe(true);
    expect(mockDb.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key_1" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      })
    );
  });
});

describe("listApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when not authenticated", async () => {
    setUnauthenticated();
    await expect(listApiKeys()).rejects.toThrow("Unauthorized");
  });

  it("returns keys for authenticated user", async () => {
    setAuthenticated();
    const mockKeys = [
      { id: "key_1", name: "Test", prefix: "avk_abcd", createdAt: new Date() },
    ];
    mockDb.apiKey.findMany.mockResolvedValue(mockKeys);
    const result = await listApiKeys();
    expect(result).toEqual(mockKeys);
  });

  it("does not return hashedKey in select", async () => {
    setAuthenticated();
    mockDb.apiKey.findMany.mockResolvedValue([]);
    await listApiKeys();
    const findManyCall = mockDb.apiKey.findMany.mock.calls[0][0];
    expect(findManyCall.select.hashedKey).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════
// Source Contracts
// ═══════════════════════════════════════════════════════

describe("API Key Contracts", () => {
  const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  it("ApiKey model exists in Prisma schema", () => {
    expect(schemaContent).toContain("model ApiKey {");
  });

  it("ApiKey model has hashedKey unique field", () => {
    expect(schemaContent).toMatch(/hashedKey\s+String\s+@unique/);
  });

  it("ApiKey model has prefix field", () => {
    expect(schemaContent).toMatch(/prefix\s+String/);
  });

  it("ApiKey model has revokedAt field", () => {
    expect(schemaContent).toMatch(/revokedAt\s+DateTime\?/);
  });

  it("ApiKey model has expiresAt field", () => {
    expect(schemaContent).toMatch(/expiresAt\s+DateTime\?/);
  });

  it("MachineSyncState has localHash field", () => {
    expect(schemaContent).toMatch(/localHash\s+String\?/);
  });

  it("MachineSyncState has lastPushAt field", () => {
    expect(schemaContent).toMatch(/lastPushAt\s+DateTime\?/);
  });

  it("MachineSyncState has lastPullAt field", () => {
    expect(schemaContent).toMatch(/lastPullAt\s+DateTime\?/);
  });

  it("User model has apiKeys relation", () => {
    // Check in the User model block
    const userBlock = schemaContent.match(/model User \{([\s\S]*?)\n\}/);
    expect(userBlock?.[1]).toContain("apiKeys");
  });

  const middlewarePath = path.resolve(__dirname, "../middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf-8");

  it("middleware excludes /api/cli from Clerk", () => {
    expect(middlewareContent).toContain("/api/cli");
    expect(middlewareContent).toContain("isCliRoute");
  });

  const apiKeyActionPath = path.resolve(__dirname, "../lib/actions/api-key.ts");
  const apiKeyActionContent = fs.readFileSync(apiKeyActionPath, "utf-8");

  it("createApiKeyAction calls requireUser (source check)", () => {
    expect(apiKeyActionContent).toContain("requireUser()");
  });

  it("createApiKeyAction uses rate limiting", () => {
    expect(apiKeyActionContent).toContain("createKeyLimiter");
  });

  it("API_KEY_PREFIX constant is 'avk_'", () => {
    expect(API_KEY_PREFIX).toBe("avk_");
  });
});
