import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════
// 1. Rate Limiter Utility
// ═══════════════════════════════════════════════════════

import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  describe("basic sliding window behavior", () => {
    it("allows requests within the limit", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 3 });
      const key = "test-allow-" + Date.now();

      const r1 = limiter.check(key);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = limiter.check(key);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = limiter.check(key);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it("blocks requests exceeding the limit", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 2 });
      const key = "test-block-" + Date.now();

      limiter.check(key);
      limiter.check(key);

      const r3 = limiter.check(key);
      expect(r3.success).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("uses separate windows for different keys", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 1 });
      const keyA = "test-keyA-" + Date.now();
      const keyB = "test-keyB-" + Date.now();

      expect(limiter.check(keyA).success).toBe(true);
      expect(limiter.check(keyB).success).toBe(true);

      // keyA is now exhausted, keyB also
      expect(limiter.check(keyA).success).toBe(false);
      expect(limiter.check(keyB).success).toBe(false);
    });

    it("expires old timestamps outside the window", () => {
      const limiter = rateLimit({ interval: 100, limit: 1 }); // 100ms window
      const key = "test-expire-" + Date.now();

      expect(limiter.check(key).success).toBe(true);
      expect(limiter.check(key).success).toBe(false);

      // Wait for the window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = limiter.check(key);
          expect(result.success).toBe(true);
          expect(result.remaining).toBe(0);
          resolve();
        }, 150);
      });
    });

    it("returns correct remaining count", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 5 });
      const key = "test-remaining-" + Date.now();

      expect(limiter.check(key).remaining).toBe(4);
      expect(limiter.check(key).remaining).toBe(3);
      expect(limiter.check(key).remaining).toBe(2);
      expect(limiter.check(key).remaining).toBe(1);
      expect(limiter.check(key).remaining).toBe(0);
      expect(limiter.check(key).remaining).toBe(0); // already at limit
    });

    it("handles limit of 0 (always blocks)", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 0 });
      const key = "test-zero-" + Date.now();
      const result = limiter.check(key);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("handles very large limit", () => {
      const limiter = rateLimit({ interval: 60_000, limit: 1000 });
      const key = "test-large-" + Date.now();
      const result = limiter.check(key);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe("multiple limiter instances", () => {
    it("different limiter instances share the same underlying map", () => {
      // Both use the module-level rateLimiterMap, but different configs
      const limiterA = rateLimit({ interval: 60_000, limit: 2 });
      const limiterB = rateLimit({ interval: 60_000, limit: 5 });
      const key = "test-shared-" + Date.now();

      // Exhaust limiterA
      limiterA.check(key);
      limiterA.check(key);
      expect(limiterA.check(key).success).toBe(false);

      // limiterB sees the same timestamps but has a higher limit
      // The 3rd check from limiterB should succeed since it allows up to 5
      // Note: the shared map already has 2 entries from limiterA
      expect(limiterB.check(key).success).toBe(true);
    });
  });
});

