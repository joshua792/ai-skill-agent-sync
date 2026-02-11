# AssetVault

AI Skill/Agent asset marketplace built with Next.js 16, TypeScript, Prisma 7, and Clerk auth.

## Changelog

### 2026-02-11
- **Commit**: `d239026` -- feat: add bundle/zip upload support and Vitest test suite
- **Changes**: Added BUNDLE storage type for multi-file assets with zip upload API, manifest tracking, and file tree display. Updated validation schema with storageType/bundleUrl/bundleManifest. Added formatBytes utility. Set up Vitest with 188 tests across validations, utilities, server actions, and integration contracts.
- **Tests**: 188 tests, all passing (94 validation, 34 utility, 30 action, 30 contract)
- **Files**: src/lib/validations/asset.ts, src/lib/actions/asset.ts, src/lib/constants.ts, src/lib/format.ts, src/lib/types/bundle.ts, src/app/api/upload/route.ts, src/components/assets/asset-form.tsx, src/components/assets/bundle-file-tree.tsx, vitest.config.ts, src/__tests__/*
