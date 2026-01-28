/**
 * PageId 到 Slug 映射管理
 * 用于正确生成 Notion 内部链接
 */

import type { BlogPost } from "./notion";
import { getAllPosts } from "./notion";

// PageId -> Slug 映射缓存
const pageIdToSlugCache = new Map<string, string>();

/**
 * 构建 pageId 到 slug 的映射
 */
export async function buildPageIdToSlugMap(): Promise<void> {
	const posts = await getAllPosts();

	for (const post of posts) {
		pageIdToSlugCache.set(post.id, post.slug);
	}

	console.log(`✓ Built pageId->slug map for ${pageIdToSlugCache.size} posts`);
}

/**
 * 根据 pageId 获取 slug
 */
export function getSlugByPageId(pageId: string): string | undefined {
	return pageIdToSlugCache.get(pageId);
}

/**
 * 清除映射缓存
 */
export function clearPageIdMap(): void {
	pageIdToSlugCache.clear();
}
