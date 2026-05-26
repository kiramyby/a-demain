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
