import type { LoaderContext } from "astro/loaders";
import { describe, expect, it, vi } from "vitest";
import { notionPostsLoader } from "@/server/notion/astro/notion-posts-loader";

describe("notionPostsLoader", () => {
	it("skips content sync when the skip flag is set", async () => {
		const clear = vi.fn();
		const set = vi.fn();
		const info = vi.fn();
		const loadPostMetas = vi.fn();
		const loadMarkdown = vi.fn();
		const loader = notionPostsLoader({
			loadPostMetas,
			loadMarkdown,
			shouldSkipContentSync: () => true,
		});

		await loader.load({
			store: {
				clear,
				set,
			},
			logger: {
				warn: vi.fn(),
				info,
				error: vi.fn(),
				debug: vi.fn(),
			},
		} as unknown as LoaderContext);

		expect(clear).toHaveBeenCalledOnce();
		expect(set).not.toHaveBeenCalled();
		expect(loadPostMetas).not.toHaveBeenCalled();
		expect(loadMarkdown).not.toHaveBeenCalled();
		expect(info).toHaveBeenCalledWith(
			"Skipping Notion posts loader because SKIP_NOTION_CONTENT_SYNC=1",
		);
	});

	it("stores rendered entries by slug", async () => {
		const set = vi.fn();
		const loader = notionPostsLoader({
			loadPostMetas: async () => [
				{
					id: "page-1",
					title: "Hello Notion",
					slug: "hello-notion",
					status: "Published",
					publishedDate: "2026-05-20",
					updatedDate: null,
					category: "Engineering",
					tags: ["Astro"],
					description: "Description",
					coverImage: null,
					featured: false,
					seoTitle: null,
					seoKeywords: [],
				},
			],
			loadMarkdown: async () => ({
				markdown: "# Hello Notion",
				truncated: false,
				unknownBlockIds: [],
			}),
		});

		await loader.load({
			store: {
				clear: vi.fn(),
				set,
			},
			parseData: async ({ data }: { data: Record<string, unknown> }) => data,
			renderMarkdown: async (markdown: string) => ({
				html: `<h1>${markdown.replace("# ", "")}</h1>`,
			}),
			generateDigest: (value: unknown) => JSON.stringify(value),
			logger: {
				warn: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			},
		} as unknown as LoaderContext);

		expect(set).toHaveBeenCalledWith({
			id: "hello-notion",
			data: {
				notionPageId: "page-1",
				title: "Hello Notion",
				slug: "hello-notion",
				status: "Published",
				publishedDate: "2026-05-20",
				updatedDate: null,
				category: "Engineering",
				tags: ["Astro"],
				description: "Description",
				coverImage: null,
				featured: false,
				seoTitle: null,
				seoKeywords: [],
			},
			body: "# Hello Notion",
			rendered: { html: "<h1>Hello Notion</h1>" },
			digest: expect.any(String),
		});
	});
});

describe("server-side Notion exports", () => {
	it("can be imported before Notion environment variables are configured", async () => {
		vi.resetModules();
		vi.stubEnv("NOTION_API_KEY", "");
		vi.stubEnv("NOTION_POSTS_DATABASE_ID", "");

		await expect(import("@/server/notion")).resolves.toHaveProperty("notionPostsLoader");

		vi.unstubAllEnvs();
	});
});
