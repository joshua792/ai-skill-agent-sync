"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  LayoutDashboard,
  Compass,
  Plus,
  Monitor,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Wand2,
  Terminal,
  Bot,
} from "lucide-react";
import { ASSET_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/constants";

interface SearchResult {
  slug: string;
  name: string;
  description: string;
  type: string;
  primaryPlatform: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  SKILL: Wand2,
  COMMAND: Terminal,
  AGENT: Bot,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function select(path: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search assets or jump to..."
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Assets">
            {results.map((r) => {
              const Icon = typeIcons[r.type] ?? Search;
              return (
                <CommandItem
                  key={r.slug}
                  value={`asset-${r.slug}`}
                  onSelect={() => select(`/assets/${r.slug}`)}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate">{r.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {ASSET_TYPE_LABELS[r.type] ?? r.type} &middot;{" "}
                      {PLATFORM_LABELS[r.primaryPlatform] ?? r.primaryPlatform}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem value="explore" onSelect={() => select("/explore")}>
            <Compass className="size-4" />
            Explore
          </CommandItem>
          <CommandItem value="dashboard" onSelect={() => select("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </CommandItem>
          <CommandItem
            value="new-asset"
            onSelect={() => select("/dashboard/assets/new")}
          >
            <Plus className="size-4" />
            New Asset
          </CommandItem>
          <CommandItem
            value="machines"
            onSelect={() => select("/dashboard/machines")}
          >
            <Monitor className="size-4" />
            Machines
          </CommandItem>
          <CommandItem
            value="analytics"
            onSelect={() => select("/dashboard/analytics")}
          >
            <BarChart3 className="size-4" />
            Analytics
          </CommandItem>
          <CommandItem
            value="settings"
            onSelect={() => select("/dashboard/settings")}
          >
            <Settings className="size-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem
            value="light-mode"
            onSelect={() => {
              setTheme("light");
              setOpen(false);
            }}
          >
            <Sun className="size-4" />
            Light Mode
            {theme === "light" && (
              <span className="ml-auto text-xs text-muted-foreground">
                Active
              </span>
            )}
          </CommandItem>
          <CommandItem
            value="dark-mode"
            onSelect={() => {
              setTheme("dark");
              setOpen(false);
            }}
          >
            <Moon className="size-4" />
            Dark Mode
            {theme === "dark" && (
              <span className="ml-auto text-xs text-muted-foreground">
                Active
              </span>
            )}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
