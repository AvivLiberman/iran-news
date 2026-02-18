export function showState(state) {
  document.getElementById("loadingState").style.display =
    state === "loading" ? "" : "none";
  document.getElementById("emptyState").style.display =
    state === "empty" ? "" : "none";
  document.getElementById("feedGrid").style.display =
    state === "grid" ? "" : "none";
}

export function setStatus(type, text) {
  const dot = document.getElementById("statusDot");
  const span = document.getElementById("statusText");
  if (dot) dot.className = `dot ${type}`;
  if (span) span.textContent = text;
}

export function updateStats(articleCount, sourceCount) {
  const bar = document.getElementById("statsBar");
  if (!bar) return;
  bar.style.display = "";
  document.getElementById("statTotal").textContent = articleCount;
  document.getElementById("statSources").textContent = sourceCount;
  document.getElementById("statUpdated").textContent =
    new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
