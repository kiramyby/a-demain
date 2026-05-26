import type { Loader, LoaderContext } from "astro/loaders"
import {
  getPostMarkdown,
  type PostMarkdown,
} from "../content/markdown-provider"
import { normalizeNotionMarkdown } from "../content/markdown-normalizer"
import { getPublishedPostMetas } from "../posts/repository"
import type { BlogPostMeta } from "../posts/schema"

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

export function notionPostsLoader(deps: NotionPostsLoaderDeps = {}): Loader {
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