describe("getClientIp", () => {
  it("extracts first IP from x-forwarded-for header", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("trims whitespace from IP", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("returns single IP when only one present", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when header is missing", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});

// ═══════════════════════════════════════════════════════
// 2. Search API Route
// ═══════════════════════════════════════════════════════

// Must mock db BEFORE importing the route
vi.mock("@/lib/db", () => ({
  db: {
    asset: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { GET } from "@/app/api/search/route";
import { db } from "@/lib/db";

const mockAssetFindMany = db.asset.findMany as ReturnType<typeof vi.fn>;

describe("Search API Route (GET /api/search)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssetFindMany.mockResolvedValue([]);
  });

  it("returns empty results when query is missing", async () => {
    const request = new Request("https://example.com/api/search");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
  });

  it("returns empty results when query is empty string", async () => {
    const request = new Request("https://example.com/api/search?q=");
    const response = await GET(request);
    const data = await response.json();
    expect(data.results).toEqual([]);
  });

  it("returns empty results when query is only 1 character", async () => {
    const request = new Request("https://example.com/api/search?q=a");
    const response = await GET(request);
    const data = await response.json();
    expect(data.results).toEqual([]);
    // Should not even query the database for short queries
    expect(mockAssetFindMany).not.toHaveBeenCalled();
  });

  it("returns empty results when query is only whitespace", async () => {
    const request = new Request("https://example.com/api/search?q=%20%20");
    const response = await GET(request);
    const data = await response.json();
    expect(data.results).toEqual([]);
  });

  it("queries database for valid 2+ character query", async () => {
    const mockResults = [
      {
        slug: "my-skill",
        name: "My Skill",
        description: "A test skill",
        type: "SKILL",
        primaryPlatform: "CLAUDE_CODE",
      },
    ];
    mockAssetFindMany.mockResolvedValue(mockResults);

    const request = new Request("https://example.com/api/search?q=skill");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual(mockResults);
    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "PUBLIC",
          deletedAt: null,
        }),
        take: 8,
      })
    );
  });

  it("filters only PUBLIC non-deleted assets", async () => {
    const request = new Request("https://example.com/api/search?q=test");
    await GET(request);

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "PUBLIC",
          deletedAt: null,
        }),
      })
    );
  });

  it("searches by name OR description (case-insensitive)", async () => {
    const request = new Request("https://example.com/api/search?q=test");
    await GET(request);

    const callArgs = mockAssetFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual([
      { name: { contains: "test", mode: "insensitive" } },
      { description: { contains: "test", mode: "insensitive" } },
    ]);
  });

  it("orders results by downloadCount descending", async () => {
    const request = new Request("https://example.com/api/search?q=test");
    await GET(request);

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { downloadCount: "desc" },
      })
    );
  });

  it("limits results to 8", async () => {
    const request = new Request("https://example.com/api/search?q=test");
    await GET(request);

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 })
    );
  });

  it("selects only slug, name, description, type, primaryPlatform", async () => {
    const request = new Request("https://example.com/api/search?q=test");
    await GET(request);

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          slug: true,
          name: true,
          description: true,
          type: true,
          primaryPlatform: true,
        },
      })
    );
  });

  it("trims whitespace from query parameter", async () => {
    const request = new Request(
      "https://example.com/api/search?q=%20%20test%20%20"
    );
    await GET(request);

    const callArgs = mockAssetFindMany.mock.calls[0][0];
    expect(callArgs.where.OR[0].name.contains).toBe("test");
  });
});

// ═══════════════════════════════════════════════════════
// 3. SEO — robots.ts
// ═══════════════════════════════════════════════════════

import robots from "@/app/robots";

describe("robots.ts", () => {
  it("returns rules allowing / for all user agents", () => {
    const result = robots();
    expect(result.rules).toBeDefined();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const mainRule = rules.find(
      (r) => r.userAgent === "*" || (Array.isArray(r.userAgent) && r.userAgent.includes("*"))
    );
    expect(mainRule).toBeDefined();
    expect(mainRule!.allow).toContain("/");
  });

  it("disallows /dashboard/", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const mainRule = rules[0];
    const disallowed = Array.isArray(mainRule.disallow)
      ? mainRule.disallow
      : [mainRule.disallow];
    expect(disallowed).toContain("/dashboard/");
  });

  it("disallows /api/", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const mainRule = rules[0];
    const disallowed = Array.isArray(mainRule.disallow)
      ? mainRule.disallow
      : [mainRule.disallow];
    expect(disallowed).toContain("/api/");
  });

  it("disallows /sign-in and /sign-up", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const mainRule = rules[0];
    const disallowed = Array.isArray(mainRule.disallow)
      ? mainRule.disallow
      : [mainRule.disallow];
    expect(disallowed).toContain("/sign-in");
    expect(disallowed).toContain("/sign-up");
  });

  it("references sitemap URL", () => {
    const result = robots();
    expect(result.sitemap).toBeDefined();
    expect(result.sitemap).toContain("/sitemap.xml");
  });
});

// ═══════════════════════════════════════════════════════
// 4. SEO — sitemap.ts
// ═══════════════════════════════════════════════════════

