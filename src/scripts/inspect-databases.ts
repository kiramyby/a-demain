/**
 * Notion 数据库结构诊断脚本
 * 运行: pnpm tsx src/scripts/inspect-databases.ts
 */

import { Client, isFullDatabase } from "@notionhq/client";
import { NOTION_API_VERSION } from "../server/notion/client";

type InspectOption = {
	name?: string;
	color?: string;
};

type InspectGroup = InspectOption & {
	option_ids?: string[];
};

type InspectProperty = {
	id?: string;
	type?: string;
	select?: { options?: InspectOption[] };
	status?: { options?: InspectOption[]; groups?: InspectGroup[] };
	multi_select?: { options?: InspectOption[] };
	number?: { format?: string };
	formula?: { expression?: string };
	relation?: { database_id?: string };
};

type InspectDataSource = {
	views?: unknown;
	properties?: Record<string, InspectProperty>;
};

const notion = new Client({
	auth: process.env.NOTION_API_KEY,
	notionVersion: NOTION_API_VERSION,
});

const POSTS_DATABASE_ID = process.env.NOTION_POSTS_DATABASE_ID;
const FRIENDS_DATABASE_ID = process.env.NOTION_FRIENDS_DATABASE_ID;

console.log(`🔍 检查 Notion 数据库结构（${NOTION_API_VERSION}）\n`);

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string | undefined {
	return typeof error === "object" && error !== null && "code" in error
		? String((error as { code?: unknown }).code)
		: undefined;
}

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

		if (database.data_sources.length > 0) {
			console.log(`\n📦 数据源（Data Sources）:`);
			const firstDataSource = database.data_sources[0];
			console.log(`  ID: ${firstDataSource.id}`);
			console.log(`  名称: ${firstDataSource.name || "(无名称)"}`);

			// 获取 data source 的详细信息（包含 properties）
			console.log(`\n🔄 获取 Data Source 详细信息...`);
			try {
				const dataSource = await notion.request<InspectDataSource>({
					path: `data_sources/${firstDataSource.id}`,
					method: "get",
				});

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
						console.log(`  ✓ ${propertyName}`);
						console.log(`    类型: ${property.type}`);
						console.log(`    ID: ${property.id}`);

						switch (property.type) {
							case "select":
								if (property.select?.options) {
									console.log(`    选项:`);
									property.select.options.forEach((opt) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								break;

							case "status":
								if (property.status?.options) {
									console.log(`    状态选项:`);
									property.status.options.forEach((opt) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								if (property.status?.groups) {
									console.log(`    分组:`);
									property.status.groups.forEach((group) => {
										console.log(
											`      - ${group.name} (${group.color}): ${group.option_ids?.length ?? 0} 个选项`,
										);
									});
								}
								break;

							case "multi_select":
								if (property.multi_select?.options) {
									console.log(`    选项:`);
									property.multi_select.options.forEach((opt) => {
										console.log(`      - ${opt.name} (${opt.color})`);
									});
								}
								break;

							case "number":
								if (property.number?.format) {
									console.log(`    格式: ${property.number.format}`);
								}
								break;

							case "formula":
								if (property.formula?.expression) {
									console.log(`    表达式: ${property.formula.expression}`);
								}
								break;

							case "relation":
								if (property.relation?.database_id) {
									console.log(`    关联数据库: ${property.relation.database_id}`);
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
			} catch (dsError) {
				console.error(`❌ 获取 Data Source 失败:`, errorMessage(dsError));
			}
		} else {
			console.log("\n⚠️  数据库没有 data_sources");
		}
	} catch (error) {
		console.error(`❌ 检查失败:`, errorMessage(error));
		if (errorCode(error) === "object_not_found") {
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
视图（Views）是 Notion API 中的一等资源，可保存：
- 筛选条件
- 排序规则
- 显示配置

⚠️  重要提示：
1. 当前脚本只检查数据库和第一个 Data Source 的结构
2. Views 已经是 Notion API 的一等资源，但不在这个诊断脚本里展开
3. Blog content pipeline 会优先使用已配置的 Posts View，再回退到 Data Source

💡 建议：
- 用这个脚本检查数据库和 Data Source 属性
- 用架构文档确认当前 blog pipeline 的 View / Data Source 优先级
	`);

	console.log(`\n${"=".repeat(60)}`);
	console.log("✨ 检查完成");
	console.log(`${"=".repeat(60)}\n`);
}

main();
