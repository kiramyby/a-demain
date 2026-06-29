import { describe, expect, it } from "vitest";
import { NotionMappingError } from "@/server/notion/errors";
import { mapNotionPageToPostMeta } from "@/server/notion/posts/mapper";
import { notionPostPage } from "./fixtures";

describe("mapNotionPageToPostMeta", () => {
	it("maps a Notion page into a stable blog post model", () => {
		expect(mapNotionPageToPostMeta(notionPostPage())).toEqual({
			id: "page-1",
			title: "Hello Notion",
			slug: "hello-notion",
			status: "Published",
			publishedDate: "2026-05-20",
			updatedDate: "2026-05-21",
			category: "Engineering",
			tags: ["Astro", "Notion"],
			description: "A post from Notion",
			coverImage: "https://example.com/cover.png",
			featured: true,
			seoTitle: "SEO Hello Notion",
			seoKeywords: ["cms", "blog"],
		});
	});

	it("fails when title is missing", () => {
		const page = notionPostPage({
			properties: {
				...notionPostPage().properties,
				Title: { type: "title", title: [] },
			},
		});

		expect(() => mapNotionPageToPostMeta(page)).toThrow(NotionMappingError);
	});

	it("fails when slug is missing", () => {
		const page = notionPostPage({
			properties: {
				...notionPostPage().properties,
				Slug: { type: "rich_text", rich_text: [] },
			},
		});

		expect(() => mapNotionPageToPostMeta(page)).toThrow(NotionMappingError);
	});
});
