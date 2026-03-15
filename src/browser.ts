import { randomInt } from 'crypto'
import { Agent, setGlobalDispatcher, getSetCookies, type Headers } from 'undici'

// ============ 反爬虫配置 ============

// 创建持久化 Agent，支持连接复用
const httpAgent = new Agent({
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 60000,
  pipelining: 1,
})
setGlobalDispatcher(httpAgent)

// ============ Cookie Jar ============

/**
 * 简单的 Cookie Jar 实现
 * 使用 undici 的 getSetCookies 解析 Set-Cookie 头
 */
class CookieJar {
  private cookies: Map<string, Map<string, string>> = new Map()

  /**
   * 从 Response Headers 解析并存储 cookies
   * 使用 undici 的 getSetCookies 进行标准解析
   */
  setCookiesFromHeaders(domain: string, headers: Headers): void {
    const parsedCookies = getSetCookies(headers)
    if (!parsedCookies || parsedCookies.length === 0) return

    if (!this.cookies.has(domain)) {
      this.cookies.set(domain, new Map())
    }

    const domainCookies = this.cookies.get(domain)!

    for (const cookie of parsedCookies) {
      if (cookie.name && cookie.value !== undefined) {
        domainCookies.set(cookie.name, cookie.value)
      }
    }
  }

  /**
   * 获取指定域名的 Cookie 请求头
   */
  getCookieHeader(domain: string): string | undefined {
    const domainCookies = this.cookies.get(domain)
    if (!domainCookies || domainCookies.size === 0) return undefined

    return Array.from(domainCookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  /**
   * 清空所有 cookies
   */
  clear(): void {
    this.cookies.clear()
  }
}

// 全局 Cookie Jar 实例
export const cookieJar = new CookieJar()

// ============ 浏览器指纹 ============

// 常见浏览器 User-Agent 列表（更新到最新版本）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
]

// Chrome 版本列表（用于 Sec-Ch-Ua）
const CHROME_VERSIONS = ['122', '121', '120', '119']
const CHROME_PLATFORMS = ['Windows', 'macOS', 'Linux']

/**
 * 获取随机 User-Agent
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length)]
}

/**
 * 提取域名（用于 cookie 存储）
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * 生成初始化请求头（首次访问主页）
 * 模拟用户从地址栏直接输入 URL 的场景
 */
export function getInitHeaders(
  baseUrl: string,
  userAgent: string,
): Record<string, string> {
  const chromeVersion = CHROME_VERSIONS[randomInt(0, CHROME_VERSIONS.length)]
  const platform = CHROME_PLATFORMS[randomInt(0, CHROME_PLATFORMS.length)]
  const domain = extractDomain(baseUrl)

  // 尝试获取已有 cookies
  const cookieHeader = cookieJar.getCookieHeader(domain)

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not(A:Brand";v="24"`,
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${platform}"`,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none', // 直接访问，没有来源站点
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  }

  // 如果有 cookies，添加到请求头
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader
  }

  return headers
}

/**
 * 生成浏览器请求头（搜索请求）
 * 模拟用户在当前站点内导航的场景
 */
export function getBrowserHeaders(
  baseUrl: string,
  userAgent: string,
): Record<string, string> {
  const chromeVersion = CHROME_VERSIONS[randomInt(0, CHROME_VERSIONS.length)]
  const platform = CHROME_PLATFORMS[randomInt(0, CHROME_PLATFORMS.length)]
  const domain = extractDomain(baseUrl)

  // 尝试获取已有 cookies
  const cookieHeader = cookieJar.getCookieHeader(domain)

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not(A:Brand";v="24"`,
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${platform}"`,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': baseUrl + '/',
    'dnt': '1',
  }

  // 如果有 cookies，添加到请求头
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader
  }

  return headers
}
