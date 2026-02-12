"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Monitor,
  Plus,
  Settings,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const sidebarItems = [
  { title: "My Assets", href: "/dashboard", icon: LayoutDashboard },
  { title: "Machines", href: "/dashboard/machines", icon: Monitor },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface MobileSidebarProps {
  isAdmin?: boolean;
}

export function MobileSidebar({ isAdmin }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Dashboard menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Dashboard</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Link
            href="/dashboard/assets/new"
            onClick={() => setOpen(false)}
          >
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              New Asset
            </Button>
          </Link>
        </div>
        <nav className="space-y-1 mt-4">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
