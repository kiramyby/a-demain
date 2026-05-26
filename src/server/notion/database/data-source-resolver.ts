import { isFullDatabase } from "@notionhq/client"
import { NotionQueryError } from "../errors"

type Config = {
  postsDatabaseId: string
  postsDataSourceId?: string
}

type DatabaseClient = {
  databases: {
    retrieve(args: { database_id: string }): Promise<unknown>
  }
}

const dataSourceCache = new Map<string, string>()

export function clearDataSourceResolverCache(): void {
  dataSourceCache.clear()
}

export async function resolvePostsDataSourceId(
  client: DatabaseClient,
  config: Config,
): Promise<string> {
  if (config.postsDataSourceId) {
    return config.postsDataSourceId
  }

  const cachedDataSourceId = dataSourceCache.get(config.postsDatabaseId)
  if (cachedDataSourceId) {
    return cachedDataSourceId
  }

  const database = await client.databases.retrieve({
    database_id: config.postsDatabaseId,
  })

  if (!isFullDatabase(database as any)) {
    throw new NotionQueryError(`No read permissions on database ${config.postsDatabaseId}`)
  }

  const dataSourceId = (database as any).data_sources?.[0]?.id
  if (!dataSourceId) {
    throw new NotionQueryError(`Database ${config.postsDatabaseId} has no data sources`)
  }

  dataSourceCache.set(config.postsDatabaseId, dataSourceId)
  return dataSourceId
}
