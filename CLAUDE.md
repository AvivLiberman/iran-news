# Iran News Monitor

A client-side news aggregator that pulls Hebrew RSS feeds and surfaces Iran-related stories using a keyword scoring system. Hosted on GitHub Pages — no build step, no dependencies.

## Architecture

Plain HTML/CSS/ES-module JS. All logic runs in the browser.

| File | Responsibility |
|------|----------------|
| `config.js` | RSS feed list, Iran keyword weights, score threshold, proxy URLs |
| `fetch.js` | RSS fetching (rss2json API → CORS proxy fallbacks), XML/JSON parsing |
| `score.js` | Keyword scoring (`scoreArticle`) and relevance bucketing (`relevanceLevel`) |
| `utils.js` | DOM helpers: `stripHtml`, `escHtml`, `formatDate`, `timeAgo`, `getSourceClass` |
| `ui.js` | State display (`showState`), status bar (`setStatus`), stats bar (`updateStats`) |
| `render.js` | Builds and injects article cards into `#feedGrid` |
| `polymarket.js` | Fetches and renders Polymarket prediction market data |
| `main.js` | Orchestrates load, deduplication, filtering, auto-refresh (5 min) |

## Key concepts

- **Scoring**: each article's title + desc + tags are checked against `IRAN_KEYWORDS`; only articles with `score >= MIN_SCORE` (4) are shown.
- **Fetch chain**: tries `rss2json.com` first (JSON, CORS-safe), then falls back through three raw XML CORS proxies.
- **Deduplication**: articles are keyed by `link || title` across all feeds.
- **Sort modes**: by recency (default) or by relevance score — driven by `#sortSelect` in the DOM.

## Adding feeds

Add an entry to `FEEDS` in `config.js`:
```js
{ url: "https://example.com/rss.xml", label: "Source Name" }
```
Add a matching CSS class in `style.css` (`.src-<name>`) and a case in `getSourceClass()` in `utils.js`.

## Adding keywords

Add entries to `IRAN_KEYWORDS` in `config.js`. Weight guidelines: direct name/country = 10, key figures/places = 6–8, tangential terms = 4.
