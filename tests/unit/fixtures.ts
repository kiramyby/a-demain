// TODO: replace inline type with `import type { BlogPost } from '@/server/notion'`
// once src/server/ is committed to the repo.
type BlogPost = {
  id: string
  title: string
  slug: string
  status: string
  publishedDate: string | null
  updatedDate: string | null
  category: string
  tags: string[]
  description: string
  coverImage: string
  featured: boolean
  seoTitle?: string
  seoKeywords?: string[]
}

export function mockPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'test-id',
    title: 'Test Post',
    slug: 'test-post',
    status: 'Published',
    publishedDate: '2026-01-01',
    updatedDate: null,
    category: 'Tech',
    tags: [],
    description: 'A test post',
    coverImage: '',
    featured: false,
    seoTitle: undefined,
    seoKeywords: [],
    ...overrides,
  }
}
