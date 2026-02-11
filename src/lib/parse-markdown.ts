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
    for (const line of frontmatter.split(/\r?\n/)) {
      const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
      if (kvMatch) {
        fmData[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
      }
    }

    const unquote = (s: string) => s.replace(/^["']|["']$/g, "");

    if (fmData["name"]) {
      result.name = unquote(fmData["name"]);
    }
    if (fmData["description"]) {
      result.description = unquote(fmData["description"]);
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
      let desc = descMatch[1].trim();
      if (desc.length > 280) desc = desc.slice(0, 277) + "...";
      result.description = desc;
    }
  }

  return result;
}
