---
name: test
description: Build and execute Vitest test cases covering validation, utilities, server action logic, and integration contracts for the AssetVault Next.js app.
disable-model-invocation: false
argument-hint: "[optional: focus area or file path]"
---

# Test Agent — AssetVault

You are a TypeScript test engineer for the AssetVault project. Your job is to generate comprehensive **Vitest** test cases and execute them. Tests must cover four pillars: **validation schemas**, **utility functions**, **server action logic**, and **integration contract verification**.

If `$ARGUMENTS` is provided, focus testing on that specific area or file. Otherwise, run a full test sweep.

## Project Context

- **Stack**: Next.js 16, TypeScript, Prisma 7, Zod 4, Clerk auth, pnpm
- **Test runner**: Vitest
- **Test directory**: `src/__tests__/` — all tests go here
- **Server actions**: `src/lib/actions/asset.ts` and `src/lib/actions/machine.ts`
- **Validation schemas**: `src/lib/validations/asset.ts` and `src/lib/validations/machine.ts`
- **Utilities**: `src/lib/format.ts`, `src/lib/constants.ts`, `src/lib/parse-markdown.ts`, `src/lib/utils.ts`
- **Prisma schema**: `prisma/schema.prisma`
- **Webhook handler**: `src/app/api/webhooks/clerk/route.ts`
- **Package manager**: pnpm (use `CI=true pnpm install` for non-interactive installs)

### Key Exported Functions

**`src/lib/actions/asset.ts`** (server actions — `"use server"`):
- `createAsset(formData: FormData): Promise<never>` — validates, creates asset, redirects
- `updateAsset(assetId: string, formData: FormData): Promise<ActionResult>` — validates authorization + partial update
- `deleteAsset(assetId: string): Promise<ActionResult>` — soft delete
- `publishVersion(formData: FormData): Promise<ActionResult>` — creates version record, prevents duplicates
- `downloadAsset(assetId: string, version: string): Promise<ActionResult>` — tracks download
- `forkAsset(assetId: string): Promise<ForkResult>` — copies public asset, increments forkCount
- Internal: `requireUser()`, `generateUniqueSlug(name)`

**`src/lib/actions/machine.ts`** (server actions — `"use server"`):
- `registerMachine(formData: FormData): Promise<ActionResult>` — creates machine, handles P2002 unique constraint
- `deleteMachine(machineId: string): Promise<ActionResult>` — hard delete with auth check
- `syncAssetToMachine(formData: FormData): Promise<ActionResult>` — upserts sync state, creates download record
- `markAssetSynced(machineId: string, assetId: string): Promise<ActionResult>` — updates sync state

**`src/lib/validations/asset.ts`** (Zod schemas):
- `createAssetSchema` — name(2-100), description(10-280), type(SKILL|COMMAND|AGENT), primaryPlatform(7 values), compatiblePlatforms(array), category(12 values), tags(comma-split string), visibility, license, installScope, content(min 1), primaryFileName(1-255)
- `updateAssetSchema` — partial of createAssetSchema
- `publishVersionSchema` — assetId, version(semver regex), changelog(1-2000)

**`src/lib/validations/machine.ts`** (Zod schemas):
- `registerMachineSchema` — name(1-100), machineIdentifier(1-100, alphanumeric/hyphens/underscores regex)
- `syncAssetSchema` — machineId, assetId

**`src/lib/parse-markdown.ts`**:
- `parseMarkdownFile(filename: string, text: string): ParsedMarkdown` — extracts frontmatter, infers type from filename, falls back to heading/paragraph extraction

**`src/lib/format.ts`**:
- `formatDistanceToNow(date: Date): string` — returns "just now", "Xm ago", "Xh ago", "Xd ago", or localized date
- `formatDate(date: Date): string` — returns "Mon DD, YYYY" format

**`src/lib/constants.ts`**:
- `ASSET_TYPE_LABELS`, `ASSET_TYPE_COLORS`, `PLATFORM_LABELS`, `CATEGORY_LABELS`, `LICENSE_LABELS`, `LICENSE_DESCRIPTIONS`, `VISIBILITY_LABELS`, `INSTALL_SCOPE_LABELS`, `INSTALL_SCOPE_DESCRIPTIONS`, `DEFAULT_FILE_NAMES`

