import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset Detail",
};

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Asset: {slug}</h1>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Asset detail view coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
