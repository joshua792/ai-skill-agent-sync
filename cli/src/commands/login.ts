import * as readline from "readline";
import { ApiClient } from "../lib/api-client.js";
import { writeConfig, readConfig, type GlobalConfig } from "../lib/config.js";
import * as log from "../lib/logger.js";

function prompt(question: string, mask = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (mask && process.stdin.isTTY) {
      // Hide input for API key
      process.stdout.write(question);
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf-8");

      let input = "";
      const onData = (char: string) => {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          rl.close();
          process.stdout.write("\n");
          resolve(input);
        } else if (char === "\u007F" || char === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char === "\u0003") {
          // Ctrl+C
          process.exit(0);
        } else {
          input += char;
          process.stdout.write("*");
        }
      };
      stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export async function loginCommand(): Promise<void> {
  log.info("Login to AssetVault CLI\n");

  const apiKey = await prompt("API Key: ", true);
  if (!apiKey) {
    log.error("API key is required");
    process.exit(1);
  }

  const serverUrl = await prompt(
    "Server URL (press Enter for http://localhost:3000): "
  );

  const url = serverUrl || "http://localhost:3000";

  log.info("Validating API key...");

  const client = new ApiClient(url, apiKey);

  try {
    const { user, machine } = await client.whoami();

    const existing = readConfig();
    const config: GlobalConfig = {
      apiKey,
      serverUrl: url,
      machineId: machine?.id ?? existing?.machineId ?? null,
      machineName: machine?.name ?? existing?.machineName ?? null,
      syncInterval: existing?.syncInterval ?? 30,
      userLinks: existing?.userLinks ?? [],
    };

    writeConfig(config);

    log.success(`Logged in as ${user.username} (${user.email})`);
    if (machine) {
      log.info(`Bound to machine: ${machine.name}`);
    } else {
      log.dim('Run `av init` to register this machine.');
    }
  } catch (err) {
    log.error(
      `Authentication failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    process.exit(1);
  }
}
