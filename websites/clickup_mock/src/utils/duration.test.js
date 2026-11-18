import test from "node:test";
import assert from "node:assert/strict";
import { parseDuration, formatDuration, formatClock } from "./format.js";
test("duration input accepts ClickUp formats and rejects malformed time", () => {
  for (const [value, seconds] of [
    ["2h", 7200],
    ["2h 30m", 9000],
    ["2h30m", 9000],
    ["90m", 5400],
    ["1.5h", 5400],
    ["2:10", 7800],
    ["2:10:30", 7830],
    ["2 hours 10 minutes 30 seconds", 7830],
    ["45 min", 2700],
    ["3 hrs", 10800],
    ["3", 10800],
    ["1.5", 5400],
    ["90", 5400],
  ])
    assert.equal(parseDuration(value), seconds, value);
  for (const value of [
    "",
    null,
    "0",
    "-1h",
    "hello",
    "2h 5 garbage",
    "2:90",
    "1:20:99",
  ])
    assert.equal(parseDuration(value), null, String(value));
  assert.equal(formatDuration(5400), "1h 30m");
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatClock(765), "0:12:45");
});
