# A demain

This repository publishes a personal Astro site whose blog content originates in Notion.
Current as of 2026-06-28.

## Language

**Post**:
A publishable blog article in the site domain.
_Avoid_: page, entry, record

**Notion Page**:
The upstream Notion content resource that carries one Post.
_Avoid_: post, route page

**Posts Database**:
The Notion database container that holds the blog's data sources and views.
_Avoid_: CMS, table

**Posts Data Source**:
The queryable Notion data source under the Posts Database that yields blog content records.
_Avoid_: database, view

**Posts View**:
A saved Notion view over the Posts Data Source that defines a result set through filters, sorts, and layout.
_Avoid_: filter, query

**Route page**:
A site page generated from blog content, such as `/posts/[slug]` or `/tags/[tag]`.
_Avoid_: Notion page

**Category**:
A single classification assigned to a Post.
_Avoid_: section, type

**Tag**:
A repeatable label assigned to a Post.
_Avoid_: category, keyword

**Friend**:
A non-blog link entry returned by the current friends Notion integration.
_Avoid_: post, route page

**Friends Database**:
The Notion database container used by the friends integration.
_Avoid_: posts database

**Friends Data Source**:
The queryable Notion data source under the Friends Database that yields Friend records.
_Avoid_: posts data source, view

## Relationships

- A **Post** originates as a **Notion Page** selected from a **Posts View** or **Posts Data Source** under the **Posts Database**.
- A **Post** may belong to zero or one **Category** and zero or more **Tags**.
- A **Post** is published through one or more **Route pages** on the site.
- A **Friend** originates as a **Notion Page** selected from a **Friends Data Source** under the **Friends Database**.
- The current friends integration has no Route page surface.

## Example dialogue

> **Dev:** "If I change the filters in the **Posts View**, do I need to change the site code to publish a different set of posts?"
> **Domain expert:** "No. The **Posts View** already defines the result set. The site should still publish the same **Post** model, just from a different upstream selection."

## Flagged ambiguities

- "post" was being used for both the domain object and implementation-specific representations. Resolved: **Post** is the canonical term; implementation records are not glossary terms.
- "page" was being used for both upstream Notion content and site output. Resolved: use **Notion Page** for upstream content and **Route page** for site output.
- "database", "data source", and "view" were being flattened into one layer. Resolved: a **Posts Database** contains **Posts Data Sources** and **Posts Views**; the pipeline queries a **Posts View** or **Posts Data Source**.
- "friends" was mixed into the old blog helper path. Resolved: **Friend** is a separate non-blog Notion model with its own repository.
