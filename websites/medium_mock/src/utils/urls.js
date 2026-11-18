export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const storyUrl = (s, state = {}) => {
  const p = (state.publications ?? []).find((p) => p.id === s?.publicationId),
    u = (state.users ?? []).find((u) => u.id === s?.authorId);
  return `/${p?.slug || "@" + (u?.username || "unknown")}/${s?.slug || "untitled"}-${s?.id}`;
};
export const listUrl = (l, state = {}) =>
  `/@${(state.users ?? []).find((u) => u.id === l?.ownerId)?.username || "unknown"}/list/${slugify(l?.name)}-${l?.id}`;
export const newId = (p) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const now = () => new Date().toISOString();
export const compact = (n) =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);
export function dateLabel(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return "";
  const days = Math.floor((new Date() - d) / 864e5);
  if (days >= 0 && days < 7) return days === 0 ? "Today" : `${days}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}
export function sanitize(html) {
  if (typeof DOMParser === "undefined") return String(html || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const clean = (node) => {
    for (const child of [...node.children]) {
      if (
        ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG"].includes(child.tagName)
      ) {
        child.remove();
        continue;
      }
      clean(child);
      if (["B", "I"].includes(child.tagName)) {
        const semantic = doc.createElement(child.tagName === "B" ? "strong" : "em");
        semantic.append(...child.childNodes);
        child.replaceWith(semantic);
        continue;
      }
      if (!["STRONG", "B", "EM", "I", "A", "BR"].includes(child.tagName))
        child.replaceWith(...child.childNodes);
      else
        for (const attr of [...child.attributes])
          if (
            attr.name !== "href" ||
            child.tagName !== "A" ||
            !/^(https?:\/\/|mailto:|\/)/i.test(attr.value)
          )
            child.removeAttribute(attr.name);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
export async function imageFile(file) {
  if (!file?.type?.startsWith("image/")) throw Error("Choose an image file");
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const c = document.createElement("canvas"),
          scale = Math.min(1, 1200 / img.width);
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
