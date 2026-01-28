/**
 * Notion API 交互库
 * 基于 2025-09-03 版本（支持多数据源）
 * 借鉴 notion-cookbook 最佳实践
 * 优化为 Astro 静态站点生成
 */

import { Client, isFullDatabase, iteratePaginatedAPI } from "@notionhq/client";

// ============== TypeScript 类型定义 ==============

export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	status: string;
	publishedDate: string | null;
	updatedDate: string | null;
	category: string;
	tags: string[];
	description: string;
	coverImage: string;
	featured: boolean;
	seoTitle?: string;
	seoKeywords?: string[];
}

export interface Friend {
	id: string;
	name: string;
	url: string;
	avatar: string;
	description: string;
	status: string;
	group: string;
}

export interface NotionBlock {
	id: string;
	type: string;
	has_children: boolean;
	children?: NotionBlock[];
	[key: string]: any;
}

// ============== Notion 客户端初始化 ==============

// 初始化 Notion 客户端
const notion = new Client({
	auth: import.meta.env.NOTION_API_KEY,
});

const POSTS_DATABASE_ID = import.meta.env.NOTION_POSTS_DATABASE_ID;
const FRIENDS_DATABASE_ID = import.meta.env.NOTION_FRIENDS_DATABASE_ID;

// 缓存 data source IDs 以提升 Astro 构建性能
const dataSourceCache = new Map<string, string>();

/**
 * 获取数据库的第一个数据源 ID
 * 在 2025-09-03 版本中，数据库可以包含多个数据源
 * 添加缓存以优化 Astro 静态构建
 */
async function getDataSourceId(databaseId: string): Promise<string> {
	// 检查缓存
	if (dataSourceCache.has(databaseId)) {
		return dataSourceCache.get(databaseId)!;
	}
	const database = await notion.databases.retrieve({
		database_id: databaseId,
	});

	// 使用类型守卫检查是否有完整访问权限
	if (!isFullDatabase(database)) {
		throw new Error(`No read permissions on database: ${databaseId}`);
	}
	// 假设使用第一个数据源
	if (database.data_sources && database.data_sources.length > 0) {
		const dataSourceId = database.data_sources[0].id;
		// 存入缓存
		dataSourceCache.set(databaseId, dataSourceId);
		return dataSourceId;
	}

	throw new Error(`No data sources found in database ${databaseId}`);
}

/**
 * 获取所有已发布的文章
 * 添加错误处理和类型守卫
 */
export async function getAllPosts() {
	return handleNotionError("get all posts", async () => {
		const dataSourceId = await getDataSourceId(POSTS_DATABASE_ID);

		// 使用 notion.request 调用新的 data_sources API
		const response: any = await notion.request({
			method: "post",
			path: `data_sources/${dataSourceId}/query`,
			body: {
				filter: {
					property: "Status",
					status: {
						equals: "Published",
					},
				},
				sorts: [
					{
						property: "Published Date",
						direction: "descending",
					},
				],
			},
		});

		return response.results.map((page: any) => ({
			id: page.id,
			title: getPropertyValue(page.properties.Title, "title"),
			slug: getPropertyValue(page.properties.Slug, "rich_text"),
			status: getPropertyValue(page.properties.Status, "status"),
			publishedDate: getPropertyValue(page.properties["Published Date"], "date"),
			updatedDate: getPropertyValue(page.properties["Updated Date"], "date"),
			category: getPropertyValue(page.properties.Category, "select"),
			tags: getPropertyValue(page.properties.Tags, "multi_select"),
			description: getPropertyValue(page.properties.Description, "rich_text"),
			coverImage: getPropertyValue(page.properties["Cover Image"], "url"),
			featured: getPropertyValue(page.properties.Featured, "checkbox"),
			seoTitle: getPropertyValue(page.properties["SEO Title"], "rich_text"),
			seoKeywords: getPropertyValue(page.properties["SEO Keywords"], "multi_select"),
		})) as BlogPost[];
	});
}

/**
 * 根据 slug 获取单个文章
 * 添加错误处理和状态验证
 */
