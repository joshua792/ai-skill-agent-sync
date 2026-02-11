import Link from "next/link";
import { Vault } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Vault className="h-4 w-4" />
          <span>AssetVault</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground transition-colors">
            Explore
          </Link>
          <Link href="https://github.com/joshua792/ai-skill-agent-sync" className="hover:text-foreground transition-colors">
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
