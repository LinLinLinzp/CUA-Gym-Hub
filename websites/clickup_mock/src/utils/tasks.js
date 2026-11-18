import { arr, dateKey, monday, plusDays } from "./format.js";
export const locationOf = (state, task) => {
  const list = arr(state.lists).find((l) => l.id === task?.listId);
  return {
    list,
    space: arr(state.spaces).find((s) => s.id === list?.spaceId),
    folder: arr(state.folders).find((f) => f.id === list?.folderId),
  };
};
export const billableDefault = (state, taskId) =>
  locationOf(
    state,
    arr(state.tasks).find((t) => t.id === taskId),
  ).folder?.id === "fd_clients" ||
  !!state.workspace?.clickApps?.billableDefault;
export const statusOf = (state, task) =>
  arr(locationOf(state, task).space?.statuses).find(
    (s) => s.name === task?.status,
  ) || {
    name: task?.status || "to do",
    color: "#87909E",
    type: ["complete", "closed"].includes(task?.status) ? "done" : "open",
  };
export const isClosed = (s, t) =>
  ["done", "closed"].includes(statusOf(s, t).type);
export const visibleTasks = (s, includeArchived = false) =>
  arr(s.tasks).filter((t) => !t.deleted && (includeArchived || !t.archived));
export const subtasksOf = (s, id) =>
  visibleTasks(s).filter((t) => t.parentId === id);
export const trackedSeconds = (s, id) =>
  arr(s.timeEntries)
    .filter((e) => e.taskId === id)
    .reduce((a, e) => a + (Number(e.duration) || 0), 0);
export const locationText = (s, t) => {
  const l = locationOf(s, t);
  return [l.space?.name, l.folder?.name, l.list?.name]
    .filter(Boolean)
    .join(" / ");
};
export function tasksForLocation(s, key, archived = false) {
  const [type, id] = key.split(":");
  return visibleTasks(s, archived).filter((t) => {
    const { list } = locationOf(s, t);
    return (
      type === "everything" ||
      (type === "mytasks" && arr(t.assigneeIds).includes(s.currentUserId)) ||
      (type === "list" && t.listId === id) ||
      (type === "sprint" && t.sprintId === id) ||
      (type === "space" && list?.spaceId === id) ||
      (type === "folder" && list?.folderId === id)
    );
  });
}
export const fieldsFor = (s, t) => {
  const { list } = locationOf(s, t);
  return arr(s.customFields).filter((f) =>
    f.scope?.type === "list"
      ? f.scope.id === t.listId
      : f.scope?.type === "space"
        ? f.scope.id === list?.spaceId
        : f.scope?.type === "folder"
          ? f.scope.id === list?.folderId
          : false,
  );
};
export function matchesFilter(s, t, f) {
  let value;
  if (f.field === "assignee") value = arr(t.assigneeIds);
  else if (f.field === "sprint") value = t.sprintId;
  else value = t[f.field];
  if (f.op === "is_set")
    return Array.isArray(value)
      ? value.length > 0
      : value != null && value !== "";
  if (f.op === "is_not_set")
    return Array.isArray(value)
      ? value.length === 0
      : value == null || value === "";
  if (
    f.value == null ||
    f.value === "" ||
    (Array.isArray(f.value) && !f.value.length)
  )
    return true;
  let result;
  if (f.field === "dueDate") {
    const day = dateKey();
    result =
      f.value === "overdue"
        ? !!value && value < day && !isClosed(s, t)
        : f.value === "today"
          ? value === day
          : f.value === "this_week"
            ? value >= monday() && value <= plusDays(monday(), 6)
            : !value;
  } else
    result = Array.isArray(value)
      ? value.includes(f.value)
      : String(value ?? "") === String(f.value ?? "");
  return f.op === "is_not" ? !result : result;
}
