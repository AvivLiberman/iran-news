import { IRAN_KEYWORDS } from "./config.js";

// Terms that directly identify Iran as the subject (weight-10 keywords).
// If none of these appear, secondary-term accumulation alone (e.g. the TV
// show "Tehran") is unlikely to represent genuine Iran news.
const ANCHOR_TERMS = IRAN_KEYWORDS
  .filter(({ weight }) => weight >= 10)
  .map(({ term }) => term.toLowerCase());

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

// Returns true when an article is genuinely Iran-related.
// Articles that contain a direct Iran anchor term need only meet MIN_SCORE.
// Articles with no anchor term must accumulate ≥ 10 points from secondary
// terms — that rules out single mentions of "Tehran" (the TV show, score 8)
// while keeping articles that reference multiple strong secondary signals.
export function isArticleRelevant(article, score) {
  const haystack = [article.title, article.desc, article.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  const hasAnchor = ANCHOR_TERMS.some((term) => haystack.includes(term));
  return hasAnchor ? score >= 4 : score >= 10;
}

export function relevanceLevel(score) {
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}