export async function getPostBySlug(slug: string, requirePublished = true) {
	return handleNotionError(`get post by slug: ${slug}`, async () => {
		const dataSourceId = await getDataSourceId(POSTS_DATABASE_ID);

		const response: any = await notion.request({
			method: "post",
			path: `data_sources/${dataSourceId}/query`,
			body: {
				filter: {
					property: "Slug",
					rich_text: {
						equals: slug,
					},
				},
			},
		});

		if (response.results.length === 0) return null;

		const page = response.results[0];
		const post = {
			id: page.id,
			title: getPropertyValue(page.properties.Title, "title"),
			slug: getPropertyValue(page.properties.Slug, "rich_text"),
			status: getPropertyValue(page.properties.Status, "status"),
			publishedDate: getPropertyValue(page.properties["Published Date"], "date"),
			updatedDate: getPropertyValue(page.properties["Updated Date"], "date"),
			category: getPropertyValue(page.properties.Category, "select"),
			tags: getPropertyValue(page.properties.Tags, "multi_select"),
			description: getPropertyValue(page.properties.Description, "rich_text"),
			coverImage: getPropertyValue(page.properties["Cover Image"], "url"),
			featured: getPropertyValue(page.properties.Featured, "checkbox"),
			seoTitle: getPropertyValue(page.properties["SEO Title"], "rich_text"),
			seoKeywords: getPropertyValue(page.properties["SEO Keywords"], "multi_select"),
		} as BlogPost;

		// 验证发布状态
		if (requirePublished && post.status !== "Published") {
			console.warn(`Post "${slug}" is not published (status: ${post.status})`);
			return null;
		}

		return post;
	});
}

/**
 * 获取页面的所有块内容（子页面内容）
 * 使用 iteratePaginatedAPI 自动处理分页
 */
export async function getPageBlocks(pageId: string) {
	const blocks: any[] = [];

	// 使用 iteratePaginatedAPI 自动处理分页（来自 notion-cookbook）
	for await (const block of iteratePaginatedAPI(notion.blocks.children.list, {
		block_id: pageId,
		page_size: 100,
	})) {
		blocks.push(block);
	}

	// 递归获取子块
	for (const block of blocks) {
		if (block.has_children && block.type !== "child_page") {
			block.children = await getPageBlocks(block.id);
		}
	}

	return blocks;
}

/**
 * 从富文本数组中获取纯文本
 * 来自 notion-cookbook 最佳实践
 */
function getPlainTextFromRichText(richText: any[]): string {
	if (!richText || !Array.isArray(richText)) return "";
	return richText.map((t) => t.plain_text).join("");
	// Note: 页面提及如果页面未与集成共享，将返回"Undefined"
}

/**
 * 从任何块类型中获取文本
 * 改进自 notion-cookbook 的 getTextFromBlock
 */
export function getTextFromBlock(block: any): string {
	if (!block) return "";

	let text = "";

	// 对于支持 rich_text 的块类型
	if (block[block.type]?.rich_text) {
		text = getPlainTextFromRichText(block[block.type].rich_text);
	}
	// 处理不支持 rich_text 的块类型
	else {
		switch (block.type) {
			case "bookmark":
				text = block.bookmark?.url || "";
				break;
			case "child_database":
				text = block.child_database?.title || "";
				break;
			case "child_page":
				text = block.child_page?.title || "";
				break;
			case "embed":
			case "video":
			case "file":
			case "image":
			case "pdf":
				text = getMediaSourceText(block);
				break;
			case "equation":
				text = block.equation?.expression || "";
				break;
			case "link_preview":
				text = block.link_preview?.url || "";
				break;
			case "table":
				text = `Table (${block.table?.table_width} columns)`;
				break;
			case "table_of_contents":
				text = "Table of Contents";
				break;
			case "divider":
			case "breadcrumb":
			case "column_list":
				text = "";
				break;
			case "unsupported":
				text = "[Unsupported block type]";
				break;
			default:
				text = "";
				break;
		}
	}

	return text;
}

/**
 * 获取媒体块的源 URL 和可选标题
 * 来自 notion-cookbook
 */
