# Iran News Monitor

A client-side news aggregator that pulls Hebrew RSS feeds and surfaces Iran-related stories using a keyword scoring system. Hosted on GitHub Pages — no build step, no dependencies, no bundler.

## Architecture

Plain HTML/CSS/ES-module JS. All logic runs in the browser. `index.html` loads `main.js` as `type="module"`, which imports from the other modules below.

| File | Responsibility |
|------|----------------|
| `config.js` | RSS feed list, Iran keyword weights, `MIN_SCORE`, CORS proxy URL builders |
| `fetch.js` | RSS fetching via CORS proxies, XML parsing |
| `score.js` | `scoreArticle`, `titleHasIranKeyword`, `relevanceLevel` |
| `utils.js` | Pure helpers: `stripHtml`, `escHtml`, `formatDate`, `timeAgo`, `getSourceClass` |
| `ui.js` | DOM state: `showState`, `showViewToolbar`, `setStatus`, `updateStats` |
| `render.js` | `renderArticles` (grid view) and `renderTimeline` (timeline view) |
| `polymarket.js` | Fetches and renders Polymarket prediction market data (cards + SVG graph) |
| `main.js` | Orchestration: feed loading, deduplication, filtering, source filter bar, view mode, auto-refresh |
| `app.js` | **Legacy monolithic file** — superseded by the modular architecture above. Not loaded by `index.html`. Do not modify. |

## Key concepts

### Filtering (double gate)

An article must pass **both** conditions to be shown:
1. `scoreArticle(article) >= MIN_SCORE` — total keyword weight in title + desc + tags ≥ 8
2. `titleHasIranKeyword(article)` — at least one Iran keyword must appear directly in the **title**

This prevents tangential articles that mention Iran only in tags/body from appearing.

### Scoring (`score.js`)

`scoreArticle` concatenates `title + desc + tags`, lowercases the result, then sums weights for every `IRAN_KEYWORDS` term found (via `String.includes`). The same term can only match once per article (substring match, not exact word boundary).

`relevanceLevel` maps a score to a 1–3 tier used for the timeline dot colour:
- **1**: score < 10
- **2**: 10 ≤ score < 20
- **3**: score ≥ 20

### `MIN_SCORE`

Currently **8** (in `config.js`). The legacy `app.js` used 4 — do not confuse the two.

### Fetch chain (`fetch.js`)

Only XML CORS proxies are used (rss2json was dropped). Proxies are tried in order from `XML_PROXIES` in `config.js` until one returns a valid `<item>`-containing response:

1. Custom Cloudflare Worker: `rss-proxy.aviv-liberman.workers.dev`
2. `corsproxy.io`
3. `api.allorigins.win`
4. `api.codetabs.com`
5. `proxy.cors.sh`

If all five fail, the feed is marked as failed and shown in `#feedErrors`.

### Deduplication

Articles are keyed by `article.link || article.title` in a `Set` across all feeds in `main.js:loadAllFeeds`.

### View modes

Users can switch between two views, persisted to `localStorage` under the key `"viewMode"`:

- **Grid** (`renderArticles`): responsive card grid, sorted by `pubDate` descending
- **Timeline** (`renderTimeline`): chronological list grouped by time buckets (last hour / 1–4h / 4–12h / 12–24h / 1–3 days / >3 days), with coloured relevance dots

The view toolbar (`#viewToolbar`) is hidden until the first feed load completes.

### Source filter bar

After loading, a row of buttons appears (`#sourceFilterBar`) letting users filter by news source group (Ynet, מעריב, וואלה, גלובס, ישראל היום). "הכל" resets to all sources. Grouping logic lives in `main.js:getSourceGroup`.

### Polymarket widget

`polymarket.js` fetches `https://gamma-api.polymarket.com/events?slug=us-strikes-iran-by` through the same XML proxies (which work for JSON too). It renders two views toggled by `#polyBtnCards` / `#polyBtnGraph`:

- **Cards** (`renderCards`): 8 day-cards (today + 7 days) showing probability % and 1-day trend
- **Graph** (`renderGraph`): inline SVG area chart of consecutive future markets, with gradient fill, grid lines, peak label, and date axis labels (today / mid / last)

Module-level state (`_marketList`, `_graphData`, `_currentView`, `_listenersAttached`) is retained between the 5-minute auto-refresh cycles so the graph re-renders correctly.

### Auto-refresh

Both `loadAllFeeds` and `loadPolymarket` are called at boot and then every 5 minutes via `setInterval`. The `#refreshBtn` (floating button) triggers both immediately.

## DOM element IDs

These IDs are hardcoded across JS modules — renaming them in HTML requires updating all references:

| ID | Purpose |
|----|---------|
| `loadingState` | Spinner/loading message |
| `emptyState` | "No articles" message |
| `feedGrid` | Grid of article cards |
| `feedTimeline` | Timeline list |
| `feedErrors` | Feed failure notices |
| `viewToolbar` | Grid/Timeline toggle buttons |
| `btnGrid` | Grid view button |
| `btnTimeline` | Timeline view button |
| `sourceFilterBar` | Per-source filter buttons |
| `statusDot` | Status indicator dot |
| `statusText` | Status text |
| `statsBar` | Stats bar container |
| `statTotal` | Article count stat |
| `statSources` | Feed source count stat |
| `statUpdated` | Last updated time stat |
| `refreshBtn` | Floating refresh button |
| `polymarketSection` | Entire Polymarket widget |
| `polyBody` | Polymarket content area |
| `polyVol` | 24h volume badge |
| `polyBtnCards` | Cards view toggle button |
| `polyBtnGraph` | Graph view toggle button |

## CSS conventions

Source badge colours are controlled by `.src-*` classes in `style.css`. Each source group has one class:

| Class | Source |
|-------|--------|
| `.src-ynet` | Ynet |
| `.src-maariv` | מעריב |
| `.src-walla` | וואלה |
| `.src-globes` | גלובס |
| `.src-israelhayom` | ישראל היום |
| `.src-themarker` | TheMarker (reserved) |

## Adding feeds

1. Add an entry to `FEEDS` in `config.js`:
   ```js
   { url: "https://example.com/rss.xml", label: "Source Name" }
   ```
2. Add a case to `getSourceClass()` in `utils.js` returning a CSS class string.
3. Add a case to `getSourceGroup()` in `main.js` returning the display group name.
4. Add the `.src-<name>` CSS rule to `style.css`.

## Adding keywords

Add entries to `IRAN_KEYWORDS` in `config.js`. Weight guidelines:
- **10** — direct country name / demonym (איראן, iran, iranian)
- **7–8** — key figures, IRGC, capitals, nuclear programme terms
- **6** — specific sites (Natanz, Fordow), weapon shipments
- **4** — tangential terms (proxy, Tehran, Persian)

Both Hebrew and English terms are supported. Matching is case-insensitive substring (no word boundaries).

## Deployment

The site is hosted on GitHub Pages from the `main` branch (root of repo). There is no build step — push changes and they are live. `index.html` is the entry point.

## Development notes

- No build tools, no npm, no TypeScript. Open `index.html` directly in a browser (via a local HTTP server to allow ES module imports — e.g. `python3 -m http.server`).
- `app.js` is the legacy monolithic version retained for reference. `index.html` loads `main.js`, not `app.js`.
- The fetch strategy avoids any server-side component. If CORS proxies are unreliable, the first proxy (`rss-proxy.aviv-liberman.workers.dev`) is a custom Cloudflare Worker that can be updated independently.
- All text content is in Hebrew (RTL). The `<html dir="rtl">` attribute and per-element `dir="rtl"` on card titles/descriptions handle bidirectionality.
