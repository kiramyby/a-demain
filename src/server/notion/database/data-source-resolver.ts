import { isFullDatabase } from "@notionhq/client";
import { NotionQueryError } from "../errors";

type Config = {
	postsDatabaseId: string;
	postsDataSourceId?: string;
};

type DatabaseClient = {
	databases: {
		retrieve(args: { database_id: string }): Promise<unknown>;
	};
};

const dataSourceCache = new Map<string, string>();

export function clearDataSourceResolverCache(): void {
	dataSourceCache.clear();
}

export async function resolveDatabaseDataSourceId(
	client: DatabaseClient,
	databaseId: string,
	explicitDataSourceId?: string,
): Promise<string> {
	if (explicitDataSourceId) {
		return explicitDataSourceId;
	}

	const cachedDataSourceId = dataSourceCache.get(databaseId);
	if (cachedDataSourceId) {
		return cachedDataSourceId;
	}

	const database = await client.databases.retrieve({
		database_id: databaseId,
	});

	if (!isFullDatabase(database as any)) {
		throw new NotionQueryError(`No read permissions on database ${databaseId}`);
	}

	const dataSourceId = (database as any).data_sources?.[0]?.id;
	if (!dataSourceId) {
		throw new NotionQueryError(`Database ${databaseId} has no data sources`);
	}

	dataSourceCache.set(databaseId, dataSourceId);
	return dataSourceId;
}

export async function resolvePostsDataSourceId(
	client: DatabaseClient,
	config: Config,
): Promise<string> {
	return resolveDatabaseDataSourceId(client, config.postsDatabaseId, config.postsDataSourceId);
}
