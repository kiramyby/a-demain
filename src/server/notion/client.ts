import { Client } from "@notionhq/client"
import { readNotionConfig, type NotionConfig } from "./config"

export const NOTION_API_VERSION = "2026-03-11" as const

export type NotionClient = Client
type NotionClientConfig = Pick<NotionConfig, "apiKey">

export function createNotionClient(config: NotionClientConfig = readNotionConfig()): NotionClient {
  return new Client({
    auth: config.apiKey,
    notionVersion: NOTION_API_VERSION,
  })
}

let defaultClient: NotionClient | undefined

export function getDefaultNotionClient(): NotionClient {
  defaultClient ??= createNotionClient()
  return defaultClient
}

export const notion = new Proxy({} as NotionClient, {
  get(_target, property) {
    const client = getDefaultNotionClient()
    const value = client[property as keyof NotionClient]
    return typeof value === "function" ? value.bind(client) : value
  },
})
