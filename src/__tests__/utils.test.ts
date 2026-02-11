import { describe, it, expect } from "vitest";
import { parseMarkdownFile } from "@/lib/parse-markdown";
import { formatDistanceToNow, formatDate } from "@/lib/format";
import {
  ASSET_TYPE_LABELS,
  PLATFORM_LABELS,
  CATEGORY_LABELS,
  LICENSE_LABELS,
  LICENSE_DESCRIPTIONS,
  VISIBILITY_LABELS,
  INSTALL_SCOPE_LABELS,
  DEFAULT_FILE_NAMES,
} from "@/lib/constants";

// ═══════════════════════════════════════════════════════
// parseMarkdownFile
// ═══════════════════════════════════════════════════════

describe("parseMarkdownFile", () => {
  describe("type inference from filename", () => {
    it("infers SKILL from SKILL.md", () => {
      const result = parseMarkdownFile("SKILL.md", "content");
      expect(result.type).toBe("SKILL");
    });

    it("infers COMMAND from my-command.md (case-insensitive)", () => {
      const result = parseMarkdownFile("my-command.md", "content");
      expect(result.type).toBe("COMMAND");
    });

    it("infers AGENT from agent-setup.md", () => {
      const result = parseMarkdownFile("agent-setup.md", "content");
      expect(result.type).toBe("AGENT");
    });

    it("returns undefined type for README.md", () => {
      const result = parseMarkdownFile("README.md", "content");
      expect(result.type).toBeUndefined();
    });
  });

  describe("frontmatter parsing", () => {
    it("extracts all fields from valid YAML frontmatter", () => {
      const text = [
        "---",
        "name: Test Skill",
        "description: A test skill for testing",
        "tags: [foo, bar]",
        "platform: claude_code",
        "category: testing",
        "---",
        "Body content here",
      ].join("\n");

      const result = parseMarkdownFile("SKILL.md", text);
      expect(result.name).toBe("Test Skill");
      expect(result.description).toBe("A test skill for testing");
      expect(result.tags).toEqual(["foo", "bar"]);
      expect(result.primaryPlatform).toBe("CLAUDE_CODE");
      expect(result.category).toBe("TESTING");
    });

    it("extracts name from first # heading when no frontmatter", () => {
      const text = "# My Cool Skill\n\nSome description here";
      const result = parseMarkdownFile("README.md", text);
      expect(result.name).toBe("My Cool Skill");
    });

    it("falls back to heading when frontmatter has no name", () => {
      const text = [
        "---",
        "description: A test",
        "---",
        "# Heading Name",
        "",
        "Body content",
      ].join("\n");

      const result = parseMarkdownFile("README.md", text);
      expect(result.name).toBe("Heading Name");
    });

    it("returns undefined name when no heading or frontmatter", () => {
      const text = "Just some plain text without any heading";
      const result = parseMarkdownFile("README.md", text);
      expect(result.name).toBeUndefined();
    });
  });

  describe("description extraction", () => {
    it("extracts first paragraph after heading", () => {
      const text = "# Title\n\nThis is the description paragraph.";
      const result = parseMarkdownFile("README.md", text);
      expect(result.description).toBe("This is the description paragraph.");
    });

    it("truncates description longer than 280 chars", () => {
      const longDesc = "a".repeat(300);
      const text = `# Title\n\n${longDesc}`;
      const result = parseMarkdownFile("README.md", text);
      expect(result.description).toBe("a".repeat(277) + "...");
      expect(result.description!.length).toBe(280);
    });
  });

  describe("platform/category normalization", () => {
    it("uppercases and normalizes platform", () => {
      const text = "---\nplatform: claude_code\n---\nBody";
      const result = parseMarkdownFile("test.md", text);
      expect(result.primaryPlatform).toBe("CLAUDE_CODE");
    });

    it("does not set invalid platform", () => {
      const text = "---\nplatform: nonexistent_platform\n---\nBody";
      const result = parseMarkdownFile("test.md", text);
      expect(result.primaryPlatform).toBeUndefined();
    });

    it("does not set invalid category", () => {
      const text = "---\ncategory: nonexistent_category\n---\nBody";
      const result = parseMarkdownFile("test.md", text);
      expect(result.category).toBeUndefined();
    });
  });

  describe("tags parsing", () => {
    it("parses bracketed tag list", () => {
      const text = "---\ntags: [foo, bar, baz]\n---\nBody";
      const result = parseMarkdownFile("test.md", text);
      expect(result.tags).toEqual(["foo", "bar", "baz"]);
    });

    it("unquotes quoted tag values", () => {
      const text = '---\ntags: ["foo", \'bar\']\n---\nBody';
      const result = parseMarkdownFile("test.md", text);
      expect(result.tags).toEqual(["foo", "bar"]);
    });
  });

  describe("content and filename passthrough", () => {
    it("content always equals the full file text", () => {
      const text = "---\nname: Test\n---\nBody content";
      const result = parseMarkdownFile("test.md", text);
      expect(result.content).toBe(text);
    });

    it("primaryFileName always equals the passed filename", () => {
      const result = parseMarkdownFile("my-file.md", "content");
      expect(result.primaryFileName).toBe("my-file.md");
    });
  });
});

