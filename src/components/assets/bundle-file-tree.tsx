"use client";

import { File, Folder, Package } from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { BundleManifest } from "@/lib/types/bundle";

interface BundleFileTreeProps {
  manifest: BundleManifest;
  primaryFileName?: string;
}

interface TreeNode {
  name: string;
  path: string;
  size?: number;
  children: Map<string, TreeNode>;
}

function buildTree(files: BundleManifest["files"]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          size: isFile ? file.size : undefined,
          children: new Map(),
        });
      } else if (isFile) {
        const node = current.children.get(part)!;
        node.size = file.size;
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function TreeItem({
  node,
  depth,
  primaryFileName,
}: {
  node: TreeNode;
  depth: number;
  primaryFileName?: string;
}) {
  const isFile = node.children.size === 0;
  const isPrimary = node.path === primaryFileName;
  const sortedChildren = [...node.children.values()].sort((a, b) => {
    // Folders first, then files
    const aIsDir = a.children.size > 0;
    const bIsDir = b.children.size > 0;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-0.5 text-xs font-mono ${
          isPrimary ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {isFile ? (
          <File className="size-3 shrink-0" />
        ) : (
          <Folder className="size-3 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {node.size !== undefined && (
          <span className="ml-auto shrink-0 text-muted-foreground/60">
            {formatBytes(node.size)}
          </span>
        )}
        {isPrimary && (
          <span className="ml-1 shrink-0 text-[10px] bg-primary/10 text-primary px-1.5 rounded">
            primary
          </span>
        )}
      </div>
      {sortedChildren.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          primaryFileName={primaryFileName}
        />
      ))}
    </>
  );
}

export function BundleFileTree({ manifest, primaryFileName }: BundleFileTreeProps) {
  const tree = buildTree(manifest.files);
  const sortedRootChildren = [...tree.children.values()].sort((a, b) => {
    const aIsDir = a.children.size > 0;
    const bIsDir = b.children.size > 0;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="size-4" />
          Bundle Contents
        </div>
        <span className="text-xs text-muted-foreground">
          {manifest.fileCount} files, {formatBytes(manifest.totalSize)}
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {sortedRootChildren.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={0}
            primaryFileName={primaryFileName}
          />
        ))}
      </div>
    </div>
  );
}
