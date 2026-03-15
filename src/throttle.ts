import { MIN_INTERVAL } from './config.js'

/**
 * 单个服务器的状态
 */
interface ServerState {
  lastRequestTime: number
  queue: Array<() => void>
}

/**
 * Throttle 管理器
 * 确保对每个服务器的请求之间有最小间隔
 */
class ThrottleManager {
  private servers: Map<string, ServerState> = new Map()
  private minInterval: number

  constructor(minInterval: number = MIN_INTERVAL) {
    this.minInterval = minInterval
  }

  /**
   * 获取请求许可
   * 如果距离上次请求不足 minInterval，则阻塞等待
   */
  async acquire(serverUrl: string): Promise<void> {
    let state = this.servers.get(serverUrl)
    if (!state) {
      state = { lastRequestTime: 0, queue: [] }
      this.servers.set(serverUrl, state)
    }

    const now = Date.now()
    const elapsed = now - state.lastRequestTime
    const waitTime = this.minInterval - elapsed

    if (waitTime <= 0) {
      // 可以立即执行
      state.lastRequestTime = now
      return
    }

    // 需要等待，加入队列
    return new Promise((resolve) => {
      state!.queue.push(() => {
        state!.lastRequestTime = Date.now()
        resolve()
      })

      // 设置定时器，在 waitTime 后处理队列
      setTimeout(() => this.processQueue(serverUrl), waitTime)
    })
  }

  /**
   * 处理队列中的下一个请求
   */
  private processQueue(serverUrl: string): void {
    const state = this.servers.get(serverUrl)
    if (!state || state.queue.length === 0) return

    const next = state.queue.shift()
    if (next) {
      next()
      // 如果队列还有等待的请求，继续设置定时器
      if (state.queue.length > 0) {
        setTimeout(() => this.processQueue(serverUrl), this.minInterval)
      }
    }
  }

  /**
   * 获取服务器状态（用于调试）
   */
  getStatus(
    serverUrl: string,
  ): { queueLength: number; lastRequestTime: number } | undefined {
    const state = this.servers.get(serverUrl)
    if (!state) return undefined
    return {
      queueLength: state.queue.length,
      lastRequestTime: state.lastRequestTime,
    }
  }
}

// 全局单例
export const throttleManager = new ThrottleManager()
