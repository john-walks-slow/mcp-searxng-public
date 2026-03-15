# mcp-searxng-public-extended

English | [Chinese](README.zh-CN.md) |

Free web search for your AI using public SearXNG instances.

> **Acknowledgment**: Inspired by [pwilkin/mcp-searxng-public](https://github.com/pwilkin/mcp-searxng-public), extended with parallel multi-server requests, global throttling, configurable parameters, and bilingual schema support (zh/en).

## Features

- **HTML Parsing**: Most public SearXNG instances disable JSON API, this server parses HTML responses directly
- **Rich Parameters**: categories, engines, safesearch, time range, language, pagination, return fields
- **Parallel Racing & Deduplication**: Randomly select `BATCH_SIZE` servers, query in parallel, merge results from top `MIN_SERVERS` fastest
- **Auto Throttling**: Per-server request queue with configurable minimum interval, preventing rate limiting from public instances

## Usage with MCP Clients

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "\"@johnnren/mcp-searxng-public-extended\""],
      "env": {
        "SEARXNG_BASE_URL": "https://opnxng.com;https://priv.au;https://searx.perennialte.ch;https://searx.rhscz.eu",
        "SEARXNG_VISIBLE_PARAMETERS": "query,categories,time_range,language,startPage",
        "SEARXNG_DEFAULT_ENGINES": "google",
        "SEARXNG_DEFAULT_PAGES": "1",
        "SEARXNG_DEFAULT_SAFESARCH": "0",
        "SEARXNG_RESULT_FIELDS": "url,title,summary"
      }
    }
  }
}
```

> Hiding `pages` and `engines` with `SEARXNG_VISIBLE_PARAMETERS` improves stability (not all servers support all engines) and reduces response size (one page is usually enough).

## Environment Variables

| Variable                     | Description                                                          | Default        |
| ---------------------------- | -------------------------------------------------------------------- | -------------- |
| `SEARXNG_BASE_URL`           | SearXNG server URLs (semicolon-separated) **Required**               | -              |
| `SEARXNG_SCHEMA_LANG`        | Schema language: `zh` (Chinese) or `en` (English)                    | `zh`           |
| `SEARXNG_DEFAULT_LANGUAGE`   | Default language code                                                | -              |
| `SEARXNG_BATCH_SIZE`         | Servers to query per search (number or `all`)                        | `1`            |
| `SEARXNG_MIN_SERVERS`        | Merge results from top N fastest servers                             | `1`            |
| `SEARXNG_DEFAULT_ENGINES`    | Default engines (comma-separated)                                    | Server default |
| `SEARXNG_DEFAULT_PAGES`      | Default pages to fetch                                               | `1`            |
| `SEARXNG_DEFAULT_SAFESARCH`  | Safe search level (0=off, 1=moderate, 2=strict)                      | Server default |
| `SEARXNG_MIN_INTERVAL`       | Min interval between requests to same server (ms)                    | `450`          |
| `SEARXNG_RESULT_FIELDS`      | Fields included in result: url, title, summary, engine, sourceServer | All fields     |
| `SEARXNG_VISIBLE_PARAMETERS` | Parameters visible to LLM                                            | `all`          |

## Tool: `search`

Web search via SearXNG.

**Parameters:**

| Parameter    | Type   | Required | Description                                                              |
| ------------ | ------ | -------- | ------------------------------------------------------------------------ |
| `query`      | string | Yes      | Search query                                                             |
| `categories` | string | No       | Categories: `general`, `images`, `news`, `videos`, `science`, `it`, etc. |
| `engines`    | string | No       | Engines: `google`, `bing`, `duckduckgo`, `github`, `stackoverflow`, etc. |
| `safesearch` | number | No       | Level: 0=off, 1=moderate, 2=strict                                       |
| `time_range` | string | No       | Filter: `day`, `week`, `month`, `year`                                   |
| `language`   | string | No       | Language code (e.g., `en`, `zh`)                                         |
| `pages`      | number | No       | Pages to fetch                                                           |
| `startPage`  | number | No       | Starting page number                                                     |

**Returns:** Array of `{ url, title, summary, engine, sourceServer }`

## Publishing

```bash
npm version patch  # or minor/major
git push --follow-tags
```

## License

MIT
