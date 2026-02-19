import { IRAN_KEYWORDS } from "./config.js";

export function scoreArticle(article) {
  const haystack = [article.title, article.desc, article.tags.join(" ")]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const { term, weight } of IRAN_KEYWORDS) {
    if (haystack.includes(term.toLowerCase())) score += weight;
  }
  return score;
}

export function titleHasIranKeyword(article) {
  const title = (article.title || "").toLowerCase();
  return IRAN_KEYWORDS.some(({ term }) => title.includes(term.toLowerCase()));
}

export function relevanceLevel(score) {
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}