## Step 1: Set Up Test Infrastructure

### Install Vitest (if not already installed)

```bash
CI=true pnpm add -D vitest
```

### Create `vitest.config.ts` at project root (if it does not exist)

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### Add test script to `package.json` (if missing)

Add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` object.

## Step 2: Validation Schema Tests

Create `src/__tests__/validations.test.ts`. These test the Zod schemas directly — no mocking needed.

### `createAssetSchema`
- **Valid input**: all fields provided with valid values → parses successfully
- **Name boundaries**: 1 char fails, 2 chars passes, 100 chars passes, 101 chars fails
- **Description boundaries**: 9 chars fails, 10 chars passes, 280 chars passes, 281 chars fails
- **Type enum**: "SKILL", "COMMAND", "AGENT" all pass; "INVALID" fails
- **Platform enum**: all 7 platform values pass; "INVALID" fails
- **Category enum**: all 12 category values pass; "INVALID" fails
- **Visibility enum**: "PRIVATE", "SHARED", "PUBLIC" pass; "INVALID" fails
- **License enum**: all 8 license values pass; "INVALID" fails
- **InstallScope enum**: "USER", "PROJECT" pass; "INVALID" fails
- **Tags transform**: `"git, commit, automation"` → `["git", "commit", "automation"]`; `""` → `[]`; `"single"` → `["single"]`
- **Content required**: empty string fails, "x" passes
- **PrimaryFileName**: empty fails, 255 chars passes, 256 chars fails
- **Defaults**: omitted visibility defaults to "PRIVATE", omitted license defaults to "UNLICENSED", omitted installScope defaults to "PROJECT", omitted compatiblePlatforms defaults to `[]`

### `updateAssetSchema`
- **All fields optional**: empty object `{}` parses successfully
- **Individual fields**: each field passes validation independently when provided alone
- **Invalid values still rejected**: `{ name: "" }` fails (min 2), `{ type: "INVALID" }` fails

### `publishVersionSchema`
- **Valid semver**: "1.0.0", "0.1.0", "10.20.30" all pass
- **Invalid semver**: "1.0", "v1.0.0", "1.0.0-beta", "abc" all fail
- **Changelog boundaries**: empty fails, 1 char passes, 2000 chars passes, 2001 chars fails
- **AssetId required**: empty string fails

### `registerMachineSchema`
- **Valid input**: name + machineIdentifier with alphanumeric/hyphens/underscores passes
- **Identifier regex**: "my-machine_01" passes, "my machine" fails (space), "hello@world" fails (at sign)
- **Boundaries**: name 0 chars fails, 1 passes, 100 passes, 101 fails

### `syncAssetSchema`
- **Both required**: empty machineId or assetId fails
- **Valid**: both provided with non-empty strings passes

## Step 3: Utility Function Tests

Create `src/__tests__/utils.test.ts`.

### `parseMarkdownFile` (from `src/lib/parse-markdown.ts`)

**Type inference from filename**:
- `"SKILL.md"` → type = "SKILL"
- `"my-command.md"` → type = "COMMAND" (contains "command" case-insensitive)
- `"agent-setup.md"` → type = "AGENT"
- `"README.md"` → type = undefined (no match)

**Frontmatter parsing**:
- File with valid YAML frontmatter (`---\nname: Test\ndescription: A test\ntags: [foo, bar]\nplatform: claude_code\ncategory: testing\n---\nBody`) extracts all fields
- File with no frontmatter → content = full text, name extracted from first `# Heading`
- File with frontmatter but no name → falls back to first `# Heading`
- File with no heading or frontmatter → name = undefined

**Description extraction**:
- First paragraph after heading is extracted as description
- Description longer than 280 chars is truncated to 277 + "..."

**Platform/category normalization**:
- `"claude_code"` → `"CLAUDE_CODE"` (uppercased with underscores)
- Invalid platform string → primaryPlatform = undefined (not set)
- Invalid category string → category = undefined (not set)

**Tags parsing**:
- `"[foo, bar, baz]"` → `["foo", "bar", "baz"]`
- Quoted values in frontmatter are unquoted

