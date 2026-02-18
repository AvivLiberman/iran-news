import { escHtml, formatDate, timeAgo, getSourceClass } from "./utils.js";
import { showState } from "./ui.js";

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
