import * as fs from "fs";
import * as path from "path";
import type { LinkEntry } from "./config.js";

export interface ProjectConfig {
  links: LinkEntry[];
}

const PROJECT_CONFIG_FILE = ".assetvault.json";

export function findProjectConfig(startDir?: string): string | null {
  let dir = startDir ?? process.cwd();

  // Walk up looking for .assetvault.json
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, PROJECT_CONFIG_FILE);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

export function readProjectConfig(dir: string): ProjectConfig | null {
  const configPath = path.join(dir, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ProjectConfig;
  } catch {
    return null;
  }
}

export function writeProjectConfig(
  dir: string,
  config: ProjectConfig
): void {
  const configPath = path.join(dir, PROJECT_CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}