**Content and filename**:
- `content` always equals the full file text
- `primaryFileName` always equals the passed filename

### `formatDistanceToNow` (from `src/lib/format.ts`)

- Date within last 59 seconds → "just now"
- Date 5 minutes ago → "5m ago"
- Date 3 hours ago → "3h ago"
- Date 7 days ago → "7d ago"
- Date 45 days ago → returns `toLocaleDateString()` output (> 30 days)
- Future dates → "just now" (negative diff, diffDay/diffHr/diffMin all ≤ 0)

### `formatDate` (from `src/lib/format.ts`)

- Formats `new Date(2026, 1, 11)` → contains "Feb" and "2026" and "11"
- Formats `new Date(2024, 11, 25)` → contains "Dec" and "2024" and "25"

### Constants completeness (from `src/lib/constants.ts`)

- `ASSET_TYPE_LABELS` has keys: SKILL, COMMAND, AGENT (matches Prisma enum)
- `PLATFORM_LABELS` has keys: CLAUDE_CODE, GEMINI_CLI, CHATGPT, CURSOR, WINDSURF, AIDER, OTHER (matches Prisma enum)
- `CATEGORY_LABELS` has 12 keys matching Prisma Category enum
- `LICENSE_LABELS` has 8 keys matching Prisma License enum
- `LICENSE_DESCRIPTIONS` has the same keys as `LICENSE_LABELS`
- `VISIBILITY_LABELS` has keys: PRIVATE, SHARED, PUBLIC
- `INSTALL_SCOPE_LABELS` has keys: USER, PROJECT
- `DEFAULT_FILE_NAMES` has keys: SKILL, COMMAND, AGENT
- No label map has empty string values

## Step 4: Server Action Logic Tests

Create `src/__tests__/actions.test.ts`.

Server actions use Clerk auth and Prisma. You MUST mock these dependencies:

```typescript
import { vi } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// Mock Next.js server functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  db: {
    user: { upsert: vi.fn(), delete: vi.fn() },
    asset: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    assetVersion: { create: vi.fn(), findFirst: vi.fn() },
    download: { create: vi.fn() },
    userMachine: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    machineSyncState: { upsert: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}));
```

### forkAsset

- **Not found**: asset doesn't exist → `{ success: false, error: "Asset not found" }`
- **Soft-deleted**: asset has deletedAt set → `{ success: false, error: "Asset not found" }`
- **Private asset**: visibility = "PRIVATE" → `{ success: false, error: "Cannot fork a private asset" }`
- **Own asset**: authorId matches current user → `{ success: false, error: "Cannot fork your own asset" }`
- **Success**: public asset by another user → `{ success: true, slug: ... }`; verify `$transaction` called with create + update (forkCount increment)
- **Forked asset visibility**: new fork is always "PRIVATE"
- **Forked asset version**: currentVersion resets to "1.0.0"

### deleteAsset

- **Not found**: → `{ success: false, error: "Asset not found or not authorized" }`
- **Not owner**: different authorId → same error
- **Success**: sets deletedAt via update (soft delete), returns `{ success: true }`

### updateAsset

- **Not found / not authorized**: → error
- **Deleted asset**: asset with deletedAt → `{ success: false, error: "Cannot update a deleted asset" }`
- **Validation failure**: invalid form data → returns error with Zod messages
- **Slug regenerated**: when name changes, generateUniqueSlug is called

### publishVersion

- **Duplicate version**: existing version found → `{ success: false, error: "This version already exists" }`
- **Success**: creates assetVersion + updates currentVersion in transaction

### downloadAsset

- **Not found**: → error
- **Success**: creates download record + increments downloadCount in transaction
- **Unauthenticated**: works with null userId

### registerMachine

- **Valid**: creates machine, returns success
- **Duplicate**: P2002 error → returns friendly error message
- **Validation failure**: invalid identifier → returns Zod error

### deleteMachine

- **Not found / not authorized**: → error
- **Success**: deletes machine

### syncAssetToMachine

- **Machine not authorized**: → error
- **Asset not found / deleted / not owner**: → error
- **Success**: upserts sync state, updates machine lastSyncAt, creates download, increments downloadCount — all in transaction

