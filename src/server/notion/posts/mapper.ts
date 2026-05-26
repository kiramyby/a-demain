import { NotionMappingError } from "../errors"
import { POST_PROPERTIES, type BlogPostMeta } from "./schema"

type NotionRichText = { plain_text?: string }
type NotionProperty = {
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  status?: { name?: string } | null
  select?: { name?: string } | null
  multi_select?: { name?: string }[]
  date?: { start?: string | null } | null
  checkbox?: boolean
  url?: string | null
}

type NotionPageLike = {
  id?: string
  object?: string
  properties?: Record<string, NotionProperty>
}

function plainText(items: NotionRichText[] | undefined): string {
  return Array.isArray(items)
    ? items.map((item) => item.plain_text ?? "").join("")
    : ""
}

function property(page: NotionPageLike, name: string): NotionProperty | undefined {
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
  return (
    property(page, name)?.multi_select
      ?.map((item) => item.name)
      .filter((name): name is string => Boolean(name)) ?? []
  )
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

function requiredValue(
  value: string | undefined,
  label: string,
  pageId: string,
): string {
  if (!value) {
    throw new NotionMappingError(
      `Missing required ${label} on Notion page ${pageId}`,
    )
  }
  return value
}

export function mapNotionPageToPostMeta(page: NotionPageLike): BlogPostMeta {
  const id = requiredValue(page.id, "id", "unknown")
  const titleValue = requiredValue(
    title(page, POST_PROPERTIES.title),
    "Title",
    id,
  )
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
