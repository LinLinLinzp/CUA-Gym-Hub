export const colors = [
  "#E8D5B7",
  "#B5C9C3",
  "#C9B8D8",
  "#F2C6B4",
  "#A9C6E8",
  "#D8E2B6",
  "#E3B5B5",
  "#BFD7EA",
];
export function coverDataUri(token = "cover:default") {
  if (/^data:image\//.test(token || "")) return token;
  let h = 0;
  for (const c of String(token)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = colors[h % 8],
    b = colors[(h + 3) % 8];
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 28L28 0" stroke="#242424" stroke-opacity=".045"/></pattern></defs><rect width="900" height="600" fill="url(#g)"/><rect width="900" height="600" fill="url(#p)"/><circle cx="${170 + (h % 300)}" cy="190" r="160" fill="#fff" opacity=".4"/><path d="M430 600V300a150 150 0 0 1 300 0v300" fill="#242424" opacity=".65"/><circle cx="${80 + (h % 200)}" cy="510" r="190" fill="${a}"/><path d="M90 440H810M90 450H810" stroke="#242424" opacity=".4"/></svg>`,
    )
  );
}
