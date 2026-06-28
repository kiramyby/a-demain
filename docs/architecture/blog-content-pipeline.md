# Blog content pipeline

Current as of 2026-06-29.

## Summary

The blog content pipeline loads blog content from Notion during Astro content sync, maps upstream Notion resources into post metadata, stores rendered entries in the Astro `posts` collection, and publishes route pages from that collection. The current integration targets Notion API version `2026-03-11` in [src/server/notion/client.ts](../../src/server/notion/client.ts).

## Inputs

The upstream content container is the **Posts Database**. Source resolution precedence is: configured **Posts View**, then configured **Posts Data Source**, then the first **Posts Data Source** resolved from the database in [src/server/notion/posts/repository.ts](../../src/server/notion/posts/repository.ts) and [src/server/notion/database/data-source-resolver.ts](../../src/server/notion/database/data-source-resolver.ts).

The current editorial contract and field mapping are documented in [Content model](./content-model.md). `Status` is used by the data source fallback query in [src/server/notion/posts/queries.ts](../../src/server/notion/posts/queries.ts); when a **Posts View** is configured, the view defines the result set instead.

## Flow

The pipeline enters Astro content sync through [src/content.config.ts](../../src/content.config.ts), which registers the `posts` collection with [src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts).

At the Notion boundary, a **Posts View** or **Posts Data Source** yields **Notion Pages** through [src/server/notion/posts/repository.ts](../../src/server/notion/posts/repository.ts) and [src/server/notion/database/view-resolver.ts](../../src/server/notion/database/view-resolver.ts).

Each **Notion Page** is mapped into `BlogPostMeta` in [src/server/notion/posts/mapper.ts](../../src/server/notion/posts/mapper.ts), then cached for the build process in [src/server/notion/posts/cache.ts](../../src/server/notion/posts/cache.ts).

For each post metadata record, the loader writes a rendered entry into the Astro `posts` collection by slug. Markdown retrieval, normalization, diagnostics, and rendered output are documented in [Content rendering](./content-rendering.md).

Route pages then read only from collection APIs, not from Notion repositories directly, as shown by [src/pages/posts/index.astro](../../src/pages/posts/index.astro), [src/pages/posts/[slug].astro](../../src/pages/posts/%5Bslug%5D.astro), [src/pages/categories/index.astro](../../src/pages/categories/index.astro), [src/pages/categories/[category].astro](../../src/pages/categories/%5Bcategory%5D.astro), [src/pages/tags/index.astro](../../src/pages/tags/index.astro), and [src/pages/tags/[tag].astro](../../src/pages/tags/%5Btag%5D.astro).

## Outputs

The current pipeline writes the Astro `posts` collection snapshot. Site routes publish from that snapshot.

The current route surfaces and category/tag route encoding are documented in [Site routing](./site-routing.md).

## Current constraints

Blog content sync is a build-time integration. It requires valid Notion credentials, usable Notion identifiers, and network access when Astro content sync runs through the blog pipeline entry points.

Notion-hosted signed media handling is documented in [Content rendering](./content-rendering.md).

## Compatibility boundary

The current blog pipeline is the path rooted in [src/content.config.ts](../../src/content.config.ts) and [src/server/notion/astro/notion-posts-loader.ts](../../src/server/notion/astro/notion-posts-loader.ts).

Shared Notion infrastructure and non-blog Notion paths are documented in [Notion module boundaries](./notion-module-boundaries.md).
