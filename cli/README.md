# AssetVault CLI (`av`)

A lightweight command-line tool for bidirectional sync of AI skills, commands, and agents between your local machine and AssetVault.

## Installation

```bash
# From the monorepo root
pnpm install
cd cli && pnpm build

# Or install globally
npm install -g @assetvault/cli
```

## Quick Start

```bash
# 1. Authenticate with your API key (generate one at /dashboard/api-keys)
av login

# 2. Register this machine
av init

# 3. Link an asset to a local file
av link my-skill

# 4. Sync all linked assets
av sync

# 5. Start the watch daemon for real-time sync
av watch
```

## Commands

### `av login`
Authenticate with your AssetVault account using an API key. Generate a key from the web dashboard under **Dashboard > API Keys**.

```bash
av login
# Prompts for API key and server URL
```

### `av init`
Register the current machine with AssetVault. Generates a unique machine identifier automatically.

```bash
av init
# Prompts for machine name (e.g., "Work Laptop")
```

### `av link <slug> [path]`
Link an asset to a local file path. If no path is provided, the CLI auto-detects the correct location based on the asset's platform and type (e.g., `.claude/skills/` for Claude Code skills).

```bash
# Auto-detect path
av link my-coding-skill

# Explicit path
av link my-skill ~/.claude/skills/my-skill.md

# Project-scoped (from within a project directory)
av link project-rules .claude/skills/rules.md
```

### `av status`
Show sync status of all linked assets. Compares local file hashes against server versions.

```bash
av status
```

### `av push [slug]`
Push local changes to AssetVault. Automatically bumps the patch version and creates an AssetVersion snapshot.

```bash
# Push all changed assets
av push

# Push a specific asset
av push my-skill
```

### `av pull [slug]`
Pull updates from AssetVault. Detects conflicts when both local and server have changed (last-write-wins resolution).

```bash
# Pull all outdated assets
av pull

# Pull a specific asset
av pull my-skill
```

### `av sync`
Push all local changes, then pull all server updates in one operation.

```bash
av sync
```

### `av watch`
Start the watch daemon for real-time bidirectional sync. Watches linked files for local changes and polls the server for updates.

```bash
av watch
```

Resource usage:
- Uses kernel-level file notifications (`fs.watch`) — near-zero CPU
- One HTTP request per poll interval (default: 30 seconds)
- ~30-50 MB RAM baseline

Stop with `Ctrl+C` for graceful shutdown.

## Configuration

### Global Config (`~/.assetvault/config.json`)
Stores authentication and user-scoped asset links.

```json
{
  "apiKey": "avk_...",
  "serverUrl": "https://assetvault.dev",
  "machineId": "...",
  "machineName": "Work Laptop",
  "syncInterval": 30,
  "userLinks": []
}
```

### Project Config (`.assetvault.json`)
Stores project-scoped asset links. Created in the project root when linking PROJECT-scoped assets.

```json
{
  "links": [
    {
      "assetId": "...",
      "assetSlug": "my-skill",
      "localPath": ".claude/skills/my-skill.md",
      "lastHash": "sha256...",
      "lastSyncedVersion": "1.0.3"
    }
  ]
}
```

## Conflict Resolution

The CLI uses **last-write-wins** conflict resolution:
- If only local changed: push
- If only server changed: pull
- If both changed: compare timestamps — most recent wins
- Equal timestamps: server wins

## Supported Platforms

The CLI auto-detects install paths for:

| Platform | Skill | Command | Agent |
|----------|-------|---------|-------|
| Claude Code | `.claude/skills/` | `.claude/commands/` | `.claude/agents/` |
| Cursor | `.cursor/rules/` | `.cursor/rules/` | `.cursor/rules/` |
| Windsurf | `.windsurf/rules/` | `.windsurf/rules/` | `.windsurf/rules/` |
| Aider | `.aider/` | `.aider/` | `.aider/` |
