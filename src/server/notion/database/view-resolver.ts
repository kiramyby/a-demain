import { NotionQueryError } from "../errors";

type RequestClient = {
	request(args: {
		method: "get" | "post" | "delete";
		path: string;
		body?: Record<string, unknown>;
		query?: Record<string, string | number | boolean | string[]>;
	}): Promise<any>;
};

type ViewQueryResponse = {
	id: string;
	results: unknown[];
	next_cursor: string | null;
	has_more: boolean;
};

export async function queryViewPages(
	client: RequestClient,
	viewId: string,
	pageSize = 100,
): Promise<unknown[]> {
	let queryId: string | null = null;

	try {
		const firstPage = (await client.request({
			method: "post",
			path: `views/${viewId}/queries`,
			body: { page_size: pageSize },
		})) as ViewQueryResponse;

		queryId = firstPage.id;
		const pages = [...firstPage.results];
		let cursor = firstPage.next_cursor;

		while (cursor) {
			const nextPage = (await client.request({
				method: "get",
				path: `views/${viewId}/queries/${queryId}`,
				query: { start_cursor: cursor, page_size: pageSize },
			})) as ViewQueryResponse;

			pages.push(...nextPage.results);
			cursor = nextPage.next_cursor;
		}

		return pages;
	} catch (error) {
		throw new NotionQueryError(`Failed to query Notion view ${viewId}`, error);
	} finally {
		if (queryId) {
			try {
				await client.request({
					method: "delete",
					path: `views/${viewId}/queries/${queryId}`,
				});
			} catch {
				// Query cleanup is best-effort; preserve the primary query result or error.
			}
		}
	}
}
