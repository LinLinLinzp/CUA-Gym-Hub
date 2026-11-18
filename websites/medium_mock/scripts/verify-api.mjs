import assert from "node:assert/strict";
import { createInitialData } from "../src/data/seed.js";
const origin = "http://localhost:5340",
  sid = "api-" + Date.now(),
  nativeFetch = globalThis.fetch,
  requests = [];
const memory = () => {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };
};
globalThis.window = { location: { search: "?sid=" + sid } };
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();
globalThis.fetch = (url, options) => {
  requests.push({ url, method: options?.method || "GET" });
  return nativeFetch(new URL(url, origin), options);
};
const post = async (data) => {
  const response = await nativeFetch(`${origin}/post?sid=${sid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  assert.equal(response.status, 200);
};
await post({
  action: "set",
  state: {
    stories: [],
    lists: [],
    responses: [],
    publications: [],
    settings: { allowEmailReplies: false },
  },
});
const { loadState, saveState, withSid } = await import(
  "../src/utils/dataManager.js"
);
const loaded = await loadState("medium", createInitialData);
await new Promise((r) => setTimeout(r, 100));
assert.equal(loaded.stories.length, 0);
assert.equal(loaded.users.length, 32);
assert.equal(loaded.settings.allowEmailReplies, false);
assert.equal(loaded.settings.email, "maya.lindqvist@fastmail.com");
assert.equal(requests.filter((r) => r.method === "POST").length, 1);
const reload = await loadState("medium", createInitialData);
assert.deepEqual(loaded, reload);
assert.equal(requests.length, 2, "cache load creates no requests");
assert.equal(withSid("/search?q=books"), "/search?q=books&sid=" + sid);
const next = structuredClone(loaded);
next.ui.homeTab = "following";
saveState("medium", next);
await new Promise((r) => setTimeout(r, 100));
const inspect = await (await nativeFetch(`${origin}/go?sid=${sid}`)).json();
assert.equal(inspect.current_state.ui.homeTab, "following");
assert.ok(inspect.state_diff.ui);
assert.deepEqual(inspect.initial_state.stories, []);
for (const path of [
  "/",
  "/@mayalindqvist/the-quiet-art-of-rereading-st_0041",
  "/me/lists",
  "/slow-culture/manage",
]) {
  const response = await nativeFetch(origin + path + "?sid=" + sid);
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes("<title>Medium</title>"));
}
console.log(
  "PASS: API injection/merge, baseline, cached reload, session links, save, /go diff and deep HTTP routes",
);
