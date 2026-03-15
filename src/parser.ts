import type { SearchResult } from './types.js'

/**
 * 从 HTML 中提取引擎信息
 * 格式: <div class="engines"><span>brave</span><span>google</span>...</div>
 */
function extractEngines(blockHtml: string): string[] {
  const engines: string[] = []

  // 匹配 <div class="engines">...</div> 块
  const enginesDivMatch = blockHtml.match(
    /<div[^>]*class=["'][^"']*engines[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  )

  if (enginesDivMatch) {
    const enginesContent = enginesDivMatch[1]
    // 提取所有 <span> 标签内的文本
    const spanRegex = /<span[^>]*>([^<]+)<\/span>/gi
    let spanMatch
    while ((spanMatch = spanRegex.exec(enginesContent)) !== null) {
      const engine = spanMatch[1].trim()
      if (engine) engines.push(engine)
    }
  }

  return engines
}

/**
 * 从 HTML 中提取标题
 * 格式: <h3><a href="...">Title text<span class="highlight">keyword</span>...</a></h3>
 */
function extractTitle(blockHtml: string): string | undefined {
  // 优先从 h3 标签内的链接提取标题
  const h3Match = blockHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
  if (h3Match) {
    // 移除所有 HTML 标签，只保留纯文本
    const title = h3Match[1].replace(/<[^>]*>/g, '').trim()
    if (title) return title
  }

  // 备选：从 h4 标签提取
  const h4Match = blockHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)
  if (h4Match) {
    const title = h4Match[1].replace(/<[^>]*>/g, '').trim()
    if (title) return title
  }

  // 最后尝试从 title 属性提取
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
    const engines = extractEngines(blockHtml)
    const engine = engines.length > 0 ? engines.join(', ') : undefined

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
