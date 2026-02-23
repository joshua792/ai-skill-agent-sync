import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { getConfigDir, ensureConfigDir } from "./config.js";
import { getRepoRoot } from "./repo.js";
import * as log from "./logger.js";

interface UpdateCheckCache {
  lastCheckedAt: string;
  localHash: string;
  remoteHash: string;
  commitsBehind: number;
}

const CACHE_FILE = "update-check.json";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

function getCachePath(): string {
  return path.join(getConfigDir(), CACHE_FILE);
}

function readCache(): UpdateCheckCache | null {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeCache(cache: UpdateCheckCache): void {
  ensureConfigDir();
  fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), "utf-8");
}

export function clearUpdateCache(): void {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

/**
 * Silently check for updates in the background.
 * Called after commands via postAction hook. Never throws.
 */
export function checkForUpdates(): void {
  try {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return;

    const cache = readCache();
    const now = Date.now();

    // If checked recently, just display cached result
    if (cache && now - new Date(cache.lastCheckedAt).getTime() < CHECK_INTERVAL_MS) {
      if (cache.commitsBehind > 0) {
        printUpdateBanner(cache.commitsBehind);
      }
      return;
    }

    // Fetch latest from remote (silently, with timeout)
    try {
      execSync("git fetch origin main --quiet", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 10_000,
      });
    } catch {
      return; // Network failure — skip silently
    }

    const localHash = execSync("git rev-parse HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const remoteHash = execSync("git rev-parse origin/main", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    let commitsBehind = 0;
    if (localHash !== remoteHash) {
      const count = execSync("git rev-list --count HEAD..origin/main", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      commitsBehind = parseInt(count, 10) || 0;
    }

    writeCache({
      lastCheckedAt: new Date().toISOString(),
      localHash,
      remoteHash,
      commitsBehind,
    });

    if (commitsBehind > 0) {
      printUpdateBanner(commitsBehind);
    }
  } catch {
    // Swallow all errors — update check must never break normal commands
  }
}

function printUpdateBanner(commitsBehind: number): void {
  const s = commitsBehind === 1 ? "" : "s";
  log.warn(
    `Update available: ${commitsBehind} new commit${s}. Run \`av update\` to update.`
  );
}
