# AssetVault

AI Skill/Agent asset marketplace built with Next.js 16, TypeScript, Prisma 7, and Clerk auth.

## Changelog

### 2026-02-11
- **Commit**: `d239026` -- feat: add bundle/zip upload support and Vitest test suite
- **Changes**: Added BUNDLE storage type for multi-file assets with zip upload API, manifest tracking, and file tree display. Updated validation schema with storageType/bundleUrl/bundleManifest. Added formatBytes utility. Set up Vitest with 188 tests across validations, utilities, server actions, and integration contracts.
- **Tests**: 188 tests, all passing (94 validation, 34 utility, 30 action, 30 contract)
- **Files**: src/lib/validations/asset.ts, src/lib/actions/asset.ts, src/lib/constants.ts, src/lib/format.ts, src/lib/types/bundle.ts, src/app/api/upload/route.ts, src/components/assets/asset-form.tsx, src/components/assets/bundle-file-tree.tsx, vitest.config.ts, src/__tests__/*

### 2026-02-11 (Phase 7 — Polish)
- **Commit**: `8d212ad` -- feat: Phase 7 polish — command palette, responsive design, loading states, SEO, rate limiting, analytics
- **Changes**: Added Ctrl+K command palette with debounced search API, responsive mobile navigation (hamburger menu + dashboard sidebar sheet), loading skeletons for all routes, error boundaries, 404 pages, SEO metadata (OpenGraph, Twitter Cards, JSON-LD, robots.txt, sitemap.xml), in-memory sliding window rate limiting on uploads/creates/downloads/forks/search, and analytics dashboard with stats cards, download trend chart, and top assets table.
- **Tests**: Added 40 Phase 7 tests (228 total, all passing) covering rate limiter logic, search API validation, robots.ts, sitemap.ts, and rate limit configuration
- **Files**: src/lib/rate-limit.ts, src/app/api/search/route.ts, src/components/command-palette.tsx, src/components/layout/header.tsx, src/components/layout/mobile-sidebar.tsx, src/components/layout/sidebar.tsx, src/components/skeletons/*, src/app/*/loading.tsx, src/app/*/error.tsx, src/app/*/not-found.tsx, src/app/robots.ts, src/app/sitemap.ts, src/app/dashboard/analytics/*, src/components/analytics/*, src/app/layout.tsx, src/app/assets/[slug]/page.tsx, src/app/profile/[username]/page.tsx, src/app/explore/page.tsx, src/app/api/upload/route.ts, src/lib/actions/asset.ts, src/__tests__/phase7.test.ts
