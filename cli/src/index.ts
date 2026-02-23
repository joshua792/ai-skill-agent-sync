#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { initCommand } from "./commands/init.js";
import { linkCommand, linkAllCommand, unlinkCommand } from "./commands/link.js";
import { statusCommand } from "./commands/status.js";
import { pushCommand } from "./commands/push.js";
import { pullCommand } from "./commands/pull.js";
import { syncCommand } from "./commands/sync.js";
import { watchCommand } from "./commands/watch.js";
import { updateCommand } from "./commands/update.js";
import { CLI_VERSION, getLocalCommitHash } from "./lib/cli-version.js";
import { checkForUpdates } from "./lib/update-check.js";

const commitHash = getLocalCommitHash();
const versionString = commitHash ? `${CLI_VERSION} (${commitHash})` : CLI_VERSION;

const program = new Command();

program
  .name("av")
  .description("AssetVault CLI — sync AI skills, commands, and agents across machines")
  .version(versionString);

program
  .command("login")
  .description("Authenticate with your AssetVault API key")
  .action(loginCommand);

program
  .command("init")
  .description("Register this machine for syncing")
  .action(initCommand);

program
  .command("link")
  .description("Link an asset to a local file path")
  .argument("<slug>", "Asset slug to link")
  .argument("[path]", "Local file path (auto-detected if omitted)")
  .action(linkCommand);

program
  .command("link-all")
  .description("Scan a directory, create assets from files, and link them all")
  .argument("<dir>", "Directory to scan (e.g., .claude/skills)")
  .option("--project <name>", "Override inferred project name (for cross-machine sync with different folder names)")
  .action((dir: string, opts: { project?: string }) => linkAllCommand(dir, opts.project));

program
  .command("unlink")
  .description("Remove an asset link (does not delete local file)")
  .argument("<slug>", "Asset slug to unlink")
  .action(unlinkCommand);

program
  .command("status")
  .description("Show sync status for all linked assets")
  .action(statusCommand);

program
  .command("push")
  .description("Push local changes to AssetVault")
  .argument("[slug]", "Specific asset to push (all if omitted)")
  .action(pushCommand);

program
  .command("pull")
  .description("Pull updates from AssetVault")
  .argument("[slug]", "Specific asset to pull (all if omitted)")
  .action(pullCommand);

program
  .command("sync")
  .description("Push local changes then pull server updates")
  .action(syncCommand);

program
  .command("watch")
  .description("Start sync daemon — watch files and poll for updates")
  .action(watchCommand);

program
  .command("update")
  .description("Update the CLI to the latest version from git")
  .action(updateCommand);

// After every command except update/login, check for available updates
program.hook("postAction", (thisCommand) => {
  const name = thisCommand.name();
  if (["update", "login"].includes(name)) return;
  checkForUpdates();
});

program.parse();
