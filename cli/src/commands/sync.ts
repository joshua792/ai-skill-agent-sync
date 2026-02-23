import { pushCommand } from "./push.js";
import { pullCommand } from "./pull.js";
import * as log from "../lib/logger.js";

export async function syncCommand(): Promise<void> {
  log.info("Syncing...\n");

  log.info("── Push local changes ──");
  await pushCommand();

  console.log("");

  log.info("── Pull server updates ──");
  await pullCommand();

  console.log("");
  log.success("Sync complete.");
}
