import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">@{username}</h1>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Public user profile coming in Phase 3.
        </p>
      </div>
    </div>
  );
}
