import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════
// Cross-Cutting: CLI ↔ Server Parity
// ═══════════════════════════════════════════════════════

describe("CLI ↔ Server INSTALL_PATHS parity", () => {
  const serverConstants = fs.readFileSync(
    path.resolve(__dirname, "../lib/constants.ts"),
    "utf-8"
  );
  const cliInstallPaths = fs.readFileSync(
    path.resolve(__dirname, "../../cli/src/lib/install-paths.ts"),
    "utf-8"
  );

  it("CLI mirrors CLAUDE_CODE SKILL path", () => {
    expect(serverConstants).toContain('SKILL: ".claude/skills"');
    expect(cliInstallPaths).toContain('SKILL: ".claude/skills"');
  });

  it("CLI mirrors CLAUDE_CODE COMMAND path", () => {
    expect(serverConstants).toContain('COMMAND: ".claude/commands"');
    expect(cliInstallPaths).toContain('COMMAND: ".claude/commands"');
  });

  it("CLI mirrors CLAUDE_CODE AGENT path", () => {
    expect(serverConstants).toContain('AGENT: ".claude/agents"');
    expect(cliInstallPaths).toContain('AGENT: ".claude/agents"');
  });

  it("CLI mirrors CURSOR path", () => {
    expect(serverConstants).toContain('CURSOR: { "*": ".cursor/rules" }');
    expect(cliInstallPaths).toContain('CURSOR: { "*": ".cursor/rules" }');
  });

  it("CLI mirrors WINDSURF path", () => {
    expect(serverConstants).toContain('WINDSURF: { "*": ".windsurf/rules" }');
    expect(cliInstallPaths).toContain('WINDSURF: { "*": ".windsurf/rules" }');
  });
});

// ═══════════════════════════════════════════════════════
// Cross-Cutting: API Key Infrastructure
// ═══════════════════════════════════════════════════════

describe("API Key infrastructure alignment", () => {
  it("server API_KEY_PREFIX matches avk_ format", () => {
    const constants = fs.readFileSync(
      path.resolve(__dirname, "../lib/constants.ts"),
      "utf-8"
    );
    expect(constants).toContain('API_KEY_PREFIX = "avk_"');
  });

  it("CLI api-client sends Bearer token in Authorization header", () => {
    const apiClient = fs.readFileSync(
      path.resolve(__dirname, "../../cli/src/lib/api-client.ts"),
      "utf-8"
    );
    expect(apiClient).toContain("Authorization");
    expect(apiClient).toContain("Bearer");
  });

  it("server cli-auth reads Bearer token from Authorization header", () => {
    const cliAuth = fs.readFileSync(
      path.resolve(__dirname, "../lib/cli-auth.ts"),
      "utf-8"
    );
    expect(cliAuth).toContain("authorization");
    expect(cliAuth).toContain("Bearer ");
  });

  it("middleware skips Clerk for /api/cli routes", () => {
    const middleware = fs.readFileSync(
      path.resolve(__dirname, "../middleware.ts"),
      "utf-8"
    );
    expect(middleware).toContain("/api/cli");
    expect(middleware).toContain("isCliRoute");
  });
});

// ═══════════════════════════════════════════════════════
// Cross-Cutting: CLI Tool Structure
// ═══════════════════════════════════════════════════════

