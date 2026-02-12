# AssetVault

AI Skill/Agent asset marketplace built with Next.js 16, TypeScript, Prisma 7, and Clerk auth.

## Changelog

### 2026-02-11
- **Commit**: `d239026` -- feat: add bundle/zip upload support and Vitest test suite
- **Changes**: Added BUNDLE storage type for multi-file assets with zip upload API, manifest tracking, and file tree display. Updated validation schema with storageType/bundleUrl/bundleManifest. Added formatBytes utility. Set up Vitest with 188 tests across validations, utilities, server actions, and integration contracts.
- **Tests**: 188 tests, all passing (94 validation, 34 utility, 30 action, 30 contract)
- **Files**: src/lib/validations/asset.ts, src/lib/actions/asset.ts, src/lib/constants.ts, src/lib/format.ts, src/lib/types/bundle.ts, src/app/api/upload/route.ts, src/components/assets/asset-form.tsx, src/components/assets/bundle-file-tree.tsx, vitest.config.ts, src/__tests__/*

### 2026-02-11 (Install to Project + Platform Compat)
- **Commit**: `6579dbc` -- feat: Install to Project dialog + platform compatibility auto-suggest
- **Changes**: Added File System Access API-powered "Install to Project" dialog for PROJECT-scoped assets, allowing users to pick a project directory and have files written directly to the correct subdirectory (e.g., `.claude/skills/`). Added `installPath` field to MachineSyncState, INSTALL_PATHS constant mapping platform+type to subdirectories, `getDefaultInstallSubdir()` helper, and `PLATFORM_COMPATIBILITY_MAP` for auto-suggesting compatible platforms in the asset form. Fixed asset creation redirect issue (server action now returns redirect path, client uses `router.push()`). Browser fallback for Firefox/Safari shows suggested path + download.
- **Tests**: Added 9 new tests (250 total, all passing) — PLATFORM_COMPATIBILITY_MAP coverage, installPath Prisma/source contracts, syncAssetToMachine installPath flow
- **Files**: prisma/schema.prisma, src/lib/constants.ts, src/lib/validations/machine.ts, src/lib/actions/machine.ts, src/lib/actions/asset.ts, src/lib/types/file-system-access.d.ts, src/components/machines/install-to-project-dialog.tsx, src/components/machines/machine-sync-view.tsx, src/components/assets/asset-form.tsx, src/__tests__/utils.test.ts, src/__tests__/contracts.test.ts, src/__tests__/actions.test.ts, src/__tests__/validations.test.ts

### 2026-02-11 (Phase 7 — Polish)
- **Commit**: `8d212ad` -- feat: Phase 7 polish — command palette, responsive design, loading states, SEO, rate limiting, analytics
- **Changes**: Added Ctrl+K command palette with debounced search API, responsive mobile navigation (hamburger menu + dashboard sidebar sheet), loading skeletons for all routes, error boundaries, 404 pages, SEO metadata (OpenGraph, Twitter Cards, JSON-LD, robots.txt, sitemap.xml), in-memory sliding window rate limiting on uploads/creates/downloads/forks/search, and analytics dashboard with stats cards, download trend chart, and top assets table.
- **Tests**: Added 40 Phase 7 tests (228 total, all passing) covering rate limiter logic, search API validation, robots.ts, sitemap.ts, and rate limit configuration
- **Files**: src/lib/rate-limit.ts, src/app/api/search/route.ts, src/components/command-palette.tsx, src/components/layout/header.tsx, src/components/layout/mobile-sidebar.tsx, src/components/layout/sidebar.tsx, src/components/skeletons/*, src/app/*/loading.tsx, src/app/*/error.tsx, src/app/*/not-found.tsx, src/app/robots.ts, src/app/sitemap.ts, src/app/dashboard/analytics/*, src/components/analytics/*, src/app/layout.tsx, src/app/assets/[slug]/page.tsx, src/app/profile/[username]/page.tsx, src/app/explore/page.tsx, src/app/api/upload/route.ts, src/lib/actions/asset.ts, src/__tests__/phase7.test.ts

### 2026-02-12 (Profile Settings)
- **Commit**: `0873d60` -- feat: add profile settings page with display name and bio editing
- **Changes**: Replaced the settings stub with a working profile editor. Users can update display name and bio from /dashboard/settings, with changes shown on public profile. Clerk webhook no longer overwrites displayName on user.updated so in-app edits persist. Includes validation schema, rate-limited server action, profile form component, and loading skeleton.
- **Tests**: Added 31 profile tests (281 total, all passing) — updateProfileSchema validation, updateProfile action logic, webhook displayName contract, integration contracts
- **Files**: src/lib/validations/user.ts, src/lib/actions/user.ts, src/components/settings/profile-form.tsx, src/app/dashboard/settings/page.tsx, src/app/dashboard/settings/loading.tsx, src/app/api/webhooks/clerk/route.ts, src/__tests__/profile.test.ts

### 2026-02-12 (Email-Based Asset Sharing)
- **Commit**: `8d76d86` -- feat: email-based asset sharing with Resend notifications
- **Changes**: Added proper SHARED visibility access control with token-based and email-based authentication. Asset owners can invite anyone by email via a ShareDialog component, recipients get a Resend notification email with a tokenized link. Non-users access via `?token=` URL; logged-in users matched by email automatically. AssetShare Prisma model with unique token + email constraints. SHARED assets blocked from forking. Rate-limited share actions (10/5min). Graceful email fallback when RESEND_API_KEY not configured.
- **Tests**: Added 32 new tests (313 total, all passing) — 24 share action tests (shareAsset, revokeShare, getAssetShares), 7 share contract tests (AssetShare model, auth patterns, FormData alignment, fork SHARED block), 1 forkAsset SHARED visibility test
- **Files**: prisma/schema.prisma, src/lib/email.ts, src/lib/validations/share.ts, src/lib/actions/share.ts, src/components/assets/share-dialog.tsx, src/__tests__/share.test.ts, src/app/assets/[slug]/page.tsx, src/components/assets/asset-actions.tsx, src/lib/actions/asset.ts, src/__tests__/contracts.test.ts, src/__tests__/actions.test.ts
