import { PLATFORM_LABELS, CATEGORY_LABELS } from "@/lib/constants";

export interface ParsedMarkdown {
  content: string;
  primaryFileName: string;
  type?: string;
  name?: string;
  description?: string;
  tags?: string[];
  primaryPlatform?: string;
  category?: string;
}

// Match the limits in createAssetSchema so parsed values always validate
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 280;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 3) + "..." : value;
}

export function parseMarkdownFile(
  filename: string,
  text: string
): ParsedMarkdown {
  const result: ParsedMarkdown = {
    content: text,
    primaryFileName: filename,
  };

  // 1. Infer type from filename
  const upperName = filename.toUpperCase();
  if (upperName.includes("SKILL")) result.type = "SKILL";
  else if (upperName.includes("COMMAND")) result.type = "COMMAND";
  else if (upperName.includes("AGENT")) result.type = "AGENT";

  // 2. Extract frontmatter (between --- delimiters)
  let body = text;
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (fmMatch) {
    const frontmatter = fmMatch[1];
    body = fmMatch[2];

    const fmData: Record<string, string> = {};
    const lines = frontmatter.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const kvMatch = lines[i].match(/^(\w[\w-]*)\s*:\s*(.+)$/);
      if (!kvMatch) continue;
      let value = kvMatch[2].trim();
      // YAML block scalar (`>`, `|`, `>-`, ...): value is on the following indented lines
      if (/^[>|][+-]?$/.test(value)) {
        const block: string[] = [];
        while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
          block.push(lines[++i].trim());
        }
        value = value.startsWith("|")
          ? block.join("\n").trim()
          : block.join(" ").replace(/\s+/g, " ").trim();
      }
      fmData[kvMatch[1].toLowerCase()] = value;
    }

    const unquote = (s: string) => s.replace(/^["']|["']$/g, "");

    if (fmData["name"]) {
      result.name = truncate(unquote(fmData["name"]), MAX_NAME_LENGTH);
    }
    if (fmData["description"]) {
      result.description = truncate(unquote(fmData["description"]), MAX_DESCRIPTION_LENGTH);
    }
    if (fmData["tags"]) {
      const raw = fmData["tags"].replace(/^\[|\]$/g, "");
      result.tags = raw
        .split(",")
        .map((t) => unquote(t.trim()))
        .filter(Boolean);
    }
    if (fmData["platform"]) {
      const plat = fmData["platform"].toUpperCase().replace(/[\s-]+/g, "_");
      if (plat in PLATFORM_LABELS) result.primaryPlatform = plat;
    }
    if (fmData["category"]) {
      const cat = fmData["category"].toUpperCase().replace(/[\s-]+/g, "_");
      if (cat in CATEGORY_LABELS) result.category = cat;
    }
  }

  // 3. Extract name from first # heading (if not from frontmatter)
  if (!result.name) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      result.name = headingMatch[1].trim();
    }
  }

  // 4. Extract description from first paragraph after heading
  if (!result.description) {
    const descMatch = body.match(/^#\s+.+\r?\n\r?\n(.+)/m);
    if (descMatch) {
      result.description = truncate(descMatch[1].trim(), MAX_DESCRIPTION_LENGTH);
    }
  }

  return result;
}
