import { FEEDS } from "./config.js";
import { fetchFeed } from "./fetch.js";
import { scoreArticle, isArticleRelevant } from "./score.js";
import { renderArticles } from "./render.js";
import { showState, setStatus, updateStats } from "./ui.js";
import { loadPolymarket } from "./polymarket.js";

let allArticles = [];
let successCount = 0;
let activeSource = null;

function getSourceGroup(label) {
  if (label.startsWith("Ynet")) return "Ynet";
  if (label.startsWith("מעריב")) return "מעריב";
  if (label.startsWith("וואלה")) return "וואלה";
  if (label.startsWith("גלובס")) return "גלובס";
  if (label === "ישראל היום") return "ישראל היום";
  return label;
}

function renderSourceFilter() {
  const bar = document.getElementById("sourceFilterBar");
  if (!bar) return;

  const groups = [...new Set(allArticles.map((a) => getSourceGroup(a.source)))].sort();

  if (groups.length <= 1) {
    bar.style.display = "none";
    return;
  }

  // Reset activeSource if it no longer exists in the loaded articles
  if (activeSource !== null && !groups.includes(activeSource)) {
    activeSource = null;
  }

  bar.style.display = "";
  bar.innerHTML =
    `<button class="source-filter-btn${activeSource === null ? " active" : ""}" data-group="">הכל</button>` +
    groups
      .map(
        (g) =>
          `<button class="source-filter-btn${activeSource === g ? " active" : ""}" data-group="${g}">${g}</button>`,
      )
      .join("");

  bar.querySelectorAll(".source-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSource = btn.dataset.group || null;
      renderSourceFilter();
      applyAndRender();
    });
  });
}

function applyAndRender() {
  const filtered = activeSource
    ? allArticles.filter((a) => getSourceGroup(a.source) === activeSource)
    : allArticles;
  renderArticles(filtered);
}

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
        if (isArticleRelevant(article, score)) allArticles.push({ ...article, score });
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

  updateStats(allArticles.length, successCount);
  renderSourceFilter();
  applyAndRender();
  setStatus("live", `${allArticles.length} כתבות · ${successCount} מקורות`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadAllFeeds();
loadPolymarket();
setInterval(loadAllFeeds, 5 * 60 * 1000);
setInterval(loadPolymarket, 5 * 60 * 1000);

document.getElementById("refreshBtn").addEventListener("click", () => {
  const btn = document.getElementById("refreshBtn");
  btn.classList.add("spinning");
  btn.addEventListener("animationend", () => btn.classList.remove("spinning"), { once: true });
  loadAllFeeds();
  loadPolymarket();
});
