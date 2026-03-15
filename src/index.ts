#!/usr/bin/env node
import { FastMCP, UserError, Logger } from 'fastmcp'
import { z } from 'zod'
import type { McpSearchParams } from './types.js'
import {
  isVisible,
  BASE_URLS,
  BATCH_SIZE,
  MIN_SERVERS,
  DEFAULT_ENGINES,
  DEFAULT_SAFESARCH,
  DEFAULT_LANGUAGE,
  DEFAULT_PAGES,
  DEFAULT_CATEGORIES,
  DEFAULT_TIME_RANGE,
} from './config.js'
import { raceSearch } from './search.js'
import { filterResultFields } from './utils.js'

const VERSION = '1.0.0'

/** 条件展开：仅在参数可见时添加到 schema */
const opt = <T extends z.ZodTypeAny>(name: string, schema: T) =>
  isVisible(name) ? { [name]: schema } : {}

/** 控制台 Logger（用于调试） */
class ConsoleLogger implements Logger {
  debug(...args: unknown[]): void {
    console.debug('[DEBUG]', new Date().toISOString(), ...args)
  }

  error(...args: unknown[]): void {
    console.error('[ERROR]', new Date().toISOString(), ...args)
  }

  info(...args: unknown[]): void {
    console.info('[INFO]', new Date().toISOString(), ...args)
  }

  log(...args: unknown[]): void {
    console.log('[LOG]', new Date().toISOString(), ...args)
  }

  warn(...args: unknown[]): void {
    console.warn('[WARN]', new Date().toISOString(), ...args)
  }
}

// ============ MCP 服务器 ============

function startServer(): void {
  // 启动时打印配置信息
  console.log('[INFO] SearXNG MCP Server 启动')
  console.log('[INFO] 配置:', {
    BASE_URLS,
    BATCH_SIZE,
    MIN_SERVERS,
    DEFAULT_ENGINES,
    DEFAULT_LANGUAGE,
  })

  const server = new FastMCP({
    name: 'SearXNG Search',
    version: VERSION,
    logger: new ConsoleLogger(),
  })

  server.addTool({
    name: 'search',
    description: '使用 SearXNG 进行网络搜索，返回最快有效结果。',
    parameters: z.object({
      query: z.string().describe('搜索查询'),
      ...opt(
        'categories',
        z
          .string()
          .describe(
            `搜索类别，用逗号分隔。支持：general, images, news, music, videos, science, it, social_media。默认: ${DEFAULT_CATEGORIES || '不指定'}`,
          )
          .optional(),
      ),
      ...opt(
        'engines',
        z
          .string()
          .describe(
            `搜索引擎，用逗号分隔。支持：google, bing, duckduckgo, brave, qwant, startpage, wikipedia, github, stackoverflow, reddit, youtube, arxiv。默认: ${DEFAULT_ENGINES || '不指定'}`,
          )
          .optional(),
      ),
      ...opt(
        'safesearch',
        z
          .number()
          .min(0)
          .max(2)
          .describe(
            `安全搜索: 0=关闭, 1=中等, 2=严格。默认: ${DEFAULT_SAFESARCH ?? '不指定'}`,
          )
          .optional(),
      ),
      ...opt(
        'time_range',
        z
          .string()
          .describe(
            `过滤时间范围： day=一天内, week=一周内, month=一个月内, year=一年内。默认: ${DEFAULT_TIME_RANGE || '不指定'}`,
          )
          .optional(),
      ),
      ...opt(
        'language',
        z
          .string()
          .describe(`语言代码 (en, zh, ja)。默认: ${DEFAULT_LANGUAGE}`)
          .optional(),
      ),
      ...opt(
        'pages',
        z
          .number()
          .min(1)
          .max(5)
          .describe(`获取几页结果（建议每次获取 1 页）。默认: ${DEFAULT_PAGES}`)
          .optional(),
      ),
      ...opt(
        'startpage',
        z.number().min(1).describe('起始页码。默认: 1').optional(),
      ),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
      idempotentHint: false,
    },
    execute: async (params, { log }) => {
      const {
        query,
        categories,
        engines,
        safesearch,
        time_range,
        language,
        pages,
        startpage,
      } = params as McpSearchParams

      try {
        const results = await raceSearch(log, query, pages, startpage, {
          categories,
          engines,
          safesearch,
          timeRange: time_range,
          language,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results.map(filterResultFields), null, 2),
            },
          ],
        }
      } catch (error) {
        throw new UserError(
          `搜索失败: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    },
  })

  process.on('SIGINT', () => process.exit(0))

  process.stdout.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code === 'EPIPE') {
      process.exit(0)
    } else {
      throw err
    }
  })

  server.start({ transportType: 'stdio' })
}

if (!process.env.VITEST) {
  startServer()
}

// 导出用于测试
export { raceSearch, filterResultFields }
export { parseSearchResults } from './parser.js'
export { fetchResults, fetchMultiplePages } from './search.js'
export { shuffleAndTake } from './utils.js'
