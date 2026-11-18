import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
globalThis.window = { location: { search: "?sid=verify" } };
globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  logLevel: "error",
});
try {
  const { createInitialData } = await server.ssrLoadModule("/src/data/seed.js");
  const { AppStoreContext, createActions } = await server.ssrLoadModule(
    "/src/store/AppStore.jsx",
  );
  const { UIProvider } = await server.ssrLoadModule("/src/components/UI.jsx");
  const { currentUser } = await server.ssrLoadModule("/src/store/selectors.js");
  const { default: App } = await server.ssrLoadModule("/src/App.jsx");
  const ref = { current: createInitialData() };
  let writes = 0;
  const update = (fn) => {
    const next = structuredClone(ref.current),
      result = fn(next);
    if (result === false) return false;
    ref.current = next;
    writes++;
    return result ?? true;
  };
  const actions = createActions(ref, update),
    get = (key, id) => ref.current[key].find((x) => x.id === id);
  const baseline = JSON.stringify(ref.current);
  assert.equal(
    baseline,
    JSON.stringify(createInitialData()),
    "deterministic seed",
  );
  const seeded = ref.current;
  assert.equal(new Set(seeded.stories.map((s) => s.subtitle)).size, 84);
  assert.ok(new Set(seeded.stories.map((s) => s.body[0]?.text).filter(Boolean)).size >= 80);
  assert.ok(new Set(seeded.responses.map((r) => r.body)).size >= 40);
  assert.equal(new Set(seeded.publications.map((p) => p.description)).size, 10);
  for (const story of seeded.stories) {
    const original = { wordCount: story.wordCount, readingTime: story.readingTime };
    actions.saveStory(story.id, { title: story.title, body: story.body });
    assert.deepEqual({ wordCount: get("stories", story.id).wordCount, readingTime: get("stories", story.id).readingTime }, original, "title-only save preserves metrics");
  }
  const id = actions.createDraft({ title: "A walk through Stockholm" });
  actions.saveStory(id, {
    title: "A walk through Stockholm",
    body: [{ id: "b_new", type: "p", text: "We walked along the water." }],
  });
  assert.equal(get("stories", id).wordCount, 5);
  actions.publish(id, { topicIds: ["t_books"], memberOnly: true });
  assert.equal(get("stories", id).status, "published");
  assert.ok(get("stories", id).publishedAt);
  const scheduled = actions.createDraft({ title: "Winter notes" });
  actions.publish(scheduled, { scheduledFor: "2099-12-01T15:00:00.000Z" });
  assert.equal(get("stories", scheduled).status, "scheduled");
  const listId = actions.createList(
    {
      name: "Northern essays",
      description: "To return to",
      visibility: "private",
    },
    id,
  );
  assert.equal(get("lists", listId).items[0].storyId, id);
  actions.note(listId, id, "Read this again");
  assert.equal(get("lists", listId).items[0].note, "Read this again");
  actions.toggleList(listId, id);
  assert.equal(get("lists", listId).items.length, 0);
  actions.toggleList(listId, id);
  const before = ref.current.listSaves.length;
  actions.saveList("lst_staff_picks");
  assert.equal(ref.current.listSaves.length, before + 1);
  actions.saveList("lst_staff_picks");
  assert.equal(ref.current.listSaves.length, before);
  const responseId = actions.respond("story", id, "A considered response");
  const replyId = actions.respond("story", id, "A reply", responseId);
  assert.equal(get("responses", replyId).parentResponseId, responseId);
  actions.patch("responses", responseId, {
    body: "An edited response",
    edited: true,
  });
  assert.equal(get("responses", responseId).edited, true);
  actions.patch("responses", responseId, {
    hidden: true,
    hiddenById: "u_maya",
  });
  actions.patch("responses", responseId, { hidden: false, hiddenById: null });
  actions.patch("responses", responseId, { deleted: true });
  assert.equal(get("responses", responseId).deleted, true);
  for (let i = 0; i < 55; i++) actions.clap("response", replyId);
  assert.equal(ref.current.claps.find((c) => c.targetId === replyId).count, 50);
  const cappedWrites = writes;
  actions.clap("response", replyId);
  assert.equal(writes, cappedWrites, "clap cap causes no write");
  actions.clap("story", id);
  assert.equal(writes, cappedWrites, "own story cannot clap");
  const draft = actions.createDraft({ title: "The work of looking" });
  assert.equal(
    actions.submit(draft, "pub_counter_arts", "For the editors"),
    true,
  );
  const sub = ref.current.submissions.find((s) => s.storyId === draft);
  assert.equal(sub.status, "pending");
  assert.equal(actions.submit(draft, "pub_counter_arts"), false);
  actions.decide(sub.id, "withdrawn");
  assert.equal(get("stories", draft).publicationId, null);
  actions.decide("sub_005", "in_review");
  assert.equal(get("submissions", "sub_005").status, "in_review");
  actions.decide("sub_005", "edits_requested", "Please clarify the argument");
  assert.equal(
    get("submissions", "sub_005").editorNote,
    "Please clarify the argument",
  );
  actions.decide("sub_006", "declined", "Outside our focus");
  assert.equal(
    get("stories", get("submissions", "sub_006").storyId).publicationId,
    null,
  );
  actions.decide("sub_007", "approved");
  assert.equal(
    get("stories", get("submissions", "sub_007").storyId).status,
    "published",
  );
  actions.decide("sub_002", "pending");
  assert.equal(get("submissions", "sub_002").status, "pending");
  const pubId = actions.createPublication({
    name: "Northern Light",
    slug: "northern-light",
    description: "Essays about noticing",
    tagline: "Look a little longer.",
    topicIds: ["t_art"],
    logoColor: "#B5C9C3",
    headerStyle: "light",
    accentColor: "#1F3A5F",
    email: "",
    twitter: "",
  });
  assert.deepEqual(get("publications", pubId).editorIds, ["u_maya"]);
  actions.patch("publications", pubId, {
    writerIds: ["u_012"],
    submissionPolicy: "writers_only",
  });
  assert.equal(get("publications", pubId).writerIds[0], "u_012");
  const followers = get("publications", "pub_fourth_wave").followerCount;
  actions.follow("publication", "pub_fourth_wave");
  assert.equal(
    get("publications", "pub_fourth_wave").followerCount,
    followers + 1,
  );
  actions.follow("publication", "pub_fourth_wave");
  assert.equal(get("publications", "pub_fourth_wave").followerCount, followers);
  actions.recordRead(id);
  actions.recordRead(id);
  assert.equal(
    ref.current.readingHistory.filter((h) => h.storyId === id).length,
    1,
  );
  actions.deleteStory(id);
  assert.ok(!get("stories", id));
  assert.ok(!get("lists", listId).items.some((i) => i.storyId === id));
  actions.deleteList(listId);
  assert.ok(!get("lists", listId));
  actions.deleteList("lst_reading_maya");
  assert.ok(get("lists", "lst_reading_maya"));
  console.log("PASS: deterministic seed and 32 workflow/state invariants");
  const defaultWorld = createInitialData(),
    empty = {
      ...createInitialData(),
      users: [],
      stories: [],
      publications: [],
      lists: [],
      responses: [],
      topics: [],
      follows: [],
      notifications: [],
      readingHistory: [],
      highlights: [],
    },
    single = {
      ...empty,
      users: [{ id: "u_maya", username: "mayalindqvist", name: "Maya" }],
      stories: [
        {
          id: "st_one",
          authorId: "u_missing",
          title: "A single story",
          status: "published",
        },
      ],
      publications: [
        {
          id: "pub_one",
          slug: "only-publication",
          name: "One Publication",
          ownerId: "u_maya",
        },
      ],
      lists: [{ id: "lst_one", ownerId: "u_maya", name: "One list" }],
    },
    large = {
      ...single,
      stories: Array.from({ length: 500 }, (_, i) => ({
        ...single.stories[0],
        id: "st_" + i,
        title: "Story " + i,
      })),
    };
  let renders = 0;
  const oldError = console.error;
  console.error = (...args) => {
    if (!String(args[0]).includes("useLayoutEffect does nothing"))
      oldError(...args);
  };
  for (const [name, world] of Object.entries({
    default: defaultWorld,
    empty,
    single,
    large,
  }))
    for (const path of [
      "/?sid=verify",
      "/new-story?sid=verify",
      "/me/stories/drafts?sid=verify",
      "/me/lists?sid=verify",
      "/me/lists/reading-history?sid=verify",
      "/me/lists/highlights?sid=verify",
      "/me/lists/responses?sid=verify",
      "/search?q=book&sid=verify",
      "/explore-topics?sid=verify",
      "/tag/books?sid=verify",
      "/me/notifications?sid=verify",
      "/me/publications?sid=verify",
      "/new-publication?sid=verify",
      "/slow-culture/manage?sid=verify",
      "/slow-culture/manage/people?sid=verify",
      "/slow-culture/manage/info?sid=verify",
      "/slow-culture/about?sid=verify",
      "/@mayalindqvist?sid=verify",
      "/@mayalindqvist/lists?sid=verify",
      "/p/st_0041?sid=verify",
      "/p/st_one?sid=verify",
      "/@mayalindqvist/list/reading-list-lst_reading_maya?sid=verify",
      "/me/settings?sid=verify",
      "/me/stats?sid=verify",
      "/me/following?sid=verify",
    ]) {
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(
            AppStoreContext.Provider,
            { value: { state: world, actions, user: currentUser(world) } },
            React.createElement(UIProvider, null, React.createElement(App)),
          ),
        ),
      );
      assert.ok(html.length > 0, `${name} ${path}`);
      renders++;
    }
  console.error = oldError;
  console.log(
    `PASS: ${renders} route/world server renders (default, empty, sparse, 500 stories)`,
  );
} finally {
  await server.close();
}