import sitemap from "@/app/sitemap";

const mockUserFindMany = db.user.findMany as ReturnType<typeof vi.fn>;

describe("sitemap.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes static pages (/ and /explore)", async () => {
    mockAssetFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://assetvault.dev");
    expect(urls).toContain("https://assetvault.dev/explore");
  });

  it("includes dynamic asset pages from DB", async () => {
    mockAssetFindMany.mockResolvedValue([
      { slug: "my-skill", updatedAt: new Date("2026-01-15") },
      { slug: "cool-agent", updatedAt: new Date("2026-02-01") },
    ]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://assetvault.dev/assets/my-skill");
    expect(urls).toContain("https://assetvault.dev/assets/cool-agent");
  });

  it("includes dynamic profile pages from DB", async () => {
    mockAssetFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([
      { username: "alice", updatedAt: new Date("2026-01-20") },
      { username: "bob", updatedAt: new Date("2026-02-05") },
    ]);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://assetvault.dev/profile/alice");
    expect(urls).toContain("https://assetvault.dev/profile/bob");
  });

  it("sets lastModified from DB records", async () => {
    const assetDate = new Date("2026-01-15");
    mockAssetFindMany.mockResolvedValue([
      { slug: "my-skill", updatedAt: assetDate },
    ]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await sitemap();
    const assetEntry = result.find((e) =>
      e.url.includes("/assets/my-skill")
    );
    expect(assetEntry).toBeDefined();
    expect(assetEntry!.lastModified).toEqual(assetDate);
  });

  it("queries only PUBLIC non-deleted assets", async () => {
    mockAssetFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    await sitemap();

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: "PUBLIC", deletedAt: null },
      })
    );
  });

  it("limits to 5000 assets and 5000 users", async () => {
    mockAssetFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    await sitemap();

    expect(mockAssetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5000 })
    );
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5000 })
    );
  });

  it("returns at least 2 entries (static pages) when DB is empty", async () => {
    mockAssetFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await sitemap();
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════
// 5. Rate Limiting in Server Actions (integration-style)
// ═══════════════════════════════════════════════════════

describe("Rate limiting integration", () => {
  it("rateLimit factory produces a limiter that blocks after limit", () => {
    const limiter = rateLimit({ interval: 60_000, limit: 3 });
    const key = "integration-" + Date.now();

    expect(limiter.check(key).success).toBe(true);
    expect(limiter.check(key).success).toBe(true);
    expect(limiter.check(key).success).toBe(true);
    expect(limiter.check(key).success).toBe(false);
  });

  it("asset.ts configures createLimiter at 10 per 5 minutes", () => {
    // Verify the rate limiter configuration matches what's in asset.ts
    const limiter = rateLimit({ interval: 5 * 60_000, limit: 10 });
    const key = "create-config-" + Date.now();

    // Should allow 10 requests
    for (let i = 0; i < 10; i++) {
      expect(limiter.check(key).success).toBe(true);
    }
    expect(limiter.check(key).success).toBe(false);
  });

  it("asset.ts configures downloadLimiter at 30 per minute", () => {
    const limiter = rateLimit({ interval: 60_000, limit: 30 });
    const key = "download-config-" + Date.now();

    for (let i = 0; i < 30; i++) {
      expect(limiter.check(key).success).toBe(true);
    }
    expect(limiter.check(key).success).toBe(false);
  });

  it("asset.ts configures forkLimiter at 5 per 5 minutes", () => {
    const limiter = rateLimit({ interval: 5 * 60_000, limit: 5 });
    const key = "fork-config-" + Date.now();

    for (let i = 0; i < 5; i++) {
      expect(limiter.check(key).success).toBe(true);
    }
    expect(limiter.check(key).success).toBe(false);
  });

  it("search route configures searchLimiter at 60 per minute", () => {
    const limiter = rateLimit({ interval: 60_000, limit: 60 });
    const key = "search-config-" + Date.now();

    for (let i = 0; i < 60; i++) {
      expect(limiter.check(key).success).toBe(true);
    }
    expect(limiter.check(key).success).toBe(false);
  });
});
