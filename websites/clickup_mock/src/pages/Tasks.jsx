import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink } from "../utils/nav.jsx";
import {
  arr,
  dateKey,
  plusDays,
  shortDate,
  uid,
  now,
  formatDuration,
} from "../utils/format.js";
import {
  tasksForLocation,
  statusOf,
  isClosed,
  subtasksOf,
  locationOf,
  locationText,
  matchesFilter,
  trackedSeconds,
} from "../utils/tasks.js";
import {
  Icon,
  Button,
  Menu,
  Popover,
  SearchPicker,
  AvatarStack,
  StatusPill,
  StatusIcon,
  Priority,
  Tag,
  DateChip,
  FieldPicker,
  Favorite,
  EstimatePicker,
  Empty,
  useUI,
} from "../components/UI.jsx";
import { TaskMenu, useTaskOpen } from "../components/TaskDetail.jsx";
import { SprintOverview, SprintReport, SprintStatus } from "./Sprints.jsx";
const baseColumns = ["assigneeIds", "dueDate", "priority"];
const columnNames = {
  status: "Status",
  name: "Name",
  none: "None",
  assigneeIds: "Assignee",
  assignee: "Assignee",
  dueDate: "Due date",
  priority: "Priority",
  sprintPoints: "Sprint Points",
  sprintId: "Sprint",
  sprint: "Sprint",
  tags: "Tags",
  timeTracked: "Time tracked",
  timeEstimate: "Time estimate",
  startDate: "Start date",
  createdAt: "Date created",
};
export function TaskLocation() {
  const params = useParams(),
    loc = useLocation(),
    nav = useNav(),
    { state, actions } = useStore(),
    ui = useUI(),
    [searchParams] = useSearchParams();
  let type = "everything",
    id = "";
  if (params.listId) {
    type = "list";
    id = params.listId;
  } else if (params.spaceId) {
    type = "space";
    id = params.spaceId;
  } else if (params.folderId) {
    type = "folder";
    id = params.folderId;
  } else if (params.sprintId) {
    type = "sprint";
    id = params.sprintId;
  }
  const key = id ? type + ":" + id : type,
    collection = {
      list: "lists",
      space: "spaces",
      folder: "folders",
      sprint: "sprints",
    }[type],
    item = id
      ? arr(state[collection]).find((x) => x.id === id)
      : { name: "Everything" },
    list = type === "list" ? item : null,
    folder =
      type === "folder"
        ? item
        : type === "sprint"
          ? state.folders.find((f) => f.id === item?.folderId)
          : state.folders.find((f) => f.id === list?.folderId),
    space =
      type === "space"
        ? item
        : state.spaces.find(
            (s) => s.id === item?.spaceId || s.id === folder?.spaceId,
          ),
    isBacklog = list?.isBacklog;
  const settings = {
      view: "list",
      groupBy: "status",
      sortBy: null,
      sortDir: "asc",
      showClosed: false,
      subtasks: "collapsed",
      meMode: false,
      filters: [],
      columns: [
        ...baseColumns,
        ...(type === "sprint" || isBacklog ? ["sprintPoints"] : []),
        ...(isBacklog ? ["sprintId"] : []),
      ],
      ...state.viewSettings[key],
    },
    view = searchParams.get("view") || settings.view,
    save = (p) => actions.act("VIEW", { key, patch: p }),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState([]),
    [collapsed, setCollapsed] = useState({}),
    [expanded, setExpanded] = useState({}),
    [inline, setInline] = useState(null),
    [lastSelectedId, setLastSelectedId] = useState(null);
  useEffect(() => {
    setQ("");
    setSelected([]);
    setLastSelectedId(null);
    setCollapsed({});
    setInline(null);
  }, [key]);
  const goView = (v) => {
    const p = new URLSearchParams(loc.search);
    p.set("view", v);
    nav(loc.pathname + "?" + p);
    save({ view: v });
  };
  let tasks = useMemo(
    () =>
      tasksForLocation(state, key, settings.showArchived).filter(
        (t) =>
          (settings.subtasks === "separate" || !t.parentId) &&
          (!searchParams.get("assignee") ||
            arr(t.assigneeIds).includes(searchParams.get("assignee"))) &&
          (settings.showClosed || statusOf(state, t).type !== "closed") &&
          (!settings.meMode ||
            arr(t.assigneeIds).includes(state.currentUserId)) &&
          (!isBacklog || settings.showInSprints || !t.sprintId) &&
          arr(settings.filters).every((f) => matchesFilter(state, t, f)) &&
          `${t.name || ""} ${t.description || ""}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [state, key, JSON.stringify(settings), q],
  );
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  tasks.sort((a, b) => {
    const field = settings.sortBy;
    if (!field) return (a.orderIndex || 0) - (b.orderIndex || 0);
    let x =
        field === "priority"
          ? (priorityOrder[a.priority] ?? 4)
          : (a[field] ?? ""),
      y =
        field === "priority"
          ? (priorityOrder[b.priority] ?? 4)
          : (b[field] ?? "");
    return (
      (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) *
      (settings.sortDir === "desc" ? -1 : 1)
    );
  });
  const groups = [];
  const addGroup = (name, st) => {
    if (!groups.some((g) => g.name === name))
      groups.push({ name, status: st, tasks: [] });
  };
  if (settings.groupBy === "status") {
    const statuses = space
      ? arr(space.statuses)
      : state.spaces.flatMap((s) => arr(s.statuses));
    statuses
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .forEach((st) => {
        if (settings.showClosed || st.type !== "closed") addGroup(st.name, st);
      });
  }
  tasks.forEach((t) => {
    let names =
      settings.groupBy === "status"
        ? [t.status || "to do"]
        : settings.groupBy === "assignee"
          ? arr(t.assigneeIds).length
            ? t.assigneeIds
            : ["Unassigned"]
          : settings.groupBy === "tags"
            ? arr(t.tags).length
              ? t.tags
              : ["No tags"]
            : settings.groupBy === "priority"
              ? [t.priority || "No priority"]
              : settings.groupBy === "dueDate"
                ? [t.dueDate || "No due date"]
                : ["All tasks"];
    names.forEach((name) => {
      addGroup(name, settings.groupBy === "status" ? statusOf(state, t) : null);
      groups.find((g) => g.name === name).tasks.push(t);
    });
  });
  if (settings.groupDir === "desc") groups.reverse();
  const locationLists =
      type === "list"
        ? [item]
        : state.lists.filter((l) =>
            type === "space"
              ? l.spaceId === id
              : type === "folder"
                ? l.folderId === id
                : type === "sprint"
                  ? l.id === folder?.sprintSettings?.backlogListId
                  : true,
          ),
    defaultList = locationLists[0]?.id || state.lists[0]?.id,
    context = {
      listId: defaultList,
      ...(type === "sprint" ? { sprintId: id } : {}),
    },
    create = (extra) => ui.open("taskCreate", { ...context, ...extra }),
    docs = state.docs.filter(
      (d) =>
        !d.deleted &&
        !d.archived &&
        d.location?.type === type &&
        d.location?.id === id,
    );
  const select = (task, event) => {
    const visibleOrder = groups.flatMap((g) =>
      (collapsed[g.name] ?? g.status?.type === "done")
        ? []
        : g.tasks.flatMap((t) => [
            t,
            ...(settings.subtasks !== "separate" &&
            (expanded[t.id] || settings.subtasks === "expanded")
              ? subtasksOf(state, t.id)
              : []),
          ]),
    );
    const i = visibleOrder.findIndex((t) => t.id === task.id),
      lastIndex = visibleOrder.findIndex((t) => t.id === lastSelectedId);
    if (event.shiftKey && i >= 0 && lastIndex >= 0) {
      const range = visibleOrder
        .slice(Math.min(i, lastIndex), Math.max(i, lastIndex) + 1)
        .map((t) => t.id);
      setSelected((xs) => [...new Set([...xs, ...range])]);
    } else
      setSelected((xs) =>
        xs.includes(task.id)
          ? xs.filter((x) => x !== task.id)
          : [...xs, task.id],
      );
    setLastSelectedId(task.id);
  };
  const drop = (e, g) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("task"),
      task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const patch = {
      orderIndex: Math.max(0, ...g.tasks.map((t) => t.orderIndex || 0)) + 1000,
    };
    if (settings.groupBy === "status") patch.status = g.name;
    else if (settings.groupBy === "priority")
      patch.priority = g.name === "No priority" ? null : g.name;
    else if (settings.groupBy === "assignee")
      patch.assigneeIds = g.name === "Unassigned" ? [] : [g.name];
    actions.updateTask(taskId, patch);
  };
  const row = (t, indent = false) => (
    <TaskRow
      key={t.id}
      task={t}
      columns={settings.columns}
      selected={selected.includes(t.id)}
      anySelected={selected.length > 0}
      onSelect={(e) => select(t, e)}
      indent={indent}
      expanded={expanded[t.id] || settings.subtasks === "expanded"}
      onExpand={() => setExpanded((xs) => ({ ...xs, [t.id]: !xs[t.id] }))}
      onSort={(field) =>
        save({
          sortBy: field,
          sortDir:
            settings.sortBy === field && settings.sortDir === "asc"
              ? "desc"
              : "asc",
        })
      }
    />
  );
  if (!item) return <Empty title="This item doesn't exist or was deleted" />;
  if (type === "folder" && item.isSprintFolder)
    return <SprintOverview folder={item} />;
  return (
    <div className="location-page">
      <div className="location-header">
        <div className="breadcrumb">
          {space && type !== "space" && (
            <>
              <SLink to={"/s/" + space.id}>
                <span
                  className="space-icon"
                  style={{ background: space.color }}
                >
                  {space.icon}
                </span>
                {space.name}
              </SLink>
              <Icon name="ChevronRight" size={12} />
            </>
          )}
          {folder && type !== "folder" && (
            <>
              <SLink to={"/f/" + folder.id}>
                <Icon
                  name={folder.isSprintFolder ? "Zap" : "Folder"}
                  size={15}
                />
                {folder.name}
              </SLink>
              <Icon name="ChevronRight" size={12} />
            </>
          )}
          <strong>
            <Icon
              name={
                type === "sprint"
                  ? "Zap"
                  : type === "everything"
                    ? "Layers"
                    : type === "space"
                      ? "Layers"
                      : "List"
              }
            />
            {item.name}
          </strong>
          <Favorite type={type} id={id || "everything"} />
          <Menu
            items={[
              {
                label: "Rename",
                onClick: () =>
                  ui.prompt("Rename " + type, item.name, (name) =>
                    actions.act("RENAME", { collection, id, name }),
                  ),
              },
              type === "sprint" && {
                label: "Edit dates",
                onClick: () => ui.open("sprintDates", { id }),
              },
              type === "sprint" && {
                label: "Sprint settings",
                onClick: () =>
                  ui.open("sprintSettings", { folderId: item.folderId }),
              },
              type === "sprint" && {
                label: "Delete sprint",
                title: state.tasks.some((t) => t.sprintId === id)
                  ? "Move or remove this sprint's tasks first"
                  : item.status !== "not_started"
                    ? "Only a sprint that has not started can be deleted"
                    : undefined,
                disabled:
                  item.status !== "not_started" ||
                  state.tasks.some((t) => t.sprintId === id),
                danger: true,
                onClick: () =>
                  ui.confirm("Delete sprint?", () => {
                    actions.act("SPRINT_DELETE", { id });
                    nav("/f/" + item.folderId);
                  }),
              },
            ]}
          />
        </div>
        {type !== "everything" && (
          <Popover
            trigger={
              <span>
                <Icon name="FileText" />
                Docs {docs.length}
              </span>
            }
            label="Location Docs"
          >
            {(close) => (
              <>
                {docs.map((d) => (
                  <SLink
                    className="menu-item"
                    key={d.id}
                    to={"/d/" + d.id}
                    onClick={close}
                  >
                    {d.icon} {d.title || "Untitled"}
                  </SLink>
                ))}
                <Button
                  onClick={() => {
                    close();
                    ui.open("docCreate", { location: { type, id } });
                  }}
                >
                  + New Doc
                </Button>
              </>
            )}
          </Popover>
        )}
      </div>
      {type === "sprint" && (
        <div className="sprint-strip">
          <SprintStatus sprint={item} />
          <span className="chip">
            <Icon name="Calendar" />
            {shortDate(item.startDate)} – {shortDate(item.endDate)}
          </span>
          <span>
            {folder?.sprintSettings?.measureOfEffort === "time_estimates"
              ? "Hours:"
              : "Points:"}{" "}
            {tasks
              .filter((t) => isClosed(state, t))
              .reduce(
                (a, t) =>
                  a +
                  (folder?.sprintSettings?.measureOfEffort === "time_estimates"
                    ? (t.timeEstimate || 0) / 60
                    : t.sprintPoints || 0),
                0,
              )}{" "}
            /{" "}
            {tasks.reduce(
              (a, t) =>
                a +
                (folder?.sprintSettings?.measureOfEffort === "time_estimates"
                  ? (t.timeEstimate || 0) / 60
                  : t.sprintPoints || 0),
              0,
            )}
          </span>
          {item.forecastPoints != null && (
            <span className="muted">🔒 Forecast: {item.forecastPoints}</span>
          )}
        </div>
      )}
      {type === "sprint" && item.status === "done" && (
        <div className="banner">
          This sprint was completed on {shortDate(item.completedAt)} by{" "}
          {state.users.find((u) => u.id === item.completedBy)?.name ||
            "a teammate"}{" "}
          · {item.completedPoints} of {item.forecastPoints} points completed
        </div>
      )}
      <div className="view-tabs">
        {[
          ["list", "List", "List"],
          ["board", "Columns3", "Board"],
          ["calendar", "Calendar", "Calendar"],
          ["gantt", "ChartGantt", "Gantt"],
          ...(type === "sprint"
            ? [["report", "ChartNoAxesCombined", "Report"]]
            : []),
        ].map(([v, icon, label]) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => goView(v)}
          >
            <Icon name={icon} />
            {type === "sprint" && v !== "calendar" ? "Sprint " : ""}
            {label}
          </button>
        ))}
      </div>
      {view === "report" && type === "sprint" ? (
        <SprintReport sprint={item} />
      ) : (
        <>
          <div className="toolbar">
            <Popover
              trigger={
                <span>
                  <Icon name="Layers" />
                  Group: {columnNames[settings.groupBy] || settings.groupBy}
                  <Icon name="ChevronDown" size={12} />
                </span>
              }
              label="Group by"
            >
              <label>
                Group by
                <select
                  value={settings.groupBy}
                  onChange={(e) => save({ groupBy: e.target.value })}
                >
                  {[
                    "status",
                    "assignee",
                    "priority",
                    "tags",
                    "dueDate",
                    "none",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {columnNames[v] || v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Group order
                <select
                  value={settings.groupDir || "asc"}
                  onChange={(e) => save({ groupDir: e.target.value })}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
              <label>
                Sort by
                <select
                  value={settings.sortBy || ""}
                  onChange={(e) => save({ sortBy: e.target.value || null })}
                >
                  <option value="">Manual order</option>
                  {[
                    "dueDate",
                    "priority",
                    "name",
                    "sprintPoints",
                    "createdAt",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {columnNames[v] || v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort direction
                <select
                  value={settings.sortDir}
                  onChange={(e) => save({ sortDir: e.target.value })}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
            </Popover>
            <Popover
              trigger={
                <span>
                  <Icon name="GitBranch" />
                  Subtasks
                  <Icon name="ChevronDown" size={12} />
                </span>
              }
              label="Subtasks"
            >
              {(close) =>
                ["collapsed", "expanded", "separate"].map((v) => (
                  <button
                    key={v}
                    className="menu-item"
                    onClick={() => {
                      save({ subtasks: v });
                      close();
                    }}
                  >
                    {v === "collapsed"
                      ? "Collapse all"
                      : v === "expanded"
                        ? "Expand all"
                        : "As separate tasks"}
                  </button>
                ))
              }
            </Popover>
            <Popover
              trigger={
                <span>
                  <Icon name="Columns3" />
                  Columns
                </span>
              }
              label="Columns"
            >
              {[
                ...baseColumns,
                "sprintPoints",
                "sprintId",
                "tags",
                "timeTracked",
                "timeEstimate",
                "startDate",
                "createdAt",
                ...state.customFields.map((f) => "customField:" + f.id),
              ].map((c) => (
                <label className="check" key={c}>
                  <input
                    type="checkbox"
                    checked={settings.columns.includes(c)}
                    onChange={(e) =>
                      save({
                        columns: e.target.checked
                          ? [...settings.columns, c]
                          : settings.columns.filter((x) => x !== c),
                      })
                    }
                  />
                  {columnNames[c] ||
                    state.customFields.find((f) => "customField:" + f.id === c)
                      ?.name}
                </label>
              ))}
            </Popover>
            <div className="grow" />
            <FilterControl settings={settings} save={save} />
            <button
              className={
                "toolbar-button " + (settings.meMode ? "selected" : "")
              }
              onClick={() => save({ meMode: !settings.meMode })}
            >
              <Icon name="UserRound" size={14} />
              Me
            </button>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.showClosed}
                onChange={(e) => save({ showClosed: e.target.checked })}
              />
              Closed
            </label>
            <Popover
              trigger={<Icon name="Settings2" />}
              label="More view options"
            >
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!settings.showArchived}
                  onChange={(e) => save({ showArchived: e.target.checked })}
                />
                Archived
              </label>
              {isBacklog && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!settings.showInSprints}
                    onChange={(e) => save({ showInSprints: e.target.checked })}
                  />
                  Show tasks in sprints
                </label>
              )}
            </Popover>
            <div className="task-search">
              <Icon name="Search" size={14} />
              <input
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="split-button">
              <Button variant="dark" icon="Plus" onClick={() => create()}>
                Task
              </Button>
              <Menu
                label="Create Task or Doc"
                trigger={<Icon name="ChevronDown" size={13} />}
                items={[
                  { label: "Task", onClick: () => create() },
                  {
                    label: "Doc",
                    onClick: () =>
                      ui.open("docCreate", {
                        location: {
                          type: type === "everything" ? "workspace" : type,
                          id,
                        },
                      }),
                  },
                ]}
              />
            </div>
          </div>
          {isBacklog && (
            <label className="backlog-toggle check">
              <input
                type="checkbox"
                checked={!!settings.showInSprints}
                onChange={(e) => save({ showInSprints: e.target.checked })}
              />
              Show tasks in sprints
            </label>
          )}
          <div className="task-view-content">
            {view === "calendar" ? (
              <TaskCalendar tasks={tasks} context={context} />
            ) : view === "gantt" ? (
              <Gantt tasks={tasks} />
            ) : view === "board" ? (
              <div className="board">
                {groups.map((g) => (
                  <div
                    className="board-column"
                    key={g.name}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => drop(e, g)}
                  >
                    <div className="group-heading">
                      <StatusPill
                        status={
                          g.status || {
                            name:
                              state.users.find((u) => u.id === g.name)?.name ||
                              g.name,
                            color: "#87909E",
                            type: "open",
                          }
                        }
                      />
                      <span className="muted">{g.tasks.length}</span>
                      <div className="grow" />
                      <button
                        className="icon-btn"
                        aria-label={"Add task " + g.name}
                        onClick={() => setInline(g.name)}
                      >
                        <Icon name="Plus" size={14} />
                      </button>
                    </div>
                    {g.tasks.map((t) => (
                      <BoardCard
                        key={t.id}
                        task={t}
                        onDrop={(source) =>
                          actions.updateTask(source, {
                            orderIndex: (t.orderIndex || 1000) - 1,
                            ...(settings.groupBy === "status"
                              ? { status: g.name }
                              : settings.groupBy === "priority"
                                ? {
                                    priority:
                                      g.name === "No priority" ? null : g.name,
                                  }
                                : settings.groupBy === "assignee"
                                  ? {
                                      assigneeIds:
                                        g.name === "Unassigned" ? [] : [g.name],
                                    }
                                  : {}),
                          })
                        }
                      />
                    ))}
                    <InlineCreate
                      active={inline === g.name}
                      activate={() => setInline(g.name)}
                      cancel={() => setInline(null)}
                      context={{
                        ...context,
                        ...(settings.groupBy === "status"
                          ? { status: g.name }
                          : settings.groupBy === "priority"
                            ? {
                                priority:
                                  g.name === "No priority" ? null : g.name,
                              }
                            : settings.groupBy === "assignee"
                              ? {
                                  assigneeIds:
                                    g.name === "Unassigned" ? [] : [g.name],
                                }
                              : {}),
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="task-list">
                {groups.map((g) => {
                  const isCollapsed =
                    collapsed[g.name] ?? g.status?.type === "done";
                  return (
                    <section
                      className="task-group"
                      key={g.name}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, g)}
                    >
                      <div className="group-heading">
                        <button
                          className="icon-btn"
                          aria-label={"Collapse " + g.name}
                          onClick={() =>
                            setCollapsed((xs) => ({
                              ...xs,
                              [g.name]: !isCollapsed,
                            }))
                          }
                        >
                          <Icon
                            name={isCollapsed ? "ChevronRight" : "ChevronDown"}
                            size={14}
                          />
                        </button>
                        <input
                          type="checkbox"
                          aria-label={"Select group " + g.name}
                          checked={
                            g.tasks.length > 0 &&
                            g.tasks.every((t) => selected.includes(t.id))
                          }
                          onChange={(e) =>
                            setSelected((xs) =>
                              e.target.checked
                                ? [
                                    ...new Set([
                                      ...xs,
                                      ...g.tasks.map((t) => t.id),
                                    ]),
                                  ]
                                : xs.filter(
                                    (id) => !g.tasks.some((t) => t.id === id),
                                  ),
                            )
                          }
                        />
                        <StatusPill
                          status={
                            g.status || {
                              name:
                                state.users.find((u) => u.id === g.name)
                                  ?.name || g.name,
                              color: "#87909E",
                              type: "open",
                            }
                          }
                        />
                        <span className="muted">{g.tasks.length}</span>
                        <Menu
                          items={[
                            {
                              label: "Collapse all groups",
                              onClick: () =>
                                setCollapsed(
                                  Object.fromEntries(
                                    groups.map((g) => [g.name, true]),
                                  ),
                                ),
                            },
                            {
                              label: "Hide group",
                              onClick: () =>
                                setCollapsed((xs) => ({
                                  ...xs,
                                  [g.name]: true,
                                })),
                            },
                          ]}
                        />
                        <button
                          className="muted small"
                          onClick={() => {
                            setCollapsed((xs) => ({ ...xs, [g.name]: false }));
                            setInline(g.name);
                          }}
                        >
                          + Add Task
                        </button>
                      </div>
                      {!isCollapsed && (
                        <>
                          <div
                            className="task-table-header"
                            style={{
                              gridTemplateColumns: `minmax(300px,1fr) repeat(${settings.columns.length},minmax(105px,120px)) 32px`,
                            }}
                          >
                            <button
                              onClick={() =>
                                save({
                                  sortBy: "name",
                                  sortDir:
                                    settings.sortDir === "asc" ? "desc" : "asc",
                                })
                              }
                            >
                              Name
                            </button>
                            {settings.columns.map((c) => (
                              <Menu
                                key={c}
                                trigger={
                                  <span>
                                    {columnNames[c] ||
                                      state.customFields.find(
                                        (f) => "customField:" + f.id === c,
                                      )?.name}
                                    <Icon name="ChevronDown" size={10} />
                                  </span>
                                }
                                label={
                                  "Sort by " +
                                  (columnNames[c] ||
                                    state.customFields.find(
                                      (f) => "customField:" + f.id === c,
                                    )?.name ||
                                    c)
                                }
                                items={[
                                  {
                                    label: "Sort ascending",
                                    onClick: () =>
                                      save({ sortBy: c, sortDir: "asc" }),
                                  },
                                  {
                                    label: "Sort descending",
                                    onClick: () =>
                                      save({ sortBy: c, sortDir: "desc" }),
                                  },
                                  {
                                    label: "Clear sort",
                                    onClick: () => save({ sortBy: null }),
                                  },
                                ]}
                              />
                            ))}
                            <span />
                          </div>
                          {g.tasks.map((t) => (
                            <div key={t.id}>
                              {row(t)}
                              {settings.subtasks !== "separate" &&
                                (expanded[t.id] ||
                                  settings.subtasks === "expanded") &&
                                subtasksOf(state, t.id).map((child) =>
                                  row(child, true),
                                )}
                            </div>
                          ))}
                          <InlineCreate
                            active={inline === g.name}
                            activate={() => setInline(g.name)}
                            cancel={() => setInline(null)}
                            context={{
                              ...context,
                              ...(settings.groupBy === "status"
                                ? { status: g.name }
                                : {}),
                            }}
                          />
                        </>
                      )}
                    </section>
                  );
                })}
                {!tasks.length && (
                  <Empty
                    title={
                      q || settings.filters.length
                        ? "No tasks match your filters"
                        : "No tasks yet"
                    }
                    action={
                      <Button onClick={() => create()} icon="Plus">
                        Add Task
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
      {selected.length > 0 && (
        <BulkBar
          ids={selected}
          clear={() => setSelected([])}
          tasks={tasks}
          sprint={folder?.isSprintFolder}
        />
      )}
    </div>
  );
}
export function InlineCreate({ active, activate, cancel, context }) {
  const { state, actions } = useStore(),
    [form, setForm] = useState({
      name: "",
      assigneeIds: [],
      dueDate: null,
      priority: null,
    }),
    [error, setError] = useState(false);
  const patch = (p) => setForm((x) => ({ ...x, ...p }));
  if (!active)
    return (
      <button className="add-task-row" onClick={activate}>
        <Icon name="Plus" size={14} />
        Add Task
      </button>
    );
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(true);
      return;
    }
    if (!context.listId) return;
    actions.createTask({ ...context, ...form });
    patch({ name: "" });
    setError(false);
  };
  return (
    <form className="inline-create" onSubmit={submit}>
      <Icon name="CircleDashed" size={14} />
      <input
        autoFocus
        className={error ? "error" : ""}
        placeholder="Task Name or type '/' for commands"
        value={form.name}
        onChange={(e) => patch({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cancel();
          }
          if (e.key === "Enter" && !form.name.trim()) setError(true);
        }}
      />
      <FieldPicker
        field="assigneeIds"
        task={{ ...context, ...form }}
        onChange={patch}
      >
        <AvatarStack ids={form.assigneeIds} />
      </FieldPicker>
      <FieldPicker
        field="dueDate"
        task={{ ...context, ...form }}
        onChange={patch}
      >
        <Icon name="Calendar" size={14} />
      </FieldPicker>
      <FieldPicker
        field="priority"
        task={{ ...context, ...form }}
        onChange={patch}
      >
        <Priority value={form.priority} label={false} />
      </FieldPicker>
      <Button type="submit" disabled={!form.name.trim()}>
        Save
      </Button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Cancel task"
        onClick={cancel}
      >
        <Icon name="X" size={14} />
      </button>
    </form>
  );
}
export function TaskRow({
  task: t,
  columns = baseColumns,
  selected,
  anySelected,
  onSelect,
  indent = false,
  expanded,
  onExpand,
}) {
  const { state, actions } = useStore(),
    ui = useUI(),
    open = useTaskOpen(),
    children = subtasksOf(state, t.id),
    check = arr(t.checklists).flatMap((c) => arr(c.items));
  return (
    <div
      className={
        "task-row " +
        (selected ? "selected " : "") +
        (anySelected ? "has-selection" : "")
      }
      style={{
        gridTemplateColumns: `minmax(300px,1fr) repeat(${columns.length},minmax(105px,120px)) 32px`,
      }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const source = e.dataTransfer.getData("task");
        if (source && source !== t.id) {
          e.stopPropagation();
          actions.updateTask(source, {
            orderIndex: (t.orderIndex || 1000) - 1,
            status: t.status,
          });
        }
      }}
    >
      <div className="task-name-cell" style={{ paddingLeft: indent ? 38 : 8 }}>
        <input
          type="checkbox"
          aria-label={"Select " + t.name}
          checked={!!selected}
          onChange={() => {}}
          onClick={(e) => onSelect?.(e)}
        />
        <FieldPicker field="status" task={t}>
          <StatusIcon task={t} />
        </FieldPicker>
        <button
          className={"task-name " + (t.archived ? "muted" : "")}
          onClick={() => open(t.id)}
        >
          {t.name}
        </button>
        {children.length > 0 && (
          <button
            className="subtask-count"
            title="Expand subtasks"
            onClick={onExpand}
          >
            <Icon name={expanded ? "ChevronDown" : "GitBranch"} size={12} />
            {children.length}
          </button>
        )}
        {t.description && (
          <Icon
            name="AlignLeft"
            size={12}
            color="#aaa"
            role="img"
            aria-label="Has description"
          />
        )}
        {check.length > 0 && (
          <small className="muted">
            ☑ {check.filter((i) => i.resolved).length}/{check.length}
          </small>
        )}
        <span className="row-tags">
          {arr(t.tags)
            .slice(0, 3)
            .map((tag) => (
              <Tag key={tag} name={tag} />
            ))}
          {arr(t.tags).length > 3 && (
            <small className="muted">+{t.tags.length - 3}</small>
          )}
        </span>
        <button
          className="row-hover icon-btn"
          title="Add subtask"
          onClick={() =>
            ui.open("taskCreate", { parentId: t.id, listId: t.listId })
          }
        >
          <Icon name="Plus" size={12} />
        </button>
      </div>
      {columns.map((c) => (
        <div className="task-cell" key={c}>
          {c === "sprintPoints" &&
          locationOf(state, t).folder?.sprintSettings?.measureOfEffort ===
            "time_estimates" ? (
            <EstimatePicker task={t} />
          ) : [
              "assignee",
              "assigneeIds",
              "dueDate",
              "startDate",
              "priority",
              "sprintPoints",
              "sprint",
              "sprintId",
              "tags",
            ].includes(c) ? (
            <FieldPicker
              field={
                c === "assignee"
                  ? "assigneeIds"
                  : c === "sprint"
                    ? "sprintId"
                    : c
              }
              task={t}
            >
              {c === "assignee" || c === "assigneeIds" ? (
                <AvatarStack ids={t.assigneeIds} />
              ) : c === "dueDate" || c === "startDate" ? (
                <DateChip value={t[c]} task={t} />
              ) : c === "priority" ? (
                <Priority value={t.priority} />
              ) : c === "sprintPoints" ? (
                <span className="muted">◆ {t.sprintPoints ?? "–"}</span>
              ) : c === "sprint" || c === "sprintId" ? (
                <span className="sprint-cell">
                  {state.sprints.find((s) => s.id === t.sprintId)?.name || "–"}
                </span>
              ) : (
                <span>
                  {arr(t.tags).map((n) => (
                    <Tag key={n} name={n} />
                  ))}
                </span>
              )}
            </FieldPicker>
          ) : c === "timeEstimate" ? (
            <EstimatePicker task={t} />
          ) : c === "timeTracked" ? (
            <button
              onClick={() => ui.open("time", { taskId: t.id, tab: "Manual" })}
            >
              {formatDuration(trackedSeconds(state, t.id))}
            </button>
          ) : c === "createdAt" ? (
            shortDate(t.createdAt)
          ) : c.startsWith("customField:") ? (
            <CustomCell task={t} fieldId={c.split(":")[1]} />
          ) : null}
        </div>
      ))}
      <TaskMenu task={t} />
    </div>
  );
}
function CustomCell({ task, fieldId }) {
  const { state, actions } = useStore(),
    f = state.customFields.find((f) => f.id === fieldId),
    value = task.customFields?.[fieldId];
  if (!f) return "–";
  return (
    <Popover
      label={"Edit " + f.name}
      trigger={
        arr(f.options).find((o) => o.id === value)?.name ||
        (f.type === "currency" && value != null
          ? "$" + Number(value).toFixed(2)
          : Array.isArray(value)
            ? value.join(", ")
            : String(value ?? "Empty"))
      }
    >
      {(close) =>
        f.options ? (
          <SearchPicker
            items={f.options.map((o) => ({ value: o.id, label: o.name }))}
            onPick={(v) => {
              actions.updateTask(task.id, {
                customFields: {
                  ...task.customFields,
                  [fieldId]: f.type === "labels" ? [v] : v,
                },
              });
              close();
            }}
          />
        ) : (
          <input
            autoFocus
            type={
              f.type === "currency" || f.type === "number" ? "number" : "text"
            }
            defaultValue={value ?? ""}
            onBlur={(e) => {
              actions.updateTask(task.id, {
                customFields: {
                  ...task.customFields,
                  [fieldId]:
                    f.type === "currency" || f.type === "number"
                      ? +e.target.value
                      : e.target.value,
                },
              });
              close();
            }}
          />
        )
      }
    </Popover>
  );
}
function BoardCard({ task: t, onDrop }) {
  const { state } = useStore(),
    open = useTaskOpen();
  return (
    <article
      className="board-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e.dataTransfer.getData("task"));
      }}
    >
      <div className="board-card-meta">
        <span>{locationOf(state, t).list?.name}</span>
        <TaskMenu task={t} />
      </div>
      <button className="text-left" onClick={() => open(t.id)}>
        {t.name}
      </button>
      <div className="chips wrap">
        {arr(t.tags).map((n) => (
          <Tag key={n} name={n} />
        ))}
      </div>
      <div className="board-card-footer">
        <FieldPicker field="assigneeIds" task={t}>
          <AvatarStack ids={t.assigneeIds} />
        </FieldPicker>
        <FieldPicker field="dueDate" task={t}>
          <DateChip value={t.dueDate} task={t} />
        </FieldPicker>
        <FieldPicker field="priority" task={t}>
          <Priority value={t.priority} label={false} />
        </FieldPicker>
        {t.sprintPoints != null && (
          <FieldPicker field="sprintPoints" task={t}>
            ◆ {t.sprintPoints}
          </FieldPicker>
        )}
      </div>
    </article>
  );
}
function FilterControl({ settings, save }) {
  const { state } = useStore();
  const filters = arr(settings.filters),
    change = (id, p) =>
      save({ filters: filters.map((f) => (f.id === id ? { ...f, ...p } : f)) });
  return (
    <Popover
      label="Filters"
      trigger={
        <span>
          <Icon name="ListFilter" />
          Filter {filters.length || ""}
        </span>
      }
    >
      <div className="filter-builder">
        {filters.map((f) => {
          const values =
            f.field === "status"
              ? [
                  ...new Set(
                    state.spaces.flatMap((s) =>
                      arr(s.statuses).map((st) => st.name),
                    ),
                  ),
                ].map((x) => [x, x])
              : f.field === "assignee"
                ? state.users.map((u) => [u.id, u.name])
                : f.field === "priority"
                  ? ["urgent", "high", "normal", "low"].map((x) => [
                      x,
                      x[0].toUpperCase() + x.slice(1),
                    ])
                  : f.field === "tags"
                    ? state.tags.map((t) => [t.name, t.name])
                    : f.field === "dueDate"
                      ? ["overdue", "today", "this_week", "no_date"].map(
                          (x) => [
                            x,
                            x[0].toUpperCase() +
                              x.slice(1).replaceAll("_", " "),
                          ],
                        )
                      : f.field === "sprint"
                        ? state.sprints.map((s) => [s.id, s.name])
                        : [1, 2, 3, 5, 8, 13].map((n) => [n, n]);
          return (
            <div className="filter-row" key={f.id}>
              <span>Where</span>
              <select
                value={f.field}
                onChange={(e) =>
                  change(f.id, { field: e.target.value, value: "" })
                }
              >
                {[
                  "status",
                  "assignee",
                  "priority",
                  "tags",
                  "dueDate",
                  "sprintPoints",
                  "sprint",
                ].map((x) => (
                  <option key={x} value={x}>
                    {columnNames[x] || x}
                  </option>
                ))}
              </select>
              <select
                value={f.op}
                onChange={(e) => change(f.id, { op: e.target.value })}
              >
                {["is", "is_not", "is_set", "is_not_set"].map((x) => (
                  <option key={x} value={x}>
                    {x.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              {!["is_set", "is_not_set"].includes(f.op) && (
                <select
                  value={f.value}
                  onChange={(e) => change(f.id, { value: e.target.value })}
                >
                  <option value="">Select…</option>
                  {values.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              <button
                aria-label="Remove filter"
                onClick={() =>
                  save({ filters: filters.filter((x) => x.id !== f.id) })
                }
              >
                ×
              </button>
            </div>
          );
        })}
        <div className="form-actions">
          <Button
            onClick={() =>
              save({
                filters: [
                  ...filters,
                  { id: uid("filter"), field: "status", op: "is", value: "" },
                ],
              })
            }
          >
            + Add filter
          </Button>
          <Button onClick={() => save({ filters: [] })}>Clear all</Button>
        </div>
      </div>
    </Popover>
  );
}
function BulkBar({ ids, clear, tasks, sprint }) {
  const { state, actions } = useStore(),
    ui = useUI();
  const update = (patch) => {
      actions.act("BULK_TASK", { ids, patch });
      clear();
    },
    task = tasks.find((t) => t.id === ids[0]) || {};
  return (
    <div className="bulk-bar">
      <strong>
        {ids.length} {ids.length === 1 ? "Task" : "Tasks"} selected
      </strong>
      <button onClick={clear}>×</button>
      {[
        ["status", "Status"],
        ["assigneeIds", "Assignees"],
        ["dueDate", "Dates"],
        ["priority", "Priority"],
        ["tags", "Tags"],
        ...(sprint ? [["sprintId", "Sprint"]] : []),
      ].map(([field, label]) => (
        <FieldPicker
          key={field}
          label={label}
          field={field}
          task={task}
          onChange={(patch) => {
            if (field === "tags")
              ids.forEach((id) => {
                const t = state.tasks.find((t) => t.id === id);
                actions.updateTask(id, {
                  tags: [...new Set([...arr(t?.tags), ...arr(patch.tags)])],
                });
              });
            else if (field === "assigneeIds")
              ids.forEach((id) => {
                const t = state.tasks.find((t) => t.id === id);
                actions.updateTask(id, {
                  assigneeIds: [
                    ...new Set([
                      ...arr(t?.assigneeIds).filter(
                        (x) =>
                          !arr(task.assigneeIds)
                            .filter((a) => !arr(patch.assigneeIds).includes(a))
                            .includes(x),
                      ),
                      ...arr(patch.assigneeIds).filter(
                        (x) => !arr(task.assigneeIds).includes(x),
                      ),
                    ]),
                  ],
                });
              });
            else actions.act("BULK_TASK", { ids, patch });
            if (!["tags", "assigneeIds"].includes(field)) clear();
          }}
        >
          {label}
        </FieldPicker>
      ))}
      <Popover label="Move selected tasks" trigger="Move">
        {(close) => (
          <SearchPicker
            items={state.lists.map((l) => ({ value: l.id, label: l.name }))}
            onPick={(listId) => {
              update({ listId });
              close();
            }}
          />
        )}
      </Popover>
      <button
        onClick={() => {
          ids.forEach((id) => actions.act("DUPLICATE_TASK", { id }));
          clear();
        }}
      >
        Duplicate
      </button>
      <button onClick={() => update({ archived: true })}>Archive</button>
      <button
        onClick={() =>
          ui.confirm("Delete selected tasks?", () =>
            update({
              deleted: true,
              deletedAt: now(),
              deletedBy: state.currentUserId,
            }),
          )
        }
      >
        Delete
      </button>
    </div>
  );
}
function TaskCalendar({ tasks, context }) {
  const { actions } = useStore(),
    ui = useUI(),
    open = useTaskOpen(),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
  const start = plusDays(dateKey(month), -(month.getDay() + 6) % 7),
    days = Array.from({ length: 42 }, (_, i) => plusDays(start, i));
  return (
    <>
      <div className="calendar-toolbar">
        <Button
          onClick={() =>
            setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
        >
          ‹
        </Button>
        <Button
          onClick={() =>
            setMonth(
              new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            )
          }
        >
          Today
        </Button>
        <Button
          onClick={() =>
            setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
        >
          ›
        </Button>
        <strong>
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </strong>
      </div>
      <div className="calendar-layout">
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div className="calendar-dayname" key={day}>
              {day}
            </div>
          ))}
          {days.map((day) => {
            const items = tasks.filter((t) => t.dueDate === day);
            return (
              <div
                key={day}
                className={"calendar-day " + (day === dateKey() ? "today" : "")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("task");
                  if (id) actions.updateTask(id, { dueDate: day });
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget)
                    ui.open("taskCreate", { ...context, dueDate: day });
                }}
              >
                <button
                  className="day-number"
                  title="Create task on this date"
                  onClick={() =>
                    ui.open("taskCreate", { ...context, dueDate: day })
                  }
                >
                  {Number(day.slice(-2))}
                </button>
                {items.slice(0, 3).map((t) => (
                  <button
                    className="calendar-task"
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
                    onClick={() => open(t.id)}
                  >
                    <StatusIcon task={t} />
                    {t.name}
                  </button>
                ))}
                {items.length > 3 && (
                  <Popover trigger={"+" + (items.length - 3) + " more"}>
                    {items.map((t) => (
                      <button
                        className="menu-item"
                        key={t.id}
                        onClick={() => open(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </Popover>
                )}
              </div>
            );
          })}
        </div>
        <aside className="unscheduled">
          <h4>No due date</h4>
          {tasks
            .filter((t) => !t.dueDate)
            .map((t) => (
              <button
                key={t.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
                onClick={() => open(t.id)}
              >
                {t.name}
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}
function Gantt({ tasks }) {
  const { actions } = useStore(),
    open = useTaskOpen(),
    start = plusDays(dateKey(), -7),
    days = Array.from({ length: 28 }, (_, i) => plusDays(start, i));
  return (
    <div className="gantt">
      <div className="gantt-row">
        <strong>Task</strong>
        {days.map((d) => (
          <small key={d}>{Number(d.slice(-2))}</small>
        ))}
      </div>
      {tasks.map((t) => (
        <div key={t.id} className="gantt-row">
          <button onClick={() => open(t.id)}>{t.name}</button>
          {days.map((day) => (
            <div
              key={day}
              className="gantt-day"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("task"),
                  task = tasks.find((t) => t.id === id);
                if (!task) return;
                const length = Math.max(
                  0,
                  (+new Date(task.dueDate || day) -
                    +new Date(task.startDate || task.dueDate || day)) /
                    86400000,
                );
                actions.updateTask(id, {
                  startDate: day,
                  dueDate: plusDays(day, length),
                });
              }}
            >
              {t.dueDate &&
                day >= (t.startDate || t.dueDate) &&
                day <= t.dueDate && (
                  <span
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
                    className="gantt-bar"
                  />
                )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
