#!/usr/bin/env node
import { FastMCP, UserError, Logger } from 'fastmcp'
import { z } from 'zod'
import type { McpSearchParams } from './types.js'
import {
  BASE_URLS,
  BATCH_SIZE,
  MIN_SERVERS,
  DEFAULT_ENGINES,
  DEFAULT_SAFESARCH,
  DEFAULT_LANGUAGE,
  DEFAULT_PAGES,
  DEFAULT_CATEGORIES,
  DEFAULT_TIME_RANGE,
  opt,
} from './config.js'
import { raceSearch } from './search.js'
import { filterResultFields } from './utils.js'
import { t, CURRENT_LANG } from './i18n.js'

const VERSION = '1.0.0'

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
    LANG: CURRENT_LANG,
  })

  const server = new FastMCP({
    name: 'SearXNG Search',
    version: VERSION,
    logger: new ConsoleLogger(),
  })

  server.addTool({
    name: 'search',
    description: t.toolDescription,
    parameters: z.object({
      query: z.string().describe(t.query),
      ...opt(
        'categories',
        z.string().describe(t.categories(DEFAULT_CATEGORIES)).optional(),
      ),
      ...opt(
        'engines',
        z.string().describe(t.engines(DEFAULT_ENGINES)).optional(),
      ),
      ...opt(
        'safesearch',
        z
          .number()
          .min(0)
          .max(2)
          .describe(t.safesearch(DEFAULT_SAFESARCH))
          .optional(),
      ),
      ...opt(
        'time_range',
        z.string().describe(t.timeRange(DEFAULT_TIME_RANGE)).optional(),
      ),
      ...opt(
        'language',
        z.string().describe(t.language(DEFAULT_LANGUAGE)).optional(),
      ),
      ...opt(
        'pages',
        z.number().min(1).max(5).describe(t.pages(DEFAULT_PAGES)).optional(),
      ),
      ...opt('startpage', z.number().min(1).describe(t.startpage).optional()),
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
