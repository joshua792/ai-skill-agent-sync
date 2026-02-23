import { execSync } from "child_process";
import * as log from "../lib/logger.js";
import { getRepoRoot, getCliDir } from "../lib/repo.js";
import { getLocalCommitHash } from "../lib/cli-version.js";
import { clearUpdateCache } from "../lib/update-check.js";

export async function updateCommand(): Promise<void> {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    log.error(
      "Cannot determine repository root. Is the CLI installed via npm link from the repo?"
    );
    process.exit(1);
  }

  const cliDir = getCliDir();
  if (!cliDir) {
    log.error("Cannot find cli/ directory in the repository.");
    process.exit(1);
  }

  const beforeHash = getLocalCommitHash();
  log.info(`Current version: ${beforeHash ?? "unknown"}`);

  // Step 1: Check for uncommitted changes
  log.info("Checking for uncommitted changes...");
  try {
    const status = execSync("git status --porcelain", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (status) {
      log.warn("Uncommitted changes detected. Stashing...");
      execSync("git stash --include-untracked", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: "inherit",
      });
      log.info("Changes stashed. Run `git stash pop` to restore them after update.");
    }
  } catch (err) {
    log.error(
      `Git status check failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    process.exit(1);
  }

  // Step 2: git pull
  log.info("Pulling latest changes...");
  try {
    execSync("git pull origin main", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "inherit",
    });
  } catch (err) {
    log.error(
      `Git pull failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    log.dim("You may need to resolve merge conflicts manually.");
    process.exit(1);
  }

  // Step 3: pnpm install
  log.info("Installing dependencies...");
  try {
    execSync("pnpm install --frozen-lockfile", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "inherit",
    });
  } catch {
    log.warn("Frozen lockfile install failed, retrying...");
    try {
      execSync("pnpm install", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: "inherit",
      });
    } catch (err) {
      log.error(
        `pnpm install failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      process.exit(1);
    }
  }

  // Step 4: Build CLI
  log.info("Building CLI...");
  try {
    execSync("pnpm build", {
      cwd: cliDir,
      encoding: "utf-8",
      stdio: "inherit",
    });
  } catch (err) {
    log.error(
      `Build failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    log.dim("Check TypeScript errors and try again.");
    process.exit(1);
  }

  // Step 5: Clear update check cache
  clearUpdateCache();

  // Step 6: Report result
  const afterHash = getLocalCommitHash();
  if (beforeHash === afterHash) {
    log.success("Already up to date.");
  } else {
    log.success(`Updated: ${beforeHash} → ${afterHash}`);
    log.dim("If `av watch` is running, restart it to pick up the new version.");
  }
}
