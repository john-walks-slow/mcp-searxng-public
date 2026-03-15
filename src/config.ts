// ============ 环境变量配置 ============

// SearXNG 服务器列表（分号分隔）
export const BASE_URLS: string[] = (process.env.SEARXNG_BASE_URL || '')
  .split(';')
  .map((url) => url.trim())
  .filter(Boolean)

// 默认语言
export const DEFAULT_LANGUAGE = process.env.SEARXNG_DEFAULT_LANGUAGE || 'en'

// 每次搜索随机抽取几个服务器（number 或 'all'）
export const BATCH_SIZE = process.env.SEARXNG_BATCH_SIZE || '3'

// 取前几个最快返回的服务器的结果聚合
export const MIN_SERVERS = parseInt(process.env.SEARXNG_MIN_SERVERS || '2', 10)

// 默认搜索引擎
export const DEFAULT_ENGINES = process.env.SEARXNG_DEFAULT_ENGINES || ''

// 默认获取页数
export const DEFAULT_PAGES = parseInt(
  process.env.SEARXNG_DEFAULT_PAGES || '1',
  10,
)

// 默认安全搜索级别
export const DEFAULT_SAFESARCH = process.env.SEARXNG_DEFAULT_SAFESARCH
  ? parseInt(process.env.SEARXNG_DEFAULT_SAFESARCH, 10)
  : undefined

// 默认搜索类别
export const DEFAULT_CATEGORIES = process.env.SEARXNG_DEFAULT_CATEGORIES || ''

// 默认时间范围
export const DEFAULT_TIME_RANGE = process.env.SEARXNG_DEFAULT_TIME_RANGE || ''

// 请求间延迟范围（毫秒）
export const DELAY_MIN = parseInt(process.env.SEARXNG_DELAY_MIN || '500', 10)
export const DELAY_MAX = parseInt(process.env.SEARXNG_DELAY_MAX || '1500', 10)

// 结果中包含的字段（逗号分隔，如 "url,title,summary"）
// 可选值: url, title, summary, engine, sourceServer
// 默认包含所有字段
export const RESULT_FIELDS = (
  process.env.SEARXNG_RESULT_FIELDS || 'url,title,summary,engine,sourceServer'
)
  .split(',')
  .map((f) => f.trim().toLowerCase())
  .filter((f) =>
    ['url', 'title', 'summary', 'engine', 'sourceserver'].includes(f),
  )

// ============ 参数可见性 ============

// 对 LLM 可见的参数（逗号分隔）
// 默认: 全部可见（留空或设为 "all"）
const VISIBLE_SET: Set<string> | null = (() => {
  const envValue = process.env.SEARXNG_VISIBLE_PARAMETERS || ''
  if (!envValue || envValue.toLowerCase() === 'all') return null
  return new Set(envValue.split(',').map((p) => p.trim().toLowerCase()))
})()

/** 检查参数是否对 LLM 可见 */
export const isVisible = (name: string): boolean =>
  VISIBLE_SET === null || VISIBLE_SET.has(name.toLowerCase())
