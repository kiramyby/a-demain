import type { QueryDataSourceResponse } from "@notionhq/client";
import type { NotionClient } from "../client";
import { type NotionConfig, readNotionConfig } from "../config";
import {
	clearDataSourceResolverCache,
	type DatabaseClient,
	resolvePostsDataSourceId,
} from "../database/data-source-resolver";
import { queryViewPages, type RequestClient } from "../database/view-resolver";
import { NotionQueryError } from "../errors";
import { clearNotionPostCache, memoizeOnce } from "./cache";
import { mapNotionPageToPostMeta, type NotionPageLike } from "./mapper";
import { publishedPostsQuery } from "./queries";
import type { BlogPostMeta } from "./schema";

type PostRepositoryClient = DatabaseClient &
	RequestClient & {
		dataSources: {
			query(
				args: Parameters<NotionClient["dataSources"]["query"]>[0],
			): Promise<QueryDataSourceResponse>;
		};
	};

type RepositoryDeps = {
	client?: PostRepositoryClient;
	config?: NotionConfig;
};

export function clearPostRepositoryCache(): void {
	clearNotionPostCache();
	clearDataSourceResolverCache();
}

async function createDefaultClient(): Promise<PostRepositoryClient> {
	const { createNotionClient } = await import("../client");
	return createNotionClient();
}

async function queryDataSourcePages(
	client: PostRepositoryClient,
	config: NotionConfig,
): Promise<unknown[]> {
	const dataSourceId = await resolvePostsDataSourceId(client, config);
	const pages: unknown[] = [];
	let cursor: string | undefined;

	do {
		const response = await client.dataSources.query({
			data_source_id: dataSourceId,
			...publishedPostsQuery(cursor),
		});

		pages.push(...response.results);
		cursor = response.next_cursor ?? undefined;
	} while (cursor);

	return pages;
}

async function loadPublishedPostMetas(
	client: PostRepositoryClient,
	config: NotionConfig,
): Promise<BlogPostMeta[]> {
	try {
		const pages = config.postsViewId
			? await queryViewPages(client, config.postsViewId)
			: await queryDataSourcePages(client, config);

		return pages.map((page) => mapNotionPageToPostMeta(page as NotionPageLike));
	} catch (error) {
		if (error instanceof Error && error.name.startsWith("Notion")) {
			throw error;
		}
		throw new NotionQueryError("Failed to load published Notion posts", error);
	}
}

export function getPublishedPostMetas(deps: RepositoryDeps = {}): Promise<BlogPostMeta[]> {
	const config = deps.config ?? readNotionConfig();
	const sourceKey = config.postsViewId ?? config.postsDataSourceId ?? config.postsDatabaseId;

	return memoizeOnce(`published-posts:${sourceKey}`, async () => {
		const client = deps.client ?? (await createDefaultClient());
		return loadPublishedPostMetas(client, config);
	});
}

export async function getPostMetaBySlug(
	slug: string,
	deps: RepositoryDeps = {},
): Promise<BlogPostMeta | null> {
	const posts = await getPublishedPostMetas(deps);
	return posts.find((post) => post.slug === slug) ?? null;
}
