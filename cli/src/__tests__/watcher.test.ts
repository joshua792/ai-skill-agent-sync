import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { FileWatcher } from "../lib/watcher.js";
import { ServerPoller } from "../lib/poller.js";

const TEST_DIR = path.join(os.tmpdir(), "av-watcher-test-" + Date.now());

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("FileWatcher", () => {
  it("watchCount increments when watching a file", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const filePath = path.join(TEST_DIR, "test.md");
    fs.writeFileSync(filePath, "initial");

    const watcher = new FileWatcher();
    watcher.watch(filePath, () => {});
    expect(watcher.watchCount).toBe(1);
    watcher.unwatchAll();
  });

  it("unwatch decrements watchCount", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const filePath = path.join(TEST_DIR, "test.md");
    fs.writeFileSync(filePath, "initial");

    const watcher = new FileWatcher();
    watcher.watch(filePath, () => {});
    expect(watcher.watchCount).toBe(1);
    watcher.unwatch(filePath);
    expect(watcher.watchCount).toBe(0);
  });

  it("unwatchAll cleans up all watchers", () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const f1 = path.join(TEST_DIR, "a.md");
    const f2 = path.join(TEST_DIR, "b.md");
    fs.writeFileSync(f1, "a");
    fs.writeFileSync(f2, "b");

    const watcher = new FileWatcher();
    watcher.watch(f1, () => {});
    watcher.watch(f2, () => {});
    expect(watcher.watchCount).toBe(2);
    watcher.unwatchAll();
    expect(watcher.watchCount).toBe(0);
  });

  it("skips missing files gracefully", () => {
    const watcher = new FileWatcher();
    watcher.watch("/nonexistent/file.md", () => {});
    expect(watcher.watchCount).toBe(0);
    watcher.unwatchAll();
  });
});

describe("ServerPoller", () => {
  it("calls onPoll at interval", async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const poller = new ServerPoller();
    poller.start(50, onPoll);
    expect(poller.isRunning).toBe(true);

    await new Promise((r) => setTimeout(r, 130));
    poller.stop();

    expect(onPoll.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("stop clears interval", () => {
    const poller = new ServerPoller();
    poller.start(100, async () => {});
    expect(poller.isRunning).toBe(true);
    poller.stop();
    expect(poller.isRunning).toBe(false);
  });

  it("swallows errors during poll", async () => {
    const onPoll = vi.fn().mockRejectedValue(new Error("network error"));
    const poller = new ServerPoller();
    poller.start(50, onPoll);

    await new Promise((r) => setTimeout(r, 80));
    poller.stop();

    // Should have called onPoll at least once without crashing
    expect(onPoll).toHaveBeenCalled();
  });
});

describe("Watch command contracts", () => {
  it("watch command module exists", async () => {
    await import("../commands/watch.js");
  });
});
