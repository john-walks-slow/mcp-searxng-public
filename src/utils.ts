import { RESULT_FIELDS } from './config.js'
import type { SearchResult } from './types.js'

/**
 * 过滤结果字段，只保留配置中指定的字段
 */
export function filterResultFields(
  result: SearchResult,
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}

  // 始终包含 url（必需字段）
  if (RESULT_FIELDS.includes('url') || RESULT_FIELDS.length === 0) {
    filtered.url = result.url
  }

  if (RESULT_FIELDS.includes('title') && result.title !== undefined) {
    filtered.title = result.title
  }

  if (RESULT_FIELDS.includes('summary')) {
    filtered.summary = result.summary
  }

  if (RESULT_FIELDS.includes('engine') && result.engine !== undefined) {
    filtered.engine = result.engine
  }

  if (
    RESULT_FIELDS.includes('sourceserver') &&
    result.sourceServer !== undefined
  ) {
    filtered.sourceServer = result.sourceServer
  }

  return filtered
}

/**
 * 随机打乱数组并取前 N 个
 */
export function shuffleAndTake<T>(array: T[], count: number | 'all'): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  if (count === 'all') return shuffled
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * 按 URL 去重合并搜索结果
 */
export function dedupeByUrls(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const deduped: SearchResult[] = []

  for (const result of results) {
    if (!seen.has(result.url)) {
      deduped.push(result)
      seen.add(result.url)
    }
  }

  return deduped
}
