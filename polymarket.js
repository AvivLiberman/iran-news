import { XML_PROXIES } from "./config.js";

const POLY_URL = "https://gamma-api.polymarket.com/events?slug=us-strikes-iran-by";

function dateFromTitle(title) {
  if (!title) return null;
  const d = new Date(`${title}, ${new Date().getFullYear()}`);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return null;
}

export async function loadPolymarket() {
  const bodyEl = document.getElementById("polyBody");
  try {
    let data = null;
    for (const makeUrl of XML_PROXIES) {
      try {
        const res = await fetch(makeUrl(POLY_URL));
        if (!res.ok) continue;
        data = await res.json();
        if (data) break;
      } catch {
        /* try next proxy */
      }
    }
    if (!data) throw new Error("All proxies failed");
    const event = Array.isArray(data) ? data[0] : data;
    const markets = event.markets || [];

    // 24h volume badge
    const vol24 = event.volume24hr;
    if (vol24) {
      const fmt =
        vol24 >= 1e6
          ? "$" + (vol24 / 1e6).toFixed(1) + "M"
          : vol24 >= 1e3
            ? "$" + (vol24 / 1e3).toFixed(0) + "K"
            : "$" + Math.round(vol24);
      const volEl = document.getElementById("polyVol");
      if (volEl) volEl.textContent = fmt + " נסחר ב-24ש";
    }

    const marketList = markets
      .filter((m) => !m.closed && m.active)
      .map((m) => ({
        dateStr:
          dateFromTitle(m.groupItemTitle) ||
          m.endDateIso ||
          m.endDate.split("T")[0],
        pct: parseFloat(m.lastTradePrice) || 0,
        dayChange:
          m.oneDayPriceChange != null ? parseFloat(m.oneDayPriceChange) : null,
      }))
      .sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

    if (marketList.length === 0) {
      bodyEl.innerHTML = '<span class="poly-status">אין שווקים פתוחים כרגע</span>';
      return;
    }

    function marketForDate(dateStr) {
      return marketList.find((m) => m.dateStr >= dateStr) || null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

    const cards = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = marketForDate(dateStr);

      const label = i === 0 ? "היום" : i === 1 ? "מחר" : HE_DAYS[d.getDay()];
      const dateLabel = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const pct = entry ? (entry.pct * 100).toFixed(1) + "%" : "—";

      let trendHtml = "";
      if (entry && entry.dayChange !== null) {
        const sign = entry.dayChange >= 0 ? "+" : "";
        const cls = entry.dayChange >= 0 ? "up" : "down";
        const arrow = entry.dayChange >= 0 ? "▲" : "▼";
        trendHtml = `<div class="poly-day-trend ${cls}">${arrow} ${sign}${(entry.dayChange * 100).toFixed(1)}%</div>`;
      }

      return `
          <div class="poly-day-card${i === 0 ? " poly-day-today" : ""}">
            <div class="poly-day-name">${label}</div>
            <div class="poly-day-pct">${pct}</div>
            <div class="poly-day-date">${dateLabel}</div>
            ${trendHtml}
          </div>`;
    }).join("");

    bodyEl.innerHTML = `<div class="poly-days-row">${cards}</div>`;
  } catch {
    bodyEl.innerHTML = '<span class="poly-status">לא ניתן לטעון נתוני Polymarket</span>';
  }
}
