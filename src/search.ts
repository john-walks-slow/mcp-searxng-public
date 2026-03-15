import { UserError } from 'fastmcp'
import {
  BASE_URLS,
  BATCH_SIZE,
  MIN_SERVERS,
  DEFAULT_PAGES,
  DEFAULT_ENGINES,
  DEFAULT_SAFESARCH,
  DEFAULT_LANGUAGE,
} from './config.js'
import type { Log, SearchResult, ServerSearchResult } from './types.js'
import { getRandomUserAgent } from './browser.js'
import { parseSearchResults } from './parser.js'
import { shuffleAndTake, dedupeByUrls } from './utils.js'
import { throttleManager } from './throttle.js'

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

  // 获取请求许可（throttle 控制）
  await throttleManager.acquire(baseUrl)

  // 随机选择 User-Agent（整个流程使用同一个）
  const userAgent = getRandomUserAgent()

  // ========== fetchCSS 策略 ==========
  // 先访问主页并请求 CSS，模拟真实浏览器行为
  try {
    log.debug('访问主页建立 session', { baseUrl })

    // 1. 访问主页
    const homeHeaders = {
      'User-Agent': userAgent,
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    }

    const homeResponse = await fetch(baseUrl, {
      method: 'GET',
      headers: homeHeaders,
      redirect: 'follow',
    })

    const homeHtml = await homeResponse.text()

    // 2. 解析并请求 CSS 文件
    const cssMatch = homeHtml.match(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']*client[^"']*\.css)["'][^>]*>/i,
    )

    if (cssMatch && cssMatch[1]) {
      const cssPath = cssMatch[1]
      const cssUrl = cssPath.startsWith('http')
        ? cssPath
        : new URL(cssPath, baseUrl).href

      log.debug('请求 CSS 文件', { cssUrl })

      await fetch(cssUrl, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/css,*/*;q=0.1',
          'Referer': baseUrl + '/',
          'Sec-Fetch-Dest': 'style',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin',
        },
      })
    }
  } catch (initError) {
    // 初始化失败不影响主请求
    log.warn('初始化请求失败，继续搜索', {
      error: initError instanceof Error ? initError.message : String(initError),
    })
  }

  // ========== 执行搜索请求 ==========
  // 再次获取许可，确保主页/CSS 请求与搜索请求之间有间隔
  await throttleManager.acquire(baseUrl)
  // 简化请求头
  const searchHeaders = {
    'User-Agent': userAgent,
    'Referer': baseUrl + '/',
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: searchHeaders,
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
 * 并行竞速搜索多个服务器，失败时自动重试其他服务器以满足 MIN_SERVERS
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

  // 初始随机选取服务器
  const initialServers = shuffleAndTake(BASE_URLS, batchSize)
  const triedServers = new Set<string>() // 已尝试的服务器
  const validResults: ServerSearchResult[] = [] // 成功的结果

  // 将初始服务器加入待尝试列表
  const serversToTry = [...initialServers]

  log.debug(`开始并行请求，目标: ${MIN_SERVERS} 个成功服务器`, {
    initialBatch: initialServers,
  })

  // 循环直到满足条件或无更多服务器
  while (validResults.length < MIN_SERVERS && serversToTry.length > 0) {
    // 取出一批服务器尝试
    const batch = serversToTry.splice(0, serversToTry.length)
    batch.forEach((s) => triedServers.add(s))

    // 并行发起请求
    const searchPromises: Promise<ServerSearchResult | null>[] = batch.map(
      (serverUrl: string) =>
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

    // 等待当前批次完成
    const results = await Promise.all(searchPromises)

    // 收集有效结果
    for (const r of results) {
      if (r !== null && r.results.length > 0) {
        validResults.push(r)
      }
    }

    // 如果结果不足，尝试从剩余服务器补充
    if (validResults.length < MIN_SERVERS) {
      const remainingServers = BASE_URLS.filter((s) => !triedServers.has(s))
      if (remainingServers.length > 0) {
        // 计算需要补充的服务器数量
        const needed = MIN_SERVERS - validResults.length
        const extraServers = shuffleAndTake(remainingServers, needed)
        serversToTry.push(...extraServers)
        log.debug(
          `成功服务器不足 (${validResults.length}/${MIN_SERVERS})，补充 ${extraServers.length} 个服务器重试`,
          { extraServers },
        )
      }
    }
  }

  log.debug(`成功获取结果的服务器: ${validResults.length} 个`, {
    servers: validResults.map((r) => ({
      url: r.serverUrl,
      count: r.results.length,
    })),
  })

  // 取前 MIN_SERVERS 个成功的服务器的结果合并
  const topResults = validResults.slice(0, MIN_SERVERS)

  // 合并去重
  const allResults = topResults.flatMap((r) => r.results)
  const mergedResults = dedupeByUrls(allResults)

  if (mergedResults.length === 0) {
    throw new UserError('所有服务器均未返回有效结果')
  }

  return mergedResults
}
