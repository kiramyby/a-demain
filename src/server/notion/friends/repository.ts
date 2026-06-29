import type { QueryDataSourceResponse } from "@notionhq/client";
import type { NotionClient } from "../client";
import { createNotionClient } from "../client";
import { type NotionFriendsConfig, readNotionFriendsConfig } from "../config";
import { type DatabaseClient, resolveDatabaseDataSourceId } from "../database/data-source-resolver";
import { NotionQueryError } from "../errors";
import { FRIEND_PROPERTIES, type Friend } from "./schema";

type FriendRepositoryClient = DatabaseClient & {
	dataSources: {
		query(
			args: Parameters<NotionClient["dataSources"]["query"]>[0],
		): Promise<QueryDataSourceResponse>;
	};
};

type RepositoryDeps = {
	client?: FriendRepositoryClient;
	config?: NotionFriendsConfig;
};

type NotionRichText = { plain_text?: string };
type NotionProperty = {
	title?: NotionRichText[];
	rich_text?: NotionRichText[];
	select?: { name?: string } | null;
	url?: string | null;
};

type NotionPageLike = {
	id?: string;
	properties?: Record<string, NotionProperty>;
};

function plainText(items: NotionRichText[] | undefined): string {
	return Array.isArray(items) ? items.map((item) => item.plain_text ?? "").join("") : "";
}

function property(page: NotionPageLike, name: string): NotionProperty | undefined {
	return page.properties?.[name];
}

function title(page: NotionPageLike, name: string): string {
	return plainText(property(page, name)?.title);
}

function richText(page: NotionPageLike, name: string): string {
	return plainText(property(page, name)?.rich_text);
}

function select(page: NotionPageLike, name: string): string {
	return property(page, name)?.select?.name ?? "";
}

function url(page: NotionPageLike, name: string): string {
	return property(page, name)?.url ?? "";
}

export function mapNotionPageToFriend(page: NotionPageLike): Friend {
	return {
		id: page.id ?? "",
		name: title(page, FRIEND_PROPERTIES.name),
		url: url(page, FRIEND_PROPERTIES.url),
		avatar: url(page, FRIEND_PROPERTIES.avatar),
		description: richText(page, FRIEND_PROPERTIES.description),
		status: select(page, FRIEND_PROPERTIES.status),
		group: select(page, FRIEND_PROPERTIES.group),
	};
}

function activeFriendsQuery(startCursor?: string) {
	return {
		filter: {
			property: FRIEND_PROPERTIES.status,
			select: { equals: "Active" },
		},
		sorts: [
			{
				property: FRIEND_PROPERTIES.name,
				direction: "ascending" as const,
			},
		],
		page_size: 100,
		...(startCursor ? { start_cursor: startCursor } : {}),
	};
}

export async function getActiveFriends(deps: RepositoryDeps = {}): Promise<Friend[]> {
	const config = deps.config ?? readNotionFriendsConfig();
	const client = deps.client ?? createNotionClient(config);

	try {
		const dataSourceId = await resolveDatabaseDataSourceId(client, config.friendsDatabaseId);
		const pages: unknown[] = [];
		let cursor: string | undefined;

		do {
			const response = await client.dataSources.query({
				data_source_id: dataSourceId,
				...activeFriendsQuery(cursor),
			});

			pages.push(...response.results);
			cursor = response.next_cursor ?? undefined;
		} while (cursor);

		return pages.map((page) => mapNotionPageToFriend(page as NotionPageLike));
	} catch (error) {
		if (error instanceof Error && error.name.startsWith("Notion")) {
			throw error;
		}
		throw new NotionQueryError("Failed to load active Notion friends", error);
	}
}
