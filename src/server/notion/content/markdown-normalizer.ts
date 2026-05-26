import {
  findNotionMediaDiagnostics,
  type MarkdownDiagnostic,
} from "./media-policy"

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
