export interface WhoAmIResponse {
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
  };
  machine: {
    id: string;
    name: string;
    machineIdentifier: string;
  } | null;
}

export interface SyncManifestAsset {
  id: string;
  slug: string;
  name: string;
  type: string;
  primaryPlatform: string;
  currentVersion: string;
  storageType: string;
  primaryFileName: string;
  installScope: string;
  updatedAt: string;
  syncState: {
    syncedVersion: string;
    localHash: string | null;
    installPath: string | null;
    lastPushAt: string | null;
    lastPullAt: string | null;
    syncedAt: string;
  } | null;
}

export interface SyncManifestResponse {
  machine: { id: string; name: string; machineIdentifier: string };
  assets: SyncManifestAsset[];
}

export interface AssetContentResponse {
  type: "INLINE" | "BUNDLE";
  content?: string;
  bundleUrl?: string;
  version: string;
  primaryFileName: string;
  updatedAt: string;
}

export interface PutContentResponse {
  version: string;
}

export interface CreateAssetRequest {
  name: string;
  content: string;
  type: "SKILL" | "COMMAND" | "AGENT";
  primaryPlatform: string;
  primaryFileName: string;
  installScope: "USER" | "PROJECT";
  machineId: string;
}

export interface CreateAssetResponse {
  id: string;
  slug: string;
  name: string;
  currentVersion: string;
  primaryFileName: string;
  type: string;
  primaryPlatform: string;
  installScope: string;
}

export interface RegisterMachineResponse {
  id: string;
  name: string;
  machineIdentifier: string;
}

export class ApiClient {
  constructor(
    private serverUrl: string,
    private apiKey: string
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return res.json() as Promise<T>;
  }

  async whoami(): Promise<WhoAmIResponse> {
    return this.request("GET", "/api/cli/whoami");
  }

  async syncManifest(machineId: string): Promise<SyncManifestResponse> {
    return this.request(
      "GET",
      `/api/cli/sync-manifest?machineId=${encodeURIComponent(machineId)}`
    );
  }

  async getAssetContent(assetId: string): Promise<AssetContentResponse> {
    return this.request("GET", `/api/cli/assets/${assetId}/content`);
  }

  async putAssetContent(
    assetId: string,
    body: { content: string; localHash: string; machineId: string }
  ): Promise<PutContentResponse> {
    return this.request("PUT", `/api/cli/assets/${assetId}/content`, body);
  }

  async registerMachine(
    name: string,
    machineIdentifier: string
  ): Promise<RegisterMachineResponse> {
    return this.request("POST", "/api/cli/machines/register", {
      name,
      machineIdentifier,
    });
  }

  async createAsset(body: CreateAssetRequest): Promise<CreateAssetResponse> {
    return this.request("POST", "/api/cli/assets", body);
  }

  async reportSync(body: {
    machineId: string;
    assetId: string;
    syncedVersion: string;
    localHash?: string;
    installPath?: string;
    direction: "push" | "pull";
  }): Promise<void> {
    await this.request("POST", "/api/cli/sync", body);
  }
}
