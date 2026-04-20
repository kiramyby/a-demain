# Testing Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a complete testing infrastructure covering E2E UI tests (Playwright) and unit/integration tests (Vitest), usable for both frontend layout tests and backend Notion adapter tests.

**Architecture:** Two test layers — Playwright for browser-level E2E tests that need a real DOM and navigation, Vitest for fast unit tests of server-side logic (Notion queries, data transformation, helpers). Both share a `tests/` directory with clear subdirectory separation.

**Tech Stack:** Playwright (E2E), Vitest (unit), @astrojs/check (type checking)

---

## File Map

| Action | File |
|--------|------|
| Create | `playwright.config.ts` — E2E test runner config |
| Create | `vitest.config.ts` — unit test runner config |
| Create | `tests/e2e/.gitkeep` — E2E test directory |
| Create | `tests/unit/.gitkeep` — unit test directory |
| Create | `tests/e2e/example.test.ts` — smoke test verifying Playwright works |
| Create | `tests/unit/example.test.ts` — smoke test verifying Vitest works |
| Modify | `package.json` — add test scripts |

---

## Task 1: Install Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Expected: `✔ chromium` downloaded under `~/.cache/ms-playwright`.

- [ ] **Step 2: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 3: Create `tests/e2e/` directory with smoke test**

```typescript
// tests/e2e/smoke.test.ts
import { test, expect } from '@playwright/test'

test('dev server is reachable', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(400)
})
```

- [ ] **Step 4: Run smoke test**

```bash
pnpm exec playwright test tests/e2e/smoke.test.ts
```

Expected:
```
✓  1 passed (chromium)
✓  1 passed (mobile)
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.test.ts package.json pnpm-lock.yaml
git commit -m "chore: add Playwright for E2E testing"
```

---

## Task 2: Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest and type checker**

```bash
pnpm add -D vitest @astrojs/check typescript
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create `tests/unit/` directory with smoke test**

```typescript
// tests/unit/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('unit test runner', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 4: Run smoke test**

```bash
pnpm exec vitest run tests/unit/smoke.test.ts
```

Expected:
```
✓ tests/unit/smoke.test.ts (1)
  ✓ unit test runner > works
Test Files  1 passed (1)
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/unit/smoke.test.ts package.json pnpm-lock.yaml
git commit -m "chore: add Vitest for unit testing"
```

---

## Task 3: Add test scripts to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts**

In the `"scripts"` section of `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:all": "vitest run && playwright test",
"typecheck": "astro check"
```

- [ ] **Step 2: Verify scripts work**

```bash
pnpm test          # runs Vitest unit tests
pnpm test:e2e      # runs Playwright E2E tests
pnpm typecheck     # runs Astro type checking
```

Expected: all three complete without error.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add unified test scripts"
```

---

## Task 4: Add test utilities

**Files:**
- Create: `tests/unit/fixtures.ts` — unit test fixtures (not shared with E2E)

Keeping fixtures under `tests/unit/` makes the scope clear — E2E tests don't use mock data, they hit the actual dev server.

- [ ] **Step 1: Create `tests/unit/fixtures.ts`**

```typescript
import type { BlogPost } from '@/server/notion'

// Creates a mock BlogPost for unit tests; type-checked against the real type.
export function mockPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'test-id',
    title: 'Test Post',
    slug: 'test-post',
    status: 'Published',
    publishedDate: '2026-01-01',
    updatedDate: null,
    category: null,
    tags: [],
    description: null,
    coverImage: null,
    featured: false,
    seoTitle: null,
    seoKeywords: [],
    ...overrides,
  }
}
```

- [ ] **Step 2: Write a unit test that uses the helper**

```typescript
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
```

- [ ] **Step 3: Run the test**

```bash
pnpm test
```

Expected:
```
✓ tests/unit/mock-helper.test.ts (2)
Test Files  2 passed (2)
```

- [ ] **Step 4: Commit**

```bash
git add tests/unit/fixtures.ts tests/unit/mock-helper.test.ts
git commit -m "chore: add shared test utilities and mock helpers"
```

---

## Usage guide for future tests

**E2E test** (browser navigation, layout, View Transitions):
```
tests/e2e/<feature>.test.ts
Run: pnpm test:e2e
```

**Unit test** (Notion adapter, data transformation, helpers):
```
tests/unit/<module>.test.ts
Run: pnpm test
```

**Type check** (catches import errors, Astro component props):
```
Run: pnpm typecheck
```
