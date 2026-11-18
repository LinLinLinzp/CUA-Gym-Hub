import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink, withSid } from "../utils/nav.jsx";
import {
  arr,
  dateKey,
  plusDays,
  shortDate,
  stamp,
  formatDuration,
  sum,
  uid,
} from "../utils/format.js";
import {
  visibleTasks,
  isClosed,
  statusOf,
  locationText,
} from "../utils/tasks.js";
import {
  Icon,
  Button,
  Avatar,
  StatusIcon,
  Priority,
  DateChip,
  FieldPicker,
  Empty,
  Menu,
  Progress,
  Modal,
  useUI,
} from "../components/UI.jsx";
import { useTaskOpen } from "../components/TaskDetail.jsx";
import { SprintReport, Velocity } from "./Sprints.jsx";
export function Inbox() {
  const { state, actions } = useStore(),
    loc = useLocation(),
    nav = useNav(),
    openTask = useTaskOpen(),
    [tab, setTab] = useState("Primary");
  const assigned = loc.pathname.endsWith("assigned-comments"),
    replies = loc.pathname.endsWith("replies"),
    title = assigned ? "Assigned Comments" : replies ? "Replies" : "Inbox";
  const myComments = state.comments
      .filter((c) => c.authorId === state.currentUserId)
      .map((c) => c.id),
    comments = state.comments.filter((c) =>
      assigned
        ? c.assigneeId === state.currentUserId && !c.resolved
        : arr(c.mentions).includes(state.currentUserId) ||
          myComments.includes(c.replyToId),
    );
  const notifications = state.notifications
    .filter(
      (n) =>
        (!n.userId || n.userId === state.currentUserId) &&
        (tab === "Cleared"
          ? n.cleared
          : tab === "Later"
            ? n.savedForLater && !n.cleared
            : !n.cleared &&
              !n.savedForLater &&
              (tab === "Other"
                ? ["status_changed", "due_date"].includes(n.type)
                : !["status_changed", "due_date"].includes(n.type))),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const change = (id, patch) => actions.act("NOTIFICATION", { id, patch }),
    open = (n) => {
      change(n.id, { read: true });
      if (n.timesheetId) nav("/timesheets/approvals/" + n.timesheetId);
      else if (n.docId) nav("/d/" + n.docId);
      else if (n.taskId) openTask(n.taskId);
      else if (n.type === "sprint_started") nav("/sprint/spr_23");
    };
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>{title}</h2>
        <div className="grow" />
        {!assigned && !replies && (
          <>
            <Button
              icon="CheckCheck"
              onClick={() => change(null, { read: true })}
            >
              Mark all as read
            </Button>
            <Button
              icon="Check"
              onClick={() => change(null, { cleared: true })}
            >
              Clear all
            </Button>
          </>
        )}
      </div>
      {!assigned && !replies && (
        <div className="hub-tabs tabs">
          {["Primary", "Other", "Later", "Cleared"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="inbox-content">
        {assigned || replies ? (
          <>
            {comments.map((c) => (
              <div className="notification" key={c.id}>
                <Avatar id={c.authorId} size={32} />
                <div className="grow">
                  <button
                    className="text-left"
                    onClick={() =>
                      c.parentType === "doc"
                        ? nav("/d/" + c.parentId)
                        : openTask(c.parentId)
                    }
                  >
                    <strong>
                      {state.users.find((u) => u.id === c.authorId)?.name ||
                        "Teammate"}
                    </strong>
                    <p>{c.text}</p>
                    <small className="muted">
                      {c.parentType === "task"
                        ? state.tasks.find((t) => t.id === c.parentId)?.name
                        : state.docs.find((d) => d.id === c.parentId)?.title}
                    </small>
                  </button>
                </div>
                {assigned && (
                  <Button
                    onClick={() =>
                      actions.act("UPDATE_COMMENT", {
                        id: c.id,
                        patch: { resolved: true },
                      })
                    }
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}
            {!comments.length && <Empty title="You're all caught up" />}
          </>
        ) : (
          <>
            {["Today", "Yesterday", "Last 7 days"].map((group) => {
              const ns = notifications.filter((n) => {
                const day = dateKey(n.createdAt);
                return group === "Today"
                  ? day === dateKey()
                  : group === "Yesterday"
                    ? day === plusDays(dateKey(), -1)
                    : day < plusDays(dateKey(), -1);
              });
              return (
                ns.length > 0 && (
                  <section key={group}>
                    <div className="inbox-group">{group}</div>
                    {ns.map((n) => (
                      <div
                        className={"notification " + (!n.read ? "unread" : "")}
                        key={n.id}
                      >
                        <Avatar id={n.actorId} size={32} />
                        <button
                          className="notification-body"
                          onClick={() => open(n)}
                        >
                          <div>
                            <strong>
                              {state.users.find((u) => u.id === n.actorId)
                                ?.name || "Teammate"}
                            </strong>{" "}
                            {n.text}
                          </div>
                          <p>
                            {n.docId
                              ? state.docs.find((d) => d.id === n.docId)?.title
                              : n.timesheetId
                                ? "Timesheet approval"
                                : state.tasks.find((t) => t.id === n.taskId)
                                    ?.name || "Workspace update"}
                          </p>
                          <small>
                            {n.taskId
                              ? locationText(
                                  state,
                                  state.tasks.find((t) => t.id === n.taskId),
                                )
                              : ""}
                          </small>
                        </button>
                        <small className="muted">{stamp(n.createdAt)}</small>
                        <div className="notification-actions">
                          <button
                            className="icon-btn"
                            title={n.cleared ? "Restore" : "Clear"}
                            onClick={() =>
                              change(n.id, { cleared: !n.cleared })
                            }
                          >
                            <Icon name="Check" />
                          </button>
                          <button
                            className="icon-btn"
                            title="Save for later"
                            onClick={() =>
                              change(n.id, { savedForLater: !n.savedForLater })
                            }
                          >
                            <Icon name="Clock" />
                          </button>
                          <button
                            className="icon-btn"
                            title={n.read ? "Mark unread" : "Mark read"}
                            onClick={() => change(n.id, { read: !n.read })}
                          >
                            <Icon name={n.read ? "Mail" : "MailOpen"} />
                          </button>
                        </div>
                        {!n.read && <span className="unread-dot" />}
                      </div>
                    ))}
                  </section>
                )
              );
            })}
            {!notifications.length && (
              <Empty
                title="You're all caught up"
                text="New updates will appear here."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
export function MyTasks() {
  const { state } = useStore(),
    open = useTaskOpen(),
    [collapsed, setCollapsed] = useState({ Done: true }),
    tasks = visibleTasks(state).filter((t) =>
      arr(t.assigneeIds).includes(state.currentUserId),
    ),
    today = dateKey(),
    buckets = {
      "Today & Overdue": tasks.filter(
        (t) => !isClosed(state, t) && t.dueDate && t.dueDate <= today,
      ),
      Next: tasks.filter(
        (t) =>
          !isClosed(state, t) &&
          t.dueDate > today &&
          t.dueDate <= plusDays(today, 7),
      ),
      Later: tasks.filter(
        (t) => !isClosed(state, t) && t.dueDate > plusDays(today, 7),
      ),
      Unscheduled: tasks.filter((t) => !isClosed(state, t) && !t.dueDate),
      Done: tasks.filter(
        (t) =>
          isClosed(state, t) && dateKey(t.dateClosed) >= plusDays(today, -7),
      ),
    };
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>My Tasks</h2>
        <div className="grow" />
        <SLink to="/inbox/assigned-comments" className="chip">
          Assigned comments ·{" "}
          {
            state.comments.filter(
              (c) => c.assigneeId === state.currentUserId && !c.resolved,
            ).length
          }
        </SLink>
        <SLink to="/inbox">Inbox →</SLink>
      </div>
      <div className="hub-content">
        {Object.entries(buckets).map(([name, items]) => (
          <section className="my-task-group" key={name}>
            <button
              className="group-heading"
              onClick={() =>
                setCollapsed((xs) => ({ ...xs, [name]: !xs[name] }))
              }
            >
              <Icon
                name={collapsed[name] ? "ChevronRight" : "ChevronDown"}
                size={14}
              />
              <strong>{name}</strong>
              <span className="muted">{items.length}</span>
            </button>
            {!collapsed[name] &&
              items.map((t) => (
                <div className="my-task-row" key={t.id}>
                  <FieldPicker field="status" task={t}>
                    <StatusIcon task={t} />
                  </FieldPicker>
                  <button className="grow text-left" onClick={() => open(t.id)}>
                    {t.name}
                    <small className="muted">{locationText(state, t)}</small>
                  </button>
                  <FieldPicker field="dueDate" task={t}>
                    <DateChip value={t.dueDate} task={t} />
                  </FieldPicker>
                  <FieldPicker field="priority" task={t}>
                    <Priority value={t.priority} />
                  </FieldPicker>
                </div>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}
export function Trash() {
  const { state, actions } = useStore(),
    ui = useUI(),
    items = [
      ...state.tasks
        .filter((t) => t.deleted)
        .map((t) => ({ ...t, collection: "tasks" })),
      ...state.docs
        .filter((d) => d.deleted)
        .map((d) => ({ ...d, collection: "docs" })),
    ];
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>Trash</h2>
      </div>
      <div className="hub-content">
        {items.map((x) => (
          <div className="trash-row" key={x.id}>
            <Icon name={x.collection === "docs" ? "FileText" : "CircleCheck"} />
            <strong className="grow">{x.name || x.title || "Untitled"}</strong>
            <span className="muted">
              {shortDate(x.deletedAt)} ·{" "}
              {state.users.find((u) => u.id === x.deletedBy)?.name || "You"}
            </span>
            <Button
              onClick={() =>
                x.collection === "tasks"
                  ? actions.updateTask(x.id, {
                      deleted: false,
                      deletedAt: null,
                      deletedBy: null,
                    })
                  : actions.act("UPDATE_DOC", {
                      id: x.id,
                      patch: { deleted: false, deletedAt: null },
                    })
              }
            >
              Restore
            </Button>
            <Button
              variant="danger-text"
              onClick={() =>
                ui.confirm(
                  "Delete forever?",
                  () =>
                    actions.act("PERMANENT_DELETE", {
                      id: x.id,
                      collection: x.collection,
                    }),
                  "This permanently deletes this item and its children and comments.",
                )
              }
            >
              Delete forever
            </Button>
          </div>
        ))}
        {!items.length && <Empty title="Trash is empty" />}
      </div>
    </div>
  );
}
export function Settings() {
  const { state, actions } = useStore();
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>Settings</h2>
      </div>
      <div className="settings-content">
        <h3>Preferences</h3>
        <label>
          Theme
          <select
            value={state.preferences.theme || "light"}
            onChange={(e) =>
              actions.act("PREFERENCES", { theme: e.target.value })
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Start of week
          <select
            value={state.preferences.startOfWeek || "monday"}
            onChange={(e) =>
              actions.act("PREFERENCES", { startOfWeek: e.target.value })
            }
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </label>
        <label>
          Time format
          <select
            value={state.preferences.timeFormat || "12h"}
            onChange={(e) =>
              actions.act("PREFERENCES", { timeFormat: e.target.value })
            }
          >
            <option value="12h">12 hour</option>
            <option value="24h">24 hour</option>
          </select>
        </label>
        <h3>ClickApps</h3>
        {[
          ["sprintPoints", "Sprint Points"],
          ["timeEstimates", "Time Estimates"],
          ["timeTracking", "Time Tracking"],
          ["billableDefault", "Billable by default"],
        ].map(([key, label]) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              aria-label={label}
              checked={!!state.workspace.clickApps?.[key]}
              onChange={(e) =>
                actions.act("CLICKAPPS", { [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
export function Dashboards() {
  const { state, actions } = useStore(),
    [adding, setAdding] = useState(false),
    [widget, setWidget] = useState("time_by_user"),
    dash = state.dashboards[0],
    sp =
      state.sprints.find((s) => s.status === "in_progress") || state.sprints[0];
  if (!dash) return <Empty title="No dashboards" />;
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>{dash.name}</h2>
        <div className="grow" />
        <Button variant="primary" icon="Plus" onClick={() => setAdding(true)}>
          Add Widget
        </Button>
      </div>
      <div className="hub-content card-grid">
        {arr(dash.widgets).map((w, i) => (
          <div className="dashboard-widget chart-card" key={w + i}>
            <h3>
              {w.replaceAll("_", " ").replace(/\b\w/g, (s) => s.toUpperCase())}
            </h3>
            {w === "sprint_burndown" ? (
              sp ? (
                <SprintReport sprint={sp} />
              ) : (
                <Empty title="No sprints" />
              )
            ) : w === "velocity" ? (
              <Velocity sprints={state.sprints} />
            ) : w === "time_by_user" ? (
              state.users.map((u) => (
                <div key={u.id} className="widget-row">
                  <Avatar user={u} />
                  <span>{u.name}</span>
                  <Progress
                    value={sum(
                      state.timeEntries.filter(
                        (e) =>
                          e.userId === u.id &&
                          dateKey(e.start) >= plusDays(dateKey(), -7),
                      ),
                    )}
                    total={40 * 3600}
                  />
                  <strong>
                    {formatDuration(
                      sum(
                        state.timeEntries.filter(
                          (e) =>
                            e.userId === u.id &&
                            dateKey(e.start) >= plusDays(dateKey(), -7),
                        ),
                      ),
                    )}
                  </strong>
                </div>
              ))
            ) : w === "tasks_by_status" ? (
              <StatusSummary />
            ) : (
              visibleTasks(state)
                .filter(
                  (t) =>
                    t.dueDate && t.dueDate < dateKey() && !isClosed(state, t),
                )
                .map((t) => (
                  <SLink className="menu-item" key={t.id} to={"/t/" + t.id}>
                    <StatusIcon task={t} />
                    {t.name}
                    <span className="overdue">{shortDate(t.dueDate)}</span>
                  </SLink>
                ))
            )}
          </div>
        ))}
      </div>
      {adding && (
        <Modal title="Add Widget" onClose={() => setAdding(false)}>
          <div className="modal-body">
            <select value={widget} onChange={(e) => setWidget(e.target.value)}>
              {[
                "sprint_burndown",
                "velocity",
                "time_by_user",
                "tasks_by_status",
                "overdue",
              ].map((w) => (
                <option key={w} value={w}>
                  {w
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (s) => s.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <footer>
            <Button
              variant="primary"
              onClick={() => {
                actions.act("ADD_WIDGET", { id: dash.id, widget });
                setAdding(false);
              }}
            >
              Add Widget
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
function StatusSummary() {
  const { state } = useStore(),
    tasks = visibleTasks(state),
    groups = [...new Set(tasks.map((t) => t.status))];
  let cursor = 0;
  const segments = groups.map((st) => {
    const count = tasks.filter((t) => t.status === st).length,
      start = cursor;
    cursor += (count / Math.max(1, tasks.length)) * 100;
    return `${
      statusOf(
        state,
        tasks.find((t) => t.status === st),
      ).color
    } ${start}% ${cursor}%`;
  });
  return (
    <div className="status-summary">
      <div
        className="donut"
        style={{
          background: `conic-gradient(${segments.join(",") || "#eee 0% 100%"})`,
        }}
      />
      <div>
        {groups.map((st) => (
          <div className="shortcut" key={st}>
            <span>{st}</span>
            <strong>{tasks.filter((t) => t.status === st).length}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
