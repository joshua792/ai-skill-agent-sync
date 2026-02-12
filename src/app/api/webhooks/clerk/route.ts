import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, username, first_name, last_name, image_url, email_addresses } =
      evt.data;

    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      return new Response("No email found", { status: 400 });
    }

    const displayName = [first_name, last_name].filter(Boolean).join(" ") || null;

    await db.user.upsert({
      where: { id },
      create: {
        id,
        username: username ?? id,
        displayName,
        avatarUrl: image_url,
        email,
      },
      update: {
        username: username ?? undefined,
        // displayName intentionally omitted — users can override it in Settings
        avatarUrl: image_url,
        email,
      },
    });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db.user.delete({ where: { id } }).catch(() => {
        // User may not exist locally yet
      });
    }
  }

  return new Response("OK", { status: 200 });
}
