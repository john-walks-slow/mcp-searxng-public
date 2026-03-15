import type { SerializableValue } from 'fastmcp'

/**
 * 日志类型（兼容 fastmcp）
 */
export type Log = {
  debug: (message: string, data?: SerializableValue) => void
  error: (message: string, data?: SerializableValue) => void
  info: (message: string, data?: SerializableValue) => void
  warn: (message: string, data?: SerializableValue) => void
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  url: string
  title?: string
  summary: string
  engine?: string
  sourceServer?: string
}

/**
 * 服务器搜索结果（带服务器信息）
 */
export interface ServerSearchResult {
  serverUrl: string
  results: SearchResult[]
  duration: number
}

/**
 * MCP 工具参数
 */
export interface McpSearchParams {
  query: string
  categories?: string
  engines?: string
  safesearch?: number
  time_range?: string
  language?: string
  pages?: number
  startpage?: number
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  categories?: string
  engines?: string
  safesearch?: number
  timeRange?: string
  language?: string
}