function getMediaSourceText(block: any): string {
	if (!block || !block[block.type]) return "";

	const blockContent = block[block.type];
	let source = "";

	// 确定媒体源
	if (blockContent.external) {
		source = blockContent.external.url;
	} else if (blockContent.file) {
		source = blockContent.file.url;
	} else if (blockContent.url) {
		source = blockContent.url;
	}

	// 如果有标题，返回标题和源
	if (blockContent.caption && blockContent.caption.length > 0) {
		const caption = getPlainTextFromRichText(blockContent.caption);
		return caption ? `${caption}: ${source}` : source;
	}

	return source;
}

/**
 * 获取所有活跃的友链
 * 添加错误处理
 */
export async function getAllFriends() {
	return handleNotionError("get all friends", async () => {
		const dataSourceId = await getDataSourceId(FRIENDS_DATABASE_ID);

		const response: any = await notion.request({
			method: "post",
			path: `data_sources/${dataSourceId}/query`,
			body: {
				filter: {
					property: "Status",
					select: {
						equals: "Active",
					},
				},
				sorts: [
					{
						property: "Name",
						direction: "ascending",
					},
				],
			},
		});

		return response.results.map((page: any) => ({
			id: page.id,
			name: getPropertyValue(page.properties.Name, "title"),
			url: getPropertyValue(page.properties.URL, "url"),
			avatar: getPropertyValue(page.properties.Avatar, "url"),
			description: getPropertyValue(page.properties.Description, "rich_text"),
			status: getPropertyValue(page.properties.Status, "select"),
			group: getPropertyValue(page.properties.Group, "select"),
		})) as Friend[];
	});
}

/**
 * 获取所有分类
 * 添加缓存优化
 */
export async function getAllCategories(): Promise<string[]> {
	return handleNotionError("get all categories", async () => {
		const posts = await getAllPosts();
		const categories = new Set(
			posts.map((post: any) => post.category).filter((cat: any) => cat) as string[],
		);
		return Array.from(categories).sort();
	});
}

/**
 * 获取所有标签
 * 添加缓存优化
 */
export async function getAllTags(): Promise<string[]> {
	return handleNotionError("get all tags", async () => {
		const posts = await getAllPosts();
		const tags = new Set(
			posts.flatMap((post: any) => post.tags).filter((tag: any) => tag) as string[],
		);
		return Array.from(tags).sort();
	});
}

/**
 * 辅助函数：从 Notion 属性中提取值
 * 优化自 notion-cookbook 示例
 */
function getPropertyValue(property: any, type: string): any {
	if (!property) {
		// 根据类型返回合适的默认值
		switch (type) {
			case "multi_select":
				return [];
			case "checkbox":
				return false;
			case "number":
				return null;
			default:
				return "";
		}
	}

	switch (type) {
		case "title":
			return getPlainTextFromRichText(property.title);

		case "rich_text":
			return getPlainTextFromRichText(property.rich_text);

		case "status":
			return property.status?.name || "";

		case "select":
			return property.select?.name || "";

		case "multi_select":
			return property.multi_select?.map((s: any) => s.name) || [];

		case "date":
			return property.date?.start || null;

		case "checkbox":
			return property.checkbox || false;

		case "number":
			return property.number ?? null;

		case "url":
			return property.url || "";

		case "email":
			return property.email || "";

		case "phone_number":
			return property.phone_number || "";

		case "files": {
			const file = property.files?.[0];
			if (!file) return "";
			return file.type === "external" ? file.external.url : file.file?.url || "";
		}

		case "people":
			return property.people || [];

		case "created_time":
			return property.created_time || null;

		case "last_edited_time":
			return property.last_edited_time || null;

		default:
			console.warn(`Unhandled property type: ${type}`);
			return "";
	}
}

/**
 * 错误处理包装器
 */
async function handleNotionError<T>(operation: string, fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error: any) {
		console.error(`Notion API Error (${operation}):`, {
			message: error.message,
			code: error.code,
			status: error.status,
		});
		throw new Error(`Failed to ${operation}: ${error.message}`);
	}
}
