// ── RSS sources ─────────────────────────────────────────────────────────────
const FEEDS = [
  // Ynet
  {
    url: "https://www.ynet.co.il/Integration/StoryRss2.xml",
    label: "Ynet חדשות",
  },
  {
    url: "https://www.ynet.co.il/Integration/StoryRss1854.xml",
    label: "Ynet מבזקים",
  },
  // Maariv
  {
    url: "https://www.maariv.co.il/rss/rssfeedsmivzakichadashot",
    label: "מעריב מבזקים",
  },
  { url: "https://www.maariv.co.il/rss/rsschadashot", label: "מעריב חדשות" },
  // Walla
  { url: "https://rss.walla.co.il/feed/1?type=main", label: "וואלה חדשות" },
  { url: "https://rss.walla.co.il/feed/22", label: "וואלה מבזקים" },
  { url: "https://rss.walla.co.il/feed/2689", label: "וואלה צבא וביטחון" },
  // Globes
  {
    url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2",
    label: "גלובס",
  },
  // Israel Hayom
  {
    url: "https://www.israelhayom.co.il/rss.xml",
    label: "ישראל היום",
  },
];

// ── Iran keywords (Hebrew + English) ────────────────────────────────────────
const IRAN_KEYWORDS = [
  // Hebrew – high weight
  { term: "איראן", weight: 10 },
  { term: "האיראני", weight: 10 },
  { term: "האיראנים", weight: 10 },
  { term: "האיראנית", weight: 10 },
  { term: "טהרן", weight: 8 },
  { term: "חמינאי", weight: 8 },
  { term: "חמנאי", weight: 8 },
  { term: "חמיני", weight: 8 },
  { term: 'פסד"ל', weight: 8 },
  { term: "משמרות המהפכה", weight: 8 },
  { term: "הגרעין האיראני", weight: 10 },
  { term: "תוכנית הגרעין", weight: 7 },
  { term: "העשרת אורניום", weight: 7 },
  { term: "נתנז", weight: 6 },
  { term: "פורדו", weight: 6 },
  { term: "ספינת נשק", weight: 6 },
  { term: "פרוקסי", weight: 4 },
  { term: "רעיסי", weight: 7 },
  { term: "אחמדינז'אד", weight: 7 },
  { term: "פזשכיאן", weight: 7 },
  { term: "רוחאני", weight: 7 },
  // English – high weight
  { term: "iran", weight: 10 },
  { term: "iranian", weight: 10 },
  { term: "tehran", weight: 8 },
  { term: "khamenei", weight: 8 },
  { term: "irgc", weight: 8 },
  { term: "revolutionary guard", weight: 8 },
  { term: "jcpoa", weight: 7 },
  { term: "nuclear deal", weight: 6 },
  { term: "natanz", weight: 6 },
  { term: "fordow", weight: 6 },
  { term: "raisi", weight: 7 },
  { term: "pezeshkian", weight: 7 },
  { term: "ayatollah", weight: 7 },
  { term: "persian", weight: 4 },
  { term: "uranium enrichment", weight: 7 },
  { term: "centrifuge", weight: 6 },
];

const MIN_SCORE = 4; // minimum relevance score to show an article

// ── Fetch strategy ───────────────────────────────────────────────────────────
// 1. rss2json.com — purpose-built RSS→JSON API with CORS; free tier gives 10 items/feed
// 2. corsproxy.io  — raw XML fallback
// 3. codetabs proxy — raw XML fallback
// 4. allorigins raw — raw XML fallback
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
const XML_PROXIES = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

const IMG_RE = /<img[^>]+src=['"]([^'"]+)['"]/i;

function parseXmlItems(xml, label) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  return [...doc.querySelectorAll("item")].map((item) => {
    const get = (tag) => item.querySelector(tag)?.textContent?.trim() ?? "";
    const rawDesc = get("description");
    const imgMatch = rawDesc.match(IMG_RE);
    return {
      title: get("title"),
      link: get("link") || get("guid"),
      pubDate: get("pubDate"),
      desc: stripHtml(rawDesc),
      tags: get("tags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      image: imgMatch ? imgMatch[1] : null,
      source: label,
    };
  });
}

function parseRss2JsonItems(j, label) {
  return (j.items ?? []).map((item) => ({
    title: item.title ?? "",
    link: item.link ?? "",
    pubDate: item.pubDate ?? "",
    desc: stripHtml(item.description ?? ""),
    tags: (item.categories ?? []).filter(Boolean),
    image: item.thumbnail || item.enclosure?.thumbnail || null,
    source: label,
  }));
}

// ── State ────────────────────────────────────────────────────────────────────
let allArticles = [];
let successCount = 0;

// ── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchFeed({ url, label }) {
  // 1. Try rss2json (JSON, CORS-safe, no count param required on free tier)
  try {
    const res = await fetch(RSS2JSON + encodeURIComponent(url));
    if (res.ok) {
      const j = await res.json();
      if (j.status === "ok" && j.items?.length)
        return parseRss2JsonItems(j, label);
    }
  } catch {
    /* fall through */
  }

  // 2. Fallback: raw XML through CORS proxies
  let lastError;
  for (const makeUrl of XML_PROXIES) {
    try {
      const res = await fetch(makeUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.includes("<item>")) return parseXmlItems(text, label);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("All sources failed");
}

function scoreArticle(article) {
  const haystack = [article.title, article.desc, article.tags.join(" ")]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const { term, weight } of IRAN_KEYWORDS) {
    if (haystack.includes(term.toLowerCase())) {
      score += weight;
    }
  }
  return score;
}

function relevanceLevel(score) {
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "זה עתה";
    if (mins < 60) return `לפני ${mins} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    return `לפני ${days} ימים`;
  } catch {
    return "";
  }
}

// ── Source → CSS class ────────────────────────────────────────────────────────
function getSourceClass(label) {
  if (label.startsWith("Ynet")) return "src-ynet";
  if (label.startsWith("מעריב")) return "src-maariv";
  if (label.startsWith("וואלה")) return "src-walla";
  if (label.startsWith("גלובס")) return "src-globes";
  if (label === "ישראל היום") return "src-israelhayom";
  if (label === "TheMarker") return "src-themarker";
  return "";
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderArticles() {
  const sortMode = document.getElementById("sortSelect").value;
  const sorted = [...allArticles];

  if (sortMode === "relevance") {
    sorted.sort((a, b) => b.score - a.score);
  } else {
    sorted.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }

  const grid = document.getElementById("feedGrid");
  grid.innerHTML = "";

  if (sorted.length === 0) {
    showState("empty");
    return;
  }

  showState("grid");

  sorted.forEach((article) => {
    const level = relevanceLevel(article.score);
    const bars = [1, 2, 3]
      .map((i) => `<span class="${i <= level ? "active" : ""}"></span>`)
      .join("");

    const tagsHtml = article.tags
      .slice(0, 5)
      .map((t) => `<span class="tag">${escHtml(t)}</span>`)
      .join("");

    const imgHtml = article.image
      ? `<img class="card-image" src="${escHtml(article.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : "";

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
        ${imgHtml}
        <div class="card-body">
          <div class="card-meta">
            <span class="source-badge ${getSourceClass(article.source)}">${escHtml(article.source)}</span>
            <span class="pub-date" title="${escHtml(formatDate(article.pubDate))}">${timeAgo(article.pubDate)}</span>
          </div>
          <p class="card-title">${escHtml(article.title)}</p>
          ${article.desc ? `<p class="card-desc">${escHtml(article.desc)}</p>` : ""}
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}
        </div>
        <div class="card-footer">
          <div class="relevance">
            <div class="relevance-bars">${bars}</div>
            <span>רלוונטיות ${article.score}</span>
          </div>
          <a class="read-link" href="${escHtml(article.link)}" target="_blank" rel="noopener">
            קרא &#x2197;
          </a>
        </div>
      `;
    grid.appendChild(card);
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── State display ────────────────────────────────────────────────────────────
function showState(state) {
  document.getElementById("loadingState").style.display =
    state === "loading" ? "" : "none";
  document.getElementById("emptyState").style.display =
    state === "empty" ? "" : "none";
  document.getElementById("feedGrid").style.display =
    state === "grid" ? "" : "none";
}

function setStatus(type, text) {
  const dot = document.getElementById("statusDot");
  const span = document.getElementById("statusText");
  if (dot) dot.className = `dot ${type}`;
  if (span) span.textContent = text;
}

function updateStats() {
  const bar = document.getElementById("statsBar");
  if (!bar) return;
  bar.style.display = "";
  document.getElementById("statTotal").textContent = allArticles.length;
  document.getElementById("statSources").textContent = successCount;
  document.getElementById("statUpdated").textContent =
    new Date().toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
}

// ── Main loader ──────────────────────────────────────────────────────────────
async function loadAllFeeds() {
  allArticles = [];
  successCount = 0;
  showState("loading");
  setStatus("loading", "טוען פידים...");
  document.getElementById("feedErrors").innerHTML = "";

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const failedLabels = [];

  const seen = new Set();
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      successCount++;
      for (const article of result.value) {
        const key = article.link || article.title;
        if (seen.has(key)) continue;
        seen.add(key);
        const score = scoreArticle(article);
        if (score >= MIN_SCORE) allArticles.push({ ...article, score });
      }
    } else {
      failedLabels.push(FEEDS[i].label);
    }
  });

  if (failedLabels.length > 0) {
    document.getElementById("feedErrors").innerHTML = failedLabels
      .map(
        (name) =>
          `<div class="feed-error">לא ניתן לטעון את הפיד <strong>${name}</strong> — ייתכן שהוא חסום או לא זמין כרגע.</div>`,
      )
      .join("");
  }

  updateStats();
  renderArticles();
  setStatus(
    allArticles.length > 0 ? "live" : "live",
    `${allArticles.length} כתבות · ${successCount} מקורות`,
  );
}

// ── Polymarket ───────────────────────────────────────────────────────────────
async function loadPolymarket() {
  const bodyEl = document.getElementById("polyBody");
  const POLY_URL =
    "https://gamma-api.polymarket.com/events?slug=us-strikes-iran-by";
  try {
    let data = null;
    for (const makeUrl of XML_PROXIES) {
      try {
        const res = await fetch(makeUrl(POLY_URL));
        if (!res.ok) continue;
        data = await res.json();
        if (data) break;
      } catch {
        /* try next proxy */
      }
    }
    if (!data) throw new Error("All proxies failed");
    const event = Array.isArray(data) ? data[0] : data;

    const markets = event.markets || [];

    // 24h volume badge in header
    const vol24 = event.volume24hr;
    if (vol24) {
      const fmt =
        vol24 >= 1e6
          ? "$" + (vol24 / 1e6).toFixed(1) + "M"
          : vol24 >= 1e3
            ? "$" + (vol24 / 1e3).toFixed(0) + "K"
            : "$" + Math.round(vol24);
      const volEl = document.getElementById("polyVol");
      if (volEl) volEl.textContent = fmt + " נסחר ב-24ש";
    }

    // Parse date from groupItemTitle e.g. "February 5" (no year — append current year)
    function dateFromTitle(title) {
      if (!title) return null;
      const d = new Date(`${title}, ${new Date().getFullYear()}`);
      if (!isNaN(d)) return d.toISOString().split("T")[0];
      return null;
    }

    // One entry per active market: date, last trade price, and 1-day change
    const marketList = markets
      .filter((m) => !m.closed && m.active)
      .map((m) => ({
        dateStr:
          dateFromTitle(m.groupItemTitle) ||
          m.endDateIso ||
          m.endDate.split("T")[0],
        pct: parseFloat(m.lastTradePrice) || 0,
        dayChange:
          m.oneDayPriceChange != null ? parseFloat(m.oneDayPriceChange) : null,
      }))
      .sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

    if (marketList.length === 0) {
      bodyEl.innerHTML =
        '<span class="poly-status">אין שווקים פתוחים כרגע</span>';
      return;
    }

    // For a calendar date, find the first market whose deadline is on or after that date
    function marketForDate(dateStr) {
      return marketList.find((m) => m.dateStr >= dateStr) || null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

    // 8 cards: today + 7 days
    const cards = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = marketForDate(dateStr);

      const label = i === 0 ? "היום" : i === 1 ? "מחר" : HE_DAYS[d.getDay()];
      const dateLabel = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      const pct = entry ? (entry.pct * 100).toFixed(1) + "%" : "—";

      let trendHtml = "";
      if (entry && entry.dayChange !== null) {
        const sign = entry.dayChange >= 0 ? "+" : "";
        const cls = entry.dayChange >= 0 ? "up" : "down";
        const arrow = entry.dayChange >= 0 ? "▲" : "▼";
        trendHtml = `<div class="poly-day-trend ${cls}">${arrow} ${sign}${(entry.dayChange * 100).toFixed(1)}%</div>`;
      }

      return `
          <div class="poly-day-card${i === 0 ? " poly-day-today" : ""}">
            <div class="poly-day-name">${label}</div>
            <div class="poly-day-pct">${pct}</div>
            <div class="poly-day-date">${dateLabel}</div>
            ${trendHtml}
          </div>`;
    }).join("");

    bodyEl.innerHTML = `<div class="poly-days-row">${cards}</div>`;
  } catch (e) {
    document.getElementById("polyBody").innerHTML =
      '<span class="poly-status">לא ניתן לטעון נתוני Polymarket</span>';
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
loadAllFeeds();
loadPolymarket();
// auto-refresh every 5 minutes
setInterval(loadAllFeeds, 5 * 60 * 1000);
setInterval(loadPolymarket, 5 * 60 * 1000);
