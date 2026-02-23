import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════
// Machine Sync View — Sync Activity Display
// ═══════════════════════════════════════════════════════

describe("MachineSyncView sync activity", () => {
  const syncViewPath = path.resolve(
    __dirname,
    "../components/machines/machine-sync-view.tsx"
  );

  it("machine-sync-view is a client component", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content.startsWith('"use client"')).toBe(true);
  });

  it("SerializedSyncState includes localHash field", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("localHash: string | null");
  });

  it("SerializedSyncState includes lastPushAt field", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("lastPushAt: string | null");
  });

  it("SerializedSyncState includes lastPullAt field", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("lastPullAt: string | null");
  });

  it("shows push/pull direction indicators", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("ArrowUp");
    expect(content).toContain("ArrowDown");
  });

  it("displays Last Sync column header", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("Last Sync");
  });

  it("imports formatDistanceToNow for timestamps", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("formatDistanceToNow");
  });

  it("detects daemon active status from lastSyncAt", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("isDaemonActive");
    expect(content).toContain("90_000");
  });

  it("shows CLI Daemon Active badge", () => {
    const content = fs.readFileSync(syncViewPath, "utf-8");
    expect(content).toContain("CLI Daemon Active");
  });
});

// ═══════════════════════════════════════════════════════
// Machines List — Daemon Status Badges
// ═══════════════════════════════════════════════════════

describe("MachinesList daemon status", () => {
  const machinesListPath = path.resolve(
    __dirname,
    "../components/machines/machines-list.tsx"
  );

  it("machines-list imports Badge component", () => {
    const content = fs.readFileSync(machinesListPath, "utf-8");
    expect(content).toContain("Badge");
  });

  it("machines-list shows Active badge for recent sync", () => {
    const content = fs.readFileSync(machinesListPath, "utf-8");
    expect(content).toContain("Active");
    expect(content).toContain("90_000");
  });

  it("machines-list shows Inactive badge for stale machines", () => {
    const content = fs.readFileSync(machinesListPath, "utf-8");
    expect(content).toContain("Inactive");
  });

  it("machines-list uses animate-pulse for active indicator", () => {
    const content = fs.readFileSync(machinesListPath, "utf-8");
    expect(content).toContain("animate-pulse");
  });
});

// ═══════════════════════════════════════════════════════
// Machine Detail Page — Query Fields
// ═══════════════════════════════════════════════════════

describe("Machine detail page query", () => {
  const detailPagePath = path.resolve(
    __dirname,
    "../app/dashboard/machines/[id]/page.tsx"
  );

  it("machine detail page exists", () => {
    expect(fs.existsSync(detailPagePath)).toBe(true);
  });

  it("queries localHash field from syncStates", () => {
    const content = fs.readFileSync(detailPagePath, "utf-8");
    expect(content).toContain("localHash");
  });

  it("queries lastPushAt field from syncStates", () => {
    const content = fs.readFileSync(detailPagePath, "utf-8");
    expect(content).toContain("lastPushAt");
  });

  it("queries lastPullAt field from syncStates", () => {
    const content = fs.readFileSync(detailPagePath, "utf-8");
    expect(content).toContain("lastPullAt");
  });

  it("uses select for syncStates to include new fields", () => {
    const content = fs.readFileSync(detailPagePath, "utf-8");
    expect(content).toContain("syncStates:");
    expect(content).toContain("select:");
  });
});
