import test from "node:test";
import assert from "node:assert/strict";
import { reducer, normalize } from "./reducer.js";
import { createInitialData } from "../data/seed.js";
import { dateKey, monday, plusDays, sum } from "../utils/format.js";
import { isClosed } from "../utils/tasks.js";
const act = (s, type, payload) => reducer(s, { type, payload });
test("task creation, field history, child moves and closing/reopening persist", () => {
  const seed = createInitialData();
  let s = normalize(seed);
  const initial = structuredClone(s),
    n = s.tasks.length;
  s = act(s, "CREATE_TASK", {
    id: "tsk_new",
    name: "Confirm launch checklist",
    listId: "li_backlog",
    sprintId: "spr_24",
    assigneeIds: ["u_jordan"],
  });
  assert.equal(s.tasks.length, n + 1);
  assert.deepEqual(s.tasks.at(-1).sprintHistory, ["spr_24"]);
  assert.equal(s.activity.at(-1).type, "created");
  s = act(s, "CREATE_TASK", {
    id: "tsk_child",
    name: "Confirm rollout",
    parentId: "tsk_new",
    listId: "li_backlog",
  });
  s = act(s, "UPDATE_TASK", {
    id: "tsk_new",
    patch: {
      status: "complete",
      sprintPoints: 5,
      assigneeIds: ["u_priya"],
      tags: ["qa"],
    },
  });
  assert.ok(s.tasks.find((t) => t.id === "tsk_new").dateClosed);
  assert.ok(
    s.activity.some(
      (a) => a.taskId === "tsk_new" && a.type === "assignee_removed",
    ),
  );
  s = act(s, "UPDATE_TASK", {
    id: "tsk_new",
    patch: { status: "in progress", listId: "li_api" },
  });
  assert.equal(s.tasks.find((t) => t.id === "tsk_new").dateClosed, null);
  assert.equal(s.tasks.find((t) => t.id === "tsk_child").listId, "li_api");
  assert.deepEqual(initial, normalize(seed));
});
test("completing a sprint preserves completion snapshot and moves selected unfinished work and children", () => {
  let s = normalize(createInitialData()),
    sp = s.sprints.find((x) => x.id === "spr_23"),
    unfinished = s.tasks.filter(
      (t) => t.sprintId === sp.id && !t.parentId && !isClosed(s, t),
    ),
    ids = unfinished.map((t) => t.id);
  s = act(s, "SPRINT_COMPLETE", { id: sp.id, ids, target: "spr_24" });
  sp = s.sprints.find((x) => x.id === "spr_23");
  assert.equal(sp.status, "done");
  assert.ok(sp.completedAt);
  assert.deepEqual(sp.spilloverTaskIds, ids);
  assert.equal(s.tasks.find((t) => t.id === "tsk_001").sprintId, "spr_24");
  assert.equal(s.tasks.find((t) => t.id === "tsk_001a").sprintId, "spr_24");
  assert.ok(
    s.tasks.find((t) => t.id === "tsk_001").sprintHistory.includes("spr_24"),
  );
  const frozen = structuredClone(sp);
  s = act(s, "SPRINT_START", { id: sp.id });
  assert.deepEqual(
    s.sprints.find((x) => x.id === sp.id),
    frozen,
  );
});
test("doc links are symmetric and page deletion retains at least one page", () => {
  let s = normalize(createInitialData());
  s = act(s, "LINK_DOC", { taskId: "tsk_003", docId: "doc_001" });
  assert.ok(
    s.tasks.find((t) => t.id === "tsk_003").linkedDocIds.includes("doc_001"),
  );
  assert.ok(s.docs[0].linkedTaskIds.includes("tsk_003"));
  s = act(s, "LINK_DOC", { taskId: "tsk_003", docId: "doc_001", remove: true });
  assert.ok(!s.docs[0].linkedTaskIds.includes("tsk_003"));
  s = act(s, "CREATE_DOC", { id: "doc_new", pageId: "pg_new" });
  s = act(s, "UPDATE_PAGE", {
    id: "pg_new",
    patch: {
      blocks: [{ id: "b_new", type: "todo", text: "Review", checked: true }],
    },
  });
  s = act(s, "DELETE_PAGE", { id: "pg_new" });
  assert.equal(s.docPages.filter((p) => p.docId === "doc_new").length, 1);
  assert.equal(
    s.docPages.find((p) => p.id === "pg_new").blocks[0].checked,
    true,
  );
});
test("timer replacement records old time and manual duration edits respect locks", () => {
  let s = normalize(createInitialData()),
    n = s.timeEntries.length;
  s = act(s, "TIMER_START", { taskId: "tsk_083" });
  assert.equal(s.timer.billable, true);
  s = act(s, "TIMER_START", { taskId: "tsk_001" });
  assert.equal(s.timeEntries.length, n + 1);
  assert.equal(s.timeEntries.at(-1).source, "timer");
  assert.equal(s.timeEntries.at(-1).duration, 1);
  s = act(s, "TIMER_DISCARD");
  assert.equal(s.timer, null);
  const locked = s.timeEntries.find((e) => e.locked),
    value = locked.duration;
  s = act(s, "EDIT_TIME", { id: locked.id, patch: { duration: 999 } });
  assert.equal(s.timeEntries.find((e) => e.id === locked.id).duration, value);
});
test("timesheet cell deltas, submission, approval and request changes maintain totals and locking", () => {
  let s = normalize(createInitialData()),
    week = plusDays(monday(), 7),
    taskId = "tsk_083";
  s = act(s, "CELL_TIME", { taskId, day: week, duration: 7200 });
  s = act(s, "CELL_TIME", { taskId, day: week, duration: 3600 });
  let entries = s.timeEntries.filter(
    (e) => e.userId === s.currentUserId && dateKey(e.start) === week,
  );
  assert.equal(sum(entries), 3600);
  s = act(s, "SUBMIT_TIMESHEET", { week, comment: "Ready for review" });
  let sheet = s.timesheets.find((t) => t.periodStart === week);
  assert.equal(sheet.totalSeconds, 3600);
  assert.ok(s.timeEntries.find((e) => e.id === sheet.entryIds[0]).locked);
  s = act(s, "CELL_TIME", { taskId, day: week, duration: 100 });
  assert.equal(
    s.timeEntries.find((e) => e.id === sheet.entryIds[0]).duration,
    3600,
  );
  s = { ...s, currentUserId: "u_elena" };
  s = act(s, "REVIEW_TIMESHEET", {
    id: sheet.id,
    status: "changes_requested",
    comment: "Please add context",
  });
  sheet = s.timesheets.find((t) => t.id === sheet.id);
  assert.equal(sheet.status, "changes_requested");
  assert.equal(
    s.timeEntries.find((e) => e.id === sheet.entryIds[0]).locked,
    false,
  );
  assert.ok(
    s.notifications.some(
      (n) =>
        n.userId === "u_jordan" && n.type === "timesheet_changes_requested",
    ),
  );
});
test("seed ids, relationships, optional fields and entity volumes are coherent", () => {
  const s = createInitialData();
  for (const key of ["tasks", "docs", "docPages", "timeEntries", "timesheets"])
    assert.equal(new Set(s[key].map((x) => x.id)).size, s[key].length, key);
  assert.ok(s.tasks.length >= 90);
  assert.equal(s.docs.length, 11);
  assert.ok(s.timeEntries.length >= 70);
  for (const e of s.timeEntries) {
    assert.ok(e.duration > 0);
    assert.equal((+new Date(e.end) - +new Date(e.start)) / 1000, e.duration);
    assert.ok(+new Date(e.end) <= Date.now());
    assert.ok(![0, 6].includes(new Date(e.start).getDay()));
  }
  for (const t of s.timesheets)
    for (const id of t.entryIds)
      assert.ok(s.timeEntries.some((e) => e.id === id));
  const blocks = new Set(
    s.docPages.flatMap((p) => p.blocks.map((b) => b.type)),
  );
  for (const type of [
    "paragraph",
    "h1",
    "h2",
    "h3",
    "todo",
    "bullet",
    "numbered",
    "quote",
    "code",
    "divider",
    "callout",
    "task_link",
  ])
    assert.ok(blocks.has(type), type);
  assert.deepEqual(normalize({ tasks: [] }).users, []);
});

