import type { NotionClient } from "../client"
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

async function createDefaultClient(): Promise<NotionClient> {
  const { createNotionClient } = await import("../client")
  return createNotionClient()
}

export async function getPostMarkdown(
  pageId: string,
  client?: NotionClient,
): Promise<PostMarkdown> {
  try {
    const notionClient = client ?? (await createDefaultClient())
    const response = (await notionClient.pages.retrieveMarkdown({
      page_id: pageId,
    })) as PageMarkdownResponse
    const unknownBlockIds = response.unknown_block_ids ?? []

    if (response.truncated) {
      throw new NotionContentError("Markdown response is truncated", { pageId })
    }

    if (unknownBlockIds.length > 0) {
      throw new NotionContentError("Markdown response contains unknown blocks", {
        pageId,
        unknownBlockIds,
      })
    }

    return {
      markdown: response.markdown,
      truncated: response.truncated,
      unknownBlockIds,
    }
  } catch (error) {
    if (error instanceof NotionContentError) {
      throw error
    }
    throw new NotionQueryError(
      `Failed to retrieve Notion markdown for page ${pageId}`,
      error,
    )
  }
}
