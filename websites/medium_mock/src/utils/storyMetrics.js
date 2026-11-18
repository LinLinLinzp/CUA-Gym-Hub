export function storyMetrics(body = []) {
  const wordCount = body
    .map((b) => b.text || b.items?.join(" ") || "")
    .join(" ").trim().split(/\s+/).filter(Boolean).length;
  return {
    wordCount,
    readingTime: Math.max(1, Math.round(
      wordCount / 265 + body.filter((b) => b.type === "image").length * 0.2,
    )),
  };
}
