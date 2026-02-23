// Mirrors src/lib/constants.ts INSTALL_PATHS from the server
const INSTALL_PATHS: Record<string, Record<string, string>> = {
  CLAUDE_CODE: {
    SKILL: ".claude/skills",
    COMMAND: ".claude/commands",
    AGENT: ".claude/agents",
  },
  CURSOR: { "*": ".cursor/rules" },
  WINDSURF: { "*": ".windsurf/rules" },
  AIDER: { "*": ".aider" },
  GEMINI_CLI: { "*": "." },
  CHATGPT: { "*": "." },
  OTHER: { "*": "." },
};

export function getDefaultInstallSubdir(
  platform: string,
  assetType: string
): string {
  const platformMap = INSTALL_PATHS[platform];
  if (!platformMap) return ".";
  return platformMap[assetType] ?? platformMap["*"] ?? ".";
}

// Reverse mapping: given a directory path, infer platform + asset type
const DIR_TO_TYPE: Record<string, { platform: string; type: string }> = {
  ".claude/skills": { platform: "CLAUDE_CODE", type: "SKILL" },
  ".claude/commands": { platform: "CLAUDE_CODE", type: "COMMAND" },
  ".claude/agents": { platform: "CLAUDE_CODE", type: "AGENT" },
  ".cursor/rules": { platform: "CURSOR", type: "SKILL" },
  ".windsurf/rules": { platform: "WINDSURF", type: "SKILL" },
  ".aider": { platform: "AIDER", type: "SKILL" },
};

export function inferTypeFromPath(
  dirPath: string
): { platform: string; type: string } | null {
  // Normalize to forward slashes for matching
  const normalized = dirPath.replace(/\\/g, "/");
  for (const [suffix, info] of Object.entries(DIR_TO_TYPE)) {
    if (normalized.endsWith(suffix) || normalized.includes(`${suffix}/`)) {
      return info;
    }
  }
  return null;
}

export function inferProjectName(dirPath: string): string | null {
  // Walk up from the target dir to find the project root
  // (parent of .claude, .cursor, etc.)
  const normalized = dirPath.replace(/\\/g, "/");
  for (const suffix of Object.keys(DIR_TO_TYPE)) {
    const idx = normalized.indexOf(suffix);
    if (idx > 0) {
      const projectDir = normalized.substring(0, idx - 1); // strip trailing /
      const parts = projectDir.split("/");
      return parts[parts.length - 1] || null;
    }
  }
  return null;
}

export function getDefaultLocalPath(
  platform: string,
  assetType: string,
  primaryFileName: string,
  projectDir?: string
): string {
  const subdir = getDefaultInstallSubdir(platform, assetType);
  if (projectDir) {
    return `${projectDir}/${subdir}/${primaryFileName}`;
  }
  return `${subdir}/${primaryFileName}`;
}
