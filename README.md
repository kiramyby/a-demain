# À demain

> There was a promise, but now only the promise remains...

Personal Astro site with Notion-backed blog content. Notion is the editorial source; Astro Content Collections are the build-time content system.

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

Create a local `.env` from `.env.example`:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_POSTS_DATABASE_ID=your_posts_database_id

# Optional: preferred when you want a saved Notion view to define published content.
NOTION_POSTS_VIEW_ID=

# Optional: used when no view is configured.
NOTION_POSTS_DATA_SOURCE_ID=

# Existing friends database integration.
NOTION_FRIENDS_DATABASE_ID=your_friends_database_id
```

The Notion integration must have read access to the posts database and any database used by the legacy friends integration.

## Content Flow

Blog posts are loaded during Astro content sync:

```txt
Astro content sync
  -> src/content.config.ts
  -> notionPostsLoader()
  -> getPublishedPostMetas()
      -> query NOTION_POSTS_VIEW_ID when configured
      -> otherwise resolve/query the posts data source
      -> map Notion page properties to BlogPostMeta
  -> pages.retrieveMarkdown({ page_id }) for each post body
  -> normalize diagnostics
  -> renderMarkdown()
  -> store entries in the posts collection by slug
```

Pages read from `astro:content`; route files do not call Notion directly.

The collection entry ID is the Notion slug. The original Notion page ID is stored as `data.notionPageId`.

## Notion Post Fields

The posts database is expected to expose these properties:

- `Title`
- `Slug`
- `Status`
- `Published Date`
- `Updated Date`
- `Category`
- `Tags`
- `Description`
- `Cover Image`
- `Featured`
- `SEO Title`
- `SEO Keywords`

Only posts with `Status = Published` are queried when the data source fallback path is used. When `NOTION_POSTS_VIEW_ID` is configured, the saved Notion view defines the source result set.

Markdown is fetched through Notion's official `pages.retrieveMarkdown()` API. A build fails if Notion returns truncated Markdown or unknown block IDs. Notion-hosted signed media URLs are rendered as returned and reported as warnings; they are not synced locally yet.

## Routes

- `/posts`
- `/posts/[slug]`
- `/categories`
- `/categories/[category]`
- `/tags`
- `/tags/[tag]`

Category and tag URLs use a safe route-parameter helper so labels containing `/`, `%`, `.`, or spaces stay inside a single route segment.

## Scripts

```bash
pnpm dev          # start Astro dev server
pnpm build        # sync Notion content and build static site
pnpm preview      # preview built output
pnpm test         # run Vitest
pnpm typecheck    # run astro check
pnpm test:e2e     # run Playwright smoke tests
```

`pnpm build`, `pnpm typecheck`, and Playwright's web server path sync Notion content, so they require valid Notion environment variables and network access.

## Documentation

- [Notion Astro Content Design](docs/superpowers/specs/2026-05-26-notion-astro-content-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-05-26-notion-astro-content.md)
