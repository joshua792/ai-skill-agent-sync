# AssetVault

A home for AI skills, commands, and agents — publish them, share them, and keep them in sync across every machine you work on.

Live at **<https://ai-skill-agent-sync.vercel.app>**

## What it does

- **Asset library** — store skills, commands, and agents for Claude Code, Cursor, Windsurf, Gemini CLI, Aider, and more. Upload a single `.md` file, a `.zip`, or drop a whole skill folder (`SKILL.md` plus `references/` and anything else).
- **Explore and fork** — browse public assets, fork them into your own vault, and track versions.
- **Sharing** — keep assets private, make them public, or share with specific people by email.
- **Machine sync** — register your machines, see what's installed where, and install assets straight into a project folder from the browser (Chrome/Edge).
- **CLI (`av`)** — two-way sync between your vault and local files, including a watch daemon for real-time sync. See [cli/README.md](cli/README.md).
- **Admin + analytics** — download trends, top assets, and user/asset management for admins.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 7 on Neon Postgres · Clerk auth · Vercel Blob (bundles) · Resend (share emails) · Tailwind + shadcn/ui · Vitest

## Local setup

Requires Node.js 20+ and pnpm.

```bash
pnpm install          # also runs prisma generate
pnpm db:push          # sync the schema to your database
pnpm db:seed          # optional sample data
pnpm dev              # http://localhost:3000
```

### Environment variables

Create a `.env` file in the repo root:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon). Use `sslmode=verify-full`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Verifies Clerk user webhooks (`/api/webhooks/clerk`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for bundle uploads |
| `RESEND_API_KEY` | Sends share emails (optional — sharing still works without it) |
| `ADMIN_USER_IDS` | Comma-separated Clerk user IDs with admin access |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used in emails, SEO, and CLI setup |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Generate the Prisma client and build for production |
| `pnpm test` | Run the web app test suite |
| `pnpm lint` | Lint the project |
| `pnpm db:studio` | Open Prisma Studio |
| `cd cli && pnpm test` | Run the CLI test suite |

## Deployment

Pushing to `main` deploys to production on Vercel. Set the environment variables above in the Vercel project settings.

## Project layout

```text
src/app/            Routes (pages + API, including /api/cli/* for the CLI)
src/components/     UI components
src/lib/            Server actions, validation schemas, helpers
src/proxy.ts        Clerk auth for /dashboard (CLI routes use API keys instead)
prisma/             Schema and seed
cli/                The `av` command-line tool
```
