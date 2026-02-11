import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const searchLimiter = rateLimit({ interval: 60_000, limit: 60 });

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { success } = searchLimiter.check(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await db.asset.findMany({
    where: {
      visibility: "PUBLIC",
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      slug: true,
      name: true,
      description: true,
      type: true,
      primaryPlatform: true,
    },
    orderBy: { downloadCount: "desc" },
    take: 8,
  });

  return NextResponse.json({ results });
}
