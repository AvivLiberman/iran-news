import { RSS2JSON, XML_PROXIES } from "./config.js";
import { stripHtml } from "./utils.js";

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
      tags: get("tags").split(",").map((t) => t.trim()).filter(Boolean),
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

export async function fetchFeed({ url, label }) {
  // 1. Try rss2json (JSON, CORS-safe)
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
