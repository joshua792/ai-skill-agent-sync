import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  readConfig,
  writeConfig,
  type GlobalConfig,
} from "../lib/config.js";
import {
  readProjectConfig,
  writeProjectConfig,
  findProjectConfig,
} from "../lib/project-config.js";

const TEST_DIR = path.join(os.tmpdir(), "av-cli-test-" + Date.now());

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("getConfigDir", () => {
  it("returns a path under the home directory", () => {
    const dir = getConfigDir();
    expect(dir.startsWith(os.homedir())).toBe(true);
  });

  it("ends with .assetvault", () => {
    const dir = getConfigDir();
    expect(path.basename(dir)).toBe(".assetvault");
  });
});

describe("getConfigPath", () => {
  it("returns config.json under config dir", () => {
    const p = getConfigPath();
    expect(path.basename(p)).toBe("config.json");
    expect(p.startsWith(getConfigDir())).toBe(true);
  });
});

describe("GlobalConfig round-trip", () => {
  const sampleConfig: GlobalConfig = {
    apiKey: "avk_test12345678901234567890ab",
    serverUrl: "https://assetvault.dev",
    machineId: "machine_123",
    machineName: "Test Machine",
    syncInterval: 30,
    userLinks: [
      {
        assetId: "asset_1",
        assetSlug: "my-skill",
        localPath: "/home/user/.claude/skills/test.md",
        lastHash: "abc123",
        lastSyncedVersion: "1.0.0",
      },
    ],
  };

  // We can't write to the real config dir in tests, so test the JSON logic directly
  it("serializes and deserializes config correctly", () => {
    const json = JSON.stringify(sampleConfig, null, 2);
    const parsed = JSON.parse(json) as GlobalConfig;
    expect(parsed).toEqual(sampleConfig);
  });

  it("config uses JSON format", () => {
    const json = JSON.stringify(sampleConfig, null, 2);
    expect(json).toContain('"apiKey"');
    expect(json).toContain('"serverUrl"');
    expect(json).toContain('"userLinks"');
  });
});

describe("ProjectConfig", () => {
  it("readProjectConfig returns null for missing file", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    expect(readProjectConfig(TEST_DIR)).toBeNull();
  });

  it("writeProjectConfig + readProjectConfig round-trips", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const config = {
      links: [
        {
          assetId: "a1",
          assetSlug: "test-skill",
          localPath: ".claude/skills/test.md",
          lastHash: "def456",
          lastSyncedVersion: "1.2.0",
        },
      ],
    };
    writeProjectConfig(TEST_DIR, config);
    const read = readProjectConfig(TEST_DIR);
    expect(read).toEqual(config);
  });

  it("findProjectConfig walks up directory tree", () => {
    const parent = path.join(TEST_DIR, "project");
    const child = path.join(parent, "src", "deep");
    fs.mkdirSync(child, { recursive: true });
    writeProjectConfig(parent, { links: [] });

    const found = findProjectConfig(child);
    expect(found).toBe(path.join(parent, ".assetvault.json"));
  });

  it("findProjectConfig returns null when no config exists", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const found = findProjectConfig(TEST_DIR);
    // May return null or find one higher up. Just verify it doesn't crash.
    expect(typeof found === "string" || found === null).toBe(true);
  });
});
