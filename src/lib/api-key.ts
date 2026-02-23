import { createHash, randomBytes } from "crypto";

export const API_KEY_PREFIX = "avk_";
const RAW_RANDOM_LENGTH = 24; // 24 bytes → 32 base64url chars

export function generateApiKey(): {
  raw: string;
  hash: string;
  prefix: string;
} {
  const randomPart = randomBytes(RAW_RANDOM_LENGTH).toString("base64url");
  const raw = `${API_KEY_PREFIX}${randomPart}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 8); // "avk_XXXX"
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function validateApiKeyFormat(key: string): boolean {
  // avk_ prefix + 32 base64url chars
  return /^avk_[A-Za-z0-9_-]{32}$/.test(key);
}
