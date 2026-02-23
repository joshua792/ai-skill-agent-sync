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
  const linkedDirs = new Set<string>();
  for (const link of allLinks) {
    const dir = path.dirname(link.localPath);
    linkedDirs.add(dir);
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

    // List files in the directory
    const files = fs.readdirSync(dir).filter((f) => {
      const fullPath = path.join(dir, f);
      return fs.statSync(fullPath).isFile() && !linkedPaths.has(fullPath);
    });

    if (files.length === 0) continue;

    log.info(`Found ${files.length} new file(s) in ${dir}`);

    for (const fileName of files) {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, "utf-8");
      const fileHash = hashContent(content);

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
