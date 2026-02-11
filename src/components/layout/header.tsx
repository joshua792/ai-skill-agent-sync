"use client";

import Link from "next/link";
import { useCallback } from "react";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import { Vault, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Header() {
  const openCommandPalette = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      })
    );
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Mobile hamburger menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Vault className="h-5 w-5" />
                AssetVault
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-4">
              <Link
                href="/explore"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Explore
              </Link>
              {clerkEnabled && (
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                </SignedIn>
              )}
              <button
                onClick={openCommandPalette}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <Search className="h-4 w-4" />
                Search...
              </button>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold mr-8"
        >
          <Vault className="h-5 w-5" />
          <span>AssetVault</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/explore"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore
          </Link>
          {clerkEnabled && (
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            </SignedIn>
          )}
        </nav>

        {/* Search trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex items-center gap-2 ml-4 text-muted-foreground"
          onClick={openCommandPalette}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            Ctrl+K
          </kbd>
        </Button>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {clerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <Link href="/sign-up">
                  <Button size="sm">Get Started</Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </SignedIn>
            </>
          ) : (
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
