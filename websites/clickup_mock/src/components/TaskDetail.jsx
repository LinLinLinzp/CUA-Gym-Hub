import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink, withSid } from "../utils/nav.jsx";
import {
  arr,
  uid,
  now,
  stamp,
  formatDuration,
  parseDuration,
} from "../utils/format.js";
import {
  locationOf,
  locationText,
  statusOf,
  subtasksOf,
  trackedSeconds,
  fieldsFor,
} from "../utils/tasks.js";
import {
  Icon,
  Button,
  Modal,
  Menu,
  Popover,
  SearchPicker,
  Avatar,
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
  Progress,
  useUI,
} from "./UI.jsx";
export function useTaskOpen() {
  const nav = useNav(),
    loc = useLocation(),
    ui = useUI();
  return (id) => {
    const p = new URLSearchParams(loc.search);
    p.set("task", id);
    nav(loc.pathname + "?" + p);
    ui.remember("task", id);
  };
}
export function TaskMenu({ task, trigger }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    nav = useNav();
  return (
    <Menu
      trigger={trigger}
      label={"Actions for " + task.name}
      items={[
        {
          label: "Copy link",
          icon: "Link",
          onClick: () => {
            ui.copyText(
              window.location.origin + withSid("/t/" + task.id),
              "Link copied",
            );
          },
        },
        {
          label: "Copy ID",
          icon: "Copy",
          onClick: () => {
            ui.copyText(task.id);
          },
        },
        {
          label: "Open in new tab",
          icon: "ExternalLink",
          onClick: () => window.open(withSid("/t/" + task.id), "_blank"),
        },
        {
          label: "Rename",
          icon: "Pencil",
          onClick: () =>
            ui.prompt("Rename task", task.name, (name) =>
              actions.updateTask(task.id, { name }),
            ),
        },
        {
          label: "Duplicate",
          icon: "CopyPlus",
          onClick: () => {
            actions.act("DUPLICATE_TASK", { id: task.id });
            ui.notify("Task duplicated");
          },
        },
        {
          label: "Move to…",
          icon: "FolderInput",
          onClick: () => ui.open("pickTaskLocation", { taskId: task.id }),
        },
        {
          label: "Add to Sprint",
          icon: "Zap",
          onClick: () => ui.open("pickTaskSprint", { taskId: task.id }),
        },
        {
          label: "Start timer",
          icon: "Play",
          onClick: () => {
            if (state.timer)
              ui.notify(
                "Timer stopped on " +
                  (state.tasks.find((t) => t.id === state.timer.taskId)?.name ||
                    "No task"),
              );
            actions.act("TIMER_START", { taskId: task.id });
          },
        },
        {
          label: task.archived ? "Unarchive" : "Archive",
          icon: "Archive",
          onClick: () => {
            actions.updateTask(task.id, { archived: !task.archived });
            ui.notify(task.archived ? "Task unarchived" : "Task archived", {
              label: "Undo",
              run: () =>
                actions.updateTask(task.id, {
                  archived: task.archived || false,
                }),
            });
          },
        },
        {
          label: "Delete",
          icon: "Trash2",
          danger: true,
          onClick: () =>
            ui.confirm(
              "Delete task?",
              () => {
                actions.updateTask(task.id, {
                  deleted: true,
                  deletedAt: now(),
                  deletedBy: state.currentUserId,
                });
                if (window.location.pathname === "/t/" + task.id) nav("/inbox");
              },
              "It will be moved to Trash.",
            ),
        },
      ]}
    />
  );
}
export function PickerDialogs() {
  const { state, actions } = useStore(),
    ui = useUI(),
    d = ui.dialog;
  if (
    ![
      "pickTaskLocation",
      "pickTaskSprint",
      "linkDoc",
      "linkTask",
      "dependency",
    ].includes(d?.type)
  )
    return null;
  const task = state.tasks.find((t) => t.id === d.taskId);
  let items = [],
    onPick;
  if (d.type === "pickTaskLocation") {
    items = state.lists
      .filter((l) => !l.archived)
      .map((l) => ({
        value: l.id,
        label:
          state.spaces.find((s) => s.id === l.spaceId)?.name + " / " + l.name,
      }));
    onPick = (id) => actions.updateTask(d.taskId, { listId: id });
  }
  if (d.type === "pickTaskSprint") {
    items = state.sprints
      .filter((s) => s.status !== "done")
      .map((s) => ({ value: s.id, label: s.name }));
    items.push({ value: null, label: "Remove from sprint" });
    onPick = (id) => actions.updateTask(d.taskId, { sprintId: id });
  }
  if (d.type === "linkDoc") {
    items = state.docs
      .filter((d) => !d.deleted)
      .map((d) => ({ value: d.id, label: d.title || "Untitled" }));
    onPick = (id) => actions.act("LINK_DOC", { taskId: d.taskId, docId: id });
  }
  if (d.type === "linkTask") {
    items = state.tasks
      .filter((t) => !t.deleted)
      .map((t) => ({ value: t.id, label: t.name }));
    onPick = (id) => actions.act("LINK_DOC", { taskId: id, docId: d.docId });
  }
  if (d.type === "dependency") {
    items = state.tasks
      .filter((t) => t.id !== d.taskId && !t.deleted)
      .map((t) => ({ value: t.id, label: t.name }));
    onPick = (id) => {
      const dep = { waitingOn: [], blocking: [], ...task.dependencies };
      dep[d.field] = [...new Set([...arr(dep[d.field]), id])];
      actions.updateTask(task.id, { dependencies: dep });
    };
  }
  return (
    <Modal
      title={
        d.type === "pickTaskLocation"
          ? "Move to…"
          : d.type === "pickTaskSprint"
            ? "Add to Sprint"
            : "Link existing item"
      }
      onClose={ui.close}
    >
      <div className="modal-body">
        <SearchPicker
          items={items}
          onPick={(v) => {
            onPick(v);
            ui.close();
          }}
        />
      </div>
    </Modal>
  );
}
export function Comments({
  parentType,
  parentId,
  pageId,
  blockId,
  quote,
  history = [],
}) {
  const { state, actions } = useStore(),
    ui = useUI(),
    [text, setText] = useState(""),
    [assignee, setAssignee] = useState(""),
    [reply, setReply] = useState(null),
    [editing, setEditing] = useState(null),
    [resolved, setResolved] = useState(false),
    [mention, setMention] = useState(null),
    composerRef = useRef(null);
  const updateMention = (value, caret) => {
    const match = value.slice(0, caret).match(/(?:^|\s)@([\w]*)$/);
    setMention(
      match
        ? { query: match[1], start: caret - match[1].length - 1, end: caret }
        : null,
    );
  };
  const comments = state.comments
    .filter(
      (c) =>
        c.parentType === parentType &&
        c.parentId === parentId &&
        (!pageId || c.pageId === pageId) &&
        (!resolved ? !c.resolved : true),
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const feed = [
    ...comments.map((c) => ({ ...c, kind: "comment" })),
    ...history.map((c) => ({ ...c, kind: "history" })),
  ].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const send = () => {
    if (!text.trim()) return;
    if (editing)
      actions.act("UPDATE_COMMENT", {
        id: editing,
        patch: { text: text.trim() },
      });
    else
      actions.act("CREATE_COMMENT", {
        parentType,
        parentId,
        pageId: pageId || null,
        blockId: blockId || null,
        quote: quote || null,
        text,
        assigneeId: assignee || null,
        replyToId: reply,
      });
    setText("");
    setMention(null);
    setEditing(null);
    setReply(null);
    setAssignee("");
  };
  return (
    <div className="comments">
      <label className="check muted">
        <input
          type="checkbox"
          checked={resolved}
          onChange={(e) => setResolved(e.target.checked)}
        />
        Include resolved
      </label>
      <div className="comment-feed">
        {feed.map((c) =>
          c.kind === "history" ? (
            <HistoryLine key={c.id} activity={c} />
          ) : (
            <article
              className={"comment " + (c.replyToId ? "reply" : "")}
              key={c.id}
            >
              <div className="comment-header">
                <Avatar id={c.authorId} size={28} />
                <strong>
                  {state.users.find((u) => u.id === c.authorId)?.name ||
                    "Teammate"}
                </strong>
                <small>{stamp(c.createdAt)}</small>
                <Menu
                  items={[
                    c.authorId === state.currentUserId && {
                      label: "Edit",
                      icon: "Pencil",
                      onClick: () => {
                        setText(c.text);
                        setEditing(c.id);
                      },
                    },
                    {
                      label: "Resolve",
                      icon: "Check",
                      onClick: () =>
                        actions.act("UPDATE_COMMENT", {
                          id: c.id,
                          patch: { resolved: !c.resolved },
                        }),
                    },
                    {
                      label: "Delete",
                      icon: "Trash2",
                      danger: true,
                      onClick: () =>
                        ui.confirm("Delete comment?", () =>
                          actions.act("DELETE_COMMENT", { id: c.id }),
                        ),
                    },
                  ]}
                />
              </div>
              {c.quote && <blockquote>{c.quote}</blockquote>}
              <p>
                {String(c.text || "")
                  .split(/(@[A-Z][a-z]+ [A-Z][a-z]+)/g)
                  .map((s, i) =>
                    s.startsWith("@") ? <mark key={i}>{s}</mark> : s,
                  )}
              </p>
              {c.assigneeId && (
                <div className="assigned-comment">
                  <Avatar id={c.assigneeId} size={18} />
                  {c.resolved ? "Resolved" : "Assigned comment"}
                  <button
                    onClick={() =>
                      actions.act("UPDATE_COMMENT", {
                        id: c.id,
                        patch: { resolved: !c.resolved },
                      })
                    }
                  >
                    {c.resolved ? "Reopen" : "Resolve"}
                  </button>
                </div>
              )}
              <div className="comment-reactions">
                {["👍", "🎉", "❤️", "👀"].map((emoji) => (
                  <button
                    key={emoji}
                    className={
                      arr(c.reactions)
                        .find((r) => r.emoji === emoji)
                        ?.userIds?.includes(state.currentUserId)
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      actions.act("REACT_COMMENT", { id: c.id, emoji })
                    }
                  >
                    {emoji}{" "}
                    {arr(c.reactions).find((r) => r.emoji === emoji)?.userIds
                      ?.length || ""}
                  </button>
                ))}
                <Popover trigger="+" label="Add reaction">
                  {["😀", "🚀", "✅", "🙏", "💡", "🔥", "💯", "👏"].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          actions.act("REACT_COMMENT", { id: c.id, emoji })
                        }
                      >
                        {emoji}
                      </button>
                    ),
                  )}
                </Popover>
                <button
                  onClick={() => {
                    setReply(c.id);
                    setEditing(null);
                  }}
                >
                  Reply
                </button>
              </div>
            </article>
          ),
        )}
      </div>
      <div className="composer">
        {(reply || editing) && (
          <div className="muted">
            {editing ? "Editing comment" : "Replying to comment"}{" "}
            <button
              onClick={() => {
                setReply(null);
                setEditing(null);
              }}
            >
              ×
            </button>
          </div>
        )}
        <textarea
          ref={composerRef}
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateMention(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {mention && (
          <div className="mention-list">
            {state.users
              .filter((u) =>
                u.name?.toLowerCase().includes(mention.query.toLowerCase()),
              )
              .map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const insertion = "@" + u.name + " ",
                      caret = mention.start + insertion.length;
                    setText(
                      (v) =>
                        v.slice(0, mention.start) +
                        insertion +
                        v.slice(mention.end),
                    );
                    setMention(null);
                    requestAnimationFrame(() => {
                      composerRef.current?.focus();
                      composerRef.current?.setSelectionRange(caret, caret);
                    });
                  }}
                >
                  {u.name}
                </button>
              ))}
          </div>
        )}
        <div className="composer-footer">
          <Button
            onClick={() => {
              const el = composerRef.current,
                caret = el?.selectionStart ?? text.length,
                prefix =
                  caret && !/\s$/.test(text.slice(0, caret)) ? " @" : "@",
                next = text.slice(0, caret) + prefix + text.slice(caret),
                end = caret + prefix.length;
              setText(next);
              updateMention(next, end);
              requestAnimationFrame(() => {
                el?.focus();
                el?.setSelectionRange(end, end);
              });
            }}
          >
            @
          </Button>
          <select
            aria-label="Assign comment"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Assign comment</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button variant="primary" disabled={!text.trim()} onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
