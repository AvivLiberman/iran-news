// ── RSS sources ──────────────────────────────────────────────────────────────
export const FEEDS = [
  // Ynet
  { url: "https://www.ynet.co.il/Integration/StoryRss2.xml", label: "Ynet חדשות" },
  { url: "https://www.ynet.co.il/Integration/StoryRss1854.xml", label: "Ynet מבזקים" },
  // Maariv
  { url: "https://www.maariv.co.il/rss/rssfeedsmivzakichadashot", label: "מעריב מבזקים" },
  { url: "https://www.maariv.co.il/rss/rsschadashot", label: "מעריב חדשות" },
  // Walla
  { url: "https://rss.walla.co.il/feed/1?type=main", label: "וואלה חדשות" },
  { url: "https://rss.walla.co.il/feed/22", label: "וואלה מבזקים" },
  { url: "https://rss.walla.co.il/feed/2689", label: "וואלה צבא וביטחון" },
  // Globes
  { url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2", label: "גלובס" },
  // Israel Hayom
  { url: "https://www.israelhayom.co.il/rss.xml", label: "ישראל היום" },
];

// ── Iran relevance keywords (Hebrew + English) ────────────────────────────────
export const IRAN_KEYWORDS = [
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

export const MIN_SCORE = 4;

// ── Fetch strategy ────────────────────────────────────────────────────────────
// Raw XML through CORS proxies (tried in order)
export const XML_PROXIES = [
  (u) => `https://rss-proxy.aviv-liberman.workers.dev/?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://proxy.cors.sh/${u}`,
];
