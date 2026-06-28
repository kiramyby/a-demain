# Content model

Current as of 2026-06-28.

## Summary

The current blog content model has two implemented shapes:

- `BlogPostMeta` in [src/server/notion/posts/schema.ts](../../src/server/notion/posts/schema.ts), produced from Notion Pages.
- Astro `posts` collection entries in [src/content.config.ts](../../src/content.config.ts), consumed by route pages.

[src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts) is the current adapter between these shapes.

## Notion post metadata

`BlogPostMeta` contains:

- `id`
- `title`
- `slug`
- `status`
- `publishedDate`
- `updatedDate`
- `category`
- `tags`
- `description`
- `coverImage`
- `featured`
- `seoTitle`
- `seoKeywords`

[src/server/notion/posts/mapper.ts](../../src/server/notion/posts/mapper.ts) maps Notion properties into this shape. The current required mapping inputs are `id`, `Title`, and `Slug`; missing any of them raises `NotionMappingError`.

The current Notion property names are centralized in `POST_PROPERTIES` in [src/server/notion/posts/schema.ts](../../src/server/notion/posts/schema.ts).

## Astro collection entry

The Astro `posts` collection schema in [src/content.config.ts](../../src/content.config.ts) stores:

- `notionPageId`
- `title`
- `slug`
- `status`
- `publishedDate`
- `updatedDate`
- `category`
- `tags`
- `description`
- `coverImage`
- `featured`
- `seoTitle`
- `seoKeywords`

The collection entry id is the post slug. [src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts) writes each entry with `id: post.slug`, stores normalized Markdown as `body`, stores rendered Markdown as `rendered`, and generates the entry digest from the parsed data and normalized Markdown.

The collection schema coerces `publishedDate` and `updatedDate` to nullable dates.

## Current constraints

`BlogPostMeta.id` is the upstream Notion Page id. `posts` collection `id` is the route slug.

Route pages read Astro collection entries and do not consume `BlogPostMeta` directly.
