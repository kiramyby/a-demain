# Notion Astro Content Design

Date: 2026-05-26

## Goal

Use Notion as the editorial source for blog posts while making Astro the content system of record at build time.

The site should treat Notion as a remote CMS and expose posts through Astro Content Collections. Astro pages should query `astro:content`, not call Notion directly.

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
    posts-database.ts
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
    block-provider.ts
    media-policy.ts

  astro/
    notion-posts-loader.ts

  index.ts
```

## Responsibilities

### `client.ts`

Creates the official `@notionhq/client` instance and pins `notionVersion` to `2026-03-11`.

No business logic belongs here.

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

The repository must paginate API results and memoize the post index during a build.

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

First version behavior:

- Preserve standard Markdown.
- Preserve enhanced HTML-like tags when Astro can pass them through.
- Record unsupported blocks as diagnostics.
- Avoid custom rendering logic until a concrete unsupported block appears.

### `content/block-provider.ts`

Fallback-only provider for cases where Markdown output contains unknown blocks or a future feature needs structured block data.

It should not be the default post body path.

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
src/pages/categories/[category].astro
src/pages/tags/[tag].astro
```

Derive paths from `getCollection("posts")`, not from separate Notion calls.

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

## Caching

Use process-level memoization during a single Astro build:

- Resolved config
- Resolved data source
- Published post metadata index
- Per-page markdown response

Do not add persistent disk caching in the first implementation.

Do not persist Notion signed file URLs across builds.

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
- Markdown provider maps Notion markdown responses and preserves diagnostics.

Integration-style tests:

- The custom Astro loader stores entries by slug.
- Collection entries contain rendered Markdown.
- Category and tag helpers derive data from one collection snapshot.

E2E tests:

- `/posts` renders published entries.
- `/posts/[slug]` renders the Markdown body.
- Tag/category pages link to the expected posts.

## Migration Notes

The existing `src/server/notion/notion.ts` should be split along the module boundaries above.

The existing `notion-client` and `react-notion-x` recordMap path should not be the default implementation. It can be retained temporarily as a legacy high-fidelity renderer only if a concrete page requires it.

## References

- Notion Data APIs guides: https://developers.notion.com/guides/data-apis
- Notion Markdown content guide: https://developers.notion.com/guides/data-apis/working-with-markdown-content
- Notion Enhanced Markdown guide: https://developers.notion.com/guides/data-apis/enhanced-markdown
- Notion database guide: https://developers.notion.com/guides/data-apis/working-with-databases
- Notion views guide: https://developers.notion.com/guides/data-apis/working-with-views
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- Astro Content Loader API: https://docs.astro.build/en/reference/content-loader-reference/
- Astro Routing reference: https://docs.astro.build/en/reference/routing-reference/
