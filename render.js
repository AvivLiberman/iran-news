import { relevanceLevel } from "./score.js";
import { escHtml, formatDate, timeAgo, getSourceClass } from "./utils.js";
import { showState } from "./ui.js";

export function renderArticles(articles) {
  const sortMode = document.getElementById("sortSelect").value;
  const sorted = [...articles];

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
