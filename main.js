import { FEEDS, MIN_SCORE } from "./config.js";
import { fetchFeed } from "./fetch.js";
import { scoreArticle } from "./score.js";
import { renderArticles } from "./render.js";
import { showState, setStatus, updateStats } from "./ui.js";
import { loadPolymarket } from "./polymarket.js";

let allArticles = [];
let successCount = 0;

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

  updateStats(allArticles.length, successCount);
  renderArticles(allArticles);
  setStatus("live", `${allArticles.length} כתבות · ${successCount} מקורות`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadAllFeeds();
loadPolymarket();
setInterval(loadAllFeeds, 5 * 60 * 1000);
setInterval(loadPolymarket, 5 * 60 * 1000);

