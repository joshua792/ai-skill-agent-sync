import * as fs from "fs";
import * as path from "path";
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
import { decideSyncAction } from "../lib/conflict.js";
import * as log from "../lib/logger.js";

export async function pullCommand(slug?: string): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);
  const client = new ApiClient(config.serverUrl, config.apiKey);

  const projectConfigPath = findProjectConfig();
  const projectDir = projectConfigPath
    ? path.dirname(projectConfigPath)
    : null;
  const projectConfig =
    projectDir ? readProjectConfig(projectDir) ?? { links: [] } : { links: [] };

  const allLinks: { link: LinkEntry; source: "global" | "project" }[] = [
    ...config.userLinks.map((l) => ({ link: l, source: "global" as const })),
    ...projectConfig.links.map((l) => ({ link: l, source: "project" as const })),
  ];

  const targets = slug
    ? allLinks.filter((e) => e.link.assetSlug === slug)
    : allLinks;

  if (targets.length === 0) {
    if (slug) {
      log.error(`No link found for "${slug}".`);
    } else {
      log.info("No assets linked.");
    }
    return;
  }

  const { assets } = await client.syncManifest(machineId);
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  let pulled = 0;

  for (const { link } of targets) {
    const asset = assetMap.get(link.assetId);
    if (!asset) {
      log.warn(`Skipping ${link.assetSlug}: asset not found on server.`);
      continue;
    }

    if (asset.storageType === "BUNDLE") {
      if (slug) {
        log.warn(
          `${link.assetSlug} is a BUNDLE asset. Download from: ${asset.syncState?.installPath ?? "web UI"}`
        );
      }
      continue;
    }

    const serverVersionChanged =
      link.lastSyncedVersion !== "" &&
      asset.currentVersion !== link.lastSyncedVersion;
    const notSynced = link.lastSyncedVersion === "";

    if (!serverVersionChanged && !notSynced && !slug) {
      continue; // Already up to date
    }

    // Check for local changes (conflict detection)
    let localHashChanged = false;
    let localMtime = new Date(0);
    if (fs.existsSync(link.localPath)) {
      const localContent = fs.readFileSync(link.localPath, "utf-8");
      const currentHash = hashContent(localContent);
      localHashChanged = link.lastHash !== "" && currentHash !== link.lastHash;
      localMtime = fs.statSync(link.localPath).mtime;
    }

    if (localHashChanged && serverVersionChanged) {
      const decision = decideSyncAction(
        true,
        true,
        localMtime,
        new Date(asset.updatedAt)
      );

      if (decision === "conflict-push") {
        log.warn(
          `Conflict: ${link.assetSlug} — local is newer, skipping pull. Run \`av push ${link.assetSlug}\` instead.`
        );
        continue;
      }
      log.warn(
        `Conflict: ${link.assetSlug} — server is newer, overwriting local.`
      );
    }

    log.info(`Pulling ${link.assetSlug}...`);

    try {
      const assetContent = await client.getAssetContent(link.assetId);

      if (assetContent.type === "BUNDLE") {
        log.warn(
          `${link.assetSlug} is BUNDLE. URL: ${assetContent.bundleUrl}`
        );
        continue;
      }

      // Ensure parent directory exists
      const dir = path.dirname(link.localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(link.localPath, assetContent.content ?? "", "utf-8");

      link.lastHash = hashContent(assetContent.content ?? "");
      link.lastSyncedVersion = assetContent.version;
      pulled++;

      // Report sync to server
      await client.reportSync({
        machineId,
        assetId: link.assetId,
        syncedVersion: assetContent.version,
        localHash: link.lastHash,
        direction: "pull",
      });

      log.success(`Pulled ${link.assetSlug} → v${assetContent.version}`);
    } catch (err) {
      log.error(
        `Failed to pull ${link.assetSlug}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  writeConfig(config);
  if (projectDir) {
    writeProjectConfig(projectDir, projectConfig);
  }

  if (pulled === 0 && !slug) {
    log.info("All assets up to date.");
  } else if (pulled > 0) {
    log.info(`Pulled ${pulled} asset(s).`);
  }
}