test("deletion and restoration write one business activity per task without metadata noise", () => {
  let s = normalize(createInitialData());
  const count = s.activity.length;
  s = act(s, "UPDATE_TASK", {
    id: "tsk_061",
    patch: {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: s.currentUserId,
    },
  });
  assert.deepEqual(
    s.activity.slice(count).map((a) => a.type),
    ["deleted"],
  );
  assert.ok(s.tasks.find((t) => t.id === "tsk_061").deletedAt);
  s = act(s, "UPDATE_TASK", {
    id: "tsk_061",
    patch: { deleted: false, deletedAt: null, deletedBy: null },
  });
  assert.deepEqual(
    s.activity.slice(count).map((a) => a.type),
    ["deleted", "restored"],
  );
});

test("seed history never points into the future before local business hours", (t) => {
  const instant = Date.parse("2026-11-17T16:05:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: instant });
  const seed = createInitialData();
  const visit = (value, path = "seed") => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && /(?:At|^lastViewedAt)$/.test(key))
        assert.ok(
          +new Date(item) <= instant,
          path + "." + key + " is in the future",
        );
      else visit(item, path + "." + key);
    }
  };
  visit(seed);
  assert.deepEqual(
    seed,
    createInitialData(),
    "Frozen-clock seeds must remain deterministic",
  );
});
