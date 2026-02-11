export const ASSET_TYPE_LABELS: Record<string, string> = {
  SKILL: "Skill",
  COMMAND: "Command",
  AGENT: "Agent",
};

export const ASSET_TYPE_COLORS: Record<string, string> = {
  SKILL: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  COMMAND: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  AGENT: "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

export const PLATFORM_LABELS: Record<string, string> = {
  CLAUDE_CODE: "Claude Code",
  GEMINI_CLI: "Gemini CLI",
  CHATGPT: "ChatGPT",
  CURSOR: "Cursor",
  WINDSURF: "Windsurf",
  AIDER: "Aider",
  OTHER: "Other",
};

export const CATEGORY_LABELS: Record<string, string> = {
  CODE_GENERATION: "Code Generation",
  CODE_REVIEW: "Code Review",
  DOCUMENTATION: "Documentation",
  TESTING: "Testing",
  DEVOPS: "DevOps",
  DATA_ANALYSIS: "Data Analysis",
  WRITING: "Writing",
  RESEARCH: "Research",
  PRODUCTIVITY: "Productivity",
  DESIGN: "Design",
  DOMAIN_SPECIFIC: "Domain Specific",
  OTHER: "Other",
};

export const LICENSE_LABELS: Record<string, string> = {
  MIT: "MIT",
  APACHE_2: "Apache 2.0",
  GPL_3: "GPL 3.0",
  BSD_3: "BSD 3-Clause",
  CC_BY_4: "CC BY 4.0",
  CC_BY_SA_4: "CC BY-SA 4.0",
  UNLICENSED: "Unlicensed",
  CUSTOM: "Custom",
};

export const LICENSE_DESCRIPTIONS: Record<string, string> = {
  MIT: "Permissive license allowing reuse with minimal restrictions. Requires attribution.",
  APACHE_2: "Permissive license similar to MIT with an express grant of patent rights.",
  GPL_3: "Copyleft license requiring derived works to use the same license.",
  BSD_3: "Permissive license similar to MIT with a non-endorsement clause.",
  CC_BY_4: "Allows sharing and adapting for any purpose with attribution.",
  CC_BY_SA_4: "Allows sharing and adapting with attribution. Derivatives must use the same license.",
  UNLICENSED: "No license specified. All rights reserved by the author.",
  CUSTOM: "Custom license. See the license text for details.",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: "Private",
  SHARED: "Shared",
  PUBLIC: "Public",
};

export const INSTALL_SCOPE_LABELS: Record<string, string> = {
  USER: "User",
  PROJECT: "Project",
};

export const INSTALL_SCOPE_DESCRIPTIONS: Record<string, string> = {
  USER: "Available in all your projects on a machine",
  PROJECT: "Scoped to a specific project directory",
};

export const STORAGE_TYPE_LABELS: Record<string, string> = {
  INLINE: "Inline",
  BUNDLE: "Bundle",
};

export const MAX_BUNDLE_SIZE_MB = 4;

export const DEFAULT_FILE_NAMES: Record<string, string> = {
  SKILL: "SKILL.md",
  COMMAND: "COMMAND.md",
  AGENT: "AGENT.md",
};
