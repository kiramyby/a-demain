import { describe, expect, it, vi } from "vitest";
import {
	type DatabaseClient,
	resolvePostsDataSourceId,
} from "@/server/notion/database/data-source-resolver";
import { queryViewPages, type RequestClient } from "@/server/notion/database/view-resolver";
import { NotionQueryError } from "@/server/notion/errors";
import { notionPostPage } from "./fixtures";

describe("resolvePostsDataSourceId", () => {
	it("uses an explicit data source id first", async () => {
		const client = { databases: { retrieve: vi.fn() } };

		await expect(
			resolvePostsDataSourceId(client as unknown as DatabaseClient, {
				postsDatabaseId: "db",
				postsDataSourceId: "explicit-ds",
			}),
		).resolves.toBe("explicit-ds");

		expect(client.databases.retrieve).not.toHaveBeenCalled();
	});

	it("falls back to the first database data source", async () => {
		const client = {
			databases: {
				retrieve: vi.fn().mockResolvedValue({
					object: "database",
					data_sources: [{ id: "resolved-ds", name: "Posts" }],
				}),
			},
		};

		await expect(
			resolvePostsDataSourceId(client as unknown as DatabaseClient, { postsDatabaseId: "db" }),
		).resolves.toBe("resolved-ds");
	});
});

describe("queryViewPages", () => {
	it("creates, paginates, and deletes a view query", async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce({
				object: "view_query",
				id: "query-1",
				results: [notionPostPage({ id: "page-1" })],
				next_cursor: "cursor-1",
				has_more: true,
			})
			.mockResolvedValueOnce({
				object: "view_query",
				id: "query-1",
				results: [notionPostPage({ id: "page-2" })],
				next_cursor: null,
				has_more: false,
			})
			.mockResolvedValueOnce({ object: "view_query", id: "query-1", deleted: true });

		const pages = await queryViewPages({ request } as unknown as RequestClient, "view-1");

		expect(pages.map((page) => (page as { id?: string }).id)).toEqual(["page-1", "page-2"]);
		expect(request).toHaveBeenNthCalledWith(1, {
			method: "post",
			path: "views/view-1/queries",
			body: { page_size: 100 },
		});
		expect(request).toHaveBeenNthCalledWith(2, {
			method: "get",
			path: "views/view-1/queries/query-1",
			query: { start_cursor: "cursor-1", page_size: 100 },
		});
		expect(request).toHaveBeenNthCalledWith(3, {
			method: "delete",
			path: "views/view-1/queries/query-1",
		});
	});

	it("does not fail the view query when cleanup fails", async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce({
				object: "view_query",
				id: "query-1",
				results: [notionPostPage()],
				next_cursor: null,
				has_more: false,
			})
			.mockRejectedValueOnce(new Error("cleanup failed"));

		await expect(
			queryViewPages({ request } as unknown as RequestClient, "view-1"),
		).resolves.toHaveLength(1);
	});

	it("wraps query failures", async () => {
		await expect(
			queryViewPages(
				{ request: vi.fn().mockRejectedValue(new Error("boom")) } as unknown as RequestClient,
				"view-1",
			),
		).rejects.toThrow(NotionQueryError);
	});
});
