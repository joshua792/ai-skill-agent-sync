import { execSync } from "child_process";
import { getRepoRoot } from "./repo.js";

export const CLI_VERSION = "0.1.0";

export function getLocalCommitHash(): string | null {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return null;
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}
