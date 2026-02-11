import Link from "next/link";
import { Vault, ArrowRight, Zap, FolderSync, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Vault className="h-5 w-5" />
            <span>AssetVault</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your AI workflow assets,{" "}
            <span className="text-primary">organized and shared.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Registry, sync tool, and marketplace for Skills, Agents, and
            Commands built for AI coding assistants. Catalog, version, sync
            across machines, and share with the community.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/explore">
              <Button size="lg" className="gap-2">
                Explore Assets
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Skills, Commands & Agents</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Organize your AI assets by type. Skills teach AI how to do things,
              Commands tell it what to do, Agents define who it should be.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderSync className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sync Across Machines</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Register your machines and keep assets in sync. Know exactly which
              version is running where.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Share & Discover</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Publish assets to the community. Fork and customize assets others
              have shared. Build on what works.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
