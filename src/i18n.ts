/**
 * 国际化模块：支持中英文 schema 描述
 */

/** 当前语言（从环境变量读取，默认中文） */
export const CURRENT_LANG: Language = (
  process.env.SEARXNG_SCHEMA_LANG || 'zh'
).toLowerCase() as Language

export type Language = 'zh' | 'en'

/** Schema 描述文本 */
export const descriptions = {
  zh: {
    toolDescription: '使用 SearXNG 进行网络搜索，返回最快有效结果。',
    query: '搜索查询',
    categories: (defaultVal: string) =>
      `搜索类别，用逗号分隔。支持：general, images, news, music, videos, science, it, social_media。默认: ${defaultVal || '不指定'}`,
    engines: (defaultVal: string) =>
      `搜索引擎，用逗号分隔。支持：google, bing, duckduckgo, brave, qwant, startpage, wikipedia, github, stackoverflow, reddit, youtube, arxiv。默认: ${defaultVal || '不指定'}`,
    safesearch: (defaultVal: number | undefined) =>
      `安全搜索: 0=关闭, 1=中等, 2=严格。默认: ${defaultVal ?? '不指定'}`,
    timeRange: (defaultVal: string) =>
      `过滤时间范围： day=一天内, week=一周内, month=一个月内, year=一年内。默认: ${defaultVal || '不指定'}`,
    language: (defaultVal: string) =>
      `语言代码 (en, zh, ja)。默认: ${defaultVal}`,
    pages: (defaultVal: number) =>
      `获取几页结果（建议每次获取 1 页）。默认: ${defaultVal}`,
    startpage: '起始页码。默认: 1',
  },
  en: {
    toolDescription:
      'Web search using SearXNG, returns the fastest valid results.',
    query: 'Search query',
    categories: (defaultVal: string) =>
      `Search categories, comma-separated. Supported: general, images, news, music, videos, science, it, social_media. Default: ${defaultVal || 'not specified'}`,
    engines: (defaultVal: string) =>
      `Search engines, comma-separated. Supported: google, bing, duckduckgo, brave, qwant, startpage, wikipedia, github, stackoverflow, reddit, youtube, arxiv. Default: ${defaultVal || 'not specified'}`,
    safesearch: (defaultVal: number | undefined) =>
      `Safe search: 0=off, 1=moderate, 2=strict. Default: ${defaultVal ?? 'not specified'}`,
    timeRange: (defaultVal: string) =>
      `Time range filter: day, week, month, year. Default: ${defaultVal || 'not specified'}`,
    language: (defaultVal: string) =>
      `Language code (en, zh, ja). Default: ${defaultVal}`,
    pages: (defaultVal: number) =>
      `Number of result pages to fetch (1 page recommended). Default: ${defaultVal}`,
    startpage: 'Starting page number. Default: 1',
  },
} as const

/** 获取当前语言的描述 */
export const t = descriptions[CURRENT_LANG]
