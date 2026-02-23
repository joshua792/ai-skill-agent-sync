import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 60 });

export async function GET(request: Request) {
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

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, username: true, email: true, displayName: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let machine = null;
  if (auth.machineId) {
    machine = await db.userMachine.findUnique({
      where: { id: auth.machineId },
      select: { id: true, name: true, machineIdentifier: true },
    });
  }

  return NextResponse.json({ user, machine });
}
