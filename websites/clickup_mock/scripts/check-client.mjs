import { Window } from "happy-dom";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { createInitialData } from "../src/data/seed.js";
const window = new Window({
  url: "http://localhost:5384/inbox?sid=client-check",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "InputEvent",
  "CustomEvent",
  "localStorage",
  "sessionStorage",
  "MutationObserver",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: key === "window" ? window : window[key],
  });
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let state = createInitialData();
const requests = [];
globalThis.fetch = async (path, options = {}) => {
  if (String(path).startsWith("/state"))
    return {
      ok: true,
      json: async () => ({ has_custom_state: false, stored_state: null }),
    };
  if (String(path).startsWith("/post")) {
    const body = JSON.parse(options.body);
    requests.push(body);
    state = body.state;
    return { ok: true, json: async () => ({ success: true }) };
  }
  throw Error("Unexpected request: " + path);
};
await mkdir("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["scripts/client-cases.jsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/client"],
  outfile: "node_modules/.cache/clickup-client-check.mjs",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "error",
});
try {
  const { runClientChecks } =
    await import("../node_modules/.cache/clickup-client-check.mjs");
  console.log(
    "Client checks:",
    await runClientChecks({ requests, serverState: () => state }),
  );
} finally {
  await window.happyDOM.abort();
}
