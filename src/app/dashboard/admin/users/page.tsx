import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUsersTable } from "@/components/admin/admin-users-table";

export const metadata: Metadata = {
  title: "Admin — Users",
};

export default async function AdminUsersPage() {
  const user = await currentUser();
  if (!user || !isAdmin(user.id)) redirect("/dashboard");

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          assets: { where: { deletedAt: null } },
          downloads: true,
        },
      },
    },
  });

  // Serialize dates for client component
  const serialized = users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
    assetCount: u._count.assets,
    downloadCount: u._count.downloads,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <AdminNav />

      <AdminUsersTable users={serialized} />
    </div>
  );
}
