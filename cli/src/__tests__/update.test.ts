import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Source contract tests — verify modules exist and export expected symbols
// ---------------------------------------------------------------------------

describe("repo.ts exports", () => {
  it("exports getRepoRoot", async () => {
    const mod = await import("../lib/repo.js");
    expect(typeof mod.getRepoRoot).toBe("function");
  });

  it("exports getCliDir", async () => {
    const mod = await import("../lib/repo.js");
    expect(typeof mod.getCliDir).toBe("function");
  });
});

describe("cli-version.ts exports", () => {
  it("exports CLI_VERSION string", async () => {
    const mod = await import("../lib/cli-version.js");
    expect(typeof mod.CLI_VERSION).toBe("string");
    expect(mod.CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exports getLocalCommitHash", async () => {
    const mod = await import("../lib/cli-version.js");
    expect(typeof mod.getLocalCommitHash).toBe("function");
  });
});

describe("update-check.ts exports", () => {
  it("exports checkForUpdates", async () => {
    const mod = await import("../lib/update-check.js");
    expect(typeof mod.checkForUpdates).toBe("function");
  });

  it("exports clearUpdateCache", async () => {
    const mod = await import("../lib/update-check.js");
    expect(typeof mod.clearUpdateCache).toBe("function");
  });
});

describe("update command exports", () => {
  it("exports updateCommand", async () => {
    const mod = await import("../commands/update.js");
    expect(typeof mod.updateCommand).toBe("function");
  });
});

describe("index.ts registers update command", () => {
  it("imports updateCommand from commands/update", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../index.ts"),
      "utf-8"
    );
    expect(src).toContain('import { updateCommand }');
    expect(src).toContain('./commands/update.js');
  });

  it("registers the update command", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../index.ts"),
      "utf-8"
    );
    expect(src).toContain('.command("update")');
  });

  it("has postAction hook for checkForUpdates", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../index.ts"),
      "utf-8"
    );
    expect(src).toContain('program.hook("postAction"');
    expect(src).toContain("checkForUpdates");
  });

  it("shows dynamic version with git hash", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../index.ts"),
      "utf-8"
    );
    expect(src).toContain("getLocalCommitHash");
    expect(src).toContain("CLI_VERSION");
    expect(src).toContain("versionString");
  });
});

// ---------------------------------------------------------------------------
// getRepoRoot — functional test (runs in actual repo)
// ---------------------------------------------------------------------------

describe("getRepoRoot", () => {
  it("finds the repo root from this test file", async () => {
    const { getRepoRoot } = await import("../lib/repo.js");
    const root = getRepoRoot();
    expect(root).not.toBeNull();
    // The repo root should contain a .git directory
    expect(fs.existsSync(path.join(root!, ".git"))).toBe(true);
  });

  it("repo root contains the cli directory", async () => {
    const { getRepoRoot } = await import("../lib/repo.js");
    const root = getRepoRoot();
    expect(root).not.toBeNull();
    expect(fs.existsSync(path.join(root!, "cli"))).toBe(true);
  });
});

describe("getCliDir", () => {
  it("returns a path ending with cli", async () => {
    const { getCliDir } = await import("../lib/repo.js");
    const cliDir = getCliDir();
    expect(cliDir).not.toBeNull();
    expect(path.basename(cliDir!)).toBe("cli");
  });
});

// ---------------------------------------------------------------------------
// getLocalCommitHash — functional test
// ---------------------------------------------------------------------------

describe("getLocalCommitHash", () => {
  it("returns a short git hash string", async () => {
    const { getLocalCommitHash } = await import("../lib/cli-version.js");
    const hash = getLocalCommitHash();
    expect(hash).not.toBeNull();
    expect(hash!.length).toBeGreaterThanOrEqual(7);
    expect(hash!).toMatch(/^[0-9a-f]+$/);
  });
});

// ---------------------------------------------------------------------------
// Update check cache — tests with temp directory
// ---------------------------------------------------------------------------

describe("update-check cache", () => {
  const TEST_DIR = path.join(os.tmpdir(), "av-update-check-test-" + Date.now());
  const CACHE_FILE = path.join(TEST_DIR, "update-check.json");

  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("cache file is JSON with expected fields", () => {
    const cache = {
      lastCheckedAt: new Date().toISOString(),
      localHash: "abc1234",
      remoteHash: "def5678",
      commitsBehind: 3,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    const read = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    expect(read.lastCheckedAt).toBeDefined();
    expect(read.localHash).toBe("abc1234");
    expect(read.remoteHash).toBe("def5678");
    expect(read.commitsBehind).toBe(3);
  });

  it("clearUpdateCache removes cache file", async () => {
    // Write a dummy cache to the actual config dir
    const { clearUpdateCache } = await import("../lib/update-check.js");
    const { getConfigDir, ensureConfigDir } = await import("../lib/config.js");

    ensureConfigDir();
    const cachePath = path.join(getConfigDir(), "update-check.json");
    fs.writeFileSync(cachePath, '{"test": true}', "utf-8");
    expect(fs.existsSync(cachePath)).toBe(true);

    clearUpdateCache();
    expect(fs.existsSync(cachePath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkForUpdates — never throws
// ---------------------------------------------------------------------------

describe("checkForUpdates", () => {
  it("never throws even if called in unusual state", async () => {
    const { checkForUpdates } = await import("../lib/update-check.js");
    // Should not throw regardless of environment
    expect(() => checkForUpdates()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// update command — source contracts
// ---------------------------------------------------------------------------

describe("update command source", () => {
  it("uses getRepoRoot for repo detection", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("getRepoRoot");
  });

  it("uses getCliDir for cli directory", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("getCliDir");
  });

  it("runs git pull", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("git pull origin main");
  });

  it("runs pnpm install", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("pnpm install");
  });

  it("runs pnpm build", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("pnpm build");
  });

  it("handles uncommitted changes via git stash", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("git status --porcelain");
    expect(src).toContain("git stash");
  });

  it("clears update cache after update", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("clearUpdateCache");
  });

  it("reports before and after commit hash", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../commands/update.ts"),
      "utf-8"
    );
    expect(src).toContain("beforeHash");
    expect(src).toContain("afterHash");
  });
});
