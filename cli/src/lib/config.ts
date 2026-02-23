import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface LinkEntry {
  assetId: string;
  assetSlug: string;
  localPath: string;
  lastHash: string;
  lastSyncedVersion: string;
}

export interface GlobalConfig {
  apiKey: string;
  serverUrl: string;
  machineId: string | null;
  machineName: string | null;
  syncInterval: number;
  userLinks: LinkEntry[];
}

const CONFIG_DIR_NAME = ".assetvault";
const CONFIG_FILE_NAME = "config.json";

export function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

export function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readConfig(): GlobalConfig | null {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as GlobalConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: GlobalConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  // Best-effort: restrict file permissions on Unix
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {
    // Ignore on Windows or if permissions can't be set
  }
}

export function requireConfig(): GlobalConfig {
  const config = readConfig();
  if (!config) {
    console.error("Not logged in. Run `av login` first.");
    process.exit(1);
  }
  return config;
}

export function requireMachine(config: GlobalConfig): string {
  if (!config.machineId) {
    console.error("No machine registered. Run `av init` first.");
    process.exit(1);
  }
  return config.machineId;
}
