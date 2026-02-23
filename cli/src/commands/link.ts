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
import {
  getDefaultInstallSubdir,
  inferTypeFromPath,
  inferProjectName,
} from "../lib/install-paths.js";
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

export async function linkAllCommand(dir: string): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);
  const client = new ApiClient(config.serverUrl, config.apiKey);

  const resolvedDir = path.resolve(dir);

  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    log.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  // Infer platform + type from the directory path
  const inferred = inferTypeFromPath(resolvedDir);
  if (!inferred) {
    log.error(
      `Could not infer asset type from path "${resolvedDir}".\n` +
      `Supported directories: .claude/skills, .claude/commands, .claude/agents, .cursor/rules, .windsurf/rules, .aider`
    );
    process.exit(1);
  }

  const projectName = inferProjectName(resolvedDir);
  const { platform, type } = inferred;

  log.info(`Scanning ${resolvedDir}`);
  log.info(`Detected: platform=${platform}, type=${type}${projectName ? `, project=${projectName}` : ""}`);

  // Scan directory for files
  const files = fs.readdirSync(resolvedDir).filter((f) => {
    const fullPath = path.join(resolvedDir, f);
    return fs.statSync(fullPath).isFile();
  });

  if (files.length === 0) {
    log.warn("No files found in directory.");
    return;
  }

  log.info(`Found ${files.length} file(s): ${files.join(", ")}`);

  // Fetch existing assets to avoid duplicates
  const { assets: existingAssets } = await client.syncManifest(machineId);
  const existingByFile = new Map(
    existingAssets.map((a) => [a.primaryFileName, a])
  );

  let created = 0;
  let linked = 0;
  let skipped = 0;

  // Determine project root (parent of .claude/, .cursor/, etc.)
  const normalized = resolvedDir.replace(/\\/g, "/");
  const markers = [".claude/", ".cursor/", ".windsurf/", ".aider"];
  let projectRoot = process.cwd();
  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx > 0) {
      projectRoot = normalized.substring(0, idx);
      break;
    }
  }
  const normalizedRoot = path.resolve(projectRoot);

  const projectConfig = readProjectConfig(normalizedRoot) ?? { links: [] };

  for (const fileName of files) {
    const filePath = path.join(resolvedDir, fileName);
    const content = fs.readFileSync(filePath, "utf-8");
    const fileHash = hashContent(content);

    // Check if already linked by path
    const alreadyLinked = projectConfig.links.some(
      (l) => path.resolve(l.localPath) === filePath
    ) || config.userLinks.some(
      (l) => path.resolve(l.localPath) === filePath
    );

    if (alreadyLinked) {
      log.dim(`  Skipping ${fileName} (already linked)`);
      skipped++;
      continue;
    }

    // Check if asset already exists on server (match by filename)
    let asset = existingByFile.get(fileName);

    if (!asset) {
      // Create asset on server
      const assetName = projectName
        ? `${projectName} - ${fileName.replace(/\.[^.]+$/, "")}`
        : fileName.replace(/\.[^.]+$/, "");

      log.info(`  Creating asset: "${assetName}"`);
      try {
        const newAsset = await client.createAsset({
          name: assetName,
          content,
          type: type as "SKILL" | "COMMAND" | "AGENT",
          primaryPlatform: platform,
          primaryFileName: fileName,
          installScope: "PROJECT",
          machineId,
        });

        asset = {
          id: newAsset.id,
          slug: newAsset.slug,
          name: newAsset.name,
          type: newAsset.type,
          primaryPlatform: newAsset.primaryPlatform,
          currentVersion: newAsset.currentVersion,
          storageType: "INLINE",
          primaryFileName: newAsset.primaryFileName,
          installScope: newAsset.installScope,
          updatedAt: new Date().toISOString(),
          syncState: null,
        };
        created++;
      } catch (err) {
        log.error(`  Failed to create asset for ${fileName}: ${err}`);
        continue;
      }
    }

    // Link it
    const entry: LinkEntry = {
      assetId: asset.id,
      assetSlug: asset.slug,
      localPath: filePath,
      lastHash: fileHash,
      lastSyncedVersion: asset.currentVersion,
    };

    projectConfig.links = projectConfig.links.filter(
      (l) => l.assetId !== asset!.id
    );
    projectConfig.links.push(entry);
    linked++;
    log.success(`  Linked "${asset.name}" → ${filePath}`);
  }

  writeProjectConfig(normalizedRoot, projectConfig);

  log.info("");
  log.success(
    `Done! Created ${created} asset(s), linked ${linked}, skipped ${skipped}.`
  );
  if (linked > 0) {
    log.dim('Run `av sync` to push content, or `av watch` to start the daemon.');
  }
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
