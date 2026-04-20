# Blog Layout Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a View Transitions-powered layout that shows a centered profile card on `/` and morphs it into a fixed sidebar (desktop) or header (mobile) on all other pages.

**Architecture:** Two Astro layouts (`IntroLayout`, `BrowseLayout`) share a `transition:name="profile-card"` element. Astro's View Transitions API automatically FLIP-animates the card between its centered position and its sidebar/header position during client-side navigation. Direct URL access skips animation entirely.

**Tech Stack:** Astro 6 (View Transitions API), Tailwind CSS 4, Playwright (E2E tests)

**Prerequisite:** [`2026-04-21-testing-infrastructure.md`](./2026-04-21-testing-infrastructure.md) must be completed first — Playwright and test scripts must already be set up.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/layouts/Layout.astro` — add `<ViewTransitions />`, title prop |
| Create | `src/layouts/IntroLayout.astro` — centered card, used only by `/` |
| Create | `src/layouts/BrowseLayout.astro` — sidebar/header, used by all content pages |
| Modify | `src/layouts/AboutLayout.astro` — delegate outer shell to BrowseLayout |
| Modify | `src/pages/index.astro` — switch to IntroLayout |
| Modify | `src/pages/posts.astro` — switch to BrowseLayout |
| Modify | `src/pages/posts/[slug].astro` — switch to BrowseLayout |
| Modify | `src/pages/categories/index.astro` — switch to BrowseLayout |
| Modify | `src/pages/tags/index.astro` — switch to BrowseLayout |
| Modify | `src/pages/friends.astro` — switch to BrowseLayout |
| Modify | `src/styles/global.css` — add `::view-transition-*` CSS overrides |
| Create | `tests/e2e/layout-transition.test.ts` |

---

## Task 1: Write failing E2E tests

**Files:**
- Create: `tests/e2e/layout-transition.test.ts`

These tests define the contract. They will all fail until the layouts are implemented.

- [ ] **Step 1: Create test file**

```typescript
import { test, expect } from '@playwright/test'

// ── Intro Layout (/): centered card ─────────────────────────────────

test('/ shows centered profile card', async ({ page }) => {
  await page.goto('/')
  const card = page.getByTestId('profile-card')
  await expect(card).toBeVisible()
})

test('/ profile card has correct view-transition-name', async ({ page }) => {
  await page.goto('/')
  const card = page.getByTestId('profile-card')
  const style = await card.getAttribute('style')
  expect(style).toContain('view-transition-name: profile-card')
})

test('/ card contains link to /posts', async ({ page }) => {
  await page.goto('/')
  const enterLink = page.getByTestId('profile-card').getByRole('link')
  await expect(enterLink).toHaveAttribute('href', '/posts')
})

test('/ does not render sidebar or header nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('browse-sidebar')).not.toBeVisible()
})

// ── Browse Layout (/posts): sidebar on desktop ───────────────────────

test('/posts shows sidebar with profile card', async ({ page }) => {
  await page.goto('/posts')
  const sidebar = page.getByTestId('browse-sidebar')
  await expect(sidebar).toBeVisible()
})

test('/posts sidebar has correct view-transition-name', async ({ page }) => {
  await page.goto('/posts')
  const sidebar = page.getByTestId('browse-sidebar')
  const style = await sidebar.getAttribute('style')
  expect(style).toContain('view-transition-name: profile-card')
})

test('/posts sidebar avatar links back to /', async ({ page }) => {
  await page.goto('/posts')
  const avatarLink = page.getByTestId('browse-sidebar').getByRole('link').first()
  await expect(avatarLink).toHaveAttribute('href', '/')
})

test('/posts sidebar contains navigation links', async ({ page }) => {
  await page.goto('/posts')
  const nav = page.getByTestId('browse-sidebar').getByRole('navigation')
  await expect(nav.getByRole('link', { name: /posts/i })).toBeVisible()
  await expect(nav.getByRole('link', { name: /categories/i })).toBeVisible()
  await expect(nav.getByRole('link', { name: /tags/i })).toBeVisible()
})

// ── Browse Layout — mobile header ────────────────────────────────────

test('/posts renders header on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/posts')
  const sidebar = page.getByTestId('browse-sidebar')
  // sidebar should be present in DOM but styled as header
  await expect(sidebar).toBeVisible()
  const box = await sidebar.boundingBox()
  // on mobile, sidebar spans full width and is short (header shape)
  expect(box!.width).toBeGreaterThan(300)
  expect(box!.height).toBeLessThan(80)
})

// ── Direct URL access ─────────────────────────────────────────────────

