import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App.jsx";
import { runReviewChecks } from "./review-cases.jsx";
export async function runClientChecks({ requests, serverState }) {
  const reviewChecks = await runReviewChecks();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
    container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<App />);
    await wait(150);
  });
  await act(async () => {
    await wait(200);
  });
  const assert = (value, message) => {
      if (!value) throw Error(message);
    },
    click = async (element) => {
      assert(element, "Missing clickable element");
      await act(async () => {
        element.click();
        await wait(40);
      });
    },
    button = (text) =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      );
  const input = async (element, value) => {
    assert(element, "Missing editable field");
    const prototype =
      element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : element.tagName === "SELECT"
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(
      element,
      value,
    );
    await act(async () => {
      element.dispatchEvent(
        new Event(element.tagName === "SELECT" ? "change" : "input", {
          bubbles: true,
        }),
      );
      await wait(40);
    });
  };
  assert(container.textContent.includes("Inbox"), "Initial route did not load");
  const baseline = requests.filter((x) => x.action === "set").length;
  assert(baseline === 1, "Expected exactly one baseline push, got " + baseline);
  let writes = requests.length;
  await act(async () => {
    await wait(1100);
  });
  assert(requests.length === writes, "Idle route saved state");
  const link = [...document.querySelectorAll("a")].find((a) =>
    a.textContent.includes("Q4 Product Launch"),
  );
  await click(link);
  assert(
    window.location.search.includes("sid="),
    "Sidebar navigation lost session",
  );
  assert(
    container.textContent.includes("Launch landing page copy"),
    "Task list did not render",
  );
  const checkboxes = [
    ...document.querySelectorAll('.task-row input[type="checkbox"]'),
  ];
  await click(checkboxes[0]);
  await act(async () =>
    checkboxes
      .at(-1)
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, shiftKey: true }),
      ),
  );
  assert(
    document
      .querySelector(".bulk-bar strong")
      .textContent.startsWith(String(checkboxes.length) + " Tasks"),
    "Shift-click skipped visible grouped rows",
  );
  await click(document.querySelector(".bulk-bar > button"));
  const field = [...document.querySelectorAll(".task-row")]
    .find(
      (row) =>
        row.querySelector(".task-name")?.textContent ===
        "Launch landing page copy",
    )
    ?.querySelector('[aria-label="Edit priority"]');
  await click(field);
  const urgent = [...document.querySelectorAll(".menu-item")].find((b) =>
    b.textContent.includes("Urgent"),
  );
  await click(urgent);
  assert(
    serverState().tasks.some(
      (t) => t.id === "tsk_061" && t.priority === "urgent",
    ),
    "Task priority did not persist",
  );
  await click(button("Launch landing page copy"));
  assert(
    document.querySelector('[aria-label="Task title"]'),
    "Task modal did not open",
  );
  await click(
    document.querySelector('.task-detail [aria-label="Edit status"]'),
  );
  await click(
    [...document.querySelectorAll(".menu-item")].find(
      (b) => b.textContent.trim() === "COMPLETE",
    ),
  );
  assert(
    serverState().tasks.find((t) => t.id === "tsk_061").dateClosed,
    "Done task did not record completion",
  );
  const countBeforeTimer = serverState().timeEntries.length;
  await click(
    document.querySelector('.task-detail [aria-label="Start timer"]'),
  );
  assert(serverState().timer?.taskId === "tsk_061", "Task timer did not start");
  await click(document.querySelector('.task-detail [aria-label="Stop timer"]'));
  assert(
    serverState().timer === null &&
      serverState().timeEntries.length === countBeforeTimer + 1,
    "Task timer restarted instead of stopping",
  );
  const originalClipboard = navigator.clipboard;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("Write permission denied");
      },
    },
  });
  await click(document.querySelector(".task-detail .id-chip"));
  assert(
    document
      .querySelector(".toast")
      .textContent.includes("Copy failed — tsk_061"),
    "Clipboard denial still reports success",
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
  await click(document.querySelector('[aria-label="Time Estimate"]'));
  await input(
    document.querySelector('input[placeholder="e.g. 2h 30m"]'),
    "3h 30m",
  );
  let form = document.querySelector(".popover form");
  assert(
    form.querySelector("button").type === "button",
    "Estimate Clear is still a submit button",
  );
  await act(async () =>
    form.requestSubmit(form.querySelector('[type="submit"]')),
  );
  assert(
    serverState().tasks.find((t) => t.id === "tsk_061").timeEstimate === 210,
    "Estimate submit cleared or lost the value",
  );
  await input(
    document.querySelector('[placeholder="Write a comment…"]'),
    "hi @Pri",
  );
  assert(
    document.querySelector(".mention-list").textContent.trim() === "Priya Shah",
    "Typed mention did not stay open and filter users",
  );
  await click(button("Priya Shah"));
  const composer = document.querySelector('[placeholder="Write a comment…"]');
  assert(
    composer.selectionStart === composer.value.length,
    "Mention insertion left the caret at the start",
  );
  await input(composer, composer.value + "please review");
  await click(button("Send"));
  assert(
    serverState().comments.at(-1).text === "hi @Priya Shah please review" &&
      serverState().comments.at(-1).mentions.includes("u_priya"),
    "Mention comment did not persist text and user id",
  );
  await click(document.querySelector('[aria-label="Add time"]'));
  await click(
    document.querySelector('.time-tracker [aria-label="Select task"]'),
  );
  await click(
    button(serverState().tasks.find((task) => task.id === "tsk_083").name),
  );
  assert(
    document
      .querySelector('[aria-label="Billable"]')
      .getAttribute("aria-pressed") === "true",
    "Manual client time did not default to billable",
  );
  await click(
    document.querySelector('.time-tracker [aria-label="Select task"]'),
  );
  await click(
    button(serverState().tasks.find((task) => task.id === "tsk_061").name),
  );
  assert(
    document
      .querySelector('[aria-label="Billable"]')
      .getAttribute("aria-pressed") === "false",
    "Manual task selection did not refresh the billable default",
  );

  await input(
    document.querySelector('[placeholder="Enter time e.g. 3 hours 20 mins"]'),
    "45m",
  );
  await input(
    document.querySelector('[placeholder="Enter a note"]'),
    "Review regression entry",
  );
  form = document.querySelector('.modal[aria-label="Track time"] form');
  assert(
    [...form.querySelectorAll("button")].filter((b) => b.type === "submit")
      .length === 1,
    "Track-time tabs or Cancel can submit",
  );
  await act(async () =>
    form.requestSubmit(form.querySelector('[type="submit"]')),
  );
  const timeId = serverState().timeEntries.at(-1).id;
  assert(
    serverState().timeEntries.at(-1).duration === 2700,
    "Manual time form did not save",
  );
  const openEntryMenu = async () => {
    if (!document.querySelector('.popover[aria-label="Time tracked"]'))
      await click(document.querySelector('[aria-label="Time tracked"]'));
    const entry = [...document.querySelectorAll(".time-entry")].find((e) =>
      e.textContent.includes("Review regression entry"),
    );
    await click(entry.querySelector('[aria-label="More actions"]'));
  };
  await openEntryMenu();
  const editEntry = button("Edit");
  await act(async () => {
    editEntry.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editEntry.click();
  });
  assert(
    document.querySelector('.modal[aria-label="Edit time entry"]'),
    "Nested Edit was unmounted on mousedown",
  );
  assert(
    !document.querySelector('.popover[aria-label="Time tracked"]'),
    "Time tracked popover covers the Edit dialog",
  );
  await input(
    document.querySelector('[placeholder="Enter time e.g. 3 hours 20 mins"]'),
    "50m",
  );
  await click(button("Save"));
  assert(
    serverState().timeEntries.find((e) => e.id === timeId).duration === 3000,
    "Nested entry edit did not persist",
  );
  await openEntryMenu();
  const deleteEntry = button("Delete");
  await act(async () => {
    deleteEntry.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    deleteEntry.click();
  });
  assert(
    !document.querySelector('.popover[aria-label="Time tracked"]'),
    "Time tracked popover covers the Delete dialog",
  );
  await click(button("Confirm"));
  assert(
    !serverState().timeEntries.some((e) => e.id === timeId),
    "Nested entry delete did not persist",
  );
  await act(async () =>
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
  );
  await click(document.querySelector('[aria-label="Close task"]'));
  assert(!window.location.search.includes("task="), "Task modal did not close");
  await click(button("Product Hunt launch assets"));
  const beforeAssignees = serverState().tasks.find(
    (t) => t.id === "tsk_062",
  ).assigneeIds;
  await click(
    document.querySelector('.task-detail [aria-label="Edit Assignees"]'),
  );
  await click(button("Assign to me"));
  assert(
    serverState()
      .tasks.find((t) => t.id === "tsk_062")
      .assigneeIds.includes("u_jordan") &&
      beforeAssignees.every((id) =>
        serverState()
          .tasks.find((t) => t.id === "tsk_062")
          .assigneeIds.includes(id),
      ),
    "Assign to me removed existing assignees",
  );
  await act(async () => {
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "m", bubbles: true }),
    );
  });
  const assigned = serverState().tasks.find(
    (t) => t.id === "tsk_062",
  ).assigneeIds;
  assert(
    assigned.includes("u_jordan") &&
      assigned.length === new Set([...beforeAssignees, "u_jordan"]).size,
    "M removed assignees or duplicated the current user",
  );
  await click(document.querySelector('[aria-label="Close task"]'));
  await click(
    [...document.querySelectorAll("a")].find(
      (a) => a.textContent.trim() === "Timesheets",
    ),
  );
  assert(
    container.textContent.includes("My timesheet"),
    "Timesheet route failed",
  );
  writes = requests.length;
  await act(async () => {
    await wait(1100);
  });
  assert(requests.length === writes, "Idle timesheet saved state");
  await click(button("Track time"));
  assert(
    document.querySelector('[role="dialog"]'),
    "Track time dialog did not open",
  );
  await click(button("Timer"));
  await click(button("Start timer"));
  assert(serverState().timer, "Timer start was not saved");
  writes = requests.length;
  await act(async () => {
    await wait(1200);
  });
  assert(requests.length === writes, "Timer display tick saved state");
  await click(document.querySelector('[aria-label="Stop timer"]'));
  assert(!serverState().timer, "Timer stop was not saved");
  assert(
    serverState().timeEntries.at(-1).source === "timer",
    "Stopping timer did not record entry",
  );
  await click(
    [...document.querySelectorAll("a")].find(
      (a) => a.textContent.trim() === "Docs",
    ),
  );
  const docCount = serverState().docs.length;
  await click(button("New Doc"));
  assert(serverState().docs.length === docCount + 1, "New Doc did not persist");
  const docId = serverState().docs.at(-1).id;
  await input(
    document.querySelector('[aria-label="Page title"]'),
    "Sprint retrospective",
  );
  assert(
    serverState().docs.at(-1).title === "Sprint retrospective",
    "Doc/page title did not stay synchronized",
  );
  await input(
    document.querySelector(".doc-block textarea"),
    "## What went well",
  );
  assert(
    serverState().docPages.find((p) => p.docId === docId).blocks[0].type ===
      "h2",
    "Markdown block shortcut did not persist",
  );
  await input(document.querySelector(".doc-block textarea"), "/quote");
  await act(async () =>
    document
      .querySelector(".doc-block textarea")
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
  );
  assert(
    serverState().docPages.find((p) => p.docId === docId).blocks[0].type ===
      "quote",
    "Slash-menu Enter split text instead of converting the block",
  );
  const pageCount = serverState().docPages.length;
  await click(button("Add page"));
  assert(
    document
      .querySelector(".page-tree-row.active .text-left")
      .textContent.trim() === "Untitled",
    "New page has a blank sidebar title",
  );
  assert(
    serverState().docPages.length === pageCount + 1,
    "Page creation did not persist",
  );
  await click(button("Share"));
  await click(
    [...document.querySelectorAll("label")]
      .find((l) => l.textContent.includes("Share link publicly"))
      .querySelector("input"),
  );
  assert(
    serverState().docs.find((d) => d.id === docId).sharing.publicLinkEnabled,
    "Doc sharing did not persist",
  );
  await click(button("Done"));
  await click(
    [...document.querySelectorAll("a")].find((a) =>
      a.getAttribute("href")?.startsWith("/sprint/spr_23?"),
    ),
  );
  await click(document.querySelector('[aria-label="Sprint status"]'));
  await click(button("Mark Sprint as Done"));
  await click(button("Complete Sprint"));
  assert(
    serverState().sprints.find((s) => s.id === "spr_23").status === "done",
    "Sprint completion did not persist",
  );
  assert(
    serverState().tasks.find((t) => t.id === "tsk_001").sprintId === "spr_24",
    "Sprint spillover did not reach next sprint",
  );
  await click(
    [...document.querySelectorAll("a")].find((link) =>
      link.getAttribute("href")?.startsWith("/sprint/spr_24?"),
    ),
  );
  const sprintHeader = document.querySelector(".location-header");
  await click(sprintHeader.querySelector('[aria-label="More actions"]'));
  await click(button("Edit dates"));
  const datesForm = document.querySelector(
    '.modal[aria-label="Edit sprint dates"] form',
  );
  assert(
    datesForm &&
      [...datesForm.querySelectorAll("button")].some(
        (button) =>
          button.textContent.trim() === "Cancel" && button.type === "button",
      ),
    "Sprint dates dialog lacks a form or Cancel action",
  );
  const newEnd = serverState().sprints.find(
    (sprint) => sprint.id === "spr_24",
  ).endDate;
  await input(datesForm.querySelectorAll('input[type="date"]')[1], newEnd);
  await act(async () =>
    datesForm.requestSubmit(datesForm.querySelector('[type="submit"]')),
  );
  assert(
    !document.querySelector('.modal[aria-label="Edit sprint dates"]') &&
      serverState().sprints.find((sprint) => sprint.id === "spr_24").endDate ===
        newEnd,
    "Sprint-date submission did not save and close",
  );
  await act(async () => root.unmount());
  container.remove();
  return {
    passed: 44 + reviewChecks,
    baselinePushes: baseline,
    userSaves: requests.filter((x) => x.action === "set_current").length,
    idleSaves: 0,
  };
}
