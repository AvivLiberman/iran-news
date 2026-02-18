export function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "זה עתה";
    if (mins < 60) return `לפני ${mins} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    return `לפני ${days} ימים`;
  } catch {
    return "";
  }
}

export function getSourceClass(label) {
  if (label.startsWith("Ynet")) return "src-ynet";
  if (label.startsWith("מעריב")) return "src-maariv";
  if (label.startsWith("וואלה")) return "src-walla";
  if (label.startsWith("גלובס")) return "src-globes";
  if (label === "ישראל היום") return "src-israelhayom";
  if (label === "TheMarker") return "src-themarker";
  return "";
}
