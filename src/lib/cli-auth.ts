import { hashApiKey, validateApiKeyFormat } from "./api-key";
import { db } from "./db";

interface ApiKeyAuth {
  userId: string;
  machineId: string | null;
  keyId: string;
}

export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuth | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7);
  if (!validateApiKeyFormat(raw)) return null;

  const hashed = hashApiKey(raw);

  const apiKey = await db.apiKey.findUnique({
    where: { hashedKey: hashed },
    select: {
      id: true,
      userId: true,
      machineId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) return null;
  if (apiKey.revokedAt) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget lastUsedAt update
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    userId: apiKey.userId,
    machineId: apiKey.machineId,
    keyId: apiKey.id,
  };
}

export async function requireApiKeyAuth(
  request: Request
): Promise<ApiKeyAuth> {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return auth;
}