test('direct URL to /categories renders browse layout, no intro card', async ({ page }) => {
  await page.goto('/categories')
  await expect(page.getByTestId('browse-sidebar')).toBeVisible()
  await expect(page.getByTestId('profile-card')).not.toBeVisible()
})
```

- [ ] **Step 2: Run tests — verify all fail**

```bash
pnpm dev &   # start dev server in background
pnpm test
```

Expected: all tests FAIL (elements not found, layouts not yet implemented).

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/e2e/layout-transition.test.ts
git commit -m "test: add failing E2E tests for layout transition"
```

---

## Task 2: Add ViewTransitions to Layout.astro

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Update Layout.astro**

Replace the entire file content:

```astro
---
import { ViewTransitions } from 'astro:transitions'
import "react-notion-x/src/styles.css"
import "../styles/global.css"
import "../styles/notion.css"

interface Props {
  title?: string
}

const { title = 'Kirac0on\'s Blog' } = Astro.props
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <ViewTransitions />
  </head>
  <body>
    <slot />
  </body>
</html>

<style>
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add ViewTransitions to base Layout"
```

---

## Task 3: Create IntroLayout.astro

**Files:**
- Create: `src/layouts/IntroLayout.astro`

- [ ] **Step 1: Create the file**

```astro
---
import Layout from './Layout.astro'
import { Icon } from 'astro-icon/components'
import { SITE_CONFIG } from '../config'

interface Props {
  title?: string
}

const { title } = Astro.props
---

<Layout title={title}>
  <main class="intro-root">
    <div
      data-testid="profile-card"
      transition:name="profile-card"
      class="intro-card"
    >
      <a href="/about">
        <img
          src={SITE_CONFIG.author.avatarUrl}
          alt={`${SITE_CONFIG.author.name}'s avatar`}
          class="intro-avatar"
        />
      </a>
      <h1 class="intro-name">{SITE_CONFIG.author.name}</h1>
      <p class="intro-bio">{SITE_CONFIG.author.bio}</p>
      <div class="intro-social">
        <a href={SITE_CONFIG.social.github} aria-label="GitHub">
          <Icon name="lucide:github" size={24} />
        </a>
        <a href={SITE_CONFIG.social.x} aria-label="Twitter / X">
          <Icon name="lucide:twitter" size={24} />
        </a>
      </div>
      <a href="/posts" class="intro-enter">Enter →</a>
    </div>
  </main>
</Layout>