describe("CLI tool structure", () => {
  const cliBase = path.resolve(__dirname, "../../cli");

  it("cli/package.json exists", () => {
    expect(fs.existsSync(path.join(cliBase, "package.json"))).toBe(true);
  });

  it("cli/package.json declares av binary", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cliBase, "package.json"), "utf-8")
    );
    expect(pkg.bin).toHaveProperty("av");
  });

  it("cli entry point exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "index.ts"))
    ).toBe(true);
  });

  it("all CLI commands exist", () => {
    const commands = ["login", "init", "link", "status", "push", "pull", "sync", "watch"];
    for (const cmd of commands) {
      const cmdPath = path.join(cliBase, "src", "commands", `${cmd}.ts`);
      expect(fs.existsSync(cmdPath)).toBe(true);
    }
  });

  it("CLI config module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "config.ts"))
    ).toBe(true);
  });

  it("CLI project-config module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "project-config.ts"))
    ).toBe(true);
  });

  it("CLI api-client module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "api-client.ts"))
    ).toBe(true);
  });

  it("CLI watcher module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "watcher.ts"))
    ).toBe(true);
  });

  it("CLI poller module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "poller.ts"))
    ).toBe(true);
  });

  it("CLI conflict module exists", () => {
    expect(
      fs.existsSync(path.join(cliBase, "src", "lib", "conflict.ts"))
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// Cross-Cutting: All CLI API Routes Exist
// ═══════════════════════════════════════════════════════

describe("CLI REST API routes", () => {
  const routeBase = path.resolve(__dirname, "../app/api/cli");

  const routes = [
    { path: "whoami/route.ts", method: "GET" },
    { path: "sync-manifest/route.ts", method: "GET" },
    { path: "assets/[id]/content/route.ts", method: "GET+PUT" },
    { path: "machines/register/route.ts", method: "POST" },
    { path: "sync/route.ts", method: "POST" },
  ];

  for (const route of routes) {
    it(`${route.path} exists`, () => {
      expect(fs.existsSync(path.join(routeBase, route.path))).toBe(true);
    });
  }

  it("all CLI routes use requireApiKeyAuth", () => {
    for (const route of routes) {
      const content = fs.readFileSync(
        path.join(routeBase, route.path),
        "utf-8"
      );
      expect(content).toContain("requireApiKeyAuth");
    }
  });

  it("all CLI routes have rate limiting", () => {
    for (const route of routes) {
      const content = fs.readFileSync(
        path.join(routeBase, route.path),
        "utf-8"
      );
      expect(content).toContain("rateLimit");
    }
  });
});

// ═══════════════════════════════════════════════════════
// Cross-Cutting: Dashboard Completeness
// ═══════════════════════════════════════════════════════

describe("Dashboard sync pages", () => {
  it("sidebar has API Keys link", () => {
    const sidebar = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/sidebar.tsx"),
      "utf-8"
    );
    expect(sidebar).toContain("/dashboard/api-keys");
  });

  it("mobile-sidebar has API Keys link", () => {
    const mobileSidebar = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/mobile-sidebar.tsx"),
      "utf-8"
    );
    expect(mobileSidebar).toContain("/dashboard/api-keys");
  });

  it("machine detail page queries sync state fields", () => {
    const detailPage = fs.readFileSync(
      path.resolve(
        __dirname,
        "../app/dashboard/machines/[id]/page.tsx"
      ),
      "utf-8"
    );
    expect(detailPage).toContain("localHash");
    expect(detailPage).toContain("lastPushAt");
    expect(detailPage).toContain("lastPullAt");
  });

  it("machine-sync-view shows push/pull direction", () => {
    const syncView = fs.readFileSync(
      path.resolve(
        __dirname,
        "../components/machines/machine-sync-view.tsx"
      ),
      "utf-8"
    );
    expect(syncView).toContain("ArrowUp");
    expect(syncView).toContain("ArrowDown");
    expect(syncView).toContain("Pushed");
    expect(syncView).toContain("Pulled");
  });

  it("machines-list shows daemon Active/Inactive badges", () => {
    const machinesList = fs.readFileSync(
      path.resolve(
        __dirname,
        "../components/machines/machines-list.tsx"
      ),
      "utf-8"
    );
    expect(machinesList).toContain("Active");
    expect(machinesList).toContain("Inactive");
    expect(machinesList).toContain("Badge");
  });
});

// ═══════════════════════════════════════════════════════
// Prisma Schema: Sync Fields
// ═══════════════════════════════════════════════════════

describe("Prisma schema sync fields", () => {
  const schema = fs.readFileSync(
    path.resolve(__dirname, "../../prisma/schema.prisma"),
    "utf-8"
  );

  it("MachineSyncState has localHash field", () => {
    expect(schema).toContain("localHash");
  });

  it("MachineSyncState has lastPushAt field", () => {
    expect(schema).toContain("lastPushAt");
  });

  it("MachineSyncState has lastPullAt field", () => {
    expect(schema).toContain("lastPullAt");
  });

  it("ApiKey model exists", () => {
    expect(schema).toContain("model ApiKey");
  });

  it("ApiKey has hashedKey unique field", () => {
    expect(schema).toContain("hashedKey");
    expect(schema).toContain("@unique");
  });
});
