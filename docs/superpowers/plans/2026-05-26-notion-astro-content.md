# Notion Astro Content Implementation Plan

> Historical execution record. Current implemented facts live in [docs/architecture/README.md](../../architecture/README.md) and [docs/architecture/blog-content-pipeline.md](../../architecture/blog-content-pipeline.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current partial Notion adapter with an Astro Content Collections pipeline that loads published Notion database entries and official Notion Markdown at build time.

**Architecture:** Notion remains the editorial source, but Astro becomes the build-time content system. A Notion repository fetches post metadata from a configured view or data source, a Markdown provider fetches page body content through `pages.retrieveMarkdown()`, and a custom Astro loader stores entries in a `posts` collection consumed by pages through `astro:content`.

**Tech Stack:** Astro 6.3, Astro Content Collections, `@notionhq/client` 5.13 with `notionVersion: "2026-03-11"`, TypeScript, Vitest, Playwright.

---

## Decisions Locked By Grill

- First version supports `NOTION_POSTS_VIEW_ID` as the preferred source and data source query as fallback.
- First version renders body content only through official Notion Markdown API.
- First version does not implement media sync; it renders Notion Markdown URLs as returned and reports Notion-hosted media warnings.
- `truncated: true` or non-empty `unknown_block_ids` fails the build.
- Astro custom loader is the integration target; pages do not call Notion repositories directly.
- Automated tests use mock clients and fixtures; real Notion verification is manual through `pnpm build` with `.env`.

## File Structure

Create:

- `src/content.config.ts` - Astro `posts` collection definition.
- `src/server/notion/client.ts` - official Notion client factory and API version constant.
- `src/server/notion/config.ts` - environment parsing and validation.
- `src/server/notion/errors.ts` - typed errors.
- `src/server/notion/database/data-source-resolver.ts` - data source resolution.
- `src/server/notion/database/view-resolver.ts` - raw View Query API wrapper.
- `src/server/notion/posts/schema.ts` - post domain types and property names.
- `src/server/notion/posts/mapper.ts` - Notion page to `BlogPostMeta` conversion.
- `src/server/notion/posts/queries.ts` - data source query body builders.
- `src/server/notion/posts/cache.ts` - build-process memoization helpers.
- `src/server/notion/posts/repository.ts` - published post metadata repository.
- `src/server/notion/content/markdown-provider.ts` - official Markdown API wrapper.
- `src/server/notion/content/markdown-normalizer.ts` - minimal Enhanced Markdown normalization and diagnostics.
- `src/server/notion/content/media-policy.ts` - Notion media URL diagnostics.
- `src/server/notion/astro/notion-posts-loader.ts` - Astro custom content loader.
- `src/server/notion/index.ts` - public server-side Notion exports.
- `tests/unit/notion/fixtures.ts` - reusable Notion fixtures.
- `tests/unit/notion/config.test.ts`
- `tests/unit/notion/mapper.test.ts`
- `tests/unit/notion/resolvers.test.ts`
- `tests/unit/notion/repository.test.ts`
- `tests/unit/notion/markdown-provider.test.ts`
- `tests/unit/notion/markdown-normalizer.test.ts`
- `tests/unit/notion/notion-posts-loader.test.ts`
- `src/pages/categories/[category].astro`
- `src/pages/tags/[tag].astro`

Modify:

- `.env.example` - add optional data source and view IDs.
- `src/pages/posts/index.astro` - render collection list.
- `src/pages/posts/[slug].astro` - render collection entry.
- `src/pages/categories/index.astro` - render category index from collection.
- `src/pages/tags/index.astro` - render tag index from collection.
- `src/layouts/Layout.astro` - remove `react-notion-x` CSS import.
- `package.json` / `pnpm-lock.yaml` - remove unused `notion-client` and `react-notion-x` dependencies after legacy files are deleted.

Delete:

- `src/components/NotionRenderer.tsx`
- `src/server/notion/notion-recordmap.ts`
- `src/server/notion/notion-page-map.ts`
- `src/styles/notion.css`

Keep for compatibility during this pass:

- `src/server/notion/notion.ts`
- `src/server/notion/notion-helpers.ts`

These old modules are no longer used by new pages after the loader lands. They can be removed in a separate cleanup once friend-link behavior is re-evaluated.

---

## Task 1: Add Test Fixtures For Notion Pages

**Files:**
- Create: `tests/unit/notion/fixtures.ts`

- [ ] **Step 1: Create reusable fixtures**

Create `tests/unit/notion/fixtures.ts`:

```ts
export function richTextProperty(text: string) {
  return {
    type: "rich_text",
    rich_text: [{ plain_text: text }],
  }
}

export function titleProperty(text: string) {
  return {
    type: "title",
    title: [{ plain_text: text }],
  }
}

export function statusProperty(name: string) {
  return {
    type: "status",
    status: { name },
  }
}

export function selectProperty(name: string | null) {
  return {
    type: "select",
    select: name ? { name } : null,
  }
}

export function multiSelectProperty(names: string[]) {
  return {
    type: "multi_select",
    multi_select: names.map((name) => ({ name })),
  }
}

export function dateProperty(start: string | null) {
  return {
    type: "date",
    date: start ? { start } : null,
  }
}

export function checkboxProperty(value: boolean) {
  return {
    type: "checkbox",
    checkbox: value,
  }
}

export function urlProperty(url: string | null) {
  return {
    type: "url",
    url,
  }
}

export function notionPostPage(overrides: Record<string, unknown> = {}) {
  return {
    object: "page",
    id: "page-1",
    properties: {
      Title: titleProperty("Hello Notion"),
      Slug: richTextProperty("hello-notion"),
      Status: statusProperty("Published"),
      "Published Date": dateProperty("2026-05-20"),
      "Updated Date": dateProperty("2026-05-21"),
      Category: selectProperty("Engineering"),
      Tags: multiSelectProperty(["Astro", "Notion"]),
      Description: richTextProperty("A post from Notion"),
      "Cover Image": urlProperty("https://example.com/cover.png"),
      Featured: checkboxProperty(true),
      "SEO Title": richTextProperty("SEO Hello Notion"),
      "SEO Keywords": multiSelectProperty(["cms", "blog"]),
    },
    ...overrides,
  }
}

export function markdownResponse(overrides: Record<string, unknown> = {}) {
  return {
    object: "page_markdown",
    id: "page-1",
    markdown: "# Hello Notion\n\nBody text.",
    truncated: false,
    unknown_block_ids: [],
    ...overrides,
  }
}
```

- [ ] **Step 2: Run existing unit tests**

Run: `pnpm test`

Expected: existing tests pass. The new fixture file has no tests yet.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/notion/fixtures.ts
git commit -m "test: add notion content fixtures"
```

---

## Task 2: Add Config, Client, Errors, And Post Schema

**Files:**
- Create: `src/server/notion/errors.ts`
- Create: `src/server/notion/config.ts`
- Create: `src/server/notion/client.ts`
- Create: `src/server/notion/posts/schema.ts`
- Test: `tests/unit/notion/config.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing config tests**

Create `tests/unit/notion/config.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { NotionConfigError } from "@/server/notion/errors"
import { readNotionConfig } from "@/server/notion/config"

describe("readNotionConfig", () => {
  it("requires the API key and posts database id", () => {
    expect(() => readNotionConfig({})).toThrow(NotionConfigError)
  })

  it("returns required and optional identifiers", () => {
    const config = readNotionConfig({
      NOTION_API_KEY: "secret-token",
      NOTION_POSTS_DATABASE_ID: "database-id",
      NOTION_POSTS_DATA_SOURCE_ID: "data-source-id",
      NOTION_POSTS_VIEW_ID: "view-id",
    })

    expect(config).toEqual({
      apiKey: "secret-token",
      postsDatabaseId: "database-id",
      postsDataSourceId: "data-source-id",
      postsViewId: "view-id",
    })
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- tests/unit/notion/config.test.ts`

Expected: FAIL with module not found for `@/server/notion/config` or `@/server/notion/errors`.

- [ ] **Step 3: Add error classes**

Create `src/server/notion/errors.ts`:

```ts
export class NotionConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotionConfigError"
  }
}

export class NotionQueryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = "NotionQueryError"
  }
}

export class NotionMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotionMappingError"
  }
}

export class NotionContentError extends Error {
  constructor(message: string, readonly details?: Record<string, unknown>) {
    super(message)
    this.name = "NotionContentError"
  }
}
```

- [ ] **Step 4: Add config reader**

Create `src/server/notion/config.ts`:

```ts
import { NotionConfigError } from "./errors"

export type NotionEnv = Record<string, string | undefined>

export type NotionConfig = {
  apiKey: string
  postsDatabaseId: string
  postsDataSourceId?: string
  postsViewId?: string
}

function defaultEnv(): NotionEnv {
  return {
    ...(typeof process !== "undefined" ? process.env : {}),
    ...((import.meta as unknown as { env?: NotionEnv }).env ?? {}),
  }
}

function required(env: NotionEnv, key: string): string {
  const value = env[key]
  if (!value) {
    throw new NotionConfigError(`Missing required environment variable: ${key}`)
  }
  return value
}

export function readNotionConfig(env: NotionEnv = defaultEnv()): NotionConfig {
  return {
    apiKey: required(env, "NOTION_API_KEY"),
    postsDatabaseId: required(env, "NOTION_POSTS_DATABASE_ID"),
    postsDataSourceId: env.NOTION_POSTS_DATA_SOURCE_ID || undefined,
    postsViewId: env.NOTION_POSTS_VIEW_ID || undefined,
  }
}
```

- [ ] **Step 5: Add client factory**

Create `src/server/notion/client.ts`:

```ts
import { Client } from "@notionhq/client"
import { readNotionConfig, type NotionConfig } from "./config"

export const NOTION_API_VERSION = "2026-03-11" as const

export type NotionClient = Client

export function createNotionClient(config: NotionConfig = readNotionConfig()): NotionClient {
  return new Client({
    auth: config.apiKey,
    notionVersion: NOTION_API_VERSION,
  })
}

export const notion = createNotionClient()
```

- [ ] **Step 6: Add post schema**

Create `src/server/notion/posts/schema.ts`:

```ts
export type BlogPostMeta = {
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

export const POST_PROPERTIES = {
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
} as const
```

- [ ] **Step 7: Update `.env.example`**

Change `.env.example` to:

```txt
# Notion API Configuration
NOTION_API_KEY=your_notion_integration_token
NOTION_POSTS_DATABASE_ID=your_posts_database_id

# Optional: use an explicit data source or saved Notion view.
NOTION_POSTS_DATA_SOURCE_ID=
NOTION_POSTS_VIEW_ID=

# Existing friends database integration.
NOTION_FRIENDS_DATABASE_ID=your_friends_database_id
```

- [ ] **Step 8: Verify tests**

Run: `pnpm test -- tests/unit/notion/config.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add .env.example src/server/notion/errors.ts src/server/notion/config.ts src/server/notion/client.ts src/server/notion/posts/schema.ts tests/unit/notion/config.test.ts
git commit -m "feat: add notion configuration core"
```

---

## Task 3: Map Notion Page Properties To BlogPostMeta

**Files:**
- Create: `src/server/notion/posts/mapper.ts`
- Test: `tests/unit/notion/mapper.test.ts`

- [ ] **Step 1: Write failing mapper tests**

Create `tests/unit/notion/mapper.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { mapNotionPageToPostMeta } from "@/server/notion/posts/mapper"
import { NotionMappingError } from "@/server/notion/errors"
import { notionPostPage } from "./fixtures"

describe("mapNotionPageToPostMeta", () => {
  it("maps a Notion page into a stable blog post model", () => {
    expect(mapNotionPageToPostMeta(notionPostPage())).toEqual({
      id: "page-1",
      title: "Hello Notion",
      slug: "hello-notion",
      status: "Published",
      publishedDate: "2026-05-20",
      updatedDate: "2026-05-21",
      category: "Engineering",
      tags: ["Astro", "Notion"],
      description: "A post from Notion",
      coverImage: "https://example.com/cover.png",
      featured: true,
      seoTitle: "SEO Hello Notion",
      seoKeywords: ["cms", "blog"],
    })
  })

  it("fails when title is missing", () => {
    const page = notionPostPage({
      properties: {
        ...notionPostPage().properties,
        Title: { type: "title", title: [] },
      },
    })

    expect(() => mapNotionPageToPostMeta(page)).toThrow(NotionMappingError)
  })

  it("fails when slug is missing", () => {
    const page = notionPostPage({
      properties: {
        ...notionPostPage().properties,
        Slug: { type: "rich_text", rich_text: [] },
      },
    })

    expect(() => mapNotionPageToPostMeta(page)).toThrow(NotionMappingError)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- tests/unit/notion/mapper.test.ts`

Expected: FAIL with module not found for `@/server/notion/posts/mapper`.

- [ ] **Step 3: Implement mapper**

Create `src/server/notion/posts/mapper.ts`:

```ts
import { NotionMappingError } from "../errors"
import { POST_PROPERTIES, type BlogPostMeta } from "./schema"

type NotionRichText = { plain_text?: string }
type NotionPageLike = {
  id?: string
  object?: string
  properties?: Record<string, any>
}

function plainText(items: NotionRichText[] | undefined): string {
  return Array.isArray(items) ? items.map((item) => item.plain_text ?? "").join("") : ""
}

function property(page: NotionPageLike, name: string): any {
  return page.properties?.[name]
}

function title(page: NotionPageLike, name: string): string {
  return plainText(property(page, name)?.title)
}

function richText(page: NotionPageLike, name: string): string {
  return plainText(property(page, name)?.rich_text)
}

function status(page: NotionPageLike, name: string): string {
  return property(page, name)?.status?.name ?? ""
}

function select(page: NotionPageLike, name: string): string | null {
  return property(page, name)?.select?.name ?? null
}

function multiSelect(page: NotionPageLike, name: string): string[] {
  return property(page, name)?.multi_select?.map((item: { name: string }) => item.name) ?? []
}

function date(page: NotionPageLike, name: string): string | null {
  return property(page, name)?.date?.start ?? null
}

function checkbox(page: NotionPageLike, name: string): boolean {
  return property(page, name)?.checkbox ?? false
}

function url(page: NotionPageLike, name: string): string | null {
  return property(page, name)?.url ?? null
}

function requiredValue(value: string | undefined, label: string, pageId: string): string {
  if (!value) {
    throw new NotionMappingError(`Missing required ${label} on Notion page ${pageId}`)
  }
  return value
}

export function mapNotionPageToPostMeta(page: NotionPageLike): BlogPostMeta {
  const id = requiredValue(page.id, "id", "unknown")
  const titleValue = requiredValue(title(page, POST_PROPERTIES.title), "Title", id)
  const slugValue = requiredValue(richText(page, POST_PROPERTIES.slug), "Slug", id)

  return {
    id,
    title: titleValue,
    slug: slugValue,
    status: status(page, POST_PROPERTIES.status),
    publishedDate: date(page, POST_PROPERTIES.publishedDate),
    updatedDate: date(page, POST_PROPERTIES.updatedDate),
    category: select(page, POST_PROPERTIES.category),
    tags: multiSelect(page, POST_PROPERTIES.tags),
    description: richText(page, POST_PROPERTIES.description),
    coverImage: url(page, POST_PROPERTIES.coverImage),
    featured: checkbox(page, POST_PROPERTIES.featured),
    seoTitle: richText(page, POST_PROPERTIES.seoTitle) || null,
    seoKeywords: multiSelect(page, POST_PROPERTIES.seoKeywords),
  }
}
```

- [ ] **Step 4: Verify mapper tests**

Run: `pnpm test -- tests/unit/notion/mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/notion/posts/mapper.ts tests/unit/notion/mapper.test.ts
git commit -m "feat: map notion pages to post metadata"
```

---

## Task 4: Resolve Data Sources And Query Views

**Files:**
- Create: `src/server/notion/database/data-source-resolver.ts`
- Create: `src/server/notion/database/view-resolver.ts`
- Test: `tests/unit/notion/resolvers.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Create `tests/unit/notion/resolvers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { NotionQueryError } from "@/server/notion/errors"
import { resolvePostsDataSourceId } from "@/server/notion/database/data-source-resolver"
import { queryViewPages } from "@/server/notion/database/view-resolver"
import { notionPostPage } from "./fixtures"

describe("resolvePostsDataSourceId", () => {
  it("uses an explicit data source id first", async () => {
    const client = { databases: { retrieve: vi.fn() } }

    await expect(
      resolvePostsDataSourceId(client as any, {
        postsDatabaseId: "db",
        postsDataSourceId: "explicit-ds",
      }),
    ).resolves.toBe("explicit-ds")

    expect(client.databases.retrieve).not.toHaveBeenCalled()
  })

  it("falls back to the first database data source", async () => {
    const client = {
      databases: {
        retrieve: vi.fn().mockResolvedValue({
          object: "database",
          data_sources: [{ id: "resolved-ds", name: "Posts" }],
        }),
      },
    }

    await expect(
      resolvePostsDataSourceId(client as any, { postsDatabaseId: "db" }),
    ).resolves.toBe("resolved-ds")
  })
})

describe("queryViewPages", () => {
  it("creates, paginates, and deletes a view query", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        object: "view_query",
        id: "query-1",
        results: [notionPostPage({ id: "page-1" })],
        next_cursor: "cursor-1",
        has_more: true,
      })
      .mockResolvedValueOnce({
        object: "view_query",
        id: "query-1",
        results: [notionPostPage({ id: "page-2" })],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({ object: "view_query", id: "query-1", deleted: true })

    const pages = await queryViewPages({ request } as any, "view-1")

    expect(pages.map((page: any) => page.id)).toEqual(["page-1", "page-2"])
    expect(request).toHaveBeenNthCalledWith(1, {
      method: "post",
      path: "views/view-1/queries",
      body: { page_size: 100 },
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "get",
      path: "views/view-1/queries/query-1",
      query: { start_cursor: "cursor-1", page_size: 100 },
    })
    expect(request).toHaveBeenNthCalledWith(3, {
      method: "delete",
      path: "views/view-1/queries/query-1",
    })
  })

  it("wraps query failures", async () => {
    await expect(queryViewPages({ request: vi.fn().mockRejectedValue(new Error("boom")) } as any, "view-1")).rejects.toThrow(NotionQueryError)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- tests/unit/notion/resolvers.test.ts`

Expected: FAIL with module not found for resolver modules.

- [ ] **Step 3: Add data source resolver**

Create `src/server/notion/database/data-source-resolver.ts`:

```ts
import { isFullDatabase } from "@notionhq/client"
import { NotionQueryError } from "../errors"

type Config = {
  postsDatabaseId: string
  postsDataSourceId?: string
}

type DatabaseClient = {
  databases: {
    retrieve(args: { database_id: string }): Promise<unknown>
  }
}

const dataSourceCache = new Map<string, string>()

export function clearDataSourceResolverCache(): void {
  dataSourceCache.clear()
}

export async function resolvePostsDataSourceId(client: DatabaseClient, config: Config): Promise<string> {
  if (config.postsDataSourceId) {
    return config.postsDataSourceId
  }

  if (dataSourceCache.has(config.postsDatabaseId)) {
    return dataSourceCache.get(config.postsDatabaseId)!
  }

  const database = await client.databases.retrieve({ database_id: config.postsDatabaseId })

  if (!isFullDatabase(database as any)) {
    throw new NotionQueryError(`No read permissions on database ${config.postsDatabaseId}`)
  }

  const dataSourceId = (database as any).data_sources?.[0]?.id
  if (!dataSourceId) {
    throw new NotionQueryError(`Database ${config.postsDatabaseId} has no data sources`)
  }

  dataSourceCache.set(config.postsDatabaseId, dataSourceId)
  return dataSourceId
}
```

- [ ] **Step 4: Add view resolver**

Create `src/server/notion/database/view-resolver.ts`:

```ts
import { NotionQueryError } from "../errors"

type RequestClient = {
  request(args: {
    method: "get" | "post" | "delete"
    path: string
    body?: Record<string, unknown>
    query?: Record<string, unknown>
  }): Promise<any>
}

type ViewQueryResponse = {
  id: string
  results: unknown[]
  next_cursor: string | null
  has_more: boolean
}

export async function queryViewPages(client: RequestClient, viewId: string, pageSize = 100): Promise<unknown[]> {
  let queryId: string | null = null

  try {
    const firstPage = (await client.request({
      method: "post",
      path: `views/${viewId}/queries`,
      body: { page_size: pageSize },
    })) as ViewQueryResponse

    queryId = firstPage.id
    const pages = [...firstPage.results]
    let cursor = firstPage.next_cursor

    while (cursor) {
      const nextPage = (await client.request({
        method: "get",
        path: `views/${viewId}/queries/${queryId}`,
        query: { start_cursor: cursor, page_size: pageSize },
      })) as ViewQueryResponse

      pages.push(...nextPage.results)
      cursor = nextPage.next_cursor
    }

    return pages
  } catch (error) {
    throw new NotionQueryError(`Failed to query Notion view ${viewId}`, error)
  } finally {
    if (queryId) {
      await client.request({
        method: "delete",
        path: `views/${viewId}/queries/${queryId}`,
      })
    }
  }
}
```

- [ ] **Step 5: Verify resolver tests**

Run: `pnpm test -- tests/unit/notion/resolvers.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/notion/database/data-source-resolver.ts src/server/notion/database/view-resolver.ts tests/unit/notion/resolvers.test.ts
git commit -m "feat: resolve notion data sources and views"
```

---

## Task 5: Implement Published Post Repository With Pagination And Cache

**Files:**
- Create: `src/server/notion/posts/queries.ts`
- Create: `src/server/notion/posts/cache.ts`
- Create: `src/server/notion/posts/repository.ts`
- Test: `tests/unit/notion/repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Create `tests/unit/notion/repository.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { getPublishedPostMetas, clearPostRepositoryCache } from "@/server/notion/posts/repository"
import { notionPostPage } from "./fixtures"

describe("getPublishedPostMetas", () => {
  it("uses configured view id before data source query", async () => {
    const request = vi.fn().mockResolvedValueOnce({
      id: "query-1",
      results: [notionPostPage()],
      next_cursor: null,
      has_more: false,
    }).mockResolvedValueOnce({ deleted: true })

    const posts = await getPublishedPostMetas({
      client: { request } as any,
      config: {
        apiKey: "secret",
        postsDatabaseId: "db",
        postsViewId: "view-1",
      },
    })

    expect(posts[0].slug).toBe("hello-notion")
    expect(request).toHaveBeenCalledWith({
      method: "post",
      path: "views/view-1/queries",
      body: { page_size: 100 },
    })
  })

  it("queries and paginates the resolved data source when no view id exists", async () => {
    const client = {
      databases: {
        retrieve: vi.fn().mockResolvedValue({
          object: "database",
          data_sources: [{ id: "ds-1", name: "Posts" }],
        }),
      },
      dataSources: {
        query: vi.fn()
          .mockResolvedValueOnce({
            results: [notionPostPage({ id: "page-1" })],
            next_cursor: "cursor-1",
            has_more: true,
          })
          .mockResolvedValueOnce({
            results: [notionPostPage({ id: "page-2" })],
            next_cursor: null,
            has_more: false,
          }),
      },
    }

    clearPostRepositoryCache()
    const posts = await getPublishedPostMetas({
      client: client as any,
      config: { apiKey: "secret", postsDatabaseId: "db" },
    })

    expect(posts.map((post) => post.id)).toEqual(["page-1", "page-2"])
    expect(client.dataSources.query).toHaveBeenNthCalledWith(1, {
      data_source_id: "ds-1",
      filter: { property: "Status", status: { equals: "Published" } },
      sorts: [{ property: "Published Date", direction: "descending" }],
      page_size: 100,
    })
    expect(client.dataSources.query).toHaveBeenNthCalledWith(2, {
      data_source_id: "ds-1",
      filter: { property: "Status", status: { equals: "Published" } },
      sorts: [{ property: "Published Date", direction: "descending" }],
      page_size: 100,
      start_cursor: "cursor-1",
    })
  })

  it("memoizes the post index during one process", async () => {
    const request = vi.fn().mockResolvedValueOnce({
      id: "query-1",
      results: [notionPostPage()],
      next_cursor: null,
      has_more: false,
    }).mockResolvedValueOnce({ deleted: true })

    clearPostRepositoryCache()
    await getPublishedPostMetas({
      client: { request } as any,
      config: { apiKey: "secret", postsDatabaseId: "db", postsViewId: "view-1" },
    })
    await getPublishedPostMetas({
      client: { request } as any,
      config: { apiKey: "secret", postsDatabaseId: "db", postsViewId: "view-1" },
    })

    expect(request).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- tests/unit/notion/repository.test.ts`

Expected: FAIL with module not found for repository.

- [ ] **Step 3: Add query builders**

Create `src/server/notion/posts/queries.ts`:

```ts
import { POST_PROPERTIES } from "./schema"

export function publishedPostsQuery(startCursor?: string) {
  return {
    filter: {
      property: POST_PROPERTIES.status,
      status: { equals: "Published" },
    },
    sorts: [
      {
        property: POST_PROPERTIES.publishedDate,
        direction: "descending" as const,
      },
    ],
    page_size: 100,
    ...(startCursor ? { start_cursor: startCursor } : {}),
  }
}
```

- [ ] **Step 4: Add repository cache**

Create `src/server/notion/posts/cache.ts`:

```ts
const cache = new Map<string, unknown>()

export function memoizeOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, loader())
  }
  return cache.get(key) as Promise<T>
}

export function clearNotionPostCache(): void {
  cache.clear()
}
```

- [ ] **Step 5: Add repository**

Create `src/server/notion/posts/repository.ts`:

```ts
import type { NotionClient } from "../client"
import { notion } from "../client"
import { readNotionConfig, type NotionConfig } from "../config"
import { NotionQueryError } from "../errors"
import { resolvePostsDataSourceId } from "../database/data-source-resolver"
import { queryViewPages } from "../database/view-resolver"
import { clearNotionPostCache, memoizeOnce } from "./cache"
import { mapNotionPageToPostMeta } from "./mapper"
import { publishedPostsQuery } from "./queries"
import type { BlogPostMeta } from "./schema"

type RepositoryDeps = {
  client?: NotionClient
  config?: NotionConfig
}

type DataSourceQueryResponse = {
  results: unknown[]
  next_cursor: string | null
  has_more: boolean
}

export function clearPostRepositoryCache(): void {
  clearNotionPostCache()
}

async function queryDataSourcePages(client: NotionClient, config: NotionConfig): Promise<unknown[]> {
  const dataSourceId = await resolvePostsDataSourceId(client, config)
  const pages: unknown[] = []
  let cursor: string | undefined

  do {
    const response = (await client.dataSources.query({
      data_source_id: dataSourceId,
      ...publishedPostsQuery(cursor),
    })) as DataSourceQueryResponse

    pages.push(...response.results)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return pages
}

async function loadPublishedPostMetas(client: NotionClient, config: NotionConfig): Promise<BlogPostMeta[]> {
  try {
    const pages = config.postsViewId
      ? await queryViewPages(client, config.postsViewId)
      : await queryDataSourcePages(client, config)

    return pages.map((page) => mapNotionPageToPostMeta(page as any))
  } catch (error) {
    if (error instanceof Error && error.name.startsWith("Notion")) {
      throw error
    }
    throw new NotionQueryError("Failed to load published Notion posts", error)
  }
}

export function getPublishedPostMetas(deps: RepositoryDeps = {}): Promise<BlogPostMeta[]> {
  const client = deps.client ?? notion
  const config = deps.config ?? readNotionConfig()
  const sourceKey = config.postsViewId ?? config.postsDataSourceId ?? config.postsDatabaseId

  return memoizeOnce(`published-posts:${sourceKey}`, () => loadPublishedPostMetas(client, config))
}

export async function getPostMetaBySlug(slug: string, deps: RepositoryDeps = {}): Promise<BlogPostMeta | null> {
  const posts = await getPublishedPostMetas(deps)
  return posts.find((post) => post.slug === slug) ?? null
}
```

- [ ] **Step 6: Verify repository tests**

Run: `pnpm test -- tests/unit/notion/repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/notion/posts/queries.ts src/server/notion/posts/cache.ts src/server/notion/posts/repository.ts tests/unit/notion/repository.test.ts
git commit -m "feat: load published notion post metadata"
```

---

## Task 6: Add Markdown Provider, Normalizer, And Media Diagnostics

**Files:**
- Create: `src/server/notion/content/markdown-provider.ts`
- Create: `src/server/notion/content/markdown-normalizer.ts`
- Create: `src/server/notion/content/media-policy.ts`
- Test: `tests/unit/notion/markdown-provider.test.ts`
- Test: `tests/unit/notion/markdown-normalizer.test.ts`

- [ ] **Step 1: Write failing Markdown provider tests**

Create `tests/unit/notion/markdown-provider.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { getPostMarkdown } from "@/server/notion/content/markdown-provider"
import { NotionContentError, NotionQueryError } from "@/server/notion/errors"
import { markdownResponse } from "./fixtures"

describe("getPostMarkdown", () => {
  it("returns markdown and diagnostics", async () => {
    const client = {
      pages: {
        retrieveMarkdown: vi.fn().mockResolvedValue(markdownResponse()),
      },
    }

    await expect(getPostMarkdown("page-1", client as any)).resolves.toEqual({
      markdown: "# Hello Notion\n\nBody text.",
      truncated: false,
      unknownBlockIds: [],
    })
  })

  it("fails on truncated markdown", async () => {
    const client = {
      pages: {
        retrieveMarkdown: vi.fn().mockResolvedValue(markdownResponse({ truncated: true })),
      },
    }

    await expect(getPostMarkdown("page-1", client as any)).rejects.toThrow(NotionContentError)
  })

  it("fails on unknown blocks", async () => {
    const client = {
      pages: {
        retrieveMarkdown: vi.fn().mockResolvedValue(markdownResponse({ unknown_block_ids: ["block-1"] })),
      },
    }

    await expect(getPostMarkdown("page-1", client as any)).rejects.toThrow(NotionContentError)
  })

  it("wraps API failures", async () => {
    const client = {
      pages: {
        retrieveMarkdown: vi.fn().mockRejectedValue(new Error("network")),
      },
    }

    await expect(getPostMarkdown("page-1", client as any)).rejects.toThrow(NotionQueryError)
  })
})
```

- [ ] **Step 2: Write failing normalizer tests**

Create `tests/unit/notion/markdown-normalizer.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { normalizeNotionMarkdown } from "@/server/notion/content/markdown-normalizer"

describe("normalizeNotionMarkdown", () => {
  it("preserves regular markdown", () => {
    expect(normalizeNotionMarkdown("# Title\n\nBody.")).toEqual({
      markdown: "# Title\n\nBody.",
      diagnostics: [],
    })
  })

  it("reports Notion-hosted media URLs", () => {
    const result = normalizeNotionMarkdown("![x](https://prod-files-secure.s3.us-west-2.amazonaws.com/file.png)")

    expect(result.diagnostics).toEqual([
      {
        type: "notion-signed-media-url",
        message: "Markdown contains a Notion-hosted signed media URL that may expire.",
      },
    ])
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm test -- tests/unit/notion/markdown-provider.test.ts tests/unit/notion/markdown-normalizer.test.ts`

Expected: FAIL with module not found for content modules.

- [ ] **Step 4: Implement media policy**

Create `src/server/notion/content/media-policy.ts`:

```ts
export type MarkdownDiagnostic = {
  type: "notion-signed-media-url"
  message: string
}

const NOTION_SIGNED_MEDIA_PATTERNS = [
  "prod-files-secure",
  "s3.us-west-2.amazonaws.com",
  "notion-static.com",
]

export function findNotionMediaDiagnostics(markdown: string): MarkdownDiagnostic[] {
  const hasSignedMediaUrl = NOTION_SIGNED_MEDIA_PATTERNS.some((pattern) => markdown.includes(pattern))

  return hasSignedMediaUrl
    ? [
        {
          type: "notion-signed-media-url",
          message: "Markdown contains a Notion-hosted signed media URL that may expire.",
        },
      ]
    : []
}
```

- [ ] **Step 5: Implement normalizer**

Create `src/server/notion/content/markdown-normalizer.ts`:

```ts
import { findNotionMediaDiagnostics, type MarkdownDiagnostic } from "./media-policy"

export type NormalizedMarkdown = {
  markdown: string
  diagnostics: MarkdownDiagnostic[]
}

export function normalizeNotionMarkdown(markdown: string): NormalizedMarkdown {
  return {
    markdown,
    diagnostics: findNotionMediaDiagnostics(markdown),
  }
}
```

- [ ] **Step 6: Implement Markdown provider**

Create `src/server/notion/content/markdown-provider.ts`:

```ts
import type { NotionClient } from "../client"
import { notion } from "../client"
import { NotionContentError, NotionQueryError } from "../errors"

export type PostMarkdown = {
  markdown: string
  truncated: boolean
  unknownBlockIds: string[]
}

type PageMarkdownResponse = {
  markdown: string
  truncated: boolean
  unknown_block_ids: string[]
}

export async function getPostMarkdown(pageId: string, client: NotionClient = notion): Promise<PostMarkdown> {
  try {
    const response = (await client.pages.retrieveMarkdown({ page_id: pageId })) as PageMarkdownResponse

    if (response.truncated) {
      throw new NotionContentError("Markdown response is truncated", { pageId })
    }

    if (response.unknown_block_ids.length > 0) {
      throw new NotionContentError("Markdown response contains unknown blocks", {
        pageId,
        unknownBlockIds: response.unknown_block_ids,
      })
    }

    return {
      markdown: response.markdown,
      truncated: response.truncated,
      unknownBlockIds: response.unknown_block_ids,
    }
  } catch (error) {
    if (error instanceof NotionContentError) {
      throw error
    }
    throw new NotionQueryError(`Failed to retrieve Notion markdown for page ${pageId}`, error)
  }
}
```

- [ ] **Step 7: Verify content tests**

Run: `pnpm test -- tests/unit/notion/markdown-provider.test.ts tests/unit/notion/markdown-normalizer.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/server/notion/content/markdown-provider.ts src/server/notion/content/markdown-normalizer.ts src/server/notion/content/media-policy.ts tests/unit/notion/markdown-provider.test.ts tests/unit/notion/markdown-normalizer.test.ts
git commit -m "feat: retrieve notion markdown content"
```

---

## Task 7: Implement Astro Content Loader

**Files:**
- Create: `src/server/notion/astro/notion-posts-loader.ts`
- Create: `src/server/notion/index.ts`
- Test: `tests/unit/notion/notion-posts-loader.test.ts`

- [ ] **Step 1: Write failing loader test**

Create `tests/unit/notion/notion-posts-loader.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { notionPostsLoader } from "@/server/notion/astro/notion-posts-loader"

describe("notionPostsLoader", () => {
  it("stores rendered entries by slug", async () => {
    const set = vi.fn()
    const loader = notionPostsLoader({
      loadPostMetas: async () => [
        {
          id: "page-1",
          title: "Hello Notion",
          slug: "hello-notion",
          status: "Published",
          publishedDate: "2026-05-20",
          updatedDate: null,
          category: "Engineering",
          tags: ["Astro"],
          description: "Description",
          coverImage: null,
          featured: false,
          seoTitle: null,
          seoKeywords: [],
        },
      ],
      loadMarkdown: async () => ({
        markdown: "# Hello Notion",
        truncated: false,
        unknownBlockIds: [],
      }),
    })

    await loader.load({
      store: {
        clear: vi.fn(),
        set,
      },
      parseData: async ({ data }: any) => data,
      renderMarkdown: async (markdown: string) => ({ html: `<h1>${markdown.replace("# ", "")}</h1>` }),
      generateDigest: (value: unknown) => JSON.stringify(value),
      logger: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    } as any)

    expect(set).toHaveBeenCalledWith({
      id: "hello-notion",
      data: {
        notionPageId: "page-1",
        title: "Hello Notion",
        slug: "hello-notion",
        status: "Published",
        publishedDate: "2026-05-20",
        updatedDate: null,
        category: "Engineering",
        tags: ["Astro"],
        description: "Description",
        coverImage: null,
        featured: false,
        seoTitle: null,
        seoKeywords: [],
      },
      body: "# Hello Notion",
      rendered: { html: "<h1>Hello Notion</h1>" },
      digest: expect.any(String),
    })
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- tests/unit/notion/notion-posts-loader.test.ts`

Expected: FAIL with module not found for `notion-posts-loader`.

- [ ] **Step 3: Implement loader**

Create `src/server/notion/astro/notion-posts-loader.ts`:

```ts
import { getPostMarkdown, type PostMarkdown } from "../content/markdown-provider"
import { normalizeNotionMarkdown } from "../content/markdown-normalizer"
import { getPublishedPostMetas } from "../posts/repository"
import type { BlogPostMeta } from "../posts/schema"

type LoaderContext = {
  store: {
    clear(): void
    set(entry: {
      id: string
      data: Record<string, unknown>
      body: string
      rendered: unknown
      digest: string
    }): void
  }
  parseData(args: { id: string; data: Record<string, unknown> }): Promise<Record<string, unknown>>
  renderMarkdown(markdown: string): Promise<unknown>
  generateDigest(value: unknown): string
  logger: {
    warn(message: string): void
  }
}

type NotionPostsLoaderDeps = {
  loadPostMetas?: () => Promise<BlogPostMeta[]>
  loadMarkdown?: (pageId: string) => Promise<PostMarkdown>
}

function toCollectionData(post: BlogPostMeta): Record<string, unknown> {
  return {
    notionPageId: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    publishedDate: post.publishedDate,
    updatedDate: post.updatedDate,
    category: post.category,
    tags: post.tags,
    description: post.description,
    coverImage: post.coverImage,
    featured: post.featured,
    seoTitle: post.seoTitle,
    seoKeywords: post.seoKeywords,
  }
}

export function notionPostsLoader(deps: NotionPostsLoaderDeps = {}) {
  const loadPostMetas = deps.loadPostMetas ?? getPublishedPostMetas
  const loadMarkdown = deps.loadMarkdown ?? getPostMarkdown

  return {
    name: "notion-posts-loader",
    async load(context: LoaderContext) {
      context.store.clear()
      const posts = await loadPostMetas()

      for (const post of posts) {
        const content = await loadMarkdown(post.id)
        const normalized = normalizeNotionMarkdown(content.markdown)

        for (const diagnostic of normalized.diagnostics) {
          context.logger.warn(`[${post.slug}] ${diagnostic.message}`)
        }

        const data = await context.parseData({
          id: post.slug,
          data: toCollectionData(post),
        })
        const rendered = await context.renderMarkdown(normalized.markdown)
        const digest = context.generateDigest({
          data,
          markdown: normalized.markdown,
        })

        context.store.set({
          id: post.slug,
          data,
          body: normalized.markdown,
          rendered,
          digest,
        })
      }
    },
  }
}
```

- [ ] **Step 4: Add public exports**

Create `src/server/notion/index.ts`:

```ts
export { NOTION_API_VERSION, createNotionClient } from "./client"
export { readNotionConfig } from "./config"
export { notionPostsLoader } from "./astro/notion-posts-loader"
export { getPublishedPostMetas, getPostMetaBySlug } from "./posts/repository"
export type { BlogPostMeta } from "./posts/schema"
```

- [ ] **Step 5: Verify loader test**

Run: `pnpm test -- tests/unit/notion/notion-posts-loader.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/notion/astro/notion-posts-loader.ts src/server/notion/index.ts tests/unit/notion/notion-posts-loader.test.ts
git commit -m "feat: add notion astro content loader"
```

---

## Task 8: Register The Astro Posts Collection

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Add content collection config**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from "astro:content"
import { notionPostsLoader } from "@/server/notion"

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

export const collections = { posts }
```

- [ ] **Step 2: Run type generation**

Run: `pnpm typecheck`

Expected: This may still fail on legacy `react-notion-x` imports until Task 10. The content config should not introduce new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: register notion posts collection"
```

---

## Task 9: Render Posts, Post Details, Categories, And Tags From Collections

**Files:**
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/posts/[slug].astro`
- Modify: `src/pages/categories/index.astro`
- Create: `src/pages/categories/[category].astro`
- Modify: `src/pages/tags/index.astro`
- Create: `src/pages/tags/[tag].astro`

- [ ] **Step 1: Update posts index**

Replace `src/pages/posts/index.astro` with:

```astro
---
import { getCollection } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

const posts = (await getCollection("posts")).sort((a, b) => {
  const left = a.data.publishedDate?.valueOf() ?? 0;
  const right = b.data.publishedDate?.valueOf() ?? 0;
  return right - left;
});
---

<BrowseLayout>
  <section class="px-6 py-10 lg:px-10">
    <h1 class="text-4xl font-bold">Posts</h1>
    <div class="mt-8 grid gap-4">
      {
        posts.map((post) => (
          <article class="border-border bg-secondary-background border-3 p-5">
            <a class="text-2xl font-bold hover:underline" href={`/posts/${post.id}/`}>
              {post.data.title}
            </a>
            <p class="mt-2 text-sm">{post.data.description}</p>
            <div class="mt-4 flex flex-wrap gap-2 text-sm">
              {post.data.category && <a href={`/categories/${post.data.category}/`}>{post.data.category}</a>}
              {post.data.tags.map((tag) => (
                <a href={`/tags/${tag}/`}>#{tag}</a>
              ))}
            </div>
          </article>
        ))
      }
    </div>
  </section>
</BrowseLayout>
```

- [ ] **Step 2: Update post detail route**

Replace `src/pages/posts/[slug].astro` with:

```astro
---
import { getCollection, render, type CollectionEntry } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

type Props = {
  post: CollectionEntry<"posts">;
};

const { post } = Astro.props;
const { Content, headings } = await render(post);
---

<BrowseLayout>
  <article class="px-6 py-10 lg:px-10">
    <header class="mb-8">
      <a href="/posts/" class="text-sm hover:underline">Posts</a>
      <h1 class="mt-3 text-4xl font-bold">{post.data.title}</h1>
      {post.data.description && <p class="mt-3">{post.data.description}</p>}
      <div class="mt-4 flex flex-wrap gap-2 text-sm">
        {post.data.category && <a href={`/categories/${post.data.category}/`}>{post.data.category}</a>}
        {post.data.tags.map((tag) => <a href={`/tags/${tag}/`}>#{tag}</a>)}
      </div>
    </header>

    {headings.length > 0 && (
      <nav class="mb-8 border-border border-3 p-4">
        <h2 class="font-bold">Contents</h2>
        <ol class="mt-2 grid gap-1 text-sm">
          {headings.map((heading) => (
            <li>
              <a href={`#${heading.slug}`}>{heading.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    )}

    <div class="prose max-w-none">
      <Content />
    </div>
  </article>
</BrowseLayout>
```

- [ ] **Step 3: Update category index**

Replace `src/pages/categories/index.astro` with:

```astro
---
import { getCollection } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

const posts = await getCollection("posts");
const categories = Array.from(new Set(posts.map((post) => post.data.category).filter(Boolean))).sort();
---

<BrowseLayout>
  <section class="px-6 py-10 lg:px-10">
    <h1 class="text-4xl font-bold">Categories</h1>
    <div class="mt-8 flex flex-wrap gap-3">
      {categories.map((category) => <a class="border-border border-3 px-4 py-2" href={`/categories/${category}/`}>{category}</a>)}
    </div>
  </section>
</BrowseLayout>
```

- [ ] **Step 4: Add category detail route**

Create `src/pages/categories/[category].astro`:

```astro
---
import { getCollection, type CollectionEntry } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  const categories = Array.from(new Set(posts.map((post) => post.data.category).filter(Boolean)));

  return categories.map((category) => ({
    params: { category },
    props: {
      category,
      posts: posts.filter((post) => post.data.category === category),
    },
  }));
}

type Props = {
  category: string;
  posts: CollectionEntry<"posts">[];
};

const { category, posts } = Astro.props;
---

<BrowseLayout>
  <section class="px-6 py-10 lg:px-10">
    <a href="/categories/" class="text-sm hover:underline">Categories</a>
    <h1 class="mt-3 text-4xl font-bold">{category}</h1>
    <div class="mt-8 grid gap-4">
      {posts.map((post) => (
        <article class="border-border bg-secondary-background border-3 p-5">
          <a class="text-2xl font-bold hover:underline" href={`/posts/${post.id}/`}>{post.data.title}</a>
          <p class="mt-2 text-sm">{post.data.description}</p>
        </article>
      ))}
    </div>
  </section>
</BrowseLayout>
```

- [ ] **Step 5: Update tag index**

Replace `src/pages/tags/index.astro` with:

```astro
---
import { getCollection } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

const posts = await getCollection("posts");
const tags = Array.from(new Set(posts.flatMap((post) => post.data.tags))).sort();
---

<BrowseLayout>
  <section class="px-6 py-10 lg:px-10">
    <h1 class="text-4xl font-bold">Tags</h1>
    <div class="mt-8 flex flex-wrap gap-3">
      {tags.map((tag) => <a class="border-border border-3 px-4 py-2" href={`/tags/${tag}/`}>#{tag}</a>)}
    </div>
  </section>
</BrowseLayout>
```

- [ ] **Step 6: Add tag detail route**

Create `src/pages/tags/[tag].astro`:

```astro
---
import { getCollection, type CollectionEntry } from "astro:content";
import BrowseLayout from "@/layouts/BrowseLayout.astro";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  const tags = Array.from(new Set(posts.flatMap((post) => post.data.tags)));

  return tags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts.filter((post) => post.data.tags.includes(tag)),
    },
  }));
}

type Props = {
  tag: string;
  posts: CollectionEntry<"posts">[];
};

const { tag, posts } = Astro.props;
---

<BrowseLayout>
  <section class="px-6 py-10 lg:px-10">
    <a href="/tags/" class="text-sm hover:underline">Tags</a>
    <h1 class="mt-3 text-4xl font-bold">#{tag}</h1>
    <div class="mt-8 grid gap-4">
      {posts.map((post) => (
        <article class="border-border bg-secondary-background border-3 p-5">
          <a class="text-2xl font-bold hover:underline" href={`/posts/${post.id}/`}>{post.data.title}</a>
          <p class="mt-2 text-sm">{post.data.description}</p>
        </article>
      ))}
    </div>
  </section>
</BrowseLayout>
```

- [ ] **Step 7: Run route typecheck**

Run: `pnpm typecheck`

Expected: May still fail on legacy Notion renderer until Task 10. New route files should not introduce collection API errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/posts/index.astro src/pages/posts/\[slug\].astro src/pages/categories/index.astro src/pages/categories/\[category\].astro src/pages/tags/index.astro src/pages/tags/\[tag\].astro
git commit -m "feat: render posts from astro content"
```

---

## Task 10: Remove Legacy RecordMap Path And Unused Dependencies

**Files:**
- Delete: `src/components/NotionRenderer.tsx`
- Delete: `src/server/notion/notion-recordmap.ts`
- Delete: `src/server/notion/notion-page-map.ts`
- Delete: `src/styles/notion.css`
- Modify: `src/layouts/Layout.astro`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Remove legacy CSS imports**

Update `src/layouts/Layout.astro` frontmatter to:

```astro
---
import "../styles/global.css";
import { ClientRouter } from "astro:transitions";
---
```

- [ ] **Step 2: Delete legacy files**

Delete:

```txt
src/components/NotionRenderer.tsx
src/server/notion/notion-recordmap.ts
src/server/notion/notion-page-map.ts
src/styles/notion.css
```

- [ ] **Step 3: Remove unused dependencies**

Run: `pnpm remove notion-client react-notion-x`

Expected: `package.json` no longer lists `notion-client` or `react-notion-x`, and `pnpm-lock.yaml` updates.

- [ ] **Step 4: Verify no legacy imports remain**

Run: `rg -n "react-notion-x|notion-client|notion-types|NotionRenderer|notion-recordmap|notion-page-map|notion.css" src package.json`

Expected: no output.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS or only unrelated pre-existing warnings. The previous `Cannot find module 'notion-types'` error must be gone.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Layout.astro package.json pnpm-lock.yaml
git add -u src/components/NotionRenderer.tsx src/server/notion/notion-recordmap.ts src/server/notion/notion-page-map.ts src/styles/notion.css
git commit -m "refactor: remove legacy notion renderer"
```

---

## Task 11: Add Build Verification Tests

**Files:**
- Test: `tests/e2e/smoke.test.ts`

- [ ] **Step 1: Review current smoke test**

Run: `sed -n '1,220p' tests/e2e/smoke.test.ts`

Expected: identify current homepage coverage.

- [ ] **Step 2: Add route smoke checks**

Append these tests below the existing homepage smoke test. Reuse the existing `import { test, expect } from "@playwright/test"` line already present in `tests/e2e/smoke.test.ts`.

Add this structure:

```ts
test("/posts loads", async ({ page }) => {
  await page.goto("/posts")
  await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible()
})

test("/categories loads", async ({ page }) => {
  await page.goto("/categories")
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible()
})

test("/tags loads", async ({ page }) => {
  await page.goto("/tags")
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible()
})
```

- [ ] **Step 3: Run unit tests**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Run build with real `.env`**

Run: `pnpm build`

Expected: Build succeeds when `.env` contains valid Notion credentials and at least one published post. If Notion returns `truncated` or unknown blocks, build fails with `NotionContentError`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/smoke.test.ts
git commit -m "test: cover content routes"
```

---

## Task 12: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused unit suite**

Run: `pnpm test -- tests/unit/notion`

Expected: all Notion unit tests pass.

- [ ] **Step 2: Run all unit tests**

Run: `pnpm test`

Expected: all unit tests pass.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: typecheck passes.

- [ ] **Step 4: Run production build**

Run: `pnpm build`

Expected: Astro builds static pages from the Notion-backed `posts` collection.

- [ ] **Step 5: Inspect git status**

Run: `git status --short`

Expected: clean working tree after the final commit.

---

## Self-Review

Spec coverage:

- Notion `2026-03-11` version pin is covered in Task 2.
- Database, data source, and view resolution are covered in Tasks 4 and 5.
- Official Markdown API body retrieval is covered in Task 6.
- Astro Content Collection integration is covered in Tasks 7 and 8.
- Routes deriving from `astro:content` are covered in Task 9.
- Legacy `react-notion-x` removal is covered in Task 10.
- Mock-first tests are covered in Tasks 1 through 7 and Task 11.
- Manual real Notion verification is covered in Task 12.

Type consistency:

- `BlogPostMeta.id` is the Notion page id.
- Collection entry id is the slug.
- Collection data uses `notionPageId` for the Notion page id.
- Markdown provider returns camelCase `unknownBlockIds` while consuming Notion's `unknown_block_ids`.

Operational notes:

- If `@notionhq/client` adds official `views` methods before implementation begins, keep `view-resolver.ts` as the adapter boundary and swap only its internals.
- If `pnpm build` cannot run locally because `.env` is unavailable, run `pnpm test` and `pnpm typecheck`, then verify `pnpm build` in the environment that has Notion credentials.
