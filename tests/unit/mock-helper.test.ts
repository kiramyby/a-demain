// tests/unit/mock-helper.test.ts
import { describe, it, expect } from 'vitest'
import { mockPost } from './fixtures'

describe('mockPost', () => {
  it('returns a post with default values', () => {
    const post = mockPost()
    expect(post.slug).toBe('test-post')
    expect(post.status).toBe('Published')
  })

  it('applies overrides', () => {
    const post = mockPost({ slug: 'custom-slug', status: 'Draft' })
    expect(post.slug).toBe('custom-slug')
    expect(post.status).toBe('Draft')
  })
})
