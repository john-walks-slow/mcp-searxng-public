import { randomInt } from 'crypto'
import { UserError } from 'fastmcp'
import {
  BASE_URLS,
  BATCH_SIZE,
  MIN_SERVERS,
  DELAY_MIN,
  DELAY_MAX,
  DEFAULT_PAGES,
  DEFAULT_ENGINES,
  DEFAULT_SAFESARCH,
  DEFAULT_LANGUAGE,
} from './config.js'
import type { Log, SearchResult, ServerSearchResult } from './types.js'
import { getRandomUserAgent, getBrowserHeaders } from './browser.js'
import { parseSearchResults } from './parser.js'
import { shuffleAndTake, dedupeByUrls } from './utils.js'

/**
 * 从 SearXNG 获取搜索结果（单页）
 */
export async function fetchResults(
  log: Log,
  query: string,
  baseUrl: string,
  options: {
    categories?: string
    engines?: string
    safesearch?: number
    timeRange?: string
    language?: string
    page?: number
  } = {},
): Promise<SearchResult[]> {
  if (!baseUrl) {
    throw new UserError('Base URL 未提供')
  }

  const params = new URLSearchParams({ q: query })
  if (options.categories) params.append('categories', options.categories)
  if (options.engines) params.append('engines', options.engines)
  if (options.safesearch !== undefined)
    params.append('safesearch', String(options.safesearch))
  if (options.timeRange) params.append('time_range', options.timeRange)
  if (options.language) params.append('language', options.language)
  if (options.page && options.page > 1)
    params.append('pageno', String(options.page))

  const url = `${baseUrl}/search?${params.toString()}`
  log.debug('正在获取搜索结果', { url })

  // 随机选择 User-Agent
  const userAgent = getRandomUserAgent()
  const headers = getBrowserHeaders(baseUrl, userAgent)

  // 执行搜索请求
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
    })
  } catch (error) {
    throw new UserError(
      `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    throw new UserError(`HTTP 错误: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  if (html.includes('body class="index_endpoint"')) {
    throw new UserError('被重定向到主页，可能触发了反爬虫机制')
  }

  const results = parseSearchResults(html, baseUrl)

  if (html.length > 100 && results.length === 0) {
    log.warn('HTML 内容存在但未解析出结果')
  }

  return results
}

/**
 * 从单个服务器获取多页结果（带计时）
 */
export async function fetchMultiplePages(
  log: Log,
  query: string,
  serverUrl: string,
  pages: number,
  startPage: number,
  options: {
    categories?: string
    engines?: string
    safesearch?: number
    timeRange?: string
    language?: string
  },
): Promise<ServerSearchResult> {
  const startTime = Date.now()
  const allResults: SearchResult[] = []

  for (let i = 0; i < pages; i++) {
    const page = startPage + i
    try {
      const pageResults = await fetchResults(log, query, serverUrl, {
        ...options,
        page,
      })

      allResults.push(...pageResults)

      if (pageResults.length === 0) break

      if (i < pages - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, randomInt(DELAY_MIN, DELAY_MAX)),
        )
      }
    } catch (error) {
      log.warn(`获取第 ${page} 页结果失败`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    serverUrl,
    results: dedupeByUrls(allResults),
    duration: Date.now() - startTime,
  }
}

/**
 * 并行竞速搜索多个服务器
 */
export async function raceSearch(
  log: Log,
  query: string,
  pages: number = DEFAULT_PAGES,
  startPage: number = 1,
  options: {
    categories?: string
    engines?: string
    safesearch?: number
    timeRange?: string
    language?: string
  } = {},
): Promise<SearchResult[]> {
  const {
    categories,
    engines = DEFAULT_ENGINES || undefined,
    safesearch = DEFAULT_SAFESARCH,
    timeRange,
    language = DEFAULT_LANGUAGE,
  } = options

  if (BASE_URLS.length === 0) {
    throw new UserError('SEARXNG_BASE_URL 环境变量未设置')
  }

  // 解析 batch 大小
  const batchSize: number | 'all' =
    BATCH_SIZE === 'all' ? 'all' : parseInt(BATCH_SIZE, 10) || 3

  // 随机选取服务器
  const selectedServers = shuffleAndTake(BASE_URLS, batchSize)

  log.debug(`并行请求 ${selectedServers.length} 个服务器`, {
    servers: selectedServers,
  })

  // 并行发起请求
  const searchPromises: Promise<ServerSearchResult | null>[] =
    selectedServers.map((serverUrl: string) =>
      fetchMultiplePages(log, query, serverUrl, pages, startPage, {
        categories,
        engines,
        safesearch,
        timeRange,
        language,
      }).catch((error: unknown) => {
        log.warn(`服务器 ${serverUrl} 请求失败`, {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }),
    )

  // 等待所有请求完成
  const results = await Promise.all(searchPromises)

  // 过滤有效结果并按响应时间排序
  const validResults = results
    .filter(
      (r: ServerSearchResult | null): r is ServerSearchResult =>
        r !== null && r.results.length > 0,
    )
    .sort(
      (a: ServerSearchResult, b: ServerSearchResult) => a.duration - b.duration,
    )

  log.debug(`成功获取结果的服务器: ${validResults.length} 个`, {
    servers: validResults.map((r: ServerSearchResult) => ({
      url: r.serverUrl,
      duration: r.duration,
      count: r.results.length,
    })),
  })

  // 取前 MIN_SERVERS 个最快的服务器的结果合并
  const topResults = validResults.slice(0, MIN_SERVERS)

  // 合并去重
  const allResults = topResults.flatMap((r) => r.results)
  const mergedResults = dedupeByUrls(allResults)

  if (mergedResults.length === 0) {
    throw new UserError('所有服务器均未返回有效结果')
  }

  return mergedResults
}
