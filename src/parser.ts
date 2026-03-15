import type { SearchResult } from './types.js'

/**
 * 从 HTML 中提取引擎信息
 */
function extractEngine(blockHtml: string): string | undefined {
  const engineMatch = blockHtml.match(/data-engine=["']([^"']+)["']/i)
  if (engineMatch) return engineMatch[1]

  const labelMatch = blockHtml.match(
    /<span[^>]*class=["'][^"']*engine[^"']*["'][^>]*>([^<]+)<\/span>/i,
  )
  if (labelMatch) return labelMatch[1].trim()

  return undefined
}

/**
 * 从 HTML 中提取标题
 */
function extractTitle(blockHtml: string): string | undefined {
  // 方法1：从 url_header 链接的文本内容中提取
  // 注意：链接内可能有子标签，所以使用 [\s\S]*? 而不是 [^<]+
  const urlHeaderMatch = blockHtml.match(
    /<a[^>]*class=["'][^"']*url_header[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
  )
  if (urlHeaderMatch) {
    // 移除内部 HTML 标签，只保留文本
    const title = urlHeaderMatch[1].replace(/<[^>]*>/g, '').trim()
    if (title) return title
  }

  // 方法2：尝试从 h3/h4 标签提取
  const headingMatch = blockHtml.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i)
  if (headingMatch) {
    const title = headingMatch[1].replace(/<[^>]*>/g, '').trim()
    if (title) return title
  }

  // 方法3：尝试从 title 属性提取
  const titleAttrMatch = blockHtml.match(/title=["']([^"']+)["']/i)
  if (titleAttrMatch) {
    return titleAttrMatch[1].trim()
  }

  return undefined
}

/**
 * 从 HTML 中解析搜索结果
 */
export function parseSearchResults(
  html: string,
  sourceServer: string,
): SearchResult[] {
  const results: SearchResult[] = []
  const resultBlockRegex =
    /<article[^>]*class=["'][^"']*result[^"']*["'][^>]*>(.*?)<\/article>/gis
  let blockMatch

  while ((blockMatch = resultBlockRegex.exec(html)) !== null) {
    const blockHtml = blockMatch[1]
    const urlMatch = blockHtml.match(
      /<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*url_header[^"']*["']/i,
    )
    const summaryMatch = blockHtml.match(
      /<p[^>]*class=["'][^"']*content[^"']*["'][^>]*>(.*?)<\/p>/is,
    )

    const url = urlMatch ? urlMatch[1] : null
    const summary = summaryMatch
      ? summaryMatch[1].replace(/<[^>]*>/g, '').trim()
      : null
    const title = extractTitle(blockHtml)
    const engine = extractEngine(blockHtml)

    if (url) {
      results.push({
        url,
        title,
        summary: summary || '无摘要',
        engine,
        sourceServer,
      })
    }
  }

  return results
}
