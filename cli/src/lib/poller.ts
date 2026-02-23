export class ServerPoller {
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number, onPoll: () => Promise<void>): void {
    this.stop();
    this.interval = setInterval(async () => {
      try {
        await onPoll();
      } catch {
        // Swallow errors during poll — will retry next interval
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  get isRunning(): boolean {
    return this.interval !== null;
  }
}
