import { nextSprintStart } from "../utils/sprints.js";
import { arr, uid, now, dateKey, plusDays, sum } from "../utils/format.js";
import {
  isClosed,
  billableDefault,
  locationOf,
  subtasksOf,
  visibleTasks,
} from "../utils/tasks.js";
const collections = [
  "users",
  "teams",
  "spaces",
  "folders",
  "lists",
  "sprints",
  "tasks",
  "customFields",
  "tags",
  "comments",
  "activity",
  "docs",
  "docPages",
  "timeEntries",
  "timeTags",
  "timesheets",
  "notifications",
  "favorites",
  "trash",
  "dashboards",
];
export function normalize(s) {
  const out = { ...s };
  collections.forEach((k) => (out[k] = arr(s[k])));
  out.workspace = s.workspace || {};
  out.viewSettings = s.viewSettings || {};
  out.timesheetSettings = s.timesheetSettings || {};
  out.preferences = s.preferences || {};
  return out;
}
function event(s, taskId, type, from = null, to = null, field = null) {
  s.activity.push({
    id: uid("ac"),
    taskId,
    actorId: s.currentUserId,
    type,
    field,
    from,
    to,
    createdAt: now(),
  });
}
function updateTask(s, id, patch) {
  const t = s.tasks.find((x) => x.id === id);
  if (!t) return;
  const before = structuredClone(t);
  if (patch.sprintId) {
    const sp = s.sprints.find((x) => x.id === patch.sprintId);
    if (!sp || sp.status === "done") delete patch.sprintId;
  }
  if ("name" in patch && !String(patch.name).trim()) delete patch.name;
  Object.entries(patch).forEach(([field, to]) => {
    const from = before[field];
    if (JSON.stringify(from) === JSON.stringify(to)) return;
    const names = {
      name: "renamed",
      status: "status_changed",
      priority: "priority_changed",
      dueDate: "due_date_changed",
      startDate: "start_date_changed",
      sprintPoints: "points_changed",
      timeEstimate: "estimate_changed",
      description: "description_changed",
      listId: "moved",
      checklists: "checklist_changed",
      orderIndex: "reordered",
      dependencies: "dependencies_changed",
      attachments: "attachment_added",
      watcherIds: "watchers_changed",
    };
    if (["deletedAt", "deletedBy", "dateClosed", "closedBy"].includes(field)) {
      t[field] = to;
      return;
    }
    if (["assigneeIds", "tags"].includes(field)) {
      arr(from)
        .filter((x) => !arr(to).includes(x))
        .forEach((x) =>
          event(
            s,
            id,
            field === "tags" ? "tag_removed" : "assignee_removed",
            x,
            null,
            field,
          ),
        );
      arr(to)
        .filter((x) => !arr(from).includes(x))
        .forEach((x) =>
          event(
            s,
            id,
            field === "tags" ? "tag_added" : "assignee_added",
            null,
            x,
            field,
          ),
        );
    } else if (field === "sprintId") {
      if (from) event(s, id, "sprint_removed", from, null, field);
      if (to) event(s, id, "sprint_added", from, to, field);
      t.sprintHistory = [
        ...new Set([...arr(t.sprintHistory), ...(to ? [to] : [])]),
      ];
    } else if (field === "customFields") {
      Object.entries(to || {}).forEach(([k, v]) => {
        if (JSON.stringify(before.customFields?.[k]) !== JSON.stringify(v))
          event(
            s,
            id,
            "custom_field_changed",
            before.customFields?.[k] ?? null,
            v,
            k,
          );
      });
    } else
      event(
        s,
        id,
        field === "deleted"
          ? to
            ? "deleted"
            : "restored"
          : field === "archived"
            ? to
              ? "archived"
              : "unarchived"
            : names[field] || field + "_changed",
        from ?? null,
        to,
        field,
      );
    t[field] = to;
  });
  t.updatedAt = now();
  if (before.status !== t.status) {
    t.dateClosed = isClosed(s, t) ? now() : null;
    t.closedBy = isClosed(s, t) ? s.currentUserId : null;
  }
  if (
    before.listId !== t.listId ||
    before.sprintId !== t.sprintId ||
    before.deleted !== t.deleted
  ) {
    s.tasks
      .filter((x) => x.parentId === id)
      .forEach((child) => {
        const follow = {};
        ["listId", "sprintId", "deleted", "deletedAt", "deletedBy"].forEach(
          (k) => {
            if (k in patch) follow[k] = patch[k];
          },
        );
        updateTask(s, child.id, follow);
      });
  }
}
function createTask(s, p) {
  const parent = s.tasks.find((t) => t.id === p.parentId),
    list =
      s.lists.find((l) => l.id === (parent?.listId || p.listId)) || s.lists[0];
  if (!String(p.name || "").trim() || !list) return null;
  const sp = s.spaces.find((x) => x.id === list.spaceId),
    stamp = now();
  const task = {
    id: p.id || uid("tsk"),
    name: p.name.trim(),
    description: "",
    status: arr(sp?.statuses)[0]?.name || "to do",
    priority: null,
    assigneeIds: [],
    watcherIds: [],
    tags: [],
    listId: list.id,
    sprintId: parent?.sprintId || null,
    sprintHistory: [],
    parentId: parent?.id || null,
    startDate: null,
    dueDate: null,
    timeEstimate: null,
    sprintPoints: null,
    customFields: {},
    checklists: [],
    linkedDocIds: [],
    dependencies: { waitingOn: [], blocking: [] },
    orderIndex:
      Math.max(
        0,
        ...s.tasks
          .filter((t) => t.listId === list.id)
          .map((t) => t.orderIndex || 0),
      ) + 1000,
    createdBy: s.currentUserId,
    createdAt: stamp,
    updatedAt: stamp,
    dateClosed: null,
    closedBy: null,
    archived: false,
    deleted: false,
    ...p,
  };
  if (parent) {
    task.listId = parent.listId;
    task.sprintId = parent.sprintId || null;
  }
  if (task.sprintId) {
    const sprint = s.sprints.find((x) => x.id === task.sprintId);
    if (!sprint || sprint.status === "done") task.sprintId = null;
  }
  task.sprintHistory = task.sprintId ? [task.sprintId] : [];
  if (isClosed(s, task)) {
    task.dateClosed = stamp;
    task.closedBy = s.currentUserId;
  }
  s.tasks.push(task);
  arr(task.linkedDocIds).forEach((docId) => {
    const d = s.docs.find((d) => d.id === docId);
    if (d) d.linkedTaskIds = [...new Set([...arr(d.linkedTaskIds), task.id])];
  });
  event(s, task.id, "created");
  if (parent) event(s, parent.id, "subtask_added", null, task.id);
  return task;
}
function addTime(s, p) {
  if (!(p.duration > 0) || !p.start) return;
  const stamp = now(),
    entry = {
      id: uid("te"),
      taskId: null,
      userId: s.currentUserId,
      billable: false,
      description: "",
      tagIds: [],
      source: "manual",
      locked: false,
      createdAt: stamp,
      updatedAt: stamp,
      ...p,
      duration: Math.round(p.duration),
    };
  entry.end = new Date(
    +new Date(entry.start) + entry.duration * 1000,
  ).toISOString();
  s.timeEntries.push(entry);
  if (entry.taskId)
    event(s, entry.taskId, "time_tracked", null, entry.duration);
}
function stopTimer(s) {
  if (!s.timer) return;
  addTime(s, {
    ...s.timer,
    duration: Math.max(
      1,
      Math.round((Date.now() - +new Date(s.timer.start)) / 1000),
    ),
    source: "timer",
  });
  s.timer = null;
}
function createSprints(s, p) {
  const folder = s.folders.find((f) => f.id === p.folderId);
  if (!folder) return;
  const settings = folder.sprintSettings || {},
    days = Number(settings.durationDays) || 14;
  let last = s.sprints
    .filter((sp) => sp.folderId === folder.id)
    .sort((a, b) => (b.index || 0) - (a.index || 0))[0];
  let start = p.startDate || nextSprintStart(last?.endDate, settings);
  const count = Number(p.count);
  if (!Number.isInteger(count) || count < 1 || count > 10) return;
  for (let i = 0; i < count; i++) {
    const index = (last?.index || 0) + 1,
      end = plusDays(start, days - 1);
    const short = (x) => {
      const d = new Date(x + "T12:00");
      return settings.dateFormat === "YYYY-MM-DD"
        ? x
        : `${d.getMonth() + 1}/${d.getDate()}`;
    };
    last = {
      id: uid("spr"),
      folderId: folder.id,
      spaceId: folder.spaceId,
      index,
      name: (
        settings.nameTemplate || "Sprint {INDEX} ({START_DATE} - {END_DATE})"
      )
        .replaceAll("{INDEX}", index)
        .replaceAll("{START_DATE}", short(start))
        .replaceAll("{END_DATE}", short(end)),
      startDate: start,
      endDate: end,
      status: "not_started",
      goal: "",
      forecastPoints: null,
      startedAt: null,
      startedBy: null,
      completedAt: null,
      completedBy: null,
      completedPoints: null,
      committedTaskIds: [],
      completedTaskIds: [],
      spilloverTaskIds: [],
      spilloverToSprintId: null,
      createdAt: now(),
      createdBy: s.currentUserId,
    };
    s.sprints.push(last);
    start = plusDays(end, 1);
  }
  return last;
}
export function reducer(state, action) {
  if (action.type === "HYDRATE") return normalize(action.state);
  const s = structuredClone(state),
    p = action.payload || {};
  switch (action.type) {
    case "CREATE_TASK":
      createTask(s, p);
      break;
    case "UPDATE_TASK":
      updateTask(s, p.id, p.patch);
      break;
    case "BULK_TASK":
      arr(p.ids).forEach((id) => updateTask(s, id, { ...p.patch }));
      break;
    case "DUPLICATE_TASK": {
      const t = s.tasks.find((x) => x.id === p.id);
      if (t)
        createTask(s, {
          ...t,
          id: uid("tsk"),
          name: t.name + " (copy)",
          createdAt: now(),
          createdBy: s.currentUserId,
          deleted: false,
          archived: false,
          parentId: null,
          checklists: arr(t.checklists).map((c) => ({
            ...c,
            id: uid("ck"),
            items: arr(c.items).map((x) => ({ ...x, id: uid("cki") })),
          })),
        });
      break;
    }
    case "CHECKLIST": {
      const t = s.tasks.find((t) => t.id === p.taskId);
      if (!t) break;
      t.checklists = p.checklists;
      t.updatedAt = now();
      event(
        s,
        t.id,
        p.resolved ? "checklist_item_resolved" : "checklist_changed",
        null,
        p.resolved || null,
      );
      break;
    }
    case "CREATE_COMMENT":
      if (p.text?.trim())
        s.comments.push({
          id: uid("cm"),
          parentType: "task",
          pageId: null,
          authorId: s.currentUserId,
          mentions: s.users
            .filter((u) => p.text.includes("@" + u.name))
            .map((u) => u.id),
          assigneeId: null,
          replyToId: null,
          reactions: [],
          resolved: false,
          createdAt: now(),
          updatedAt: null,
          ...p,
          text: p.text.trim(),
        });
      break;
    case "UPDATE_COMMENT": {
      const c = s.comments.find((x) => x.id === p.id);
      if (c) {
        Object.assign(c, p.patch, { updatedAt: now() });
        if ("text" in p.patch)
          c.mentions = s.users
            .filter((u) => String(c.text).includes("@" + u.name))
            .map((u) => u.id);
      }
      break;
    }
    case "DELETE_COMMENT":
      s.comments = s.comments.filter(
        (c) => c.id !== p.id && c.replyToId !== p.id,
      );
      break;
    case "REACT_COMMENT": {
      const c = s.comments.find((x) => x.id === p.id);
      if (!c) break;
      c.reactions = arr(c.reactions);
      let r = c.reactions.find((x) => x.emoji === p.emoji);
      if (!r) {
        r = { emoji: p.emoji, userIds: [] };
        c.reactions.push(r);
      }
      r.userIds = arr(r.userIds).includes(s.currentUserId)
        ? r.userIds.filter((x) => x !== s.currentUserId)
        : [...arr(r.userIds), s.currentUserId];
      c.reactions = c.reactions.filter((r) => r.userIds.length);
      break;
    }
    case "VIEW":
      s.viewSettings[p.key] = { ...s.viewSettings[p.key], ...p.patch };
      break;
    case "FAVORITE":
      s.favorites = s.favorites.some((f) => f.id === p.id && f.type === p.type)
        ? s.favorites.filter((f) => !(f.id === p.id && f.type === p.type))
        : [...s.favorites, p];
      break;
    case "NOTIFICATION":
      s.notifications.forEach((n) => {
        if (
          (!n.userId || n.userId === s.currentUserId) &&
          (!p.id || n.id === p.id)
        )
          Object.assign(n, p.patch);
      });
      break;
    case "RENAME": {
      const t = arr(s[p.collection]).find((x) => x.id === p.id);
      if (t && p.name?.trim()) t.name = p.name.trim();
      break;
    }
    case "CREATE_SPRINTS":
      createSprints(s, p);
      break;
    case "SPRINT_START": {
      const sp = s.sprints.find((x) => x.id === p.id);
      if (!sp || sp.status !== "not_started") break;
      const tasks = visibleTasks(s).filter((t) => t.sprintId === sp.id);
      Object.assign(sp, {
        status: "in_progress",
        startedAt: now(),
        startedBy: s.currentUserId,
        forecastPoints: tasks.reduce(
          (a, t) => a + (Number(t.sprintPoints) || 0),
          0,
        ),
        committedTaskIds: tasks.map((t) => t.id),
      });
      break;
    }
    case "SPRINT_COMPLETE": {
      const sp = s.sprints.find((x) => x.id === p.id);
      if (!sp || sp.status === "done") break;
      const tasks = visibleTasks(s).filter((t) => t.sprintId === sp.id),
        done = tasks.filter((t) => isClosed(s, t)),
        unfinished = tasks.filter((t) => !isClosed(s, t));
      let target = p.target || null;
      if (target === "create")
        target =
          createSprints(s, { folderId: sp.folderId, count: 1 })?.id || null;
      Object.assign(sp, {
        status: "done",
        completedAt: now(),
        completedBy: s.currentUserId,
        completedPoints: done.reduce(
          (a, t) => a + (Number(t.sprintPoints) || 0),
          0,
        ),
        completedTaskIds: done.map((t) => t.id),
        spilloverTaskIds: unfinished
          .filter((t) => arr(p.ids).includes(t.id))
          .map((t) => t.id),
        spilloverToSprintId: target,
      });
      unfinished
        .filter((t) => arr(p.ids).includes(t.id))
        .forEach((t) => {
          if (target)
            updateTask(s, t.id, {
              sprintId: target === "backlog" ? null : target,
            });
        });
      const folder = s.folders.find((f) => f.id === sp.folderId),
        a = folder?.sprintSettings?.automations;
      if (a?.autoCreate) {
        const n = Math.max(
          0,
          Math.min(10, Number(a.autoCreateCount) || 2) -
            s.sprints.filter(
              (x) => x.folderId === sp.folderId && x.status === "not_started",
            ).length,
        );
        if (n) createSprints(s, { folderId: sp.folderId, count: n });
      }
      break;
    }
    case "SPRINT_EDIT": {
      const sp = s.sprints.find((x) => x.id === p.id);
      if (
        sp &&
        (!p.patch.endDate ||
          !p.patch.startDate ||
          p.patch.endDate >= p.patch.startDate)
      )
        Object.assign(sp, p.patch);
      break;
    }
    case "SPRINT_DELETE":
      s.sprints = s.sprints.filter(
        (sp) =>
          sp.id !== p.id ||
          sp.status !== "not_started" ||
          s.tasks.some((t) => t.sprintId === sp.id),
      );
      break;
    case "SPRINT_SETTINGS": {
      const f = s.folders.find((x) => x.id === p.id);
      if (f) f.sprintSettings = p.settings;
      break;
    }
    case "CREATE_DOC": {
      const stamp = now(),
        id = p.id || uid("doc");
      s.docs.push({
        id,
        title: "",
        icon: null,
        location: p.location || { type: "workspace", id: null },
        ownerId: s.currentUserId,
        isWiki: false,
        tags: [],
        sharing: {
          visibility: "workspace",
          defaultPermission: "edit",
          memberIds: [],
          memberPermissions: {},
          publicLinkEnabled: false,
        },
        linkedTaskIds: [],
        archived: false,
        deleted: false,
        createdAt: stamp,
        createdBy: s.currentUserId,
        updatedAt: stamp,
        updatedBy: s.currentUserId,
        lastViewedAt: stamp,
      });
      s.docPages.push({
        id: p.pageId || uid("pg"),
        docId: id,
        parentPageId: null,
        title: "",
        icon: null,
        cover: null,
        orderIndex: 0,
        blocks: [{ id: uid("b"), type: "paragraph", text: "" }],
        createdAt: stamp,
        createdBy: s.currentUserId,
        updatedAt: stamp,
        updatedBy: s.currentUserId,
      });
      break;
    }
    case "UPDATE_DOC": {
      const doc = s.docs.find((x) => x.id === p.id);
      if (doc)
        Object.assign(doc, p.patch, {
          updatedAt: now(),
          updatedBy: s.currentUserId,
        });
      break;
    }
    case "VIEW_DOC": {
      const doc = s.docs.find((x) => x.id === p.id);
      if (doc) doc.lastViewedAt = now();
      break;
    }
    case "CREATE_PAGE":
      s.docPages.push({
        id: p.id || uid("pg"),
        docId: p.docId,
        parentPageId: p.parentPageId || null,
        title: p.title || "",
        icon: null,
        cover: null,
        orderIndex:
          Math.max(
            0,
            ...s.docPages
              .filter((x) => x.docId === p.docId)
              .map((x) => x.orderIndex || 0),
          ) + 1000,
        blocks: [{ id: uid("b"), type: "paragraph", text: "" }],
        createdAt: now(),
        createdBy: s.currentUserId,
        updatedAt: now(),
        updatedBy: s.currentUserId,
      });
      break;
    case "UPDATE_PAGE": {
      const page = s.docPages.find((x) => x.id === p.id);
      if (page) {
        Object.assign(page, p.patch, {
          updatedAt: now(),
          updatedBy: s.currentUserId,
        });
        const doc = s.docs.find((x) => x.id === page.docId);
        if (doc) {
          doc.updatedAt = now();
          doc.updatedBy = s.currentUserId;
        }
      }
      break;
    }
    case "DELETE_PAGE": {
      const page = s.docPages.find((x) => x.id === p.id);
      if (!page) break;
      const remove = new Set([p.id]);
      let prev;
      do {
        prev = remove.size;
        s.docPages.forEach((x) => {
          if (remove.has(x.parentPageId)) remove.add(x.id);
        });
      } while (prev !== remove.size);
      if (
        s.docPages.filter((x) => x.docId === page.docId && !remove.has(x.id))
          .length
      )
        s.docPages = s.docPages.filter((x) => !remove.has(x.id));
      break;
    }
    case "DUPLICATE_DOC": {
      const doc = s.docs.find((x) => x.id === p.id);
      if (!doc) break;
      const id = uid("doc"),
        pages = s.docPages.filter((x) => x.docId === doc.id),
        ids = Object.fromEntries(pages.map((x) => [x.id, uid("pg")]));
      s.docs.push({
        ...doc,
        id,
        title: doc.title + " (copy)",
        linkedTaskIds: [],
        createdBy: s.currentUserId,
        ownerId: s.currentUserId,
        createdAt: now(),
        updatedAt: now(),
      });
      pages.forEach((page) =>
        s.docPages.push({
          ...page,
          id: ids[page.id],
          docId: id,
          parentPageId: ids[page.parentPageId] || null,
          blocks: arr(page.blocks).map((b) => ({ ...b, id: uid("b") })),
          createdAt: now(),
          updatedAt: now(),
        }),
      );
      break;
    }
    case "LINK_DOC": {
      const t = s.tasks.find((x) => x.id === p.taskId),
        d = s.docs.find((x) => x.id === p.docId);
      if (!t || !d) break;
      t.linkedDocIds = p.remove
        ? arr(t.linkedDocIds).filter((x) => x !== d.id)
        : [...new Set([...arr(t.linkedDocIds), d.id])];
      d.linkedTaskIds = p.remove
        ? arr(d.linkedTaskIds).filter((x) => x !== t.id)
        : [...new Set([...arr(d.linkedTaskIds), t.id])];
      t.updatedAt = d.updatedAt = now();
      event(s, t.id, p.remove ? "doc_unlinked" : "doc_linked", null, d.id);
      break;
    }
    case "TIMER_START": {
      stopTimer(s);
      s.timer = {
        taskId: p.taskId || null,
        userId: s.currentUserId,
        start: now(),
        billable: billableDefault(s, p.taskId),
        description: "",
        tagIds: [],
        ...p,
      };
      break;
    }
    case "TIMER_STOP":
      stopTimer(s);
      break;
    case "TIMER_EDIT":
      if (s.timer) Object.assign(s.timer, p);
      break;
    case "TIMER_DISCARD":
      s.timer = null;
      break;
    case "ADD_TIME":
      addTime(s, p);
      break;
    case "EDIT_TIME": {
      const e = s.timeEntries.find((e) => e.id === p.id);
      if (
        e &&
        !e.locked &&
        (!("duration" in p.patch) || p.patch.duration > 0)
      ) {
        Object.assign(e, p.patch, { updatedAt: now() });
        e.end = new Date(+new Date(e.start) + e.duration * 1000).toISOString();
      }
      break;
    }
    case "DELETE_TIME":
      s.timeEntries = s.timeEntries.filter(
        (e) => !arr(p.ids || [p.id]).includes(e.id) || e.locked,
      );
      break;
    case "CELL_TIME": {
      const entries = s.timeEntries.filter(
        (e) =>
          e.userId === s.currentUserId &&
          (e.taskId || null) === (p.taskId || null) &&
          dateKey(e.start) === p.day,
      );
      if (
        entries.some((e) => e.locked) ||
        s.timesheets.some(
          (t) =>
            t.userId === s.currentUserId &&
            ["submitted", "approved"].includes(t.status) &&
            p.day >= t.periodStart &&
            p.day <= t.periodEnd,
        )
      )
        break;
      const old = sum(entries);
      if (p.duration > old) {
        const x = new Date(p.day + "T09:00");
        addTime(s, {
          taskId: p.taskId || null,
          start: new Date(+x + old * 1000).toISOString(),
          duration: p.duration - old,
          source: "timesheet",
          billable: billableDefault(s, p.taskId),
        });
      } else {
        let remaining = old - p.duration;
        entries
          .sort((a, b) => b.start.localeCompare(a.start))
          .forEach((e) => {
            if (remaining <= 0) return;
            const take = Math.min(remaining, e.duration);
            remaining -= take;
            e.duration -= take;
            e.end = new Date(
              +new Date(e.start) + e.duration * 1000,
            ).toISOString();
            e.updatedAt = now();
          });
        s.timeEntries = s.timeEntries.filter((e) => e.duration > 0);
      }
      break;
    }
    case "SUBMIT_TIMESHEET": {
      const entries = s.timeEntries.filter(
        (e) =>
          e.userId === s.currentUserId &&
          dateKey(e.start) >= p.week &&
          dateKey(e.start) <= plusDays(p.week, 6),
      );
      if (!entries.length) break;
      let sheet = s.timesheets.find(
        (x) => x.userId === s.currentUserId && x.periodStart === p.week,
      );
      if (sheet && ["approved", "submitted"].includes(sheet.status)) break;
      const exists = !!sheet;
      if (!sheet) {
        sheet = {
          id: uid("tsh"),
          userId: s.currentUserId,
          periodStart: p.week,
          periodEnd: plusDays(p.week, 6),
          history: [],
          comments: [],
        };
        s.timesheets.push(sheet);
      }
      Object.assign(sheet, {
        status: "submitted",
        totalSeconds: sum(entries),
        billableSeconds: sum(entries.filter((e) => e.billable)),
        entryIds: entries.map((e) => e.id),
        approverIds: arr(s.timesheetSettings.approvers?.[s.currentUserId]),
        submittedAt: now(),
        reviewedBy: null,
        reviewedAt: null,
        reviewComment: "",
      });
      sheet.history.push({
        action: exists ? "resubmitted" : "submitted",
        userId: s.currentUserId,
        at: now(),
        comment: p.comment || "",
      });
      entries.forEach((e) => (e.locked = true));
      break;
    }
    case "REVIEW_TIMESHEET": {
      const sheet = s.timesheets.find((x) => x.id === p.id);
      if (!sheet) break;
      const owner = sheet.userId === s.currentUserId,
        approver = arr(sheet.approverIds).includes(s.currentUserId);
      if (
        p.status === "withdrawn"
          ? !owner || sheet.status !== "submitted"
          : !approver ||
            !["submitted", "approved"].includes(sheet.status) ||
            (p.status === "changes_requested" && !p.comment?.trim())
      )
        break;
      sheet.status = p.status;
      if (p.status !== "withdrawn") {
        sheet.reviewedBy = s.currentUserId;
        sheet.reviewedAt = now();
        sheet.reviewComment = p.comment || "";
      }
      sheet.history = arr(sheet.history);
      sheet.history.push({
        action: p.status,
        userId: s.currentUserId,
        at: now(),
        comment: p.comment || "",
      });
      s.timeEntries
        .filter((e) => arr(sheet.entryIds).includes(e.id))
        .forEach((e) => (e.locked = p.status === "approved"));
      if (p.status !== "withdrawn")
        s.notifications.push({
          id: uid("nt"),
          userId: sheet.userId,
          type: "timesheet_" + p.status,
          actorId: s.currentUserId,
          timesheetId: sheet.id,
          text:
            p.status === "approved"
              ? "approved your timesheet"
              : "requested changes to your timesheet",
          createdAt: now(),
          read: false,
          cleared: false,
          savedForLater: false,
        });
      break;
    }
    case "SHEET_COMMENT": {
      const sheet = s.timesheets.find((x) => x.id === p.id);
      if (sheet && p.text?.trim()) {
        sheet.comments = arr(sheet.comments);
        sheet.comments.push({
          id: uid("tc"),
          userId: s.currentUserId,
          text: p.text.trim(),
          createdAt: now(),
        });
      }
      break;
    }
    case "PERMANENT_DELETE": {
      if (p.collection === "tasks") {
        const ids = new Set([
          p.id,
          ...subtasksOf(s, p.id).map((t) => t.id),
          ...s.tasks.filter((t) => t.parentId === p.id).map((t) => t.id),
        ]);
        let previousSize;
        do {
          previousSize = ids.size;
          s.tasks.forEach((t) => {
            if (ids.has(t.parentId)) ids.add(t.id);
          });
        } while (previousSize !== ids.size);
        s.tasks = s.tasks.filter((t) => !ids.has(t.id));
        s.comments = s.comments.filter(
          (c) => c.parentType !== "task" || !ids.has(c.parentId),
        );
        s.activity = s.activity.filter((a) => !ids.has(a.taskId));
        s.docs.forEach(
          (d) =>
            (d.linkedTaskIds = arr(d.linkedTaskIds).filter(
              (id) => !ids.has(id),
            )),
        );
      } else {
        s.docs = s.docs.filter((d) => d.id !== p.id);
        s.docPages = s.docPages.filter((d) => d.docId !== p.id);
        s.comments = s.comments.filter(
          (c) => c.parentType !== "doc" || c.parentId !== p.id,
        );
        s.tasks.forEach(
          (t) =>
            (t.linkedDocIds = arr(t.linkedDocIds).filter((id) => id !== p.id)),
        );
      }
      break;
    }
    case "ADD_TAG":
      if (!s.tags.some((t) => t.name === p.name && t.spaceId === p.spaceId))
        s.tags.push(p);
      break;
    case "EDIT_ENTITY": {
      const item = arr(s[p.collection]).find((x) => x.id === p.id);
      if (item) Object.assign(item, p.patch);
      break;
    }
    case "DUPLICATE_PAGE": {
      const page = s.docPages.find((x) => x.id === p.id);
      if (page)
        s.docPages.push({
          ...page,
          id: uid("pg"),
          title: page.title + " (copy)",
          orderIndex: (page.orderIndex || 0) + 1,
          blocks: arr(page.blocks).map((b) => ({ ...b, id: uid("b") })),
          createdAt: now(),
          createdBy: s.currentUserId,
          updatedAt: now(),
          updatedBy: s.currentUserId,
        });
      break;
    }
    case "PREFERENCES":
      s.preferences = { ...s.preferences, ...p };
      break;
    case "CLICKAPPS":
      s.workspace.clickApps = { ...s.workspace.clickApps, ...p };
      break;
    case "ADD_ENTITY":
      if (["spaces", "folders", "lists"].includes(p.collection)) {
        s[p.collection].push(p.record);
        if (p.collection === "folders" && p.record.isSprintFolder) {
          const id = uid("li");
          p.record.sprintSettings = {
            nameTemplate: "Sprint {INDEX} ({START_DATE} - {END_DATE})",
            durationDays: 14,
            startDay: "monday",
            automations: {},
            backlogListId: id,
          };
          s.lists.push({
            id,
            name: "Backlog",
            spaceId: p.record.spaceId,
            folderId: p.record.id,
            isBacklog: true,
            createdAt: now(),
            orderIndex: 0,
          });
          createSprints(s, {
            folderId: p.record.id,
            count: 1,
            startDate: dateKey(),
          });
        }
      }
      break;
    case "STATUSES": {
      const sp = s.spaces.find((x) => x.id === p.id);
      if (!sp) break;
      sp.statuses = p.statuses;
      arr(p.renames).forEach(([from, to]) =>
        s.tasks
          .filter(
            (t) => locationOf(s, t).space?.id === sp.id && t.status === from,
          )
          .forEach((t) => updateTask(s, t.id, { status: to })),
      );
      s.tasks
        .filter((t) => locationOf(s, t).space?.id === sp.id)
        .forEach((t) => {
          if (isClosed(s, t) && !t.dateClosed) {
            t.dateClosed = now();
            t.closedBy = s.currentUserId;
          } else if (!isClosed(s, t)) {
            t.dateClosed = null;
            t.closedBy = null;
          }
        });
      break;
    }
    case "ADD_WIDGET": {
      const d = s.dashboards.find((x) => x.id === p.id);
      if (d) d.widgets = [...arr(d.widgets), p.widget];
      break;
    }
    default:
      return state;
  }
  return s;
}
