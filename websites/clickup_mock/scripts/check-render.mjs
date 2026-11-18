import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["scripts/render-cases.jsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/server"],
  outfile: "node_modules/.cache/clickup-render-check.mjs",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "error",
});
const { checkRenders } =
  await import("../node_modules/.cache/clickup-render-check.mjs");
console.log("Render checks:", checkRenders());
