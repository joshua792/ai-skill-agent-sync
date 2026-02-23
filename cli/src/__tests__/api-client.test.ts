import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../lib/api-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient("https://assetvault.dev", "avk_testkey123456789012345678");
  });

  it("whoami sends correct Authorization header", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ user: { id: "u1" }, machine: null })
    );
    await client.whoami();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assetvault.dev/api/cli/whoami",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer avk_testkey123456789012345678",
        }),
      })
    );
  });

  it("whoami throws on 401", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ error: "Unauthorized" }, 401)
    );
    await expect(client.whoami()).rejects.toThrow("Unauthorized");
  });

  it("syncManifest includes machineId query param", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ machine: {}, assets: [] })
    );
    await client.syncManifest("m123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assetvault.dev/api/cli/sync-manifest?machineId=m123",
      expect.anything()
    );
  });

  it("getAssetContent uses GET method", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ type: "INLINE", content: "hello" })
    );
    await client.getAssetContent("asset_1");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assetvault.dev/api/cli/assets/asset_1/content",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("putAssetContent uses PUT method with JSON body", async () => {
    mockFetch.mockResolvedValue(mockResponse({ version: "1.0.1" }));
    await client.putAssetContent("asset_1", {
      content: "updated",
      localHash: "abc",
      machineId: "m1",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assetvault.dev/api/cli/assets/asset_1/content",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          content: "updated",
          localHash: "abc",
          machineId: "m1",
        }),
      })
    );
  });

  it("registerMachine sends name and identifier", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ id: "m1", name: "Test", machineIdentifier: "test-abc" })
    );
    await client.registerMachine("Test", "test-abc");
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({ name: "Test", machineIdentifier: "test-abc" });
  });

  it("reportSync sends POST", async () => {
    mockFetch.mockResolvedValue(mockResponse({ success: true }));
    await client.reportSync({
      machineId: "m1",
      assetId: "a1",
      syncedVersion: "1.0.0",
      direction: "push",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assetvault.dev/api/cli/sync",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("non-2xx responses throw descriptive errors", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ error: "Rate limited" }, 429)
    );
    await expect(client.whoami()).rejects.toThrow("Rate limited");
  });
});
