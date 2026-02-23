import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs";

/**
 * Walk up from the compiled JS file to find the monorepo root (.git directory).
 * Works through npm link symlinks because ESM import.meta.url resolves to the real path.
 */
export function getRepoRoot(): string | null {
  const thisFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(thisFile);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function getCliDir(): string | null {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return null;
  const cliDir = path.join(repoRoot, "cli");
  return fs.existsSync(cliDir) ? cliDir : null;
}
