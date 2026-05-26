export type BlogPostMeta = {
  id: string
  title: string
  slug: string
  status: string
  publishedDate: string | null
  updatedDate: string | null
  category: string | null
  tags: string[]
  description: string
  coverImage: string | null
  featured: boolean
  seoTitle: string | null
  seoKeywords: string[]
}

export const POST_PROPERTIES = {
  title: "Title",
  slug: "Slug",
  status: "Status",
  publishedDate: "Published Date",
  updatedDate: "Updated Date",
  category: "Category",
  tags: "Tags",
  description: "Description",
  coverImage: "Cover Image",
  featured: "Featured",
  seoTitle: "SEO Title",
  seoKeywords: "SEO Keywords",
} as const