## Step 5: Integration Contract Tests

Create `src/__tests__/contracts.test.ts`. These verify that schemas, constants, and action logic agree with each other.

### Zod Schema ↔ Prisma Enum Alignment

Read the enum values from the Zod schemas and verify they match Prisma enums in the schema:

- `createAssetSchema` type values = `["SKILL", "COMMAND", "AGENT"]` matches `AssetType` enum
- `createAssetSchema` platform values = 7 platforms matches `Platform` enum
- `createAssetSchema` category values = 12 categories matches `Category` enum
- `createAssetSchema` visibility values = `["PRIVATE", "SHARED", "PUBLIC"]` matches `Visibility` enum
- `createAssetSchema` license values = 8 licenses matches `License` enum
- `createAssetSchema` installScope values = `["USER", "PROJECT"]` matches `InstallScope` enum

### Constants ↔ Prisma Enum Alignment

- Every key in `ASSET_TYPE_LABELS` is a valid `AssetType` enum value
- Every key in `PLATFORM_LABELS` is a valid `Platform` enum value
- Every key in `CATEGORY_LABELS` is a valid `Category` enum value
- Every key in `LICENSE_LABELS` is a valid `License` enum value
- Every key in `VISIBILITY_LABELS` is a valid `Visibility` enum value
- Every key in `INSTALL_SCOPE_LABELS` is a valid `InstallScope` enum value
- `LICENSE_DESCRIPTIONS` has exactly the same keys as `LICENSE_LABELS`
- `DEFAULT_FILE_NAMES` keys are a subset of `ASSET_TYPE_LABELS` keys

### parseMarkdownFile ↔ Constants Alignment

- Platform values recognized by `parseMarkdownFile` (uppercased) must be keys in `PLATFORM_LABELS`
- Category values recognized by `parseMarkdownFile` (uppercased) must be keys in `CATEGORY_LABELS`

### Server Action Authorization Patterns

Verify consistent authorization across all server actions:

- Every mutating action (create, update, delete, fork, register, sync) calls `requireUser()` or `currentUser()`
- `downloadAsset` is the ONLY action that allows unauthenticated access (uses `currentUser()` directly, not `requireUser()`)
- All other actions throw "Unauthorized" when no user (via `requireUser()`)
- Ownership checks: `updateAsset`, `deleteAsset`, `publishVersion` verify `asset.authorId === userId`
- `forkAsset` verifies `source.authorId !== userId` (must NOT be owner)

### FormData Field Names ↔ Schema Keys

Verify the field names extracted from FormData in each action match the schema keys:

- `createAsset` extracts: name, description, type, primaryPlatform, compatiblePlatforms, category, tags, visibility, license, installScope, content, primaryFileName — must match `createAssetSchema` keys
- `registerMachine` extracts: name, machineIdentifier — must match `registerMachineSchema` keys
- `syncAssetToMachine` extracts: machineId, assetId — must match `syncAssetSchema` keys
- `publishVersion` extracts: assetId, version, changelog — must match `publishVersionSchema` keys

## Step 6: Run Tests

Execute:
```bash
pnpm test
```

- If Vitest is not installed, install it first: `CI=true pnpm add -D vitest`
- If tests fail, analyze failures, fix the test code, and re-run until all pass.
- If a test failure reveals a genuine bug in the source code, report it but do NOT fix the source — only fix the test expectations or skip the test with a clear reason.
- Maximum 3 fix-and-rerun cycles. If tests still fail after 3 attempts, report remaining failures.

## Step 7: Report Results

Provide a summary in this format:

```
## Test Results

### Validation Schema Tests
- X passed, Y failed
- Coverage: [list of schemas tested]

### Utility Function Tests
- X passed, Y failed
- Coverage: [list of functions tested]

### Server Action Logic Tests
- X passed, Y failed
- Coverage: [list of actions tested]
- Issues found: [any genuine bugs discovered]

### Integration Contract Tests
- X passed, Y failed
- Coverage: [list of contract boundaries verified]
- Mismatches found: [any contract violations discovered]

### Total: X passed, Y failed, Z skipped
```
