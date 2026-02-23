import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("API Key UI Contracts", () => {
  const pagePath = path.resolve(
    __dirname,
    "../app/dashboard/api-keys/page.tsx"
  );
  const loadingPath = path.resolve(
    __dirname,
    "../app/dashboard/api-keys/loading.tsx"
  );
  const managerPath = path.resolve(
    __dirname,
    "../components/api-keys/api-key-manager.tsx"
  );
  const sidebarPath = path.resolve(
    __dirname,
    "../components/layout/sidebar.tsx"
  );
  const mobileSidebarPath = path.resolve(
    __dirname,
    "../components/layout/mobile-sidebar.tsx"
  );

  it("api-keys page exists", () => {
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("api-keys page imports currentUser for auth", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("currentUser");
  });

  it("api-keys page calls listApiKeys", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("listApiKeys");
  });

  it("api-key-manager is a client component", () => {
    const content = fs.readFileSync(managerPath, "utf-8");
    expect(content.startsWith('"use client"')).toBe(true);
  });

  it("api-key-manager imports createApiKeyAction and revokeApiKeyAction", () => {
    const content = fs.readFileSync(managerPath, "utf-8");
    expect(content).toContain("createApiKeyAction");
    expect(content).toContain("revokeApiKeyAction");
  });

  it("api-key-manager has copy-to-clipboard functionality", () => {
    const content = fs.readFileSync(managerPath, "utf-8");
    expect(content).toContain("clipboard");
  });

  it("api-key-manager shows prefix not full key in list", () => {
    const content = fs.readFileSync(managerPath, "utf-8");
    expect(content).toContain("prefix");
  });

  it("loading.tsx exists for api-keys page", () => {
    expect(fs.existsSync(loadingPath)).toBe(true);
  });

  it("sidebar includes /dashboard/api-keys href", () => {
    const content = fs.readFileSync(sidebarPath, "utf-8");
    expect(content).toContain("/dashboard/api-keys");
  });

  it("mobile-sidebar includes /dashboard/api-keys href", () => {
    const content = fs.readFileSync(mobileSidebarPath, "utf-8");
    expect(content).toContain("/dashboard/api-keys");
  });
});
