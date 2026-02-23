import { NextResponse } from "next/server";
import slugify from "slugify";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { cliCreateAssetSchema } from "@/lib/validations/cli";

const limiter = rateLimit({ interval: 60_000, limit: 20 });

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let counter = 0;
  while (await db.asset.findUnique({ where: { slug } })) {
    counter++;
    slug = `${base}-${counter}`;
  }
  return slug;
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireApiKeyAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { success } = limiter.check(auth.keyId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = cliCreateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, content, type, primaryPlatform, primaryFileName, installScope, machineId } =
    parsed.data;

  // Verify machine belongs to user
  const machine = await db.userMachine.findFirst({
    where: { id: machineId, userId: auth.userId },
  });

  if (!machine) {
    return NextResponse.json(
      { error: "Machine not found or not authorized" },
      { status: 404 }
    );
  }

  const slug = await generateUniqueSlug(name);

  const asset = await db.asset.create({
    data: {
      slug,
      name,
      description: `Auto-created from CLI (${primaryFileName})`,
      content,
      type: type as "SKILL" | "COMMAND" | "AGENT",
      primaryPlatform: primaryPlatform as "CLAUDE_CODE" | "GEMINI_CLI" | "CHATGPT" | "CURSOR" | "WINDSURF" | "AIDER" | "OTHER",
      compatiblePlatforms: [primaryPlatform as "CLAUDE_CODE" | "GEMINI_CLI" | "CHATGPT" | "CURSOR" | "WINDSURF" | "AIDER" | "OTHER"],
      category: "GENERAL",
      tags: [],
      visibility: "PRIVATE",
      installScope: installScope as "USER" | "PROJECT",
      storageType: "INLINE",
      primaryFileName,
      currentVersion: "1.0.0",
      authorId: auth.userId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      currentVersion: true,
      primaryFileName: true,
      type: true,
      primaryPlatform: true,
      installScope: true,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