<style>
  .intro-root {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--background);
  }

  .intro-card {
    background-color: var(--secondary-background);
    border: 2px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
    padding: 2.5rem;
    text-align: center;
    width: 100%;
    max-width: 22rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .intro-avatar {
    width: 8rem;
    height: 8rem;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: block;
  }

  .intro-name {
    font-size: 1.25rem;
    font-weight: var(--font-weight-heading);
    margin: 0;
  }

  .intro-bio {
    font-size: 0.875rem;
    color: oklch(40% 0 0);
    margin: 0;
  }

  .intro-social {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .intro-enter {
    margin-top: 0.5rem;
    background-color: var(--main);
    color: var(--main-foreground);
    border: 2px solid var(--border);
    box-shadow: var(--shadow);
    padding: 0.5rem 1.25rem;
    border-radius: var(--radius-base);
    font-weight: var(--font-weight-base);
    text-decoration: none;
    transition: box-shadow 0.15s, translate 0.15s;
  }

  .intro-enter:hover {
    box-shadow: none;
    translate: var(--spacing-boxShadowX) var(--spacing-boxShadowY);
  }
</style>
```

- [ ] **Step 2: Run the intro-related tests**

```bash
pnpm test --grep "/ shows centered"
```

Expected: PASS (the profile-card element is now present with correct testid).

- [ ] **Step 3: Commit**

```bash
git add src/layouts/IntroLayout.astro
git commit -m "feat: add IntroLayout with centered profile card"
```

---

## Task 4: Create BrowseLayout.astro

**Files:**
- Create: `src/layouts/BrowseLayout.astro`

- [ ] **Step 1: Create the file**

```astro
---
import Layout from './Layout.astro'
import { Icon } from 'astro-icon/components'
import { SITE_CONFIG } from '../config'

interface Props {
  title?: string
}

const { title } = Astro.props
---

<Layout title={title}>
  <div class="browse-root">
    <aside
      data-testid="browse-sidebar"
      transition:name="profile-card"
      class="browse-sidebar"
    >
      <div class="sidebar-identity">
        <a href="/" aria-label="Back to intro">
          <img
            src={SITE_CONFIG.author.avatarUrl}
            alt={`${SITE_CONFIG.author.name}'s avatar`}
            class="sidebar-avatar"
          />
        </a>
        <span class="sidebar-name">{SITE_CONFIG.author.name}</span>
      </div>

      <nav class="sidebar-nav" aria-label="Blog navigation">
        <a href="/posts">Posts</a>
        <a href="/categories">Categories</a>
        <a href="/tags">Tags</a>
        <a href="/friends">Friends</a>
        <a href="/about">About</a>
      </nav>

      <!-- Mobile-only: social icons next to name -->
      <div class="sidebar-social-mobile">
        <a href={SITE_CONFIG.social.github} aria-label="GitHub">
          <Icon name="lucide:github" size={20} />
        </a>
        <a href={SITE_CONFIG.social.x} aria-label="Twitter / X">
          <Icon name="lucide:twitter" size={20} />
        </a>
      </div>

      <!-- Mobile-only: hamburger for nav -->
      <button class="sidebar-hamburger" aria-label="Open menu" aria-expanded="false">
        <Icon name="lucide:menu" size={24} />
      </button>
    </aside>

    <main class="browse-main">
      <slot />
    </main>
  </div>
</Layout>

<style>
  /* ── Layout shell ─────────────────────────────── */
  .browse-root {
    display: flex;
    min-height: 100vh;
  }

  /* ── Sidebar: desktop/iPad ───────────────────── */
  .browse-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 200px;
    background-color: var(--secondary-background);
    border-right: 2px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem;
    gap: 1rem;
    z-index: 10;
  }

  .browse-main {
    margin-left: 200px;
    flex: 1;
    padding: 2rem;
  }

  /* ── Sidebar identity block ──────────────────── */
  .sidebar-identity {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .sidebar-avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: block;
  }

  .sidebar-name {
    font-size: 0.875rem;
    font-weight: var(--font-weight-heading);
    text-align: center;
  }

  /* ── Sidebar nav ─────────────────────────────── */
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    border-top: 2px solid var(--border);
    padding-top: 0.75rem;
  }

  .sidebar-nav a {
    font-size: 0.875rem;
    font-weight: var(--font-weight-base);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-base);
    text-decoration: none;
    color: var(--foreground);
  }

  .sidebar-nav a:hover {
    background-color: var(--main);
    color: var(--main-foreground);
  }

  /* Mobile-only elements hidden on desktop */
  .sidebar-social-mobile,
  .sidebar-hamburger {
    display: none;
  }

  /* ── Mobile: header ──────────────────────────── */
  @media (max-width: 768px) {
    .browse-sidebar {
      bottom: auto;
      width: 100%;
      height: 56px;
      flex-direction: row;
      align-items: center;
      padding: 0 1rem;
      gap: 0.75rem;
      border-right: none;
      border-bottom: 2px solid var(--border);
    }

    .browse-main {
      margin-left: 0;
      margin-top: 56px;
      padding: 1rem;
    }

    .sidebar-identity {
      flex-direction: row;
      gap: 0.5rem;
    }

    .sidebar-avatar {
      width: 2rem;
      height: 2rem;
    }

    /* Hide desktop nav, show hamburger */
    .sidebar-nav {
      display: none;
      border-top: none;
      padding-top: 0;
    }

    .sidebar-social-mobile,
    .sidebar-hamburger {
      display: flex;
      align-items: center;
    }

    .sidebar-hamburger {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
  }
</style>
```

- [ ] **Step 2: Run browse-related tests**

```bash
pnpm test --grep "/posts"
```

Expected: tests for sidebar presence and view-transition-name may still fail because `posts.astro` hasn't been updated yet. That's expected.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BrowseLayout.astro
git commit -m "feat: add BrowseLayout with responsive sidebar/header"
```

---

## Task 5: Update index.astro to use IntroLayout

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace file content**

```astro
---
import IntroLayout from '../layouts/IntroLayout.astro'
import { SITE_CONFIG } from '../config'
---

<IntroLayout title={SITE_CONFIG.siteName} />
```

The `IntroLayout` renders the profile card directly — no longer needs `Header`, `CenterContainer`, or `HomeCard` components.

- [ ] **Step 2: Run intro tests**

```bash
pnpm test --grep "^\/"
```

Expected: all intro tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: update home page to use IntroLayout"
```

---

## Task 6: Update all content pages to use BrowseLayout

**Files:**
- Modify: `src/pages/posts.astro`
- Modify: `src/pages/posts/[slug].astro`
- Modify: `src/pages/categories/index.astro`
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/friends.astro`

All content pages currently have minimal content (empty or stubs). Replace each one with the BrowseLayout wrapper and a placeholder `<slot />` / heading.

- [ ] **Step 1: Update `src/pages/posts.astro`**

```astro
---
import BrowseLayout from '../layouts/BrowseLayout.astro'
---

<BrowseLayout title="Posts — Kirac0on's Blog">
  <h1>Posts</h1>
</BrowseLayout>
```

- [ ] **Step 2: Update `src/pages/posts/[slug].astro`**

```astro
---
import BrowseLayout from '../../layouts/BrowseLayout.astro'
---

<BrowseLayout title="Post — Kirac0on's Blog">
  <slot />
</BrowseLayout>
```

- [ ] **Step 3: Update `src/pages/categories/index.astro`**

```astro
---
import BrowseLayout from '../../layouts/BrowseLayout.astro'
---

<BrowseLayout title="Categories — Kirac0on's Blog">
  <h1>Categories</h1>
</BrowseLayout>
```

- [ ] **Step 4: Update `src/pages/tags/index.astro`**

```astro
---
import BrowseLayout from '../../layouts/BrowseLayout.astro'
---

<BrowseLayout title="Tags — Kirac0on's Blog">
  <h1>Tags</h1>
</BrowseLayout>
```

- [ ] **Step 5: Update `src/pages/friends.astro`**

```astro
---
import BrowseLayout from '../layouts/BrowseLayout.astro'
---

<BrowseLayout title="Friends — Kirac0on's Blog">
  <h1>Friends</h1>
</BrowseLayout>
```

- [ ] **Step 6: Run all browse tests**

```bash
pnpm test --grep "browse|sidebar|/posts|/categories"
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/posts.astro src/pages/posts/\[slug\].astro \
  src/pages/categories/index.astro src/pages/tags/index.astro \
  src/pages/friends.astro
git commit -m "feat: update all content pages to use BrowseLayout"
```

---

## Task 7: Update AboutLayout to delegate to BrowseLayout

**Files:**
- Modify: `src/layouts/AboutLayout.astro`

`about.md` uses `AboutLayout` via its frontmatter. We keep the existing props/SEO logic but replace the outer shell with `BrowseLayout`.

- [ ] **Step 1: Replace file content**

```astro
---
import type { MarkdownLayoutProps } from 'astro'
import BrowseLayout from './BrowseLayout.astro'
import { SITE_CONFIG } from '../config'

type Props = MarkdownLayoutProps<{
  title: string
  author?: string
  date?: string
  description?: string
  keywords?: string
}>

const { frontmatter } = Astro.props
const seoTitle = `${frontmatter.title} | ${SITE_CONFIG.author.name}`
const seoDescription = frontmatter.description ?? `About ${SITE_CONFIG.author.name}`
---

<BrowseLayout title={seoTitle}>
  <article>
    <h1>{frontmatter.title}</h1>
    {frontmatter.description && <p class="description">{seoDescription}</p>}
    <slot />
    {frontmatter.date && (
      <p><time datetime={frontmatter.date}>Updated: {frontmatter.date}</time></p>
    )}
  </article>
</BrowseLayout>
```

- [ ] **Step 2: Verify about page renders**

```bash
# visit http://localhost:4321/about in browser
```

Expected: `/about` shows the BrowseLayout sidebar + the about.md content.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/AboutLayout.astro
git commit -m "feat: update AboutLayout to use BrowseLayout"
```

---

## Task 8: Add View Transition animation CSS

**Files:**
- Modify: `src/styles/global.css`

Astro's default View Transition for named elements is a cross-fade morph. Add a scale effect to make the card visually "shrink" into the sidebar position.

- [ ] **Step 1: Append to `src/styles/global.css`**

Add after all existing rules:

```css
/* ── View Transition: profile card ───────────────────────────────── */
::view-transition-old(profile-card) {
  animation: card-out 0.35s ease-in both;
}

::view-transition-new(profile-card) {
  animation: card-in 0.35s ease-out both;
}

@keyframes card-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.5); }
}

@keyframes card-in {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 2: Test the animation manually**

```bash
# open http://localhost:4321 in browser
# click "Enter →" — card should shrink and fly to sidebar
# click avatar in sidebar — sidebar should shrink back to center card
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add scale animation for profile-card View Transition"
```

---

## Task 9: Run full test suite + cleanup

**Files:**
- (potentially) `src/components/Header.astro`, `src/components/CenterContainer.astro` — now unused

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all 11 tests PASS.

- [ ] **Step 2: Build to verify no type errors**

```bash
pnpm build
```

Expected: build completes with no errors.

- [ ] **Step 3: Check for unused imports (optional)**

`Header.astro` and `CenterContainer.astro` are no longer imported anywhere. They can be kept (no harm) or deleted. To check:

```bash
grep -r "Header\|CenterContainer" src/pages src/layouts
```

If no results: safe to delete both files.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete blog layout transition with View Transitions API"
```
