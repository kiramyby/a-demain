import { describe, expect, it } from "vitest";
import { readNotionConfig, readNotionFriendsConfig } from "@/server/notion/config";
import { NotionConfigError } from "@/server/notion/errors";

describe("readNotionConfig", () => {
	it("requires the API key and posts database id", () => {
		expect(() => readNotionConfig({})).toThrow(NotionConfigError);
	});

	it("returns required and optional identifiers", () => {
		const config = readNotionConfig({
			NOTION_API_KEY: "secret-token",
			NOTION_POSTS_DATABASE_ID: "database-id",
			NOTION_POSTS_DATA_SOURCE_ID: "data-source-id",
			NOTION_POSTS_VIEW_ID: "view-id",
		});

		expect(config).toEqual({
			apiKey: "secret-token",
			postsDatabaseId: "database-id",
			postsDataSourceId: "data-source-id",
			postsViewId: "view-id",
		});
	});
});

describe("readNotionFriendsConfig", () => {
	it("requires the API key and friends database id", () => {
		expect(() => readNotionFriendsConfig({})).toThrow(NotionConfigError);
	});

	it("returns friends integration identifiers", () => {
		const config = readNotionFriendsConfig({
			NOTION_API_KEY: "secret-token",
			NOTION_FRIENDS_DATABASE_ID: "friends-database-id",
		});

		expect(config).toEqual({
			apiKey: "secret-token",
			friendsDatabaseId: "friends-database-id",
		});
	});
});
