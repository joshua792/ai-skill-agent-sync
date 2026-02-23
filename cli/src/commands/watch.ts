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
import { FileWatcher } from "../lib/watcher.js";
import { ServerPoller } from "../lib/poller.js";
import { decideSyncAction } from "../lib/conflict.js";
import * as log from "../lib/logger.js";

export async function watchCommand(): Promise<void> {
  const config = requireConfig();
  const machineId = requireMachine(config);
  const client = new ApiClient(config.serverUrl, config.apiKey);

  const watcher = new FileWatcher();
  const poller = new ServerPoller();

  // Gather all links
  const projectConfigPath = findProjectConfig();
  const projectDir = projectConfigPath
    ? path.dirname(projectConfigPath)
    : null;

  function getAllLinks(): { link: LinkEntry; source: "global" | "project" }[] {
    const projectConfig =
      projectDir
        ? readProjectConfig(projectDir) ?? { links: [] }
        : { links: [] };
    return [
      ...config.userLinks.map((l) => ({ link: l, source: "global" as const })),
      ...projectConfig.links.map((l) => ({ link: l, source: "project" as const })),
    ];
  }

  function saveConfigs() {
    writeConfig(config);
    if (projectDir) {
      const pc = readProjectConfig(projectDir) ?? { links: [] };
      writeProjectConfig(projectDir, pc);
    }
  }

  // Push handler for a single link
  async function pushLink(link: LinkEntry) {
    if (!fs.existsSync(link.localPath)) return;

    const content = fs.readFileSync(link.localPath, "utf-8");
    const currentHash = hashContent(content);
    if (currentHash === link.lastHash) return;

    log.info(`[push] ${link.assetSlug}...`);
    try {
      const result = await client.putAssetContent(link.assetId, {
        content,
        localHash: currentHash,
        machineId,
      });
      link.lastHash = currentHash;
      link.lastSyncedVersion = result.version;
      saveConfigs();
      log.success(`[push] ${link.assetSlug} → v${result.version}`);
    } catch (err) {
      log.error(
        `[push] ${link.assetSlug} failed: ${err instanceof Error ? err.message : "Unknown"}`
      );
    }
  }

  // Pull handler for all links
  async function pullAll() {
    const links = getAllLinks();
    if (links.length === 0) return;

    let pulled = 0;
    try {
      const { assets } = await client.syncManifest(machineId);
      const assetMap = new Map(assets.map((a) => [a.id, a]));

      for (const { link } of links) {
        const asset = assetMap.get(link.assetId);
        if (!asset || asset.storageType === "BUNDLE") continue;

        const serverVersionChanged =
          link.lastSyncedVersion !== "" &&
          asset.currentVersion !== link.lastSyncedVersion;
        const notSynced = link.lastSyncedVersion === "";

        if (!serverVersionChanged && !notSynced) continue;

        // Check for conflict
        let localHashChanged = false;
        let localMtime = new Date(0);
        if (fs.existsSync(link.localPath)) {
          const localContent = fs.readFileSync(link.localPath, "utf-8");
          const currentHash = hashContent(localContent);
          localHashChanged =
            link.lastHash !== "" && currentHash !== link.lastHash;
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
              `[conflict] ${link.assetSlug}: local is newer, skipping pull`
            );
            continue;
          }
          log.warn(
            `[conflict] ${link.assetSlug}: server is newer, overwriting local`
          );
        }

        try {
          const assetContent = await client.getAssetContent(link.assetId);
          if (assetContent.type === "BUNDLE") continue;

          const dir = path.dirname(link.localPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Temporarily unwatch to avoid triggering push
          watcher.unwatch(link.localPath);
          fs.writeFileSync(link.localPath, assetContent.content ?? "", "utf-8");

          link.lastHash = hashContent(assetContent.content ?? "");
          link.lastSyncedVersion = assetContent.version;
          pulled++;

          await client.reportSync({
            machineId,
            assetId: link.assetId,
            syncedVersion: assetContent.version,
            localHash: link.lastHash,
            direction: "pull",
          });

          log.success(`[pull] ${link.assetSlug} → v${assetContent.version}`);

          // Re-establish watch
          watcher.watch(link.localPath, () => pushLink(link));
        } catch (err) {
          log.error(
            `[pull] ${link.assetSlug} failed: ${err instanceof Error ? err.message : "Unknown"}`
          );
        }
      }

      if (pulled > 0) saveConfigs();
    } catch (err) {
      log.error(
        `[poll] Failed: ${err instanceof Error ? err.message : "Unknown"}`
      );
    }
  }

  // Set up file watchers for all linked files
  const links = getAllLinks();
  for (const { link } of links) {
    if (fs.existsSync(link.localPath)) {
      watcher.watch(link.localPath, () => pushLink(link));
    }
  }

  // Scan for new files in linked directories and auto-link+push them
  async function scanAndLinkNewFiles() {
    const currentLinks = getAllLinks();
    const linkedPaths = new Set(
      currentLinks.map((e) => path.resolve(e.link.localPath))
    );

    // Collect unique directories from linked files
    const dirs = new Set<string>();
    for (const { link } of currentLinks) {
      dirs.add(path.dirname(link.localPath));
    }

    const { inferTypeFromPath, inferProjectName } = await import(
      "../lib/install-paths.js"
    );

    for (const dir of dirs) {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

      const inferred = inferTypeFromPath(dir);
      if (!inferred) continue;

      const { platform, type } = inferred;
      const projectName = inferProjectName(dir);

      const newFiles = fs.readdirSync(dir).filter((f) => {
        const fullPath = path.join(dir, f);
        return fs.statSync(fullPath).isFile() && !linkedPaths.has(fullPath);
      });

      for (const fileName of newFiles) {
        const filePath = path.join(dir, fileName);
        const content = fs.readFileSync(filePath, "utf-8");
        const fileHash = hashContent(content);

        const assetName = projectName
          ? `${projectName} - ${fileName.replace(/\.[^.]+$/, "")}`
          : fileName.replace(/\.[^.]+$/, "");

        log.info(`[new] Creating asset: "${assetName}"`);
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

          // Add to project config
          const pc = projectDir
            ? readProjectConfig(projectDir) ?? { links: [] }
            : null;
          if (pc && projectDir) {
            pc.links = pc.links.filter((l) => l.assetId !== newAsset.id);
            pc.links.push(entry);
            writeProjectConfig(projectDir, pc);
          }

          // Watch the new file
          watcher.watch(filePath, () => pushLink(entry));
          linkedPaths.add(filePath);

          log.success(`[new] Linked "${newAsset.name}" → ${filePath}`);
        } catch (err) {
          log.error(
            `[new] Failed: ${fileName}: ${err instanceof Error ? err.message : "Unknown"}`
          );
        }
      }
    }
  }

  // Combined poll: scan for new files then pull updates
  async function pollCycle() {
    await scanAndLinkNewFiles();
    await pullAll();
  }

  // Start polling for server updates (also scans for new files)
  const pollIntervalMs = (config.syncInterval || 30) * 1000;
  poller.start(pollIntervalMs, pollCycle);

  log.success(
    `Watching ${watcher.watchCount} file(s), polling every ${config.syncInterval || 30}s`
  );
  log.dim("Press Ctrl+C to stop.\n");

  // Graceful shutdown
  function shutdown() {
    log.info("\nShutting down...");
    watcher.unwatchAll();
    poller.stop();
    log.info("Sync daemon stopped.");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive
  await new Promise(() => {});
}
