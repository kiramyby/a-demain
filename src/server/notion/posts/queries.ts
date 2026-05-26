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
