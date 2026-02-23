"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Plus,
  Settings,
  BarChart3,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const sidebarItems = [
  {
    title: "My Assets",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Machines",
    href: "/dashboard/machines",
    icon: Monitor,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "API Keys",
    href: "/dashboard/api-keys",
    icon: KeyRound,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r min-h-[calc(100vh-3.5rem)] p-4 hidden md:block">
      <div className="mb-6">
        <Link href="/dashboard/assets/new">
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Asset
          </Button>
        </Link>
      </div>
      <nav className="space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              (item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href))
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
      {isAdmin && (
        <>
          <Separator className="my-4" />
          <nav className="space-y-1">
            <Link
              href="/dashboard/admin"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/dashboard/admin")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          </nav>
        </>
      )}
    </aside>
  );
}
