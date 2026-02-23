import { createHash } from "crypto";
import * as fs from "fs";

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  return hashContent(content);
}
