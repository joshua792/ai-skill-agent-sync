"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { updateProfileSchema } from "@/lib/validations/user";

const profileLimiter = rateLimit({ interval: 60_000, limit: 10 });

type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      username: user.username ?? user.id,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: user.imageUrl,
      email: user.emailAddresses?.[0]?.emailAddress ?? "",
    },
    update: {},
  });

  return user;
}

export async function updateProfile(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const { success: withinLimit } = profileLimiter.check(user.id);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded. Please try again later." };
  }

  const raw = {
    displayName: formData.get("displayName") as string,
    bio: formData.get("bio") as string,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return { success: false, error: "User not found" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/profile/${dbUser.username}`);
  return { success: true };
}
