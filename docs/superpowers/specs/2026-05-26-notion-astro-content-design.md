# Notion Astro Content Design

Date: 2026-05-26
Status: Implemented on `main`

## Goal

Use Notion as the editorial source for blog posts while making Astro the content system of record at build time.

The site should treat Notion as a remote CMS and expose posts through Astro Content Collections. Astro pages should query `astro:content`, not call Notion directly.

## Current Runtime Flow

The implemented flow is build-time only:

```txt
Astro content sync
  -> src/content.config.ts
  -> notionPostsLoader()
  -> getPublishedPostMetas()
      -> read NOTION_* env
      -> create @notionhq/client with notionVersion "2026-03-11"
      -> if NOTION_POSTS_VIEW_ID exists:
           query raw View Query API
           POST /v1/views/{view_id}/queries
           GET  /v1/views/{view_id}/queries/{query_id}
           DELETE cleanup best-effort
         else:
           resolve data source
           query dataSources.query()
      -> map Notion page properties into BlogPostMeta
  -> for each post:
      -> pages.retrieveMarkdown({ page_id })
      -> fail on truncated markdown or unknown block ids
      -> normalize markdown and report Notion signed media URL warnings
      -> parseData()
      -> renderMarkdown()
      -> store entry in posts collection by slug

Astro pages
  -> getCollection("posts")
  -> getStaticPaths()
  -> render(entry)
```

The Notion repository and Markdown provider are not imported by route pages. The integration boundary is the `posts` Astro Content Collection.

## Scope

In scope:

- Fetch published blog post metadata from a Notion database.
- Support the current Notion API model where databases contain data sources and views.
- Fetch post body content through the official Notion Markdown API.
- Load posts into Astro Content Collections with schema validation.
- Generate static post, tag, and category routes from the collection.
- Define cache, error, and media handling boundaries.

Out of scope:

- Editing or publishing Notion content from the site.
- Creating pages from templates.
- Comment synchronization.
- Uploading files into Notion.
- Full Notion UI fidelity through `react-notion-x`.

## Notion Model

The editorial model remains user-facing as a Notion database. Internally, the API model is:

```txt
Database
  -> data_sources[]
      -> pages / entries
      -> properties schema
  -> views[]
      -> saved filter, sort, and presentation configuration over a data source
```

The site should support three identifiers:

```txt
NOTION_POSTS_DATABASE_ID=required
NOTION_POSTS_DATA_SOURCE_ID=optional
NOTION_POSTS_VIEW_ID=optional
```

Resolution priority:

1. If `NOTION_POSTS_VIEW_ID` is configured, query that view so Notion's saved published filter and sort are the source of truth.
2. Otherwise, use `NOTION_POSTS_DATA_SOURCE_ID` when configured.
3. Otherwise, retrieve the database and resolve its first data source, with a clear diagnostic message.

## API Version

All official Notion API calls must use:

```ts
notionVersion: "2026-03-11"
```

This should be centralized in `src/server/notion/client.ts` as a constant, not repeated at call sites.

## Module Layout

```txt
src/content.config.ts

src/server/notion/
  client.ts
  config.ts
  errors.ts

  database/
    data-source-resolver.ts
    view-resolver.ts

  posts/
    schema.ts
    mapper.ts
    repository.ts
    queries.ts
    cache.ts

  content/
    markdown-provider.ts
    markdown-normalizer.ts
    media-policy.ts

  astro/
    notion-posts-loader.ts

  index.ts

src/lib/content-routes.ts
```

## Responsibilities

### `client.ts`

Creates the official `@notionhq/client` instance and pins `notionVersion` to `2026-03-11`.

No business logic belongs here.

The exported `notion` value is a lazy proxy so importing server-side Notion modules during tests does not read environment variables until the client is actually used.

### `config.ts`

Reads and validates environment variables. Required values should fail fast with clear errors during build.

### `database/data-source-resolver.ts`

