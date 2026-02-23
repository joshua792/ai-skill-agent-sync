import * as fs from "fs";
import * as path from "path";
import { pushCommand } from "./push.js";
import { pullCommand } from "./pull.js";
import { ApiClient } from "../lib/api-client.js";
import {
  requireConfig,
  requireMachine,
  type LinkEntry,
} from "../lib/config.js";
import {
  findProjectConfig,
  readProjectConfig,
  writeProjectConfig,
} from "../lib/project-config.js";
import { hashContent } from "../lib/hash.js";
import { inferTypeFromPath, inferProjectName } from "../lib/install-paths.js";
import * as log from "../lib/logger.js";

export async function syncCommand(): Promise<void> {
  log.info("Syncing...\n");

  // Scan linked directories for new (unlinked) files
  log.info("── Scan for new files ──");
  await scanForNewFiles();

  console.log("");

  log.info("── Push local changes ──");
  await pushCommand();

  console.log("");

  log.info("── Pull server updates ──");
  await pullCommand();

  console.log("");
  log.success("Sync complete.");
}

/**
 * Scan directories that contain linked files for any new unlinked files.
 * Auto-creates assets on the server and links them.
 */
async function scanForNewFiles(): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);
  const client = new ApiClient(config.serverUrl, config.apiKey);

  const projectConfigPath = findProjectConfig();
  const projectDir = projectConfigPath
    ? path.dirname(projectConfigPath)
    : null;
  const projectConfig =
    projectDir ? readProjectConfig(projectDir) ?? { links: [] } : { links: [] };

  const allLinks: LinkEntry[] = [
    ...config.userLinks,
    ...projectConfig.links,
  ];

  if (allLinks.length === 0) {
    log.info("No linked assets. Nothing to scan.");
    return;
  }

  // Collect unique directories from existing links
  // Include parent dirs to catch sibling subdirectory skills (e.g., if we link skills/deploy/SKILL.md,
  // also scan skills/ to find skills/review/SKILL.md)
  const linkedDirs = new Set<string>();
  for (const link of allLinks) {
    const dir = path.dirname(link.localPath);
    linkedDirs.add(dir);
    // Also add the parent dir if this looks like a subdirectory skill
    const parentDir = path.dirname(dir);
    if (inferTypeFromPath(parentDir)) {
      linkedDirs.add(parentDir);
    }
  }

  // Build set of already-linked file paths for quick lookup
  const linkedPaths = new Set(
    allLinks.map((l) => path.resolve(l.localPath))
  );

  let created = 0;

  for (const dir of linkedDirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

    const inferred = inferTypeFromPath(dir);
    if (!inferred) continue;

    const { platform, type } = inferred;
    const projectName = inferProjectName(dir);

    // List files in the directory (including subdirectory patterns like skills/deploy/SKILL.md)
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      const stat = fs.statSync(entryPath);
      if (stat.isFile() && !linkedPaths.has(entryPath)) {
        files.push(entry);
      } else if (stat.isDirectory()) {
        const subFiles = fs.readdirSync(entryPath).filter((f) => {
          const subPath = path.join(entryPath, f);
          return fs.statSync(subPath).isFile() && f.endsWith(".md") && !linkedPaths.has(subPath);
        });
        for (const subFile of subFiles) {
          files.push(path.join(entry, subFile));
        }
      }
    }

    if (files.length === 0) continue;

    log.info(`Found ${files.length} new file(s) in ${dir}`);

    for (const fileName of files) {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, "utf-8");
      const fileHash = hashContent(content);

      // For subdirectory skills (deploy/SKILL.md), use the subdir name as display name
      const isSubdirFile = fileName.includes(path.sep) || fileName.includes("/");
      const displayName = isSubdirFile
        ? fileName.split(/[/\\]/)[0]
        : fileName.replace(/\.[^.]+$/, "");

      const assetName = projectName
        ? `${projectName} - ${displayName}`
        : displayName;

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

        const entry: LinkEntry = {
          assetId: newAsset.id,
          assetSlug: newAsset.slug,
          localPath: filePath,
          lastHash: fileHash,
          lastSyncedVersion: newAsset.currentVersion,
        };

        projectConfig.links = projectConfig.links.filter(
          (l) => l.assetId !== newAsset.id
        );
        projectConfig.links.push(entry);
        created++;

        log.success(`  Linked "${newAsset.name}" → ${filePath}`);
      } catch (err) {
        log.error(
          `  Failed to create asset for ${fileName}: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }
  }

  if (projectDir && created > 0) {
    writeProjectConfig(projectDir, projectConfig);
  }

  if (created > 0) {
    log.info(`Auto-linked ${created} new file(s).`);
  } else {
    log.info("No new files found.");
  }
}
