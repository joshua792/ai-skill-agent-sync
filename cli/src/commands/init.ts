import * as os from "os";
import * as readline from "readline";
import { ApiClient } from "../lib/api-client.js";
import { requireConfig, writeConfig } from "../lib/config.js";
import * as log from "../lib/logger.js";

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function generateIdentifier(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : suffix;
}

export async function initCommand(): Promise<void> {
  const config = requireConfig();

  if (config.machineId) {
    log.warn(`Machine already registered: ${config.machineName} (${config.machineId})`);
    const answer = await prompt("Re-register? (y/N): ");
    if (answer.toLowerCase() !== "y") {
      return;
    }
  }

  const defaultName = os.hostname();
  const name = (await prompt(`Machine name (${defaultName}): `)) || defaultName;
  const identifier = generateIdentifier(name);

  log.info(`Registering machine "${name}" (${identifier})...`);

  const client = new ApiClient(config.serverUrl, config.apiKey);

  try {
    const machine = await client.registerMachine(name, identifier);

    config.machineId = machine.id;
    config.machineName = machine.name;
    writeConfig(config);

    log.success(`Machine registered: ${machine.name} (${machine.machineIdentifier})`);
    log.dim('Run `av link <asset-slug>` to link assets for syncing.');
  } catch (err) {
    log.error(
      `Registration failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    process.exit(1);
  }
}
