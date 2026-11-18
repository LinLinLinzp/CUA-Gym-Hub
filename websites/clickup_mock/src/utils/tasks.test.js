import test from "node:test";
import assert from "node:assert/strict";
import { matchesFilter } from "./tasks.js";

test("incomplete task filters preserve results while set/unset operators still apply", () => {
  const state = {},
    task = { status: "in progress", sprintPoints: 0, tags: [] };
  for (const field of [
    "status",
    "assignee",
    "priority",
    "tags",
    "dueDate",
    "sprintPoints",
    "sprint",
  ]) {
    for (const value of ["", null, undefined, []]) {
      assert.equal(
        matchesFilter(state, task, { field, op: "is", value }),
        true,
      );
      assert.equal(
        matchesFilter(state, task, { field, op: "is_not", value }),
        true,
      );
    }
  }
  assert.equal(
    matchesFilter(state, task, { field: "sprintPoints", op: "is", value: 0 }),
    true,
  );
  assert.equal(
    matchesFilter(state, task, { field: "status", op: "is", value: "to do" }),
    false,
  );
  assert.equal(
    matchesFilter(state, task, { field: "status", op: "is_set", value: "" }),
    true,
  );
  assert.equal(
    matchesFilter(state, task, { field: "tags", op: "is_set", value: "" }),
    false,
  );
  assert.equal(
    matchesFilter(state, task, { field: "tags", op: "is_not_set", value: "" }),
    true,
  );
});
