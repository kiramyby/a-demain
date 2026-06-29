# À demain

> There was a promise, but now only the promise remains...

Personal Astro site with a Notion-backed blog.

Current implemented architecture starts at [docs/architecture/README.md](docs/architecture/README.md).

## Stack

- Astro 6
- TypeScript
- Tailwind CSS
- Astro Content Collections
- `@notionhq/client` pinned to Notion API version `2026-03-11`
- Vitest and Playwright

## Setup

Install dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill the required values. `.env.example` is the setup template; `NOTION_FRIENDS_DATABASE_ID` remains optional for non-blog Notion usage.

The Notion integration must have read access to the posts database and any configured friends database.

## Scripts

```bash
pnpm dev          # start Astro dev server
pnpm build        # sync Notion content and build static site
pnpm preview      # preview built output
pnpm lint         # run Biome checks
pnpm check        # run lint, typecheck, and Vitest
pnpm test         # run Vitest
pnpm typecheck    # run astro check without Notion content sync
pnpm test:e2e     # run Playwright smoke tests
```

Some commands require valid Notion credentials and network access because they trigger blog content sync. `pnpm typecheck` skips Notion content sync, and `pnpm check` does not run the production build or Playwright e2e tests.

## Documentation

- [Architecture](docs/architecture/README.md)
