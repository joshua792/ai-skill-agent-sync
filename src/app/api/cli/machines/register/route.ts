import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { cliMachineRegisterSchema } from "@/lib/validations/cli";

const limiter = rateLimit({ interval: 5 * 60_000, limit: 10 });

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

  const parsed = cliMachineRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, machineIdentifier } = parsed.data;

  try {
    const machine = await db.userMachine.create({
      data: {
        userId: auth.userId,
        name,
        machineIdentifier,
      },
    });

    // If the API key has no machine bound, bind it
    if (!auth.machineId) {
      await db.apiKey.update({
        where: { id: auth.keyId },
        data: { machineId: machine.id },
      });
    }

    return NextResponse.json({
      id: machine.id,
      name: machine.name,
      machineIdentifier: machine.machineIdentifier,
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Machine with this identifier already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