export function TimeEntries({
  taskId,
  entries: provided,
  readOnly = false,
  onOpenDialog,
}) {
  const { state, actions } = useStore(),
    ui = useUI(),
    entries = provided || state.timeEntries.filter((e) => e.taskId === taskId);
  return (
    <div className="time-entries-list">
      {!entries.length && <p className="muted">No time tracked yet</p>}
      {[...new Set(entries.map((e) => e.userId))].map((userId) => (
        <div key={userId}>
          <div className="comment-header">
            <Avatar id={userId} />
            <strong>
              {state.users.find((u) => u.id === userId)?.name || "You"}
            </strong>
          </div>
          {entries
            .filter((e) => e.userId === userId)
            .sort((a, b) => b.start.localeCompare(a.start))
            .map((e) => (
              <div className="time-entry" key={e.id}>
                <div>
                  <small>
                    {stamp(e.start)} –{" "}
                    {new Date(e.end).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: state.preferences.timeFormat !== "24h",
                    })}
                  </small>
                  <div>
                    {state.tasks.find((t) => t.id === e.taskId)?.name ||
                      "No task"}
                  </div>
                  <span className="muted">{e.description}</span>
                  <div className="chips">
                    {arr(e.tagIds).map((id) => (
                      <span className="tag" key={id}>
                        {state.timeTags.find((t) => t.id === id)?.name || id}
                      </span>
                    ))}
                  </div>
                </div>
                <strong>{formatDuration(e.duration)}</strong>
                {e.locked ? (
                  <span title="This time entry is part of a submitted timesheet">
                    <Icon name="Lock" size={14} />
                  </span>
                ) : readOnly ? null : (
                  <>
                    <button
                      title="Toggle billable"
                      className={e.billable ? "billable" : ""}
                      onClick={() =>
                        actions.act("EDIT_TIME", {
                          id: e.id,
                          patch: { billable: !e.billable },
                        })
                      }
                    >
                      $
                    </button>
                    <Menu
                      items={[
                        {
                          label: "Edit",
                          onClick: () => {
                            onOpenDialog?.();
                            ui.open("time", { entryId: e.id });
                          },
                        },
                        {
                          label: "Delete",
                          danger: true,
                          onClick: () => {
                            onOpenDialog?.();
                            ui.confirm("Delete time entry?", () =>
                              actions.act("DELETE_TIME", { id: e.id }),
                            );
                          },
                        },
                      ]}
                    />
                  </>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
export function TaskDetail({ taskId, modal = false }) {
  const params = useParams(),
    id = taskId || params.taskId,
    { state, actions } = useStore(),
    ui = useUI(),
    nav = useNav(),
    loc = useLocation(),
    task = state.tasks.find((t) => t.id === id && !t.deleted),
    [tab, setTab] = useState("Subtasks"),
    [filter, setFilter] = useState("All"),
    [sub, setSub] = useState(""),
    openTask = useTaskOpen();
  const close = () => {
    const p = new URLSearchParams(loc.search);
    p.delete("task");
    nav(loc.pathname + "?" + p);
  };
  useEffect(() => {
    const h = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      if (e.key.toLowerCase() === "m" && task)
        actions.updateTask(id, {
          assigneeIds: [
            ...new Set([...arr(task.assigneeIds), state.currentUserId]),
          ],
        });
      if (e.key.toLowerCase() === "s")
        document.querySelector('[aria-label="Edit status"]')?.click();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [id, task]);
  if (!task) {
    const content = <Empty title="This item doesn't exist or was deleted" />;
    return modal ? (
      <Modal title="Task" width="min(1200px,92vw)" onClose={close}>
        {content}
      </Modal>
    ) : (
      content
    );
  }
  const { space, folder, list } = locationOf(state, task),
    children = subtasksOf(state, id),
    st = statusOf(state, task),
    statuses = arr(space?.statuses),
    tracked = trackedSeconds(state, id),
    running = state.timer?.taskId === id,
    checklists = arr(task.checklists),
    updateChecklists = (value, resolved) =>
      actions.act("CHECKLIST", { taskId: id, checklists: value, resolved }),
    history = state.activity
      .filter((a) => a.taskId === id)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const body = (
    <div className="task-detail">
      <div className="task-top">
        <div className="breadcrumb">
          {space && <SLink to={"/s/" + space.id}>{space.name}</SLink>}
          {folder && (
            <>
              {" "}
              / <SLink to={"/f/" + folder.id}>{folder.name}</SLink>
            </>
          )}
          {list && (
            <>
              {" "}
              / <SLink to={"/l/" + list.id}>{list.name}</SLink>
            </>
          )}
        </div>
        <div className="chips">
          <button
            className="id-chip"
            onClick={() => {
              ui.copyText(id);
            }}
          >
            #{id}
          </button>
          <Favorite type="task" id={id} />
          <button
            aria-label={
              arr(task.watcherIds).includes(state.currentUserId)
                ? "Unwatch task"
                : "Watch task"
            }
            title={
              arr(task.watcherIds).includes(state.currentUserId)
                ? "Unwatch task"
                : "Watch task"
            }
            aria-pressed={arr(task.watcherIds).includes(state.currentUserId)}
            className="icon-btn"
            onClick={() =>
              actions.updateTask(id, {
                watcherIds: arr(task.watcherIds).includes(state.currentUserId)
                  ? task.watcherIds.filter((x) => x !== state.currentUserId)
                  : [...arr(task.watcherIds), state.currentUserId],
              })
            }
          >
            <Icon
              name="Eye"
              color={
                arr(task.watcherIds).includes(state.currentUserId)
                  ? "#7B68EE"
                  : undefined
              }
            />
          </button>
          <TaskMenu task={task} />
          {modal && (
            <>
              <button
                className="icon-btn"
                aria-label="Expand task"
                onClick={() => nav("/t/" + id)}
              >
                <Icon name="Maximize2" />
              </button>
              <button
                className="icon-btn"
                aria-label="Close task"
                onClick={close}
              >
                <Icon name="X" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="task-body">
        <section className="task-main">
          {task.parentId && (
            <button className="muted" onClick={() => openTask(task.parentId)}>
              ⤴{" "}
              {state.tasks.find((t) => t.id === task.parentId)?.name ||
                "Parent task"}
            </button>
          )}
          <input
            className="task-title"
            key={id}
            defaultValue={task.name}
            aria-label="Task title"
            onBlur={(e) => {
              if (e.target.value.trim())
                actions.updateTask(id, { name: e.target.value.trim() });
              else e.target.value = task.name;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
            }}
          />
          <div className="task-field-grid">
            <div className="field-row">
              <span>
                <Icon name="CircleDot" />
                Status
              </span>
              <div
                className="status-split"
                style={{
                  "--status-bg":
                    statusOf(state, task).type === "open"
                      ? "#F0F0F0"
                      : statusOf(state, task).color,
                  "--status-text":
                    statusOf(state, task).type === "open" ? "#646464" : "white",
                }}
              >
                <FieldPicker field="status" task={task}>
                  <StatusPill task={task} />
                </FieldPicker>
                <button
                  className="icon-btn"
                  title="Next status"
                  onClick={() =>
                    actions.updateTask(id, {
                      status:
                        statuses[
                          (statuses.findIndex((s) => s.name === task.status) +
                            1) %
                            Math.max(1, statuses.length)
                        ]?.name || "to do",
                    })
                  }
                >
                  <Icon name="ChevronRight" size={13} />
                </button>
              </div>
            </div>
            <div className="field-row">
              <span>
                <Icon name="UsersRound" />
                Assignees
              </span>
              <FieldPicker field="assigneeIds" task={task}>
                <AvatarStack ids={task.assigneeIds} />
                <Icon name="Plus" size={14} />
              </FieldPicker>
            </div>
            <div className="field-row">
              <span>
                <Icon name="Calendar" />
                Dates
              </span>
              <FieldPicker field="dueDate" task={task}>
                <DateChip value={task.startDate} task={task} /> →{" "}
                <DateChip value={task.dueDate} task={task} />
              </FieldPicker>
            </div>
            <div className="field-row">
              <span>
                <Icon name="Flag" />
                Priority
              </span>
              <FieldPicker field="priority" task={task}>
                <Priority value={task.priority} />
              </FieldPicker>
            </div>
            {state.workspace.clickApps?.timeEstimates !== false && (
              <div className="field-row">
                <span>
                  <Icon name="Hourglass" />
                  Time Estimate
                </span>
                <EstimatePicker task={task} />
              </div>
            )}
            {state.workspace.clickApps?.timeTracking !== false && (
              <div className="field-row">
                <span>
                  <Icon name="Clock" />
                  Track Time
                </span>
                <div className="chips">
                  <button
                    className="icon-btn"
                    title={running ? "Stop timer" : "Start timer"}
                    aria-label={running ? "Stop timer" : "Start timer"}
                    style={running ? { color: "#E5484D" } : undefined}
                    onClick={() => {
                      actions.act(running ? "TIMER_STOP" : "TIMER_START", {
                        taskId: id,
                      });
                      ui.notify(running ? "Time tracked" : "Timer started");
                    }}
                  >
                    <Icon name={running ? "Square" : "Play"} size={14} />
                  </button>
                  <Popover
                    label="Time tracked"
                    trigger={formatDuration(tracked)}
                  >
                    {(closePopover) => (
                      <>
                        <h3>Time tracked {formatDuration(tracked)}</h3>
                        <Progress
                          value={tracked}
                          total={(task.timeEstimate || 0) * 60}
                          color={
                            tracked > task.timeEstimate * 60
                              ? "#E5484D"
                              : undefined
                          }
                        />
                        <TimeEntries taskId={id} onOpenDialog={closePopover} />
                        <Button
                          onClick={() => {
                            closePopover();
                            ui.open("time", { taskId: id, tab: "Manual" });
                          }}
                        >
                          + Add time
                        </Button>
                      </>
                    )}
                  </Popover>
                  <button
                    className="icon-btn"
                    aria-label="Add time"
                    onClick={() =>
                      ui.open("time", { taskId: id, tab: "Manual" })
                    }
                  >
                    <Icon name="Plus" size={14} />
                  </button>
                </div>
              </div>
            )}
            {state.workspace.clickApps?.sprintPoints !== false && (
              <div className="field-row">
                <span>
                  <Icon name="Diamond" />
                  Sprint Points
                </span>
                <FieldPicker field="sprintPoints" task={task}>
                  ◆ {task.sprintPoints ?? "Empty"}
                </FieldPicker>
              </div>
            )}
            <div className="field-row">
              <span>
                <Icon name="Tags" />
                Tags
              </span>
              <FieldPicker field="tags" task={task}>
                {arr(task.tags).length
                  ? task.tags.map((t) => <Tag key={t} name={t} />)
                  : "Empty"}
              </FieldPicker>
            </div>
            {folder?.isSprintFolder && (
              <div className="field-row">
                <span>
                  <Icon name="Zap" />
                  Sprints
                </span>
                <FieldPicker field="sprintId" task={task}>
                  {state.sprints.find((s) => s.id === task.sprintId)?.name ||
                    "Add to sprint"}
                </FieldPicker>
              </div>
            )}
          </div>
          {children.some((t) => t.sprintPoints) && (
            <p className="muted">
              TOTAL WITH SUBTASKS{" "}
              {children.reduce(
                (a, t) => a + (t.sprintPoints || 0),
                task.sprintPoints || 0,
              )}{" "}
              points
            </p>
          )}
          <details className="fields-section" open>
            <summary>Fields</summary>
            {fieldsFor(state, task).map((f) => (
              <div className="field-row" key={f.id}>
                <span>{f.name}</span>
                {["dropdown", "labels"].includes(f.type) ? (
                  <CustomFieldPicker
                    field={f}
                    value={task.customFields?.[f.id]}
                    onChange={(value) =>
                      actions.updateTask(id, {
                        customFields: { ...task.customFields, [f.id]: value },
                      })
                    }
                  />
                ) : (
                  <input
                    aria-label={f.name}
                    type={
                      ["currency", "number"].includes(f.type)
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : "text"
                    }
                    step={f.type === "currency" ? ".01" : undefined}
                    placeholder={f.type === "currency" ? "$ Empty" : "Empty"}
                    value={task.customFields?.[f.id] ?? ""}
                    onChange={(e) =>
                      actions.updateTask(id, {
                        customFields: {
                          ...task.customFields,
                          [f.id]: ["currency", "number"].includes(f.type)
                            ? +e.target.value
                            : e.target.value,
                        },
                      })
                    }
                  />
                )}
              </div>
            ))}
          </details>
          <h4>Description</h4>
          <textarea
            className="description"
            key={id + "desc"}
            defaultValue={task.description || ""}
            placeholder="Add a description…"
            onBlur={(e) => {
              if (e.target.value !== task.description)
                actions.updateTask(id, { description: e.target.value });
            }}
          />
          <details className="relationships">
            <summary>
              Relationships ·{" "}
              {arr(task.linkedDocIds).length +
                arr(task.dependencies?.waitingOn).length +
                arr(task.dependencies?.blocking).length}
            </summary>
            <div className="chips wrap">
              {arr(task.linkedDocIds).map((docId) => (
                <span key={docId} className="tag">
                  <SLink to={"/d/" + docId}>
                    {state.docs.find((d) => d.id === docId)?.title || "Doc"}
                  </SLink>
                  <button
                    aria-label="Unlink Doc"
                    onClick={() =>
                      actions.act("LINK_DOC", {
                        taskId: id,
                        docId,
                        remove: true,
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
              <Button
                icon="FilePlus"
                onClick={() => ui.open("linkDoc", { taskId: id })}
              >
                Link Doc
              </Button>
            </div>
            {["waitingOn", "blocking"].map((field) => (
              <div key={field}>
                <span className="muted">
                  {field === "waitingOn" ? "Waiting on" : "Blocking"}{" "}
                </span>
                {arr(task.dependencies?.[field]).map((dep) => (
                  <span className="tag" key={dep}>
                    <button onClick={() => openTask(dep)}>
                      {state.tasks.find((t) => t.id === dep)?.name || dep}
                    </button>
                    <button
                      onClick={() =>
                        actions.updateTask(id, {
                          dependencies: {
                            ...task.dependencies,
                            [field]: task.dependencies[field].filter(
                              (x) => x !== dep,
                            ),
                          },
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  className="icon-btn"
                  aria-label={
                    "Add " + (field === "waitingOn" ? "waiting on" : "blocking")
                  }
                  onClick={() => ui.open("dependency", { taskId: id, field })}
                >
                  <Icon name="Plus" size={13} />
                </button>
              </div>
            ))}
          </details>
          <div className="tabs">
            {["Subtasks", "Checklists", "Attachments"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}{" "}
                {t === "Subtasks"
                  ? children.length
                  : t === "Checklists"
                    ? checklists.length
                    : arr(task.attachments).length}
              </button>
            ))}
          </div>
          {tab === "Subtasks" ? (
            <div>
              {children.map((t) => (
                <div className="subtask-row" key={t.id}>
                  <FieldPicker field="status" task={t}>
                    <StatusIcon task={t} />
                  </FieldPicker>
                  <button
                    className="grow text-left"
                    onClick={() => openTask(t.id)}
                  >
                    {t.name}
                  </button>
                  <FieldPicker field="assigneeIds" task={t}>
                    <AvatarStack ids={t.assigneeIds} />
                  </FieldPicker>
                  <FieldPicker field="dueDate" task={t}>
                    <DateChip value={t.dueDate} task={t} />
                  </FieldPicker>
                  <FieldPicker field="priority" task={t}>
                    <Priority value={t.priority} label={false} />
                  </FieldPicker>
                </div>
              ))}
              <form
                className="inline-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (sub.trim()) {
                    actions.createTask({
                      name: sub,
                      parentId: id,
                      listId: task.listId,
                    });
                    setSub("");
                  }
                }}
              >
                <Icon name="Plus" size={14} />
                <input
                  placeholder="Add subtask"
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                />
                <Button type="submit" disabled={!sub.trim()}>
                  Add
                </Button>
              </form>
            </div>
          ) : tab === "Checklists" ? (
            <div>
              {checklists.map((c, ci) => (
                <div className="checklist" key={c.id}>
                  <div className="chips">
                    <input
                      aria-label="Checklist name"
                      value={c.name}
                      onChange={(e) =>
                        updateChecklists(
                          checklists.map((x, i) =>
                            i === ci ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <span className="muted">
                      {arr(c.items).filter((x) => x.resolved).length}/
                      {arr(c.items).length}
                    </span>
                    <Menu
                      items={[
                        {
                          label: "Rename",
                          onClick: () =>
                            ui.prompt("Rename checklist", c.name, (name) =>
                              updateChecklists(
                                checklists.map((x) =>
                                  x.id === c.id ? { ...x, name } : x,
                                ),
                              ),
                            ),
                        },
                        {
                          label: "Delete",
                          onClick: () =>
                            updateChecklists(
                              checklists.filter((x) => x.id !== c.id),
                            ),
                        },
                      ]}
                    />
                  </div>
                  <Progress
                    value={arr(c.items).filter((x) => x.resolved).length}
                    total={arr(c.items).length}
                    color="#30A46C"
                  />
                  {arr(c.items).map((item, ii) => (
                    <div className="checklist-item" key={item.id}>
                      <input
                        aria-label={"Resolve " + item.name}
                        type="checkbox"
                        checked={!!item.resolved}
                        onChange={(e) =>
                          updateChecklists(
                            checklists.map((x, i) =>
                              i === ci
                                ? {
                                    ...x,
                                    items: x.items.map((a, j) =>
                                      j === ii
                                        ? { ...a, resolved: e.target.checked }
                                        : a,
                                    ),
                                  }
                                : x,
                            ),
                            e.target.checked ? item.name : null,
                          )
                        }
                      />
                      <input
                        className={item.resolved ? "strikethrough" : ""}
                        aria-label="Checklist item"
                        value={item.name}
                        onChange={(e) =>
                          updateChecklists(
                            checklists.map((x, i) =>
                              i === ci
                                ? {
                                    ...x,
                                    items: x.items.map((a, j) =>
                                      j === ii
                                        ? { ...a, name: e.target.value }
                                        : a,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      <Popover
                        trigger={<Avatar id={item.assigneeId} size={20} />}
                      >
                        <SearchPicker
                          items={state.users.map((u) => ({
                            value: u.id,
                            label: u.name,
                          }))}
                          onPick={(v) =>
                            updateChecklists(
                              checklists.map((x) =>
                                x.id === c.id
                                  ? {
                                      ...x,
                                      items: x.items.map((a) =>
                                        a.id === item.id
                                          ? { ...a, assigneeId: v }
                                          : a,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      </Popover>
                      <button
                        className="icon-btn"
                        aria-label="Delete checklist item"
                        onClick={() =>
                          updateChecklists(
                            checklists.map((x) =>
                              x.id === c.id
                                ? {
                                    ...x,
                                    items: x.items.filter(
                                      (a) => a.id !== item.id,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ))}
                  <Button
                    icon="Plus"
                    onClick={() =>
                      ui.prompt("Add item", "", (name) =>
                        updateChecklists(
                          checklists.map((x) =>
                            x.id === c.id
                              ? {
                                  ...x,
                                  items: [
                                    ...arr(x.items),
                                    {
                                      id: uid("cki"),
                                      name,
                                      resolved: false,
                                      assigneeId: null,
                                    },
                                  ],
                                }
                              : x,
                          ),
                        ),
                      )
                    }
                  >
                    Add item
                  </Button>
                </div>
              ))}
              <Button
                icon="Plus"
                onClick={() =>
                  updateChecklists([
                    ...checklists,
                    { id: uid("ck"), name: "Checklist", items: [] },
                  ])
                }
              >
                Add checklist
              </Button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                aria-label="Add attachment"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const body = new FormData();
                  body.append("file", file);
                  try {
                    const res = await fetch(withSid("/upload"), {
                        method: "POST",
                        body,
                      }),
                      data = await res.json();
                    if (!res.ok) throw Error(data.error);
                    actions.updateTask(id, {
                      attachments: [
                        ...arr(task.attachments),
                        ...arr(data.files).map((f) => ({
                          id: uid("att"),
                          name: f.original_name,
                          url: f.url,
                          size: f.size,
                          mime: f.content_type,
                          uploadedBy: state.currentUserId,
                          createdAt: now(),
                        })),
                      ],
                    });
                    ui.notify("Attachment uploaded");
                  } catch {
                    ui.notify("Upload failed. Try again.");
                  }
                }}
              />
              {arr(task.attachments).map((a) => (
                <a
                  className="attachment"
                  key={a.id}
                  href={withSid(a.url)}
                  download={a.name}
                >
                  <Icon name="Paperclip" />
                  {String(a.mime || "").startsWith("image/") && (
                    <img
                      className="attachment-thumb"
                      src={withSid(a.url)}
                      alt={a.name}
                    />
                  )}
                  {a.name} <small>{Math.ceil(a.size / 1024)} KB</small>
                </a>
              ))}
            </div>
          )}
        </section>
        <aside className="activity-pane">
          <div className="activity-heading">
            <strong>Activity</strong>
            <select
              aria-label="Activity filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All", "Comments", "History"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {filter === "History" ? (
            <div className="history-feed">
              {history.map((a) => (
                <HistoryLine key={a.id} activity={a} />
              ))}
            </div>
          ) : (
            <Comments
              parentType="task"
              parentId={id}
              history={filter === "All" ? history : []}
            />
          )}
        </aside>
      </div>
    </div>
  );
  return modal ? (
    <Modal
      title="Task"
      onClose={close}
      width="min(1200px,94vw)"
      className="task-modal"
    >
      {body}
    </Modal>
  ) : (
    body
  );
}

function HistoryLine({ activity: a }) {
  const { state } = useStore();
  return (
    <div className="history-line">
      <Avatar id={a.actorId} size={18} />
      <span>
        <b>{state.users.find((u) => u.id === a.actorId)?.name || "Teammate"}</b>{" "}
        {String(a.type || "updated").replaceAll("_", " ")}
        {a.from != null && typeof a.from !== "object" && (
          <>
            {" "}
            from <b>{String(a.from)}</b>
          </>
        )}
        {a.to != null && typeof a.to !== "object" && (
          <>
            {" "}
            to <b>{String(a.to)}</b>
          </>
        )}
        <small>{stamp(a.createdAt)}</small>
      </span>
    </div>
  );
}

function CustomFieldPicker({ field, value, onChange }) {
  const selected = field.type === "labels" ? arr(value) : value ? [value] : [];
  return (
    <Popover
      label={field.name}
      trigger={
        <span className="custom-field-value">
          {selected.length ? (
            selected.map((id) => {
              const option = arr(field.options).find((o) => o.id === id);
              return (
                <span
                  className="custom-option"
                  key={id}
                  style={{
                    color: option?.color || "#7B68EE",
                    background: (option?.color || "#7B68EE") + "18",
                  }}
                >
                  {option?.name || id}
                </span>
              );
            })
          ) : (
            <span className="muted">Empty</span>
          )}
          <Icon name="ChevronDown" size={12} />
        </span>
      }
    >
      {(close) => (
        <>
          <SearchPicker
            items={arr(field.options).map((o) => ({
              value: o.id,
              label: o.name,
            }))}
            multi={selected}
            onPick={(id) => {
              onChange(
                field.type === "labels"
                  ? selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id]
                  : id,
              );
              if (field.type !== "labels") close();
            }}
          />
          <Button
            onClick={() => {
              onChange(field.type === "labels" ? [] : "");
              close();
            }}
          >
            Clear
          </Button>
          {field.type === "labels" && <Button onClick={close}>Done</Button>}
        </>
      )}
    </Popover>
  );
}