// ═══════════════════════════════════════════════════════
// formatDistanceToNow
// ═══════════════════════════════════════════════════════

describe("formatDistanceToNow", () => {
  it("returns 'just now' for date within last 59 seconds", () => {
    const date = new Date(Date.now() - 30 * 1000);
    expect(formatDistanceToNow(date)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("7d ago");
  });

  it("returns localized date for > 30 days", () => {
    const date = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const result = formatDistanceToNow(date);
    // Should be a localized date string, not "Xd ago"
    expect(result).not.toContain("d ago");
    expect(result).not.toBe("just now");
  });

  it("returns 'just now' for future dates", () => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("just now");
  });
});

// ═══════════════════════════════════════════════════════
// formatDate
// ═══════════════════════════════════════════════════════

describe("formatDate", () => {
  it("formats Feb 11, 2026 correctly", () => {
    const result = formatDate(new Date(2026, 1, 11));
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
    expect(result).toContain("11");
  });

  it("formats Dec 25, 2024 correctly", () => {
    const result = formatDate(new Date(2024, 11, 25));
    expect(result).toContain("Dec");
    expect(result).toContain("2024");
    expect(result).toContain("25");
  });
});

// ═══════════════════════════════════════════════════════
// Constants completeness
// ═══════════════════════════════════════════════════════

describe("constants completeness", () => {
  it("ASSET_TYPE_LABELS has SKILL, COMMAND, AGENT", () => {
    expect(Object.keys(ASSET_TYPE_LABELS).sort()).toEqual(["AGENT", "COMMAND", "SKILL"]);
  });

  it("PLATFORM_LABELS has all 7 platform keys", () => {
    const expected = ["AIDER", "CHATGPT", "CLAUDE_CODE", "CURSOR", "GEMINI_CLI", "OTHER", "WINDSURF"];
    expect(Object.keys(PLATFORM_LABELS).sort()).toEqual(expected);
  });

  it("CATEGORY_LABELS has 12 category keys", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(12);
  });

  it("LICENSE_LABELS has 8 license keys", () => {
    expect(Object.keys(LICENSE_LABELS)).toHaveLength(8);
  });

  it("LICENSE_DESCRIPTIONS has the same keys as LICENSE_LABELS", () => {
    expect(Object.keys(LICENSE_DESCRIPTIONS).sort()).toEqual(Object.keys(LICENSE_LABELS).sort());
  });

  it("VISIBILITY_LABELS has PRIVATE, SHARED, PUBLIC", () => {
    expect(Object.keys(VISIBILITY_LABELS).sort()).toEqual(["PRIVATE", "PUBLIC", "SHARED"]);
  });

  it("INSTALL_SCOPE_LABELS has USER, PROJECT", () => {
    expect(Object.keys(INSTALL_SCOPE_LABELS).sort()).toEqual(["PROJECT", "USER"]);
  });

  it("DEFAULT_FILE_NAMES has SKILL, COMMAND, AGENT", () => {
    expect(Object.keys(DEFAULT_FILE_NAMES).sort()).toEqual(["AGENT", "COMMAND", "SKILL"]);
  });

  it("no label map has empty string values", () => {
    const maps = [
      ASSET_TYPE_LABELS, PLATFORM_LABELS, CATEGORY_LABELS,
      LICENSE_LABELS, LICENSE_DESCRIPTIONS, VISIBILITY_LABELS,
      INSTALL_SCOPE_LABELS, DEFAULT_FILE_NAMES,
    ];
    for (const map of maps) {
      for (const value of Object.values(map)) {
        expect(value).not.toBe("");
      }
    }
  });
});
