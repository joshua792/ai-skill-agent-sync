import * as path from "path";
import * as fs from "fs";
import { ApiClient } from "../lib/api-client.js";
import {
  requireConfig,
  requireMachine,
  writeConfig,
  type LinkEntry,
} from "../lib/config.js";
import {
  findProjectConfig,
  readProjectConfig,
  writeProjectConfig,
} from "../lib/project-config.js";
import { hashContent } from "../lib/hash.js";
import { getDefaultInstallSubdir } from "../lib/install-paths.js";
import * as log from "../lib/logger.js";

export async function linkCommand(
  slug: string,
  localPath?: string
): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);

  const client = new ApiClient(config.serverUrl, config.apiKey);

  log.info("Fetching asset list...");
  const { assets } = await client.syncManifest(machineId);
  const asset = assets.find((a) => a.slug === slug);

  if (!asset) {
    log.error(`Asset "${slug}" not found. Check the slug and try again.`);
    process.exit(1);
  }

  // Determine local path
  let resolvedPath: string;
  if (localPath) {
    resolvedPath = path.resolve(localPath);
  } else {
    const subdir = getDefaultInstallSubdir(asset.primaryPlatform, asset.type);
    if (asset.installScope === "PROJECT") {
      resolvedPath = path.resolve(subdir, asset.primaryFileName);
    } else {
      // USER scope — put under home dir
      const homeSubdir = getDefaultInstallSubdir(asset.primaryPlatform, asset.type);
      resolvedPath = path.resolve(
        process.env.HOME ?? process.env.USERPROFILE ?? ".",
        homeSubdir,
        asset.primaryFileName
      );
    }
  }

  const entry: LinkEntry = {
    assetId: asset.id,
    assetSlug: asset.slug,
    localPath: resolvedPath,
    lastHash: "",
    lastSyncedVersion: asset.syncState?.syncedVersion ?? "",
  };

  // If file already exists, compute initial hash
  if (fs.existsSync(resolvedPath)) {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    entry.lastHash = hashContent(content);
  }

  // Decide where to store the link
  if (asset.installScope === "PROJECT") {
    const projectConfigPath = findProjectConfig();
    const projectDir = projectConfigPath
      ? path.dirname(projectConfigPath)
      : process.cwd();
    const projectConfig = readProjectConfig(projectDir) ?? { links: [] };

    // Remove existing link for this asset
    projectConfig.links = projectConfig.links.filter(
      (l) => l.assetId !== asset.id
    );
    projectConfig.links.push(entry);
    writeProjectConfig(projectDir, projectConfig);

    log.success(
      `Linked "${asset.name}" → ${resolvedPath} (project config: ${projectDir})`
    );
  } else {
    // USER scope → global config
    config.userLinks = config.userLinks.filter((l) => l.assetId !== asset.id);
    config.userLinks.push(entry);
    writeConfig(config);

    log.success(`Linked "${asset.name}" → ${resolvedPath} (global config)`);
  }

  log.dim('Run `av sync` to download the latest version.');
}

export async function unlinkCommand(slug: string): Promise<void> {
  const config = requireConfig();

  // Try global config first
  const globalIdx = config.userLinks.findIndex((l) => l.assetSlug === slug);
  if (globalIdx !== -1) {
    const removed = config.userLinks.splice(globalIdx, 1)[0];
    writeConfig(config);
    log.success(`Unlinked "${slug}" (was: ${removed.localPath})`);
    log.dim("Local file was not deleted.");
    return;
  }

  // Try project config
  const projectConfigPath = findProjectConfig();
  if (projectConfigPath) {
    const dir = path.dirname(projectConfigPath);
    const projectConfig = readProjectConfig(dir);
    if (projectConfig) {
      const idx = projectConfig.links.findIndex((l) => l.assetSlug === slug);
      if (idx !== -1) {
        const removed = projectConfig.links.splice(idx, 1)[0];
        writeProjectConfig(dir, projectConfig);
        log.success(`Unlinked "${slug}" (was: ${removed.localPath})`);
        log.dim("Local file was not deleted.");
        return;
      }
    }
  }

  log.error(`No link found for "${slug}".`);
  process.exit(1);
}
