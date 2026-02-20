import { FEEDS, MIN_SCORE } from "./config.js";
import { fetchFeed } from "./fetch.js";
import { scoreArticle, titleHasIranKeyword } from "./score.js";
import { renderArticles, renderTimeline } from "./render.js";
import { showState, setStatus, updateStats, showViewToolbar } from "./ui.js";
import { loadPolymarket } from "./polymarket.js";

let allArticles = [];
let successCount = 0;
let activeSource = null;
let viewMode = localStorage.getItem("viewMode") || "grid";

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

function updateViewButtons() {
  const btnGrid = document.getElementById("btnGrid");
  const btnTimeline = document.getElementById("btnTimeline");
  if (!btnGrid || !btnTimeline) return;
  btnGrid.classList.toggle("active", viewMode === "grid");
  btnGrid.setAttribute("aria-pressed", String(viewMode === "grid"));
  btnTimeline.classList.toggle("active", viewMode === "timeline");
  btnTimeline.setAttribute("aria-pressed", String(viewMode === "timeline"));
}

function applyAndRender() {
  const filtered = activeSource
    ? allArticles.filter((a) => getSourceGroup(a.source) === activeSource)
    : allArticles;
  viewMode === "timeline" ? renderTimeline(filtered) : renderArticles(filtered);
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
        if (score >= MIN_SCORE && titleHasIranKeyword(article)) allArticles.push({ ...article, score });
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
  showViewToolbar(true);
  updateViewButtons();
  applyAndRender();
  setStatus("live", `${allArticles.length} כתבות · ${successCount} מקורות`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.getElementById("btnGrid").addEventListener("click", () => {
  viewMode = "grid";
  localStorage.setItem("viewMode", "grid");
  updateViewButtons();
  applyAndRender();
});

document.getElementById("btnTimeline").addEventListener("click", () => {
  viewMode = "timeline";
  localStorage.setItem("viewMode", "timeline");
  updateViewButtons();
  applyAndRender();
});

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
