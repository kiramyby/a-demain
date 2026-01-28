import { NotionAPI } from 'notion-client'
import type { ExtendedRecordMap } from 'notion-types'

const notion = new NotionAPI()
const recordMapCache = new Map<string, ExtendedRecordMap>()

/**
 * 检查页面是否可访问（公开）
 */
export async function isPageAccessible(pageId: string): Promise<boolean> {
  try {
    await notion.getPage(pageId)
    return true
  } catch (error) {
    console.warn(`Page ${pageId} is not accessible (might not be public)`)
    return false
  }
}

/**
 * 获取页面 recordMap（react-notion-x 所需格式）
 * 使用 notion-client,无需 API key,适用于公开页面
 */
export async function getPageRecordMap(pageId: string): Promise<ExtendedRecordMap> {
  if (recordMapCache.has(pageId)) {
    return recordMapCache.get(pageId)!
  }

  try {
    const recordMap = await notion.getPage(pageId)
    recordMapCache.set(pageId, recordMap)
    return recordMap
  } catch (error) {
    console.error(`Failed to fetch recordMap for page ${pageId}:`, error)

    // 提供详细的错误信息和解决方案
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('not found')) {
      throw new Error(
        `Notion 页面未找到或未公开: ${pageId}\n` +
        `解决方案:\n` +
        `1. 在 Notion 中打开该页面\n` +
        `2. 点击右上角 "Share" → "Share to web" 将页面公开\n` +
        `3. 确保页面链接可以在浏览器的隐私模式下访问\n` +
        `4. 重新构建项目`
      )
    }

    throw new Error(`Could not load Notion page: ${pageId}`)
  }
}

/**
 * 清除缓存（开发时使用）
 */
export function clearRecordMapCache(): void {
  recordMapCache.clear()
}
