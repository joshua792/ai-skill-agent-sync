import * as fs from "fs";

export class FileWatcher {
  private watchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  watch(
    filePath: string,
    onChange: () => void,
    debounceMs: number = 2000
  ): void {
    // Close existing watcher for this path
    this.unwatch(filePath);

    if (!fs.existsSync(filePath)) {
      return; // Skip missing files
    }

    try {
      const watcher = fs.watch(filePath, () => {
        // Clear existing timer
        const existing = this.debounceTimers.get(filePath);
        if (existing) clearTimeout(existing);

        // Set new debounced callback
        const timer = setTimeout(() => {
          this.debounceTimers.delete(filePath);
          // Verify file still exists before callback
          if (fs.existsSync(filePath)) {
            onChange();
          }
        }, debounceMs);

        this.debounceTimers.set(filePath, timer);
      });

      watcher.on("error", () => {
        this.unwatch(filePath);
      });

      this.watchers.set(filePath, watcher);
    } catch {
      // File or directory may not exist
    }
  }

  unwatch(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
    }
    const timer = this.debounceTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(filePath);
    }
  }

  unwatchAll(): void {
    for (const filePath of this.watchers.keys()) {
      this.unwatch(filePath);
    }
  }

  get watchCount(): number {
    return this.watchers.size;
  }
}
