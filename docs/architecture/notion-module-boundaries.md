# Notion module boundaries

Current as of 2026-06-28.

## Summary

The Notion module lives under [src/server/notion](../../src/server/notion). Its app-facing export is collected in [src/server/notion/index.ts](../../src/server/notion/index.ts), which currently exposes the Astro blog loader.

Boundary-specific code imports repositories and shared infrastructure by explicit path instead of through the app-facing export.

The module targets Notion API version `2026-03-11` in [src/server/notion/client.ts](../../src/server/notion/client.ts).

## Shared infrastructure

[src/server/notion/client.ts](../../src/server/notion/client.ts) creates the Notion client and pins the Notion API version.

[src/server/notion/config.ts](../../src/server/notion/config.ts) reads separate environment contracts for blog posts and friends:

- Blog posts require `NOTION_API_KEY` and `NOTION_POSTS_DATABASE_ID`.
- Blog posts may use `NOTION_POSTS_VIEW_ID` or `NOTION_POSTS_DATA_SOURCE_ID`.
- Friends require `NOTION_API_KEY` and `NOTION_FRIENDS_DATABASE_ID`.

[src/server/notion/database/data-source-resolver.ts](../../src/server/notion/database/data-source-resolver.ts) resolves a Database to a Data Source when an explicit Data Source is not configured. [src/server/notion/database/view-resolver.ts](../../src/server/notion/database/view-resolver.ts) queries pages through a configured View.

## Blog posts boundary

Blog post loading is rooted in [src/content.config.ts](../../src/content.config.ts), which registers [src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts).

[src/server/notion/posts/repository.ts](../../src/server/notion/posts/repository.ts) owns the current blog source precedence: configured Posts View, configured Posts Data Source, then the first Posts Data Source resolved from the Posts Database.

The posts boundary maps Notion Pages into `BlogPostMeta` through [src/server/notion/posts/mapper.ts](../../src/server/notion/posts/mapper.ts) and [src/server/notion/posts/schema.ts](../../src/server/notion/posts/schema.ts). Markdown body loading and normalization live under [src/server/notion/content](../../src/server/notion/content).

Route pages read the Astro `posts` collection and do not call Notion repositories directly.

## Friends boundary

Friends querying is isolated under [src/server/notion/friends](../../src/server/notion/friends).

[src/server/notion/friends/repository.ts](../../src/server/notion/friends/repository.ts) exports `getActiveFriends`, resolves the Friends Database to a Data Source, queries `Status = Active`, sorts by `Name`, paginates Notion results, and maps pages into the `Friend` model from [src/server/notion/friends/schema.ts](../../src/server/notion/friends/schema.ts).

The current app has no friends route page. Friends querying is a non-blog Notion path and is not part of the Astro blog content sync.

## Diagnostic scripts

[src/scripts/test-notion.ts](../../src/scripts/test-notion.ts) exercises the blog posts repository and friends repository with the current Notion API version.

[src/scripts/inspect-databases.ts](../../src/scripts/inspect-databases.ts) inspects configured Notion Databases and their first Data Source. It is a diagnostic script, not a runtime boundary.
