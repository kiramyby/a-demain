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
