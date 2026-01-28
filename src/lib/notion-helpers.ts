/**
 * Notion 辅助工具函数
 * 为 Astro 静态站点生成优化
 */

import type { BlogPost, Friend, NotionBlock } from "./notion";
import { getAllPosts, getPostBySlug, getPageBlocks, getTextFromBlock } from "./notion";

// ============== 缓存层 ==============

// 目录缓存
const tableOfContentsCache = new Map<
	string,
	{ id: string; level: number; text: string }[]
>();
// 阅读时间缓存
const readingTimeCache = new Map<string, number>();

/**
 * 清理所有缓存（开发时使用）
 */
export function clearAllCaches(): void {
	tableOfContentsCache.clear();
	readingTimeCache.clear();
	console.log("✓ Cleared all notion-helpers caches");
}

// ============== Astro 动态路由辅助函数 ==============

/**
 * 获取所有文章的路径参数（用于 Astro 动态路由）
 * 使用示例：export async function getStaticPaths() { return await getPostPaths(); }
 */
export async function getPostPaths() {
	const posts = await getAllPosts();
	return posts.map((post) => ({
		params: { slug: post.slug },
		props: { post },
	}));
}

/**
 * 按分类获取文章
 */
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
	const posts = await getAllPosts();
	return posts.filter((post) => post.category === category);
}

/**
 * 按标签获取文章
 */
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
	const posts = await getAllPosts();
	return posts.filter((post) => post.tags.includes(tag));
}

/**
 * 获取精选文章
 */
export async function getFeaturedPosts(): Promise<BlogPost[]> {
	const posts = await getAllPosts();
	return posts.filter((post) => post.featured);
}

/**
 * 获取最新文章
 */
export async function getRecentPosts(limit = 5): Promise<BlogPost[]> {
	const posts = await getAllPosts();
	return posts.slice(0, limit);
}

/**
 * 获取分类统计
 */
export async function getCategoryStats(): Promise<Record<string, number>> {
	const posts = await getAllPosts();
	const stats: Record<string, number> = {};

	for (const post of posts) {
		if (post.category) {
			stats[post.category] = (stats[post.category] || 0) + 1;
		}
	}

	return stats;
}

/**
 * 获取标签统计
 */
export async function getTagStats(): Promise<Record<string, number>> {
	const posts = await getAllPosts();
	const stats: Record<string, number> = {};

	for (const post of posts) {
		for (const tag of post.tags) {
			stats[tag] = (stats[tag] || 0) + 1;
		}
	}

	return stats;
}

// ============== 内容渲染辅助函数 ==============

/**
 * 将 Notion 块转换为纯文本（用于摘要、SEO 等）
 */
export function blocksToPlainText(blocks: NotionBlock[], maxLength?: number): string {
	const text = blocks
		.map((block) => getTextFromBlock(block))
		.filter((t) => t.trim())
		.join(" ");

	if (maxLength && text.length > maxLength) {
		return text.slice(0, maxLength) + "...";
	}

	return text;
}

/**
 * 计算文章阅读时间（分钟）- 带缓存
 */
export async function getReadingTime(postId: string, useCache = true): Promise<number> {
	if (useCache && readingTimeCache.has(postId)) {
		return readingTimeCache.get(postId)!;
	}

	const blocks = await getPageBlocks(postId);
	const text = blocksToPlainText(blocks);
	const words = text.split(/\s+/).length;
	// 假设每分钟阅读 200 个单词
	const time = Math.ceil(words / 200);

	readingTimeCache.set(postId, time);
	return time;
}

/**
 * 获取文章目录（从标题块生成）- 带缓存
 */
export async function getTableOfContents(postId: string, useCache = true) {
	if (useCache && tableOfContentsCache.has(postId)) {
		return tableOfContentsCache.get(postId)!;
	}

	const blocks = await getPageBlocks(postId);

	const toc = blocks
		.filter(
			(block) =>
				block.type === "heading_1" || block.type === "heading_2" || block.type === "heading_3",
		)
		.map((block) => ({
			id: block.id,
			level: Number.parseInt(block.type.split("_")[1]),
			text: getTextFromBlock(block),
		}));

	tableOfContentsCache.set(postId, toc);
	return toc;
}

// ============== 友链分组辅助函数 ==============

/**
 * 按分组获取友链
 */
export async function getFriendsByGroup(): Promise<Record<string, Friend[]>> {
	const { getAllFriends } = await import("./notion");
	const friends = await getAllFriends();
	const grouped: Record<string, Friend[]> = {};

	for (const friend of friends) {
		if (!grouped[friend.group]) {
			grouped[friend.group] = [];
		}
		grouped[friend.group].push(friend);
	}

	return grouped;
}

// ============== SEO 辅助函数 ==============

/**
 * 生成文章的 SEO 元数据
 */
export interface SEOMetadata {
	title: string;
	description: string;
	keywords: string[];
	ogImage: string;
	canonical: string;
}

export async function getPostSEOMetadata(
	slug: string,
	siteUrl: string,
): Promise<SEOMetadata | null> {
	const post = await getPostBySlug(slug);
	if (!post) return null;

	return {
		title: post.seoTitle || post.title,
		description: post.description || "",
		keywords: post.seoKeywords || post.tags,
		ogImage: post.coverImage || `${siteUrl}/og-default.png`,
		canonical: `${siteUrl}/posts/${slug}`,
	};
}

// ============== 缓存优化（Astro 构建时）==============

/**
 * 预加载所有文章数据（用于 Astro 构建优化）
 */
export async function preloadAllPosts() {
	const posts = await getAllPosts();
	console.log(`✅ 预加载了 ${posts.length} 篇文章`);
	return posts;
}
