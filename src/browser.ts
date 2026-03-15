import { randomInt } from 'crypto'

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
 * 生成浏览器请求头
 * Sec-Fetch-Mode: navigate 是关键，防止被重定向
 */
export function getBrowserHeaders(
  baseUrl: string,
  userAgent: string,
): Record<string, string> {
  const chromeVersion = CHROME_VERSIONS[randomInt(0, CHROME_VERSIONS.length)]
  const platform = CHROME_PLATFORMS[randomInt(0, CHROME_PLATFORMS.length)]

  return {
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
}
