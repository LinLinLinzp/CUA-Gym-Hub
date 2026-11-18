import { useState, useEffect } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink } from "../utils/nav.jsx";
import { arr, formatClock } from "../utils/format.js";
import { isClosed } from "../utils/tasks.js";
import { Icon, Avatar, Button, Menu, Favorite, useUI } from "./UI.jsx";
import { Dialogs } from "./dialogs.jsx";
import { TaskDetail } from "./TaskDetail.jsx";
import { BlockTaskDialog } from "../pages/Docs.jsx";
export function TimerPill() {
  const { state, actions } = useStore(),
    ui = useUI(),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!state.timer) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.timer]);
  if (!state.timer) return null;
  return (
    <div className="timer-pill">
      <button
        onClick={() =>
          ui.open("time", { taskId: state.timer.taskId, tab: "Timer" })
        }
      >
        <span className="red-dot" />
        {formatClock((tick - +new Date(state.timer.start)) / 1000)}{" "}
        <span className="timer-name">
          {state.tasks.find((t) => t.id === state.timer.taskId)?.name ||
            "No task"}
        </span>
      </button>
      <button
        aria-label="Stop timer"
        onClick={() => {
          actions.act("TIMER_STOP");
          ui.notify("Time tracked");
        }}
      >
        <Icon name="Square" size={12} fill="currentColor" />
      </button>
    </div>
  );
}
function TreeItem({
  to,
  icon,
  name,
  count,
  indent = 0,
  children,
  menu,
  add,
  letter,
  color,
  dragSprint,
}) {
  const loc = useLocation(),
    { actions } = useStore(),
    [expanded, setExpanded] = useState(true),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(name);
  const commit = () => {
    if (draft.trim())
      menu?.find((item) => item.onRename)?.onRename(draft.trim());
    setEditing(false);
  };
  const active = loc.pathname === to;
  return (
    <>
      <div
        className={"tree-row " + (active ? "active" : "")}
        style={{ paddingLeft: 8 + indent * 15 }}
        onDragOver={dragSprint ? (e) => e.preventDefault() : undefined}
        onDrop={
          dragSprint
            ? (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("task");
                if (id) actions.updateTask(id, { sprintId: dragSprint });
              }
            : undefined
        }
      >
        {children ? (
          <button
            className="caret"
            aria-label={"Expand " + name}
            onClick={() => setExpanded((v) => !v)}
          >
            <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={12} />
          </button>
        ) : (
          <span className="caret" />
        )}
        {editing ? (
          <input
            autoFocus
            className="tree-rename"
            aria-label="Rename location"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") {
                e.stopPropagation();
                setEditing(false);
              }
            }}
          />
        ) : (
          <SLink to={to} className="tree-link">
            {letter ? (
              <span className="space-icon" style={{ background: color }}>
                {letter}
              </span>
            ) : (
              <Icon name={icon || "List"} size={15} />
            )}
            <span className="ellipsis">{name}</span>
          </SLink>
        )}
        {count > 0 && <span className="count">{count}</span>}
        {add && (
          <button
            className="tree-action icon-btn"
            aria-label={"Add task to " + name}
            onClick={add}
          >
            <Icon name="Plus" size={13} />
          </button>
        )}
        {menu && (
          <span className="tree-action">
            <Menu
              label={"Actions for " + name}
              items={menu.map((item) =>
                item.onRename
                  ? {
                      ...item,
                      onClick: () => {
                        setDraft(name);
                        setEditing(true);
                      },
                    }
                  : item,
              )}
            />
          </span>
        )}
      </div>
      {children && expanded && children}
    </>
  );
}
export function Shell() {
  const { state, actions } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    ui = useUI(),
    [params] = useSearchParams(),
    [side, setSide] = useState(true),
    [favorites, setFavorites] = useState(true);
  const unread = state.notifications.filter(
      (n) =>
        (!n.userId || n.userId === state.currentUserId) &&
        !n.read &&
        !n.cleared,
    ).length,
    assigned = state.comments.filter(
      (c) => c.assigneeId === state.currentUserId && !c.resolved,
    ).length,
    user = state.users.find((u) => u.id === state.currentUserId) ||
      state.users[0] || { name: "You" };
  const taskCount = (id) =>
    state.tasks.filter(
      (t) =>
        t.listId === id &&
        !t.parentId &&
        !t.deleted &&
        !t.archived &&
        !isClosed(state, t),
    ).length;
  const rename = (collection, x) =>
    ui.prompt("Rename " + x.name, x.name, (name) =>
      actions.act("RENAME", { collection, id: x.id, name }),
    );
  const treeMenu = (collection, type, x) => [
    {
      label: "Rename",
      icon: "Pencil",
      onClick: () => rename(collection, x),
      onRename: (name) => actions.act("RENAME", { collection, id: x.id, name }),
    },
    {
      label: "Add to Favorites",
      icon: "Star",
      onClick: () => actions.act("FAVORITE", { type, id: x.id }),
    },
    ...(collection === "lists"
      ? [
          {
            label: x.archived ? "Unarchive" : "Archive",
            icon: "Archive",
            onClick: () =>
              actions.act("EDIT_ENTITY", {
                collection,
                id: x.id,
                patch: { archived: !x.archived },
              }),
          },
        ]
      : []),
  ];
  const docsAt = (type, id, indent) =>
    state.docs
      .filter(
        (d) =>
          !d.deleted &&
          !d.archived &&
          d.location?.type === type &&
          d.location.id === id,
      )
      .map((d) => (
        <TreeItem
          key={d.id}
          indent={indent}
          to={"/d/" + d.id}
          icon="FileText"
          name={d.title || "Untitled"}
        />
      ));
  const listRow = (list, indent) => (
    <div key={list.id}>
      <TreeItem
        to={"/l/" + list.id}
        icon="List"
        name={list.name}
        indent={indent}
        count={taskCount(list.id)}
        add={() => ui.open("taskCreate", { listId: list.id })}
        menu={treeMenu("lists", "list", list)}
      />
      {docsAt("list", list.id, indent + 1)}
    </div>
  );
  useEffect(() => {
    const handler = (e) => {
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ui.open("search");
      } else if (!typing && !e.metaKey && !e.ctrlKey) {
        if (e.key === "T" || e.key === "t") ui.open("taskCreate");
        if (e.key === "?") ui.open("shortcuts");
        if (
          ["l", "b", "c"].includes(e.key) &&
          /^\/(l|s|f|sprint|everything)(\/|$)/.test(loc.pathname)
        ) {
          const p = new URLSearchParams(loc.search);
          p.set("view", { l: "list", b: "board", c: "calendar" }[e.key]);
          nav(loc.pathname + "?" + p);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loc.pathname, loc.search]);
  return (
    <div
      className={
        "app " + (state.preferences.theme === "dark" ? "dark-theme" : "")
      }
    >
      <aside className="rail">
        <img className="brand" src="/favicon.svg" alt="ClickUp" />
        {[
          ["/inbox", "House", "Home"],
          ["/docs", "FileText", "Docs"],
          ["/timesheets", "Timer", "Timesheets"],
          ["/dashboards", "LayoutDashboard", "Dashboards"],
        ].map(([to, icon, label]) => (
          <SLink
            key={to}
            to={to}
            className={
              loc.pathname.startsWith(to) ||
              (to === "/inbox" &&
                ["/everything", "/my-tasks"].includes(loc.pathname))
                ? "active"
                : ""
            }
          >
            <Icon name={icon} size={20} />
            <span>{label}</span>
          </SLink>
        ))}
        <div className="rail-bottom">
          <SLink to="/settings">
            <Icon name="Settings" size={20} />
          </SLink>
          <Avatar user={user} size={30} />
        </div>
      </aside>
      <header className="topbar">
        <Menu
          label="Workspace menu"
          trigger={
            <span className="workspace">
              <span
                className="space-icon"
                style={{ background: state.workspace.color || "#E5484D" }}
              >
                {state.workspace.initials || "L"}
              </span>
              {state.workspace.name || "Workspace"}
              <Icon name="ChevronDown" size={13} />
            </span>
          }
          items={[
            { label: state.workspace.plan || "Business Plus", disabled: true },
            {
              label: "Settings",
              icon: "Settings",
              onClick: () => nav("/settings"),
            },
            { label: "Trash", icon: "Trash2", onClick: () => nav("/trash") },
          ]}
        />
        <button className="global-search" onClick={() => ui.open("search")}>
          <Icon name="Search" size={15} />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="top-actions">
          <TimerPill />
          <Menu
            label="+ New"
            trigger={<span>+ New</span>}
            items={[
              {
                label: "Task",
                icon: "CircleCheck",
                onClick: () => ui.open("taskCreate"),
              },
              {
                label: "Doc",
                icon: "FileText",
                onClick: () => ui.open("docCreate"),
              },
              {
                label: "Track time",
                icon: "Timer",
                onClick: () => ui.open("time"),
              },
            ]}
          />
          <button
            className="icon-btn notification-bell"
            aria-label="Notifications"
            onClick={() => nav("/inbox")}
          >
            <Icon name="Bell" />
            {unread > 0 && <i />}
          </button>
          <Menu
            label="Account menu"
            trigger={<Avatar user={user} />}
            items={[
              { label: user.name, disabled: true },
              { label: user.email, disabled: true },
              {
                label: "Settings",
                icon: "Settings",
                onClick: () => nav("/settings"),
              },
            ]}
          />
        </div>
      </header>
      {side && (
        <aside className="sidebar">
          <div className="side-heading">
            <strong>Home</strong>
            <button
              className="icon-btn"
              aria-label="Collapse sidebar"
              onClick={() => setSide(false)}
            >
              <Icon name="ChevronsLeft" size={16} />
            </button>
          </div>
          <nav className="home-nav">
            {[
              ["/inbox", "Inbox", "Inbox", unread],
              ["/inbox/replies", "MessageSquare", "Replies", 0],
              [
                "/inbox/assigned-comments",
                "MessageCircle",
                "Assigned Comments",
                assigned,
              ],
              ["/my-tasks", "CircleCheck", "My Tasks", 0],
            ].map(([to, icon, label, count]) => (
              <SLink
                key={to}
                to={to}
                className={loc.pathname === to ? "active" : ""}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {count > 0 && <b className="badge">{count}</b>}
              </SLink>
            ))}
          </nav>
          {state.favorites.length > 0 && (
            <section className="side-section">
              <button
                className="section-label"
                onClick={() => setFavorites((v) => !v)}
              >
                <Icon
                  name={favorites ? "ChevronDown" : "ChevronRight"}
                  size={12}
                />
                Favorites
              </button>
              {favorites &&
                state.favorites.map((f) => {
                  const collection = {
                      sprint: "sprints",
                      list: "lists",
                      folder: "folders",
                      space: "spaces",
                      task: "tasks",
                      doc: "docs",
                    }[f.type],
                    x = arr(state[collection]).find((x) => x.id === f.id),
                    route = {
                      sprint: "sprint",
                      list: "l",
                      folder: "f",
                      space: "s",
                      task: "t",
                      doc: "d",
                    }[f.type];
                  return x ? (
                    <TreeItem
                      key={f.type + f.id}
                      to={"/" + route + "/" + f.id}
                      icon={
                        f.type === "doc"
                          ? "FileText"
                          : f.type === "sprint"
                            ? "Zap"
                            : "List"
                      }
                      name={x.name || x.title || "Untitled"}
                    />
                  ) : null;
                })}
            </section>
          )}
          <section className="side-section">
            <div className="section-label">
              <span>Spaces</span>
              <Menu
                trigger={<Icon name="Plus" size={14} />}
                items={["Space", "Folder", "List", "Sprint Folder"].map(
                  (type) => ({
                    label: "New " + type,
                    onClick: () => ui.open("entity", { entityType: type }),
                  }),
                )}
              />
            </div>
            <TreeItem to="/everything" icon="Layers" name="Everything" />
            {state.spaces.map((sp) => (
              <div key={sp.id}>
                <TreeItem
                  to={"/s/" + sp.id}
                  letter={sp.icon || sp.name?.[0]}
                  color={sp.color}
                  name={sp.name}
                  menu={[
                    {
                      label: "Edit statuses",
                      onClick: () => ui.open("statuses", { spaceId: sp.id }),
                    },
                    ...treeMenu("spaces", "space", sp),
                  ]}
                >
                  {state.folders
                    .filter((f) => f.spaceId === sp.id && !f.hidden)
                    .map((fd) => (
                      <div key={fd.id}>
                        <TreeItem
                          indent={1}
                          to={"/f/" + fd.id}
                          icon={fd.isSprintFolder ? "Zap" : "Folder"}
                          name={fd.name}
                          menu={treeMenu("folders", "folder", fd)}
                        >
                          {fd.isSprintFolder &&
                            state.sprints
                              .filter((s) => s.folderId === fd.id)
                              .sort((a, b) => b.index - a.index)
                              .map((s) => (
                                <TreeItem
                                  key={s.id}
                                  indent={2}
                                  to={"/sprint/" + s.id}
                                  icon={
                                    s.status === "in_progress"
                                      ? "CircleDot"
                                      : "Zap"
                                  }
                                  name={s.name}
                                  dragSprint={s.status !== "done" ? s.id : null}
                                  menu={treeMenu("sprints", "sprint", s)}
                                />
                              ))}
                          {state.lists
                            .filter((l) => l.folderId === fd.id && !l.archived)
                            .map((l) => listRow(l, 2))}
                          {docsAt("folder", fd.id, 2)}
                        </TreeItem>
                      </div>
                    ))}
                  {state.lists
                    .filter(
                      (l) => l.spaceId === sp.id && !l.folderId && !l.archived,
                    )
                    .map((l) => listRow(l, 1))}
                  {docsAt("space", sp.id, 1)}
                </TreeItem>
              </div>
            ))}
          </section>
          <div className="side-footer">
            <span className="muted">Lumen Labs workspace</span>
          </div>
        </aside>
      )}
      {!side && (
        <button
          className="expand-sidebar icon-btn"
          onClick={() => setSide(true)}
          aria-label="Expand sidebar"
        >
          <Icon name="PanelLeft" />
        </button>
      )}
      <main className="main-panel" style={{ marginLeft: side ? 260 : 12 }}>
        <Outlet />
      </main>
      <Dialogs />
      <BlockTaskDialog />
      {params.get("task") && <TaskDetail taskId={params.get("task")} modal />}
    </div>
  );
}
