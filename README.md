# @johnnren/mcp-searxng-public

MCP server for SearXNG with HTML parsing and parallel racing. Works with virtually all public instances since most disable JSON API for privacy.

## Features

- **Parallel Racing**: Query multiple servers, use fastest responses
- **HTML Parsing**: Works with all public SearXNG instances
- **Smart Deduplication**: Merge results from multiple servers
- **Rich Parameters**: categories, engines, safesearch, time range, language, pagination

## Installation

```bash
pnpm install
pnpm build
```

## Usage with MCP Clients

Add to your MCP client configuration:

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
        "SEARXNG_DEFAULT_SAFESARCH": "0"
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
| `SEARXNG_DEFAULT_LANGUAGE`   | Default language code                                                | -              |
| `SEARXNG_BATCH_SIZE`         | Servers to query per search (number or `all`)                        | `3`            |
| `SEARXNG_MIN_SERVERS`        | Merge results from top N fastest servers                             | `1`            |
| `SEARXNG_DEFAULT_ENGINES`    | Default engines (comma-separated)                                    | Server default |
| `SEARXNG_DEFAULT_PAGES`      | Default pages to fetch                                               | `1`            |
| `SEARXNG_DEFAULT_SAFESARCH`  | Safe search level (0=off, 1=moderate, 2=strict)                      | Server default |
| `SEARXNG_FETCH_COOKIE`       | Fetch cookie from homepage first                                     | `false`        |
| `SEARXNG_DELAY_MIN`          | Request delay min (ms)                                               | `500`          |
| `SEARXNG_DELAY_MAX`          | Request delay max (ms)                                               | `1500`         |
| `SEARXNG_RESULT_FIELDS`      | Fields included in result: url, title, summary, engine, sourceServer | All fields     |
| `SEARXNG_VISIBLE_PARAMETERS` | Parameters visible to LLM                                            | `all`          |

## Parallel Racing

Randomly select `BATCH_SIZE` servers, query in parallel, merge results from top `MIN_SERVERS` fastest.

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

**Examples:**

```json
{ "query": "TypeScript best practices" }
{ "query": "AI news", "time_range": "day" }
{ "query": "cats", "categories": "images" }
{ "query": "React hooks", "engines": "github,stackoverflow" }
```

## License

MIT
