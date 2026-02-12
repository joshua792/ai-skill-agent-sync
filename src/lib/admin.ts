import { currentUser } from "@clerk/nextjs/server";

const adminIds = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function isAdmin(userId: string): boolean {
  return adminIds.includes(userId);
}

export async function requireAdmin(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  if (!isAdmin(user.id)) throw new Error("Forbidden");
  return user.id;
}
