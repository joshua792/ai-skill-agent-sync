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
