import * as fs from "fs";
import { ApiClient } from "../lib/api-client.js";
import {
  requireConfig,
  requireMachine,
  type LinkEntry,
} from "../lib/config.js";
import { findProjectConfig, readProjectConfig } from "../lib/project-config.js";
import { hashContent } from "../lib/hash.js";
import * as log from "../lib/logger.js";
import * as path from "path";

function getAllLinks(config: { userLinks: LinkEntry[] }): LinkEntry[] {
  const links = [...config.userLinks];
  const projectConfigPath = findProjectConfig();
  if (projectConfigPath) {
    const dir = path.dirname(projectConfigPath);
    const projConfig = readProjectConfig(dir);
    if (projConfig) links.push(...projConfig.links);
  }
  return links;
}

export async function statusCommand(): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);

  const links = getAllLinks(config);
  if (links.length === 0) {
    log.info("No assets linked. Run `av link <asset-slug>` to get started.");
    return;
  }

  const client = new ApiClient(config.serverUrl, config.apiKey);
  const { assets } = await client.syncManifest(machineId);
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  console.log("");
  console.log(
    "  Asset".padEnd(30) +
      "Version".padEnd(14) +
      "Synced".padEnd(14) +
      "Status"
  );
  console.log("  " + "─".repeat(70));

  for (const link of links) {
    const asset = assetMap.get(link.assetId);
    if (!asset) {
      console.log(`  ${link.assetSlug.padEnd(28)} ${"???".padEnd(14)} ${"".padEnd(14)} Asset not found`);
      continue;
    }

    // Check local changes
    let localChanged = false;
    if (fs.existsSync(link.localPath)) {
      const content = fs.readFileSync(link.localPath, "utf-8");
      const currentHash = hashContent(content);
      localChanged = link.lastHash !== "" && currentHash !== link.lastHash;
    }

    // Check server changes
    const serverChanged =
      link.lastSyncedVersion !== "" &&
      asset.currentVersion !== link.lastSyncedVersion;
    const notSynced = link.lastSyncedVersion === "";

    let status: string;
    if (notSynced) {
      status = "\x1b[90mNot synced\x1b[0m";
    } else if (localChanged && serverChanged) {
      status = "\x1b[33mConflict\x1b[0m";
    } else if (localChanged) {
      status = "\x1b[36mLocal changed\x1b[0m";
    } else if (serverChanged) {
      status = "\x1b[33mOutdated\x1b[0m";
    } else {
      status = "\x1b[32mUp to date\x1b[0m";
    }

    const synced = link.lastSyncedVersion || "—";
    console.log(
      `  ${asset.name.slice(0, 28).padEnd(30)}${("v" + asset.currentVersion).padEnd(14)}${("v" + synced).padEnd(14)}${status}`
    );
  }

  console.log("");
}

export { getAllLinks };
