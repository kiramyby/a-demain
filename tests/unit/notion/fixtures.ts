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

export function notionFriendPage(overrides: Record<string, unknown> = {}) {
  return {
    object: "page",
    id: "friend-1",
    properties: {
      Name: titleProperty("Kira"),
      URL: urlProperty("https://example.com"),
      Avatar: urlProperty("https://example.com/avatar.png"),
      Description: richTextProperty("A personal site"),
      Status: selectProperty("Active"),
      Group: selectProperty("Blog"),
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
