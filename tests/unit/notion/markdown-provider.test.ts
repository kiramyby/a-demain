import { describe, expect, it, vi } from "vitest";
import { getPostMarkdown, type MarkdownClient } from "@/server/notion/content/markdown-provider";
import { NotionContentError, NotionQueryError } from "@/server/notion/errors";
import { markdownResponse } from "./fixtures";

describe("getPostMarkdown", () => {
	it("returns markdown and diagnostics", async () => {
		const client = {
			pages: {
				retrieveMarkdown: vi.fn().mockResolvedValue(markdownResponse()),
			},
		};

		await expect(getPostMarkdown("page-1", client)).resolves.toEqual({
			markdown: "# Hello Notion\n\nBody text.",
			truncated: false,
			unknownBlockIds: [],
		});
	});

	it("fails on truncated markdown", async () => {
		const client = {
			pages: {
				retrieveMarkdown: vi.fn().mockResolvedValue(markdownResponse({ truncated: true })),
			},
		};

		await expect(getPostMarkdown("page-1", client)).rejects.toThrow(NotionContentError);
	});

	it("fails on unknown blocks", async () => {
		const client = {
			pages: {
				retrieveMarkdown: vi
					.fn()
					.mockResolvedValue(markdownResponse({ unknown_block_ids: ["block-1"] })),
			},
		};

		await expect(getPostMarkdown("page-1", client)).rejects.toThrow(NotionContentError);
	});

	it("wraps API failures", async () => {
		const client = {
			pages: {
				retrieveMarkdown: vi.fn().mockRejectedValue(new Error("network")),
			},
		};

		await expect(getPostMarkdown("page-1", client as MarkdownClient)).rejects.toThrow(
			NotionQueryError,
		);
	});
});
