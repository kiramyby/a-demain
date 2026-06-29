import { NotionConfigError } from "./errors";

export type NotionEnv = Record<string, string | undefined>;

export type NotionConfig = {
	apiKey: string;
	postsDatabaseId: string;
	postsDataSourceId?: string;
	postsViewId?: string;
};

export type NotionFriendsConfig = {
	apiKey: string;
	friendsDatabaseId: string;
};

function defaultEnv(): NotionEnv {
	return {
		...(typeof process !== "undefined" ? process.env : {}),
		...((import.meta as unknown as { env?: NotionEnv }).env ?? {}),
	};
}

function required(env: NotionEnv, key: string): string {
	const value = env[key];
	if (!value) {
		throw new NotionConfigError(`Missing required environment variable: ${key}`);
	}
	return value;
}

export function readNotionConfig(env: NotionEnv = defaultEnv()): NotionConfig {
	return {
		apiKey: required(env, "NOTION_API_KEY"),
		postsDatabaseId: required(env, "NOTION_POSTS_DATABASE_ID"),
		postsDataSourceId: env.NOTION_POSTS_DATA_SOURCE_ID || undefined,
		postsViewId: env.NOTION_POSTS_VIEW_ID || undefined,
	};
}

export function readNotionFriendsConfig(env: NotionEnv = defaultEnv()): NotionFriendsConfig {
	return {
		apiKey: required(env, "NOTION_API_KEY"),
		friendsDatabaseId: required(env, "NOTION_FRIENDS_DATABASE_ID"),
	};
}
