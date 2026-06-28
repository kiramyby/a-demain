# Content rendering

Current as of 2026-06-29.

## Summary

The current blog body rendering path starts from Notion Markdown and ends as Astro collection entry `body`, `rendered`, and `digest` fields.

[src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts) coordinates the current rendering path for each `BlogPostMeta`.

## Markdown retrieval

[src/server/notion/content/markdown-provider.ts](../../src/server/notion/content/markdown-provider.ts) retrieves page Markdown with `pages.retrieveMarkdown`.

`getPostMarkdown` returns:

- `markdown`
- `truncated`
- `unknownBlockIds`

The current provider treats truncated Markdown as a `NotionContentError`.

The current provider treats any `unknown_block_ids` returned by Notion as a `NotionContentError`.

Non-content retrieval failures are wrapped as `NotionQueryError`.

## Normalization and diagnostics

[src/server/notion/content/markdown-normalizer.ts](../../src/server/notion/content/markdown-normalizer.ts) currently preserves Markdown text and reports diagnostics from [src/server/notion/content/media-policy.ts](../../src/server/notion/content/media-policy.ts).

The current media policy reports a `notion-signed-media-url` diagnostic when Markdown contains Notion-hosted signed media URL patterns.

The loader writes diagnostics to the Astro loader logger as warnings prefixed with the post slug.

## Astro rendered entry

For each post, [src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts):

- loads Markdown by Notion Page id
- normalizes the Markdown
- parses collection data with `context.parseData`
- renders normalized Markdown with `context.renderMarkdown`
- generates a digest from parsed data and normalized Markdown
- stores the entry with `body`, `rendered`, and `digest`

The stored entry id is the post slug.

## Current constraints

Notion-hosted signed media URLs are rendered as returned and reported as diagnostics. They are not synchronized into local project assets.
