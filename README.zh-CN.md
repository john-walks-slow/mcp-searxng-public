# @johnnren/mcp-searxng-public

允许你的 AI 使用公共 SearXNG 实例进行搜索。（可作为搜索 API 的替代）

## 特性

- **HTML 解析**：大多数公共 SearXNG 实例禁用了 JSON API，本服务器直接解析 HTML 响应
- **并行竞速与去重**：随机选择 `BATCH_SIZE` 个服务器，并行查询，合并前 `MIN_SERVERS` 个最快响应的结果
- **丰富参数**：支持分类、引擎、安全搜索、时间范围、语言、分页

## MCP 客户端配置

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "@johnnren/mcp-searxng-public"],
      "env": {
        "SEARXNG_BASE_URL": "https://opnxng.com;https://priv.au;https://searx.perennialte.ch;https://searx.rhscz.eu",
        "SEARXNG_VISIBLE_PARAMETERS": "query,categories,safesearch,time_range,language,startPage",
        "SEARXNG_DEFAULT_ENGINES": "google,bing",
        "SEARXNG_DEFAULT_PAGES": "1",
        "SEARXNG_DEFAULT_SAFESARCH": "0",
        "SEARXNG_DEFAULT_LANGUAGE": "zh"
      }
    }
  }
}
```

### 支持的环境变量选项

| 环境变量                     | 说明                                         | 默认值                                  |
| ---------------------------- | -------------------------------------------- | --------------------------------------- |
| `SEARXNG_BASE_URL`           | SearXNG 服务器地址（分号分隔）**必需**       | -                                       |
| `SEARXNG_DEFAULT_LANGUAGE`   | 默认语言代码                                 | -                                       |
| `SEARXNG_BATCH_SIZE`         | 每次搜索随机选择的服务器数量（数字或 `all`） | `3`                                     |
| `SEARXNG_MIN_SERVERS`        | 合并前 N 个最快服务器的结果                  | `1`                                     |
| `SEARXNG_DEFAULT_ENGINES`    | 默认搜索引擎（逗号分隔）                     | 服务器默认                              |
| `SEARXNG_DEFAULT_PAGES`      | 默认获取页数                                 | `1`                                     |
| `SEARXNG_DEFAULT_SAFESARCH`  | 默认安全搜索级别（0=关闭, 1=中等, 2=严格）   | 服务器默认                              |
| `SEARXNG_FETCH_COOKIE`       | 是否先从首页获取 cookie                      | `false`                                 |
| `SEARXNG_DELAY_MIN`          | 请求延迟最小值（毫秒）                       | `500`                                   |
| `SEARXNG_DELAY_MAX`          | 请求延迟最大值（毫秒）                       | `1500`                                  |
| `SEARXNG_RESULT_FIELDS`      | 返回结果包含的字段                           | `url,title,summary,engine,sourceServer` |
| `SEARXNG_VISIBLE_PARAMETERS` | 对 LLM 可见的参数                            | `all`                                   |

> `SEARXNG_VISIBLE_PARAMETERS` 中省略 `pages` 和 `engines` 可提高稳定性（部分服务器不支持所有引擎）并减少响应量（一页内容通常足够）。

## 工具说明

本服务器提供 `search` 工具。

### `search`

通过 SearXNG 进行网页搜索。

**参数：**

| 参数         | 类型   | 必需 | 说明                                                               |
| ------------ | ------ | ---- | ------------------------------------------------------------------ |
| `query`      | string | 是   | 搜索查询                                                           |
| `categories` | string | 否   | 分类：`general`, `images`, `news`, `videos`, `science`, `it` 等    |
| `engines`    | string | 否   | 引擎：`google`, `bing`, `duckduckgo`, `github`, `stackoverflow` 等 |
| `safesearch` | number | 否   | 级别：0=关闭, 1=中等, 2=严格                                       |
| `time_range` | string | 否   | 过滤：`day`, `week`, `month`, `year`                               |
| `language`   | string | 否   | 语言代码（如 `en`, `zh`）                                          |
| `pages`      | number | 否   | 获取页数                                                           |
| `startPage`  | number | 否   | 起始页码                                                           |

**返回：** `{ url, title, summary, engine, sourceServer }` 数组

## 许可证

MIT
