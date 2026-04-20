# Blog Layout Transition Design

**Date:** 2026-04-21  
**Status:** Approved

## Overview

The blog (`blog.kiracoon.top`) has two distinct layout states connected by a shared profile card element. Visitors first see the card centered on screen; clicking it triggers a View Transitions animation that morphs the card into the sidebar (desktop) or header (mobile). Clicking the avatar in the sidebar reverses the animation back to the centered intro state.

## Context

The site is split into two separate projects:
- `kiracoon.top` — personal showcase (projects, demos)
- `blog.kiracoon.top` — this project, for technical articles and life writing

The blog's profile card acts as the entry point and persistent identity element.

## Layout States

### State A — Intro (`/`)

- Full-screen centered layout, no content visible
- Profile card displayed at full size in the center of the screen
- Card contains: avatar, name, bio, social links, "Enter" prompt
- Clicking the card navigates to `/posts`

### State B — Browse (all other routes)

- **Desktop / iPad (≥ 768px):** Fixed left sidebar containing the collapsed profile card + navigation links
- **Mobile (< 768px):** Top header bar containing small avatar + site name + hamburger menu
- Main content area takes remaining space
- Clicking the avatar navigates back to `/`

## Architecture

### File Structure

```
src/
  layouts/
    Layout.astro          ← base shell, contains <ViewTransitions />
    IntroLayout.astro     ← used only by src/pages/index.astro
    BrowseLayout.astro    ← used by all other pages
  pages/
    index.astro           ← uses IntroLayout
    posts/
      index.astro         ← uses BrowseLayout
      [slug].astro        ← uses BrowseLayout
    categories/index.astro
    tags/index.astro
    friends.astro
    about.md
```

### Shared Transition Element

Both layouts assign `transition:name="profile-card"` to the profile card container. Astro's View Transitions API treats elements with the same `transition:name` as the same element across page navigations and automatically computes the FLIP animation between their positions.

```astro
<!-- IntroLayout.astro — card is centered, full size -->
<div transition:name="profile-card" class="intro-card">
  <img class="w-32 h-32 rounded-full" />
  <h1>Kirac0on</h1>
  <p>Web Dev · Cyber Security</p>
  <a href="/posts">Enter →</a>
</div>

<!-- BrowseLayout.astro — card is in sidebar/header, compact -->
<aside transition:name="profile-card" class="sidebar">
  <a href="/"><img class="w-10 h-10 rounded-full" /></a>
  <span>Kirac0on</span>
  <nav>...</nav>
</aside>
```

### Responsive Behavior

`BrowseLayout` handles both breakpoints in CSS. The View Transition's end position is whatever CSS renders — no JavaScript breakpoint detection needed.

```css
/* Desktop: fixed left sidebar */
.sidebar {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: 200px;
}

/* Mobile: top header */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0; left: 0; right: 0;
    width: 100%;
    height: 56px;
    flex-direction: row;
  }
}
```

### ViewTransitions Setup

`Layout.astro` (the base shell shared by both intro and browse layouts) imports `ViewTransitions`:

```astro
---
import { ViewTransitions } from 'astro:transitions'
---
<head>
  <ViewTransitions />
</head>
```

### Direct URL Access

No special handling required. Navigating directly to `/posts/some-slug` renders `BrowseLayout` as the initial page load — View Transitions only activates during client-side navigation within the site. The intro animation is skipped entirely, which is the desired behavior for external readers.

## Navigation Flow

```
[Direct URL] ──────────────────────────────► BrowseLayout (no animation)

[Visit /] ──► IntroLayout (centered card)
                    │
                    │ click card
                    ▼
             View Transition fires
             card morphs: center → sidebar/header
                    │
                    ▼
             BrowseLayout (/posts)
                    │
                    │ click avatar
                    ▼
             View Transition fires (reverse)
             card morphs: sidebar/header → center
                    │
                    ▼
             IntroLayout (/)
```

## Animation Customization

Astro's default View Transition for named elements is a morphing cross-fade. For a more deliberate scale + translate feel, override with `@keyframes`:

```css
::view-transition-old(profile-card) {
  animation: card-shrink 0.4s ease-in forwards;
}
::view-transition-new(profile-card) {
  animation: card-expand 0.4s ease-out forwards;
}

@keyframes card-shrink {
  from { transform: scale(1); }
  to   { transform: scale(0.4); }
}
```

The browser handles the positional translation automatically via FLIP; only scale/opacity need manual override if desired.

## Testing Approach (TDD)

Since View Transitions are browser-only, unit testing the animation itself is not practical. Tests should cover:

1. **Route rendering** — `/` renders `IntroLayout`, all other routes render `BrowseLayout`
2. **transition:name presence** — both layouts emit an element with `data-astro-transition-scope` for `profile-card`
3. **Navigation links** — the "Enter" link in intro points to `/posts`, the avatar link in browse points to `/`
4. **Responsive classes** — `BrowseLayout` emits correct CSS classes for sidebar and header breakpoints
5. **Direct URL** — `/posts/[slug]` renders correctly without requiring prior visit to `/`

Tools: Astro's built-in test utilities + Playwright for E2E navigation flow verification.

## Out of Scope

- Transition animation between `/posts` and `/posts/[slug]` (separate concern)
- Dark mode toggle (separate concern)
- The personal showcase site (`kiracoon.top`)
