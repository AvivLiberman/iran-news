import { escHtml, formatDate, timeAgo, getSourceClass } from "./utils.js";
import { showState } from "./ui.js";
import { relevanceLevel } from "./score.js";

export function renderArticles(articles) {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
  );

  const grid = document.getElementById("feedGrid");
  grid.innerHTML = "";

  if (sorted.length === 0) {
    showState("empty");
    return;
  }

  showState("grid");

  sorted.forEach((article) => {
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
          <p class="card-title" dir="rtl">${escHtml(article.title)}</p>
          ${article.desc ? `<p class="card-desc" dir="rtl">${escHtml(article.desc)}</p>` : ""}
        </div>
        <div class="card-footer"  dir="ltr">
          <a class="read-link" href="${escHtml(article.link)}" target="_blank" rel="noopener">
            קרא &#x2197;
          </a>
        </div>
      `;
    grid.appendChild(card);
  });
}

function getBucket(pubDate) {
  const diff = (Date.now() - new Date(pubDate)) / 3600000;
  if (diff < 1)  return "שעה אחרונה";
  if (diff < 4)  return "1–4 שעות";
  if (diff < 12) return "4–12 שעות";
  if (diff < 24) return "12–24 שעות";
  if (diff < 72) return "יום-שלושה ימים";
  return "יותר מ-3 ימים";
}

export function renderTimeline(articles) {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
  );

  const container = document.getElementById("feedTimeline");
  container.innerHTML = "";

  if (sorted.length === 0) {
    showState("empty");
    return;
  }

  showState("timeline");

  let lastBucket = null;
  sorted.forEach((article) => {
    const bucket = getBucket(article.pubDate);
    if (bucket !== lastBucket) {
      const label = document.createElement("div");
      label.className = "tl-group-label";
      label.textContent = bucket;
      container.appendChild(label);
      lastBucket = bucket;
    }

    const level = relevanceLevel(article.score);
    const item = document.createElement("article");
    item.className = "tl-item";
    item.innerHTML = `
      <div class="tl-dot tl-dot--${level}"></div>
      <div class="tl-content">
        <span class="tl-time" title="${escHtml(formatDate(article.pubDate))}">${timeAgo(article.pubDate)}</span>
        <span class="source-badge ${getSourceClass(article.source)}">${escHtml(article.source)}</span>
        <a class="tl-headline" href="${escHtml(article.link)}" target="_blank" rel="noopener" dir="rtl">${escHtml(article.title)}</a>
      </div>
    `;
    container.appendChild(item);
  });
}