Resolves the data source used by the posts database. It should prefer explicit configuration and only fall back to the first database data source when no explicit data source is configured.

### `database/view-resolver.ts`

Encapsulates view-based querying. When a view ID is configured, it owns creating a view query, paginating results, and cleaning up the temporary query where the API requires it.

### `posts/schema.ts`

Defines the stable domain model:

```ts
type BlogPostMeta = {
  id: string
  title: string
  slug: string
  status: string
  publishedDate: string | null
  updatedDate: string | null
  category: string | null
  tags: string[]
  description: string
  coverImage: string | null
  featured: boolean
  seoTitle: string | null
  seoKeywords: string[]
}
```

It also centralizes Notion property names:

```ts
POST_PROPERTIES = {
  title: "Title",
  slug: "Slug",
  status: "Status",
  publishedDate: "Published Date",
  updatedDate: "Updated Date",
  category: "Category",
  tags: "Tags",
  description: "Description",
  coverImage: "Cover Image",
  featured: "Featured",
  seoTitle: "SEO Title",
  seoKeywords: "SEO Keywords",
}
```

### `posts/mapper.ts`

Converts Notion page properties into `BlogPostMeta`.

Required fields:

- `id`
- `title`
- `slug`

Missing required fields should throw a mapping error. Optional fields may use explicit defaults.

### `posts/repository.ts`

Provides Notion-facing post metadata operations used by the Astro loader:

```ts
getPublishedPostMetas(): Promise<BlogPostMeta[]>
getPostMetaBySlug(slug: string): Promise<BlogPostMeta | null>
```

The repository paginates API results and memoizes the post index during a build. Rejected loads are evicted from the memoization cache so a transient Notion failure does not poison the rest of the process.

### `content/markdown-provider.ts`

Fetches body content through the official Notion Markdown API:

```ts
getPostMarkdown(pageId: string): Promise<{
  markdown: string
  truncated: boolean
  unknownBlockIds: string[]
}>
```

The provider must surface `truncated` and `unknownBlockIds`; callers should not silently ignore them.

### `content/markdown-normalizer.ts`

Normalizes Notion Enhanced Markdown into content suitable for Astro's Markdown pipeline.

Current behavior:

- Preserve Markdown unchanged.
- Return diagnostics from `media-policy.ts`.
- Avoid custom rendering logic until a concrete unsupported block appears.

### `content/media-policy.ts`

Documents and enforces media handling rules:

- Notion-hosted file URLs are temporary signed URLs.
- Do not persist Notion file URLs across builds as permanent content.
- First version may render URLs as returned during the build.
- A future `media-sync` step can download assets into local or CDN-backed storage.

### `astro/notion-posts-loader.ts`

Implements an Astro custom content loader.

It should:

1. Fetch published post metadata from `posts/repository.ts`.
2. Fetch Markdown for each post with `markdown-provider.ts`.
3. Normalize Markdown.
4. Use Astro loader context `renderMarkdown()` so entries work with `render(entry)`.
5. Store entries using `slug` as the collection entry ID.
6. Use a digest so Astro can detect unchanged content.

## Astro Integration

Define a `posts` collection in `src/content.config.ts`.

The collection schema should validate the stable post model:

```ts
const posts = defineCollection({
  loader: notionPostsLoader(),
  schema: z.object({
    notionPageId: z.string(),
    title: z.string(),
    slug: z.string(),
    status: z.string(),
    publishedDate: z.coerce.date().nullable(),
    updatedDate: z.coerce.date().nullable(),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    description: z.string(),
    coverImage: z.string().nullable(),
    featured: z.boolean(),
    seoTitle: z.string().nullable(),
    seoKeywords: z.array(z.string()),
  }),
})
```

Astro pages should use only collection APIs:

```ts
import { getCollection, getEntry, render } from "astro:content"
```

They should not import Notion repository modules directly.

## Routing

Post index:

```txt
src/pages/posts/index.astro
```

Uses `getCollection("posts")`, sorts by `publishedDate` descending, and renders the list.

