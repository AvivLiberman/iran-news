import { XML_PROXIES } from "./config.js";

const POLY_URL = "https://gamma-api.polymarket.com/events?slug=us-strikes-iran-by";

let _marketList = [];
let _graphData  = [];
let _currentView = "cards";
let _listenersAttached = false;

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromTitle(title) {
  if (!title) return null;
  const d = new Date(`${title}, ${new Date().getFullYear()}`);
  if (!isNaN(d)) return toLocalDateStr(d);
  return null;
}

/* Returns markets from today forward, stopping when consecutive gap > 1 day */
function buildGraphData(marketList) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

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
    const dateStr = toLocalDateStr(d);
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

  const W = 600, H = 220;
  const PAD = { top: 28, right: 16, bottom: 54, left: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pcts   = data.map((m) => m.pct * 100);
  const rawMax = Math.max(...pcts);
  const maxPct = Math.max(Math.ceil(rawMax / 10) * 10, 20);

  const xOf = (i) =>
    data.length < 2
      ? PAD.left + chartW / 2
      : PAD.left + (i / (data.length - 1)) * chartW;
  const yOf = (pct) => PAD.top + chartH * (1 - pct / maxPct);

  const uid = "pg" + Math.random().toString(36).slice(2, 7);
  const parts = [`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`];

  /* gradient definition */
  parts.push(
    `<defs>`,
    `  <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">`,
    `    <stop offset="0%" stop-color="#0071e3" stop-opacity="0.15"/>`,
    `    <stop offset="100%" stop-color="#0071e3" stop-opacity="0"/>`,
    `  </linearGradient>`,
    `</defs>`
  );

  /* subtle horizontal grid lines only, no labels */
  const gridSteps = [25, 50, 75].filter((v) => v <= maxPct);
  for (const g of gridSteps) {
    const y = yOf(g);
    parts.push(
      `<line class="poly-graph-grid" x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}"/>`
    );
  }

  /* smooth bezier curve + gradient area */
  if (data.length > 1) {
    const xs = data.map((_, i) => xOf(i));
    const ys = data.map((m) => yOf(m.pct * 100));

    let linePath = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const cpx = ((xs[i] + xs[i + 1]) / 2).toFixed(1);
      linePath += ` C ${cpx} ${ys[i].toFixed(1)}, ${cpx} ${ys[i + 1].toFixed(1)}, ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
    }

    const baseY  = yOf(0).toFixed(1);
    const areaPath = `${linePath} L ${xs[xs.length - 1].toFixed(1)} ${baseY} L ${xs[0].toFixed(1)} ${baseY} Z`;
    parts.push(
      `<path fill="url(#${uid})" d="${areaPath}"/>`,
      `<path class="poly-graph-line" d="${linePath}"/>`
    );
  }

  /* peak value label */
  const peakIdx = pcts.indexOf(rawMax);
  const peakX = xOf(peakIdx);
  const peakY = yOf(rawMax);
  const peakAnchor = peakIdx === 0 ? "start" : peakIdx === data.length - 1 ? "end" : "middle";
  parts.push(
    `<circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="3" class="poly-graph-peak-dot"/>`,
    `<text class="poly-graph-peak-label" x="${peakX.toFixed(1)}" y="${(peakY - 8).toFixed(1)}" text-anchor="${peakAnchor}">${rawMax.toFixed(1)}%</text>`
  );

  /* date labels: always first (today) and last, equally spaced in between
     with a minimum pixel gap so labels never crowd each other */
  const labelIndices = new Set();
  if (data.length <= 1) {
    labelIndices.add(0);
  } else {
    const MIN_PX_GAP = 72; // minimum pixels between label centres
    const maxLabels = Math.max(2, Math.min(data.length, Math.floor(chartW / MIN_PX_GAP) + 1));
    for (let step = 0; step < maxLabels; step++) {
      const idx = Math.round((data.length - 1) * step / (maxLabels - 1));
      labelIndices.add(idx);
    }
    // safety: always include first and last
    labelIndices.add(0);
    labelIndices.add(data.length - 1);
  }

  for (const i of [...labelIndices].sort((a, b) => a - b)) {
    const m = data[i];
    const x = xOf(i);
    const dateLabel = new Date(m.dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric", month: "short",
    });
    const anchor = i === 0 ? "start" : i === data.length - 1 ? "end" : "middle";
    parts.push(
      `<text class="poly-graph-axis-label" x="${x.toFixed(1)}" y="${(PAD.top + chartH + 26).toFixed(1)}" text-anchor="${anchor}">${dateLabel}</text>`
    );
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

    /* wire toggle buttons once */
    if (!_listenersAttached) {
      _listenersAttached = true;
      document.getElementById("polyBtnCards")?.addEventListener("click", () => {
        if (_currentView === "cards") return;
        _currentView = "cards";
        setActivePolyBtn("cards");
        renderCards(document.getElementById("polyBody"));
      });
      document.getElementById("polyBtnGraph")?.addEventListener("click", () => {
        if (_currentView === "graph") return;
        _currentView = "graph";
        setActivePolyBtn("graph");
        renderGraph(document.getElementById("polyBody"));
      });
    }

    /* re-render in whichever view is active */
    _currentView === "graph" ? renderGraph(bodyEl) : renderCards(bodyEl);
  } catch {
    bodyEl.innerHTML = '<span class="poly-status">לא ניתן לטעון נתוני Polymarket</span>';
  }
}
