export const arr = (x) => (Array.isArray(x) ? x : []);
export const uid = (p) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
export const now = () => new Date().toISOString();
export const dateKey = (x = new Date()) => {
  const d = new Date(x);
  return Number.isNaN(+d)
    ? ""
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const plusDays = (x, n) => {
  const d = new Date(
    typeof x === "string" && x.length === 10 ? x + "T12:00" : x,
  );
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const monday = (x = new Date()) => {
  const d = new Date(x);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
};
export const formatDuration = (s) => {
  s = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  return `${h ? h + "h " : ""}${m || !h ? m + "m" : ""}`.trim();
};
export const formatClock = (s) => {
  s = Math.max(0, Math.floor(Number(s) || 0));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
export function parseDuration(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  let seconds = 0;
  if (/^\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    seconds = n * (n <= 24 ? 3600 : 60);
  } else if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(v)) {
    const a = v.split(":").map(Number);
    if (a[1] >= 60 || (a[2] || 0) >= 60) return null;
    seconds = a[0] * 3600 + a[1] * 60 + (a[2] || 0);
  } else {
    const re =
      /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)/g;
    let match,
      rest = v;
    while ((match = re.exec(v))) {
      seconds += Number(match[1]) * { h: 3600, m: 60, s: 1 }[match[2][0]];
      rest = rest.replace(match[0], "");
    }
    if (rest.trim()) return null;
  }
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}
export const shortDate = (x) =>
  x
    ? new Date(x.length === 10 ? x + "T12:00" : x).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Empty";
export const stamp = (x) =>
  x
    ? new Date(x).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
export function relativeDate(x) {
  if (!x) return "Empty";
  const k = dateKey(x),
    t = dateKey();
  return k === t
    ? "Today"
    : k === plusDays(t, 1)
      ? "Tomorrow"
      : k === plusDays(t, -1)
        ? "Yesterday"
        : k >= monday() && k <= plusDays(monday(), 6)
          ? new Date(k + "T12:00").toLocaleDateString("en-US", {
              weekday: "short",
            })
          : shortDate(k);
}
export const sum = (items) =>
  arr(items).reduce((a, e) => a + (Number(e.duration) || 0), 0);
