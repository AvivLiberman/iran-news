import { XML_PROXIES } from "./config.js";

const POLY_URL = "https://gamma-api.polymarket.com/events?slug=us-strikes-iran-by";

let _marketList = [];
let _graphData  = [];
let _currentView = "cards";

function dateFromTitle(title) {
  if (!title) return null;
  const d = new Date(`${title}, ${new Date().getFullYear()}`);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return null;
}

/* Returns markets from today forward, stopping when consecutive gap > 1 day */
function buildGraphData(marketList) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const future = marketList.filter((m) => m.dateStr >= todayStr);
  const result = [];
  for (let i = 0; i < future.length; i++) {
    result.push(future[i]);
    if (i < future.length - 1) {
      const curr = new Date(future[i].dateStr);
      const next = new Date(future[i + 1].dateStr);
      const diffDays = (next - curr) / (1000 * 60 * 60 * 24);
      if (diffDays > 1) break;
    }
  }
  return result;
}

function renderCards(bodyEl) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  function marketForDate(dateStr) {
    return _marketList.find((m) => m.dateStr >= dateStr) || null;
  }

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
      const cls  = entry.dayChange >= 0 ? "up" : "down";
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
}

function renderGraph(bodyEl) {
  const data = _graphData;
  if (data.length === 0) {
    bodyEl.innerHTML = '<span class="poly-status">אין נתונים להצגה</span>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const W = 600, H = 200;
  const PAD = { top: 28, right: 20, bottom: 48, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pcts    = data.map((m) => m.pct * 100);
  const rawMax  = Math.max(...pcts);
  const maxPct  = Math.max(Math.ceil(rawMax / 10) * 10, 20);

  const xOf = (i) =>
    data.length < 2
      ? PAD.left + chartW / 2
      : PAD.left + (i / (data.length - 1)) * chartW;
  const yOf = (pct) => PAD.top + chartH * (1 - pct / maxPct);

  const gridSteps = [0, 25, 50, 75, 100].filter((v) => v <= maxPct);

  const parts = [`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`];

  /* grid lines + y-axis labels */
  for (const g of gridSteps) {
    const y = yOf(g);
    parts.push(
      `<line class="poly-graph-grid" x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}"/>`,
      `<text class="poly-graph-axis-label" x="${PAD.left - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end">${g}%</text>`
    );
  }

  /* area fill */
  if (data.length > 1) {
    const pts    = data.map((m, i) => `${xOf(i).toFixed(1)},${yOf(m.pct * 100).toFixed(1)}`).join(" ");
    const baseY  = yOf(0).toFixed(1);
    const firstX = xOf(0).toFixed(1);
    const lastX  = xOf(data.length - 1).toFixed(1);
    parts.push(
      `<polygon class="poly-graph-area" points="${firstX},${baseY} ${pts} ${lastX},${baseY}"/>`
    );
  }

  /* line */
  if (data.length > 1) {
    const d = data
      .map((m, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(m.pct * 100).toFixed(1)}`)
      .join(" ");
    parts.push(`<path class="poly-graph-line" d="${d}"/>`);
  }

  /* dots + labels */
  for (let i = 0; i < data.length; i++) {
    const m       = data[i];
    const x       = xOf(i);
    const y       = yOf(m.pct * 100);
    const isToday = m.dateStr === todayStr;
    const pctLabel = (m.pct * 100).toFixed(0) + "%";
    const dateLabel = new Date(m.dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric", month: "short",
    });

    /* today vertical marker */
    if (isToday) {
      parts.push(
        `<line class="poly-graph-today-line" x1="${x.toFixed(1)}" y1="${PAD.top}" x2="${x.toFixed(1)}" y2="${(PAD.top + chartH).toFixed(1)}"/>`
      );
    }

    /* dot */
    const r = isToday ? 5 : 4;
    parts.push(
      `<circle class="${"poly-graph-dot" + (isToday ? " poly-graph-dot--today" : "")}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`
    );

    /* value label above dot */
    const fw    = isToday ? "700" : "400";
    const fill  = isToday ? "#0071e3" : "";
    const fillAttr = fill ? ` fill="${fill}"` : "";
    parts.push(
      `<text class="poly-graph-axis-label" x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" text-anchor="middle" font-weight="${fw}"${fillAttr}>${pctLabel}</text>`
    );

    /* x-axis date label */
    const todayFw   = isToday ? "700" : "400";
    const todayFill = isToday ? ` fill="#0071e3"` : "";
    parts.push(
      `<text class="poly-graph-axis-label" x="${x.toFixed(1)}" y="${(PAD.top + chartH + 16).toFixed(1)}" text-anchor="middle" font-weight="${todayFw}"${todayFill}>${dateLabel}</text>`
    );

    if (isToday) {
      parts.push(
        `<text class="poly-graph-axis-label" x="${x.toFixed(1)}" y="${(PAD.top + chartH + 32).toFixed(1)}" text-anchor="middle" font-weight="700" fill="#0071e3">היום</text>`
      );
    }
  }

  parts.push("</svg>");
  bodyEl.innerHTML = `<div class="poly-graph-wrap">${parts.join("")}</div>`;
}

function setActivePolyBtn(view) {
  const cardsBtn = document.getElementById("polyBtnCards");
  const graphBtn = document.getElementById("polyBtnGraph");
  if (!cardsBtn || !graphBtn) return;
  if (view === "graph") {
    graphBtn.classList.add("active");
    graphBtn.setAttribute("aria-pressed", "true");
    cardsBtn.classList.remove("active");
    cardsBtn.setAttribute("aria-pressed", "false");
  } else {
    cardsBtn.classList.add("active");
    cardsBtn.setAttribute("aria-pressed", "true");
    graphBtn.classList.remove("active");
    graphBtn.setAttribute("aria-pressed", "false");
  }
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
    const event   = Array.isArray(data) ? data[0] : data;
    const markets = event.markets || [];

    /* 24h volume badge */
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

    _marketList = markets
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

    if (_marketList.length === 0) {
      bodyEl.innerHTML = '<span class="poly-status">אין שווקים פתוחים כרגע</span>';
      return;
    }

    _graphData = buildGraphData(_marketList);

    /* wire toggle buttons */
    document.getElementById("polyBtnCards")?.addEventListener("click", () => {
      if (_currentView === "cards") return;
      _currentView = "cards";
      setActivePolyBtn("cards");
      renderCards(bodyEl);
    });
    document.getElementById("polyBtnGraph")?.addEventListener("click", () => {
      if (_currentView === "graph") return;
      _currentView = "graph";
      setActivePolyBtn("graph");
      renderGraph(bodyEl);
    });

    /* initial render */
    renderCards(bodyEl);
  } catch {
    bodyEl.innerHTML = '<span class="poly-status">לא ניתן לטעון נתוני Polymarket</span>';
  }
}
