import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  {
    url: "http://localhost:5340/new-story?sid=dom-check",
    pretendToBeVisual: true,
  },
);
for (const name of [
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "DOMParser",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "Event",
  "InputEvent",
  "MouseEvent",
  "KeyboardEvent",
])
  globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.location = dom.window.location;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
  get() {
    return this.textContent;
  },
  set(s) {
    this.textContent = s;
  },
});
const { default: React, act } = await import("react"),
  { createRoot } = await import("react-dom/client"),
  { MemoryRouter } = await import("react-router-dom");
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  logLevel: "error",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.jsx"),
    { AppStore } = await server.ssrLoadModule("/src/store/AppStore.jsx"),
    { UIProvider } = await server.ssrLoadModule("/src/components/UI.jsx");
  const { createInitialData } = await server.ssrLoadModule("/src/data/seed.js");
  let records = [],
    current = createInitialData(),
    custom = null;
  globalThis.fetch = async (url, options) => {
    if (options?.method === "POST") {
      const data = JSON.parse(options.body);
      records.push(data);
      current = data.state;
      return { ok: true, json: async () => ({ success: true }) };
    }
    return {
      ok: true,
      json: async () => ({
        has_custom_state: custom !== null,
        stored_state: custom,
      }),
    };
  };
  let root;
  const mount = async (path) => {
    await act(async () => {
      if (root) root.unmount();
      document.body.innerHTML = '<div id="root"></div>';
      root = createRoot(document.getElementById("root"));
      root.render(
        React.createElement(
          MemoryRouter,
          {
            initialEntries: [path],
            future: { v7_startTransition: true, v7_relativeSplatPath: true },
          },
          React.createElement(
            AppStore,
            null,
            React.createElement(UIProvider, null, React.createElement(App)),
          ),
        ),
      );
      await new Promise((r) => setTimeout(r, 5));
    });
  };
  const click = async (el) => {
      assert.ok(el, "button exists");
      await act(async () =>
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })),
      );
    },
    button = (text) =>
      [...document.querySelectorAll("button")].find(
        (x) => x.textContent.trim() === text,
      );
  const type = async (el, value) => {
    assert.ok(el, "input exists");
    await act(async () => {
      const proto =
        el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const key = async (el, name) => {
    const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
    await act(async () => el.dispatchEvent(event));
    return event;
  };
  const enterText = async (el, value) => {
    await act(async () => {
      el.innerText = value;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  };
  await mount("/new-story?sid=dom-check");
  assert.equal(document.querySelector(".insert-tools"), null, "inserter is hidden without a focused block");
  assert.equal(records.length, 1, "one baseline set");
  assert.equal(records[0].action, "set");
  assert.equal(
    current.stories.length,
    84,
    "opening empty editor creates nothing",
  );
  await type(
    document.querySelector('[aria-label="Title"]'),
    "The city in the rain",
  );
  const titleNode = document.querySelector('[aria-label="Title"]');
  await act(async () => titleNode.focus());
  await key(titleNode, "Enter");
  assert.equal(document.activeElement, document.querySelector("[contenteditable]"), "title Enter focuses body immediately after draft redirect");
  assert.equal(document.querySelector(".insert-tools").parentElement, document.activeElement.parentElement, "inserter is anchored to the focused empty block");
  await enterText(document.activeElement, "alpha beta");
  assert.equal(document.querySelector(".insert-tools"), null, "typing hides the inserter on a nonempty block");
  await key(document.activeElement, "Enter");
  assert.equal(document.activeElement, document.querySelectorAll("[contenteditable]")[1], "Enter synchronously focuses inserted block");
  assert.equal(document.querySelector(".insert-tools").parentElement, document.activeElement.parentElement, "inserter follows the next empty block");
  await enterText(document.activeElement, "gamma delta");
  await act(async () => {
    await new Promise((r) => setTimeout(r, 850));
  });
  let draft = current.stories.find((s) => s.title === "The city in the rain");
  assert.ok(draft);
  assert.equal(current.stories.length, 85);
  assert.deepEqual(draft.body.map((b) => b.text), ["alpha beta", "gamma delta"]);
  const body = document.querySelector("[contenteditable]");
  await act(async () => {
    body.innerText = "I found a bookshop beside the river.";
    body.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText" }),
    );
    await new Promise((r) => setTimeout(r, 850));
  });
  draft = current.stories.find((s) => s.id === draft.id);
  assert.equal(draft.body[0].text, "I found a bookshop beside the river.");
  assert.equal(draft.wordCount, 9);
  const { sanitize } = await server.ssrLoadModule("/src/utils/urls.js");
  assert.equal(sanitize('<b>bold</b> <i>italic</i><script>bad()</script>'), '<strong>bold</strong> <em>italic</em>');
  let selectionRect = { left: 100, top: 200, bottom: 224 };
  dom.window.Range.prototype.getBoundingClientRect = () => selectionRect;
  await act(async () => body.focus());
  const selected = document.createRange();
  selected.setStart(body.firstChild, 2);
  selected.setEnd(body.firstChild, 7);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(selected);
  await act(async () => body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })));
  await click(document.querySelector('[aria-label="Link"]'));
  const linkInput = document.querySelector('[aria-label="Link URL"]');
  await act(async () => linkInput.focus());
  await act(async () => {
    window.getSelection().removeAllRanges();
    document.dispatchEvent(new Event("selectionchange"));
  });
  assert.ok(document.querySelector(".format-toolbar"), "link entry retains the saved selection while the input has focus");
  selectionRect = { left: 120, top: 150, bottom: 174 };
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.activeElement, linkInput, "scroll keeps link input focus");
  assert.equal(document.querySelector(".format-toolbar").style.top, "100px", "link input follows the saved range during scroll");
  await type(linkInput, "https://example.org");
  let linked = false;
  document.execCommand = (command, _showUI, value) => {
    assert.equal(command, "createLink");
    assert.equal(document.activeElement, body, "link command focuses editable before restoring range");
    assert.equal(window.getSelection().toString(), "found", "link preserves selected text");
    const range = window.getSelection().getRangeAt(0);
    const anchor = document.createElement("a");
    anchor.href = value;
    range.surroundContents(anchor);
    linked = true;
  };
  const linkEnter = await key(linkInput, "Enter");
  assert.ok(linkEnter.defaultPrevented, "link Enter never inserts a paragraph");
  assert.ok(linked);
  assert.equal(body.querySelector("a").textContent, "found");
  assert.equal(body.querySelector("a").href, "https://example.org/");
  assert.ok(document.querySelector(".format-toolbar"), "link keeps selection toolbar open");
  document.execCommand = (command) => {
    assert.ok(["bold", "italic"].includes(command));
    assert.equal(window.getSelection().toString(), "found", "sequential formats keep selected text");
    const range = window.getSelection().getRangeAt(0);
    const wrapper = document.createElement(command === "bold" ? "b" : "i");
    range.surroundContents(wrapper);
    range.selectNodeContents(wrapper);
  };
  await click(document.querySelector('[aria-label="Bold"]'));
  assert.equal(document.querySelector('[aria-label="Bold"]').getAttribute("aria-pressed"), "true");
  await click(document.querySelector('[aria-label="Italic"]'));
  assert.equal(document.querySelector('[aria-label="Bold"]').getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelector('[aria-label="Italic"]').getAttribute("aria-pressed"), "true");
  assert.equal(window.getSelection().toString(), "found");
  const selectFound = async () => {
    await act(async () => {
      body.focus();
      const r = document.createRange();
      r.selectNodeContents(body.querySelector("i"));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
      body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    assert.ok(document.querySelector(".format-toolbar"));
  };
  await act(async () => document.querySelector('[aria-label="Bold"]').dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
  ));
  assert.ok(document.querySelector(".format-toolbar"), "toolbar mousedown preserves sequential formatting");
  const formattedHtml = body.innerHTML;
  const staleBold = document.querySelector('[aria-label="Bold"]');
  await act(async () => {
    window.getSelection().removeAllRanges();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
  assert.equal(document.querySelector(".format-toolbar"), null, "outside click dismisses toolbar");
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar"), null, "scroll cannot revive an outside-dismissed toolbar");
  await click(staleBold);
  assert.equal(body.innerHTML, formattedHtml, "dismissed toolbar cannot format the hidden selection");
  await selectFound();
  await act(async () => {
    window.getSelection().collapseToEnd();
    document.dispatchEvent(new Event("selectionchange"));
  });
  assert.equal(document.querySelector(".format-toolbar"), null, "collapsed selection dismisses toolbar");
  await selectFound();
  await act(async () => {
    const r = document.createRange();
    r.selectNodeContents(document.querySelector(".editor-bar span"));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
  });
  assert.equal(document.querySelector(".format-toolbar"), null, "selection outside body blocks dismisses toolbar");
  await selectFound();
  await key(body, "Escape");
  await act(async () => body.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true })));
  assert.equal(document.querySelector(".format-toolbar"), null, "Escape dismisses toolbar without keyup reopening it");
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar"), null, "scroll cannot revive an Escape-dismissed toolbar");
  await selectFound();
  const postsBeforeScroll = records.length;
  selectionRect = { left: 140, top: 120, bottom: 144 };
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar").style.top, "70px", "scroll moves toolbar with selected text");
  assert.equal(document.querySelector(".format-toolbar").style.left, "140px");
  assert.equal(window.getSelection().toString(), "found");
  selectionRect = { left: 140, top: -40, bottom: -16 };
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar").style.visibility, "hidden", "toolbar hides above the editor viewport");
  selectionRect = { left: 140, top: window.innerHeight + 20, bottom: window.innerHeight + 44 };
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar").style.visibility, "hidden", "toolbar hides below the viewport");
  selectionRect = { left: 100, top: 250, bottom: 274 };
  await act(async () => document.dispatchEvent(new Event("scroll")));
  assert.equal(document.querySelector(".format-toolbar").style.visibility, "visible", "toolbar returns when selection scrolls back into view");
  assert.equal(document.querySelector(".format-toolbar").style.top, "200px");
  assert.equal(records.length, postsBeforeScroll, "scroll never writes business state");
  await click(document.querySelector('[aria-label="Bold"]'));
  assert.equal(window.getSelection().toString(), "found", "selection remains formattable after scrolling away and back");
  delete document.execCommand;
  const endOfBody = document.createRange();
  endOfBody.selectNodeContents(body);
  endOfBody.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(endOfBody);
  await key(body, "Enter");
  await enterText(document.activeElement, "an immediate new paragraph");
  assert.equal(document.querySelector(".insert-tools"), null);
  await key(document.activeElement, "Enter");
  await click(document.querySelector('[aria-label="Insert content"]'));
  await click(document.querySelector('[aria-label="Code block"]'));
  assert.equal(document.activeElement.closest(".editor-block").className, "editor-block code");
  await enterText(document.activeElement, "const slow = true;");
  await click(button("Publish"));
  const savedDraft = current.stories.find((s) => s.id === draft.id);
  assert.ok(savedDraft.body.some((b) => b.html?.includes('<a href="https://example.org">found</a>')), "inline link persists through autosave");
  assert.ok(savedDraft.body.some((b) => b.type === "code" && b.text === "const slow = true;"), "code insertion keeps the first typed characters");
  assert.ok(document.querySelector('[aria-label="Publish story"]'));
  await click(button("Publish now"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 15));
  });
  assert.equal(
    current.stories.find((s) => s.id === draft.id).status,
    "published",
  );
  assert.ok(
    document.querySelector("h1")?.textContent.includes("The city in the rain"),
  );
  assert.ok(document.querySelector('[aria-label="Published story URL"]'), "publish confirmation survives navigation");
  await click(button("View story"));
  const beforeIdle = records.length;
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1100));
  });
  assert.equal(records.length, beforeIdle, "idle DOM posts nothing");
  await mount("/p/st_0041/edit?sid=dom-check");
  const oldPublishedTitle = current.stories.find(
    (s) => s.id === "st_0041",
  ).title;
  await type(
    document.querySelector('[aria-label="Title"]'),
    "A revised published title",
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 850));
  });
  assert.equal(
    current.stories.find((s) => s.id === "st_0041").title,
    oldPublishedTitle,
    "published edits stay local",
  );
  await click(button("Save and publish"));
  assert.equal(
    current.stories.find((s) => s.id === "st_0041").title,
    "A revised published title",
  );
  await mount("/me/lists?sid=dom-check");
  await click(button("New list"));
  assert.ok(document.querySelector('[role="dialog"]'));
  await type(
    document.querySelector('[role="dialog"] input:not([type=checkbox])'),
    "Rainy day reading",
  );
  await click(button("Create"));
  assert.ok(current.lists.some((l) => l.name === "Rainy day reading"));
  await mount("/slow-culture/manage?sid=dom-check");
  await click(button("Approve & publish"));
  const approved = current.submissions.find((s) => s.id === "sub_005");
  assert.equal(approved.status, "approved");
  assert.equal(
    current.stories.find((s) => s.id === approved.storyId).status,
    "published",
  );
  await mount("/p/st_0041?sid=dom-check");
  await click(button("See all responses"));
  assert.ok(document.querySelector('[aria-label="Responses"]'));
  await click(button("What are your thoughts?"));
  await type(
    document.querySelector('[aria-label="What are your thoughts?"]'),
    "This made me read more slowly.",
  );
  await click(button("Respond"));
  assert.ok(
    current.responses.some((r) => r.body === "This made me read more slowly."),
  );
  await mount("/?sid=dom-check");
  const search = document.querySelector('[aria-label="Search"]');
  await act(async () => search.focus());
  await type(search, "Film");
  const suggestion = document.querySelector(".search-results a");
  const suggestedId = suggestion.getAttribute("href").match(/(st_[a-z0-9]+)/)[1];
  await click(suggestion);
  assert.ok(document.querySelector(".article"), "search suggestion navigates to a story");
  assert.ok(current.readingHistory.some((r) => r.storyId === suggestedId), "search suggestion records reading history");
  if (process.argv.includes("--idle")) {
    const count = records.length;
    console.log("Checking 60-second idle state stability…");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60000));
    });
    assert.equal(records.length, count, "60-second idle causes no writes");
    console.log("PASS: no state POST during 60 seconds idle");
  }
  for (const count of [0, 1, 500]) {
    custom = {
      stories: Array.from({ length: count }, (_, i) => ({
        id: "st_sparse" + i,
        authorId: "u_absent",
        title: "An injected story " + i,
        status: "published",
      })),
      users: [],
      publications: [],
      lists: [],
      responses: [],
    };
    localStorage.clear();
    await mount("/?sid=dom-check");
    assert.equal(current.stories.length, count);
    assert.equal(current.users.length, 0);
    assert.equal(
      document.querySelectorAll(".story-card").length,
      Math.min(10, count),
    );
  }
  console.log(
    "PASS: injected empty, sparse and 500-story worlds through client load/render",
  );
  await act(async () => root.unmount());
  console.log(
    "PASS: DOM events for empty editor, draft autosave, publish, idle, list creation, approval and response",
  );
} finally {
  await server.close();
  dom.window.close();
}
