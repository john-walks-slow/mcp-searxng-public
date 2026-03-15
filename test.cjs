#!/usr/bin/env node
// 测试 MCP SearXNG 服务器

const { spawn } = require('child_process')
const path = require('path')

// 设置环境变量
const env = {
  ...process.env,
  SEARXNG_BASE_URL:
    'https://search.ononoki.org;https://searx.tiekoetter.com;https://opnxng.com',
  SEARXNG_BATCH_SIZE: '2',
  SEARXNG_MIN_SERVERS: '1',
  DEFAULT_LANGUAGE: 'en',
  // 可选：只返回指定字段（注释掉则返回所有字段）
  // SEARXNG_RESULT_FIELDS: 'url,summary',
}

// 启动 MCP 服务器
const serverPath = path.join(__dirname, 'dist', 'index.js')
const child = spawn('node', [serverPath], {
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
})

let stdoutData = ''
let stderrData = ''

child.stdout.on('data', (data) => {
  stdoutData += data.toString()
})

child.stderr.on('data', (data) => {
  stderrData += data.toString()
})

// 发送请求的辅助函数
function sendRequest(request) {
  const jsonStr = JSON.stringify(request)
  child.stdin.write(jsonStr + '\n')
}

// 等待响应的辅助函数
function waitForResponse(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for response'))
    }, timeout)

    const checkInterval = setInterval(() => {
      const lines = stdoutData.split('\n').filter((line) => line.trim())
      if (lines.length > 0) {
        clearTimeout(timeoutId)
        clearInterval(checkInterval)
        try {
          const responses = lines.map((line) => JSON.parse(line))
          resolve(responses)
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`))
        }
      }
    }, 100)
  })
}

async function runTest() {
  console.log('=== 测试 MCP SearXNG 服务器 ===\n')

  try {
    // 1. 初始化请求
    console.log('1. 发送初始化请求...')
    sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 2. 列出工具
    console.log('2. 发送 tools/list 请求...')
    sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 3. 执行搜索
    console.log('3. 执行搜索测试 (查询: "TypeScript")...')
    sendRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: {
          query: 'TypeScript',
          pages: 1,
        },
      },
    })

    // 等待搜索结果（可能需要更长时间）
    console.log('   等待搜索结果...')
    await new Promise((resolve) => setTimeout(resolve, 15000))

    // 解析所有响应
    const responses = stdoutData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch (e) {
          return null
        }
      })
      .filter((r) => r !== null)

    console.log('\n=== 收到的响应 ===\n')

    responses.forEach((response, index) => {
      console.log(`响应 ${index + 1} (ID: ${response.id}):`)
      if (response.result) {
        if (response.result.tools) {
          console.log('  工具列表:')
          response.result.tools.forEach((tool) => {
            console.log(`    - ${tool.name}: ${tool.description}`)
          })
        } else if (response.result.content) {
          console.log('  搜索结果:')
          const results = JSON.parse(response.result.content[0].text)
          console.log(`    找到 ${results.length} 条结果`)
          console.log(`    字段: ${Object.keys(results[0] || {}).join(', ')}`)
          results.slice(0, 3).forEach((r, i) => {
            console.log(`    ${i + 1}. ${r.title || r.url}`)
            if (r.url) console.log(`       URL: ${r.url}`)
            if (r.summary)
              console.log(`       摘要: ${r.summary.substring(0, 100)}...`)
          })
        } else {
          console.log(
            '  结果:',
            JSON.stringify(response.result, null, 2).substring(0, 200),
          )
        }
      } else if (response.error) {
        console.log('  错误:', response.error)
      }
      console.log()
    })

    if (stderrData) {
      console.log('=== 标准错误输出 ===')
      console.log(stderrData)
    }
  } catch (error) {
    console.error('测试失败:', error.message)
    console.log('\n标准输出:', stdoutData)
    console.log('\n标准错误:', stderrData)
  } finally {
    child.kill()
    process.exit(0)
  }
}

// 启动服务器后稍微等待
setTimeout(runTest, 500)
