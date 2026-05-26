import { describe, expect, it, vi } from "vitest"
import {
  clearPostRepositoryCache,
  getPublishedPostMetas,
} from "@/server/notion/posts/repository"
import { notionPostPage } from "./fixtures"

describe("getPublishedPostMetas", () => {
  it("uses configured view id before data source query", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        id: "query-1",
        results: [notionPostPage()],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({ deleted: true })

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
        query: vi
          .fn()
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
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        id: "query-1",
        results: [notionPostPage()],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({ deleted: true })

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
