/**
 * Notion API 连接测试
 * 运行: bun run src/scripts/test-notion.ts
 */

import { getAllPosts, getAllFriends } from "../lib/notion";

console.log("🔍 测试 Notion API 连接（2025-09-03 版本）\n");

// 检查环境变量
console.log("📝 环境变量检查:");
console.log(`  API Key: ${process.env.NOTION_API_KEY ? "✅ 已设置" : "❌ 未设置"}`);
console.log(`  Posts DB: ${process.env.NOTION_POSTS_DATABASE_ID ? "✅ 已设置" : "❌ 未设置"}`);
console.log(
	`  Friends DB: ${process.env.NOTION_FRIENDS_DATABASE_ID ? "✅ 已设置" : "❌ 未设置"}\n`,
);

try {
	// 测试文章
	console.log("📚 获取博客文章...");
	const posts = await getAllPosts();
	console.log(`  ✅ 成功获取 ${posts.length} 篇文章`);

	if (posts.length > 0) {
		const post = posts[0];
		console.log(`\n  示例文章:`);
		console.log(`    标题: ${post.title}`);
		console.log(`    Slug: ${post.slug}`);
		console.log(`    分类: ${post.category}`);
		console.log(`    标签: ${post.tags.join(", ")}`);
	}
	console.log();

	// 测试友链
	console.log("🔗 获取友链...");
	const friends = await getAllFriends();
	console.log(`  ✅ 成功获取 ${friends.length} 个友链`);

	if (friends.length > 0) {
		const friend = friends[0];
		console.log(`\n  示例友链:`);
		console.log(`    名称: ${friend.name}`);
		console.log(`    链接: ${friend.url}`);
	}
	console.log();

	console.log("✨ 测试完成！Notion API 工作正常。");
} catch (error) {
	console.error("\n❌ 测试失败:", error);
	console.log("\n请检查:");
	console.log("  1. .env 文件配置是否正确");
	console.log("  2. Integration 是否有数据库访问权限");
	console.log("  3. 数据库 ID 是否正确");
	process.exit(1);
}