Post detail:

```txt
src/pages/posts/[slug].astro
```

Uses `getStaticPaths()` to generate static routes from the collection and passes the entry as a prop.

Category and tag pages:

```txt
src/pages/categories/index.astro
src/pages/categories/[category].astro
src/pages/tags/index.astro
src/pages/tags/[tag].astro
```

Derive paths from `getCollection("posts")`, not from separate Notion calls.

Category and tag URLs use `src/lib/content-routes.ts` instead of raw `encodeURIComponent()`. This keeps category/tag labels such as `Life/Work`, `..`, and `100%` inside one safe route segment while preserving the original label in page props and visible text.

## Data Flow

```txt
Astro content loader
  -> posts repository
    -> view query if NOTION_POSTS_VIEW_ID exists
    -> else data source query
    -> mapper
  -> markdown provider for each post page
  -> markdown normalizer
  -> renderMarkdown()
  -> content collection store

Astro pages
  -> getCollection("posts")
  -> getStaticPaths()
  -> render(entry)
```

The collection entry ID is the Notion slug. The original Notion page ID is stored as `data.notionPageId`.

## Caching

Use process-level memoization during a single Astro build:

- Resolved data source
- Published post metadata index

Do not add persistent disk caching in the first implementation.

Do not persist Notion signed file URLs across builds.

Rejected memoized post-index loads are removed from the cache before rethrowing. View Query cleanup is best-effort; a failed `DELETE /views/{view_id}/queries/{query_id}` should not hide a successful query result or mask the original query error.

## Error Handling

Define explicit error classes:

- `NotionConfigError`: missing or invalid environment variables.
- `NotionQueryError`: Notion API request failure, permissions, rate limits, or query lifecycle errors.
- `NotionMappingError`: required page properties are missing or have invalid shapes.
- `NotionContentError`: Markdown response is truncated or contains unknown blocks that cannot be handled.

Builds should fail for config and required mapping errors. Markdown truncation or unknown blocks should fail by default until a deliberate fallback policy is implemented.

## Testing

Unit tests:

- `posts/mapper.ts` converts Notion page fixtures into `BlogPostMeta`.
- Required fields fail with `NotionMappingError`.
- Query selection prefers view ID over data source ID.
- Data source resolver prefers explicit data source ID over first database data source.
- Repository paginates all results.
- Repository does not memoize failed post-index loads.
- View Query cleanup failure does not hide a successful result.
- Markdown provider maps Notion markdown responses and preserves diagnostics.
- Category/tag route helper keeps arbitrary labels in one safe path segment.

Integration-style tests:

- The custom Astro loader stores entries by slug.
- Collection entries contain rendered Markdown.
- Category and tag helpers derive data from one collection snapshot.

E2E tests:

- `/posts` loads.
- `/categories` loads.
- `/tags` loads.

Build verification covers the real Notion-backed content sync path. In the verified local environment, `pnpm build` generated `/posts/test/` from the configured Notion content.

## Migration Notes

The old post rendering path based on `notion-client`, `react-notion-x`, record maps, and `src/styles/notion.css` has been removed from the active blog rendering path.

The older `src/server/notion/notion.ts` and `src/server/notion/notion-helpers.ts` remain for compatibility with non-post Notion behavior such as friends data. New blog post pages should use `astro:content` only.

## References

- Notion Data APIs guides: https://developers.notion.com/guides/data-apis
- Notion Markdown content guide: https://developers.notion.com/guides/data-apis/working-with-markdown-content
- Notion Enhanced Markdown guide: https://developers.notion.com/guides/data-apis/enhanced-markdown
- Notion database guide: https://developers.notion.com/guides/data-apis/working-with-databases
- Notion views guide: https://developers.notion.com/guides/data-apis/working-with-views
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- Astro Content Loader API: https://docs.astro.build/en/reference/content-loader-reference/
- Astro Routing reference: https://docs.astro.build/en/reference/routing-reference/
