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
import * as log from "../lib/logger.js";

export async function pushCommand(slug?: string): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);
  const client = new ApiClient(config.serverUrl, config.apiKey);

  // Gather all links
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

  // Filter to specific slug if provided
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

  let pushed = 0;

  for (const { link, source } of targets) {
    if (!fs.existsSync(link.localPath)) {
      log.warn(`Skipping ${link.assetSlug}: file not found (${link.localPath})`);
      continue;
    }

    const content = fs.readFileSync(link.localPath, "utf-8");
    const currentHash = hashContent(content);

    if (currentHash === link.lastHash && !slug) {
      continue; // No changes, skip unless explicitly pushed
    }

    log.info(`Pushing ${link.assetSlug}...`);

    try {
      const result = await client.putAssetContent(link.assetId, {
        content,
        localHash: currentHash,
        machineId,
      });

      link.lastHash = currentHash;
      link.lastSyncedVersion = result.version;
      pushed++;

      log.success(`Pushed ${link.assetSlug} → v${result.version}`);
    } catch (err) {
      log.error(
        `Failed to push ${link.assetSlug}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  // Save updated configs
  writeConfig(config);
  if (projectDir) {
    writeProjectConfig(projectDir, projectConfig);
  }

  if (pushed === 0 && !slug) {
    log.info("No local changes to push.");
  } else {
    log.info(`Pushed ${pushed} asset(s).`);
  }
}
