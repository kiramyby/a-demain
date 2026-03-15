/**
 * Notion 数据库结构诊断脚本
 * 运行: pnpm tsx src/scripts/inspect-databases.ts
 */

import { Client, isFullDatabase } from "@notionhq/client";

const notion = new Client({
	auth: process.env.NOTION_API_KEY,
});

const POSTS_DATABASE_ID = process.env.NOTION_POSTS_DATABASE_ID;
const FRIENDS_DATABASE_ID = process.env.NOTION_FRIENDS_DATABASE_ID;

console.log("🔍 检查 Notion 数据库结构\n");

async function inspectDatabase(databaseId: string, name: string) {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`📊 ${name} 数据库`);
	console.log(`${"=".repeat(60)}`);

	try {
		const database = await notion.databases.retrieve({
			database_id: databaseId,
		});

		if (!isFullDatabase(database)) {
			console.log("❌ 无法访问数据库，请检查集成权限");
			return;
		}

		console.log(`\n数据库 ID: ${database.id}`);
		console.log(`标题: ${database.title.map((t) => t.plain_text).join("")}`);

		// 检查是否有 data_sources（2025-09-03 版本）
		const db = database as any;
		if (db.data_sources && db.data_sources.length > 0) {
			console.log(`\n📦 数据源（Data Sources）:`);
			const firstDataSource = db.data_sources[0];
			console.log(`  ID: ${firstDataSource.id}`);
			console.log(`  名称: ${firstDataSource.name || "(无名称)"}`);

			// 获取 data source 的详细信息（包含 properties）
			console.log(`\n🔄 获取 Data Source 详细信息...`);
			try {
				const dataSource = (await notion.request({
					path: `data_sources/${firstDataSource.id}`,
					method: "get",
				})) as any;

				// 检查是否有视图信息
				if (dataSource.views) {
					console.log(`\n👁️  视图信息（Views）:`);
					console.log(JSON.stringify(dataSource.views, null, 2));
				}

				console.log(`\n📋 属性结构（Properties）:`);
				if (dataSource.properties) {
					console.log(`共 ${Object.keys(dataSource.properties).length} 个属性\n`);

					// 遍历所有属性
					for (const [propertyName, property] of Object.entries(dataSource.properties)) {
						const prop = property as any;
						console.log(`  ✓ ${propertyName}`);
						console.log(`    类型: ${prop.type}`);
						console.log(`    ID: ${prop.id}`);

						switch (prop.type) {
							case "select":
								if (prop.select?.options) {
									console.log(`    选项:`);
									prop.select.options.forEach((opt: any) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								break;

							case "status":
								if (prop.status?.options) {
									console.log(`    状态选项:`);
									prop.status.options.forEach((opt: any) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								if (prop.status?.groups) {
									console.log(`    分组:`);
									prop.status.groups.forEach((group: any) => {
										console.log(
											`      - ${group.name} (${group.color}): ${group.option_ids.length} 个选项`,
										);
									});
								}
								break;

							case "multi_select":
								if (prop.multi_select?.options) {
									console.log(`    选项:`);
									prop.multi_select.options.forEach((opt: any) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								break;

							case "number":
								if (prop.number?.format) {
									console.log(`    格式: ${prop.number.format}`);
								}
								break;

							case "formula":
								if (prop.formula?.expression) {
									console.log(`    表达式: ${prop.formula.expression}`);
								}
								break;

							case "relation":
								if (prop.relation?.database_id) {
									console.log(`    关联数据库: ${prop.relation.database_id}`);
								}
								break;
						}

						console.log("");
					}
				} else {
					console.log("⚠️  Data Source 中没有 properties 字段");
					console.log("完整 Data Source 响应:");
					console.log(JSON.stringify(dataSource, null, 2));
				}
			} catch (dsError: any) {
				console.error(`❌ 获取 Data Source 失败:`, dsError.message);
			}
		} else {
			console.log("\n⚠️  数据库没有 data_sources");
		}
	} catch (error: any) {
		console.error(`❌ 检查失败:`, error.message);
		if (error.code === "object_not_found") {
			console.log("   提示: 数据库 ID 可能不正确，或集成没有访问权限");
		}
	}
}

async function main() {
	// 检查环境变量
	if (!process.env.NOTION_API_KEY) {
		console.error("❌ 未设置 NOTION_API_KEY");
		process.exit(1);
	}

	if (POSTS_DATABASE_ID) {
		await inspectDatabase(POSTS_DATABASE_ID, "Blog Posts");
	} else {
		console.log("⚠️  未设置 NOTION_POSTS_DATABASE_ID");
	}

	if (FRIENDS_DATABASE_ID) {
		await inspectDatabase(FRIENDS_DATABASE_ID, "Friends");
	} else {
		console.log("⚠️  未设置 NOTION_FRIENDS_DATABASE_ID");
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("📝 关于视图（Views）的说明");
	console.log(`${"=".repeat(60)}`);
	console.log(`
视图（Views）是 Notion 用户界面中的功能，允许用户：
- 创建不同的筛选条件
- 设置排序规则
- 自定义显示的列

⚠️  重要提示：
1. 标准的 Notion API（2025-09-03）不直接提供访问视图配置的功能
2. 视图的筛选和排序设置需要在代码中手动定义
3. API 只能查询数据，不能获取或使用预定义的视图配置
4. notion-query-database-view 工具需要 Business 计划 + Notion AI

💡 建议：
- 在 Notion 中创建视图来预览数据的不同展示方式
- 在代码中复制视图的筛选和排序逻辑
- 例如："Published" 视图 → 代码中使用 status.equals("Published") 过滤器
	`);

	console.log(`\n${"=".repeat(60)}`);
	console.log("✨ 检查完成");
	console.log(`${"=".repeat(60)}\n`);
}

main();
