import { useState } from "react";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink } from "../utils/nav.jsx";
import { arr, dateKey, plusDays, shortDate } from "../utils/format.js";
import { visibleTasks, isClosed } from "../utils/tasks.js";
import {
  Icon,
  Button,
  Menu,
  Favorite,
  Progress,
  Empty,
  useUI,
} from "../components/UI.jsx";
export function SprintStatus({ sprint: sp }) {
  const { state, actions } = useStore(),
    ui = useUI();
  const start = () => {
    const active = state.sprints.find(
        (s) =>
          s.folderId === sp.folderId &&
          s.status === "in_progress" &&
          s.id !== sp.id,
      ),
      run = () => actions.act("SPRINT_START", { id: sp.id });
    if (active)
      ui.confirm(
        `${active.name} is still in progress. Start Sprint ${sp.index} anyway?`,
        run,
      );
    else run();
  };
  return (
    <Menu
      trigger={
        <span className={"sprint-status " + sp.status}>
          {sp.status === "in_progress"
            ? "In Progress"
            : sp.status === "done"
              ? "Done"
              : "Not Started"}
          <Icon name="ChevronDown" size={13} />
        </span>
      }
      label="Sprint status"
      items={[
        {
          label: "Mark Sprint as In Progress",
          icon: "Play",
          disabled: sp.status !== "not_started",
          title:
            sp.status === "done"
              ? "A completed sprint cannot be reopened."
              : undefined,
          onClick: start,
        },
        {
          label: "Mark Sprint as Done",
          icon: "Check",
          disabled: sp.status === "done",
          title:
            sp.status === "done"
              ? "A completed sprint cannot be reopened."
              : undefined,
          onClick: () => ui.open("sprintComplete", { id: sp.id }),
        },
      ]}
    />
  );
}
const sprintTasks = (state, sp) =>
  visibleTasks(state).filter(
    (t) =>
      t.sprintId === sp.id ||
      (sp.status === "done" && arr(sp.committedTaskIds).includes(t.id)),
  );
function effort(state, sp, tasks) {
  const time =
    state.folders.find((f) => f.id === sp.folderId)?.sprintSettings
      ?.measureOfEffort === "time_estimates";
  return {
    total: tasks.reduce(
      (a, t) => a + (time ? (t.timeEstimate || 0) / 60 : t.sprintPoints || 0),
      0,
    ),
    done: tasks
      .filter((t) => isClosed(state, t))
      .reduce(
        (a, t) => a + (time ? (t.timeEstimate || 0) / 60 : t.sprintPoints || 0),
        0,
      ),
    unit: time ? "hours" : "pts",
    time,
  };
}
export function SprintOverview({ folder }) {
  const { state } = useStore(),
    ui = useUI(),
    nav = useNav(),
    sprints = state.sprints
      .filter((s) => s.folderId === folder.id)
      .sort((a, b) => b.index - a.index),
    current = sprints.find((s) => s.status === "in_progress"),
    backlog = visibleTasks(state).filter(
      (t) =>
        t.listId === folder.sprintSettings?.backlogListId &&
        !t.sprintId &&
        !t.parentId,
    );
  const card = (sp, hero = false) => {
    const tasks = sprintTasks(state, sp).filter((t) => !t.parentId),
      e = effort(state, sp, tasks);
    return (
      <article className={"sprint-card " + (hero ? "hero" : "")} key={sp.id}>
        <div className="card-top">
          <Icon name="Zap" size={22} />
          <SLink to={"/sprint/" + sp.id}>
            <h3>{sp.name}</h3>
          </SLink>
          <SprintStatus sprint={sp} />
        </div>
        <p className="muted">
          {shortDate(sp.startDate)} – {shortDate(sp.endDate)}
          {sp.status === "in_progress" &&
            ` · ${Math.max(0, Math.ceil((+new Date(sp.endDate + "T23:59") - Date.now()) / 86400000))} days left`}
        </p>
        {hero && <p>{sp.goal}</p>}
        <Progress
          value={
            e.time
              ? e.done
              : sp.status === "done"
                ? (sp.completedPoints ?? e.done)
                : e.done
          }
          total={e.time ? e.total : (sp.forecastPoints ?? e.total)}
          color="#30A46C"
        />
        <div className="card-bottom">
          <span>
            {e.time ? e.done : (sp.completedPoints ?? e.done)} /{" "}
            {e.time ? e.total : (sp.forecastPoints ?? e.total)} {e.unit}
          </span>
          <span className="muted">
            {tasks.filter((t) => isClosed(state, t)).length} / {tasks.length}{" "}
            tasks · {arr(sp.spilloverTaskIds).length} spillover
          </span>
          <Button onClick={() => nav("/sprint/" + sp.id)}>Open sprint</Button>
        </div>
        {hero && (
          <div className="chips">
            {["open", "custom", "done", "closed"].map((type) => (
              <span className="tag" key={type}>
                {
                  {
                    open: "To do",
                    custom: "In progress",
                    done: "Done",
                    closed: "Closed",
                  }[type]
                }{" "}
                {
                  tasks.filter((t) => {
                    const list = state.lists.find((l) => l.id === t.listId),
                      space = state.spaces.find((s) => s.id === list?.spaceId);
                    return (
                      arr(space?.statuses).find((st) => st.name === t.status)
                        ?.type === type
                    );
                  }).length
                }
              </span>
            ))}
          </div>
        )}
      </article>
    );
  };
  return (
    <div className="hub">
      <div className="hub-header">
        <h2>
          <Icon name="Zap" /> {folder.name}
        </h2>
        <Favorite type="folder" id={folder.id} />
        <div className="grow" />
        <Button
          icon="Settings"
          onClick={() => ui.open("sprintSettings", { folderId: folder.id })}
        >
          Sprint settings
        </Button>
        <Button
          variant="primary"
          icon="Plus"
          onClick={() => ui.open("sprintCreate", { folderId: folder.id })}
        >
          Create Sprints
        </Button>
      </div>
      <div className="hub-content">
        <h3>Current sprint</h3>
        {current ? (
          card(current, true)
        ) : (
          <Empty
            title="No sprint in progress"
            text="Open an upcoming sprint to get started."
          />
        )}
        <h3>Upcoming</h3>
        <div className="card-grid">
          {sprints
            .filter((s) => s.status === "not_started")
            .map((s) => card(s))}
        </div>
        <h3>Backlog</h3>
        <article className="sprint-card">
          <h3>Backlog</h3>
          <p>
            {backlog.length} tasks ·{" "}
            {backlog.reduce((a, t) => a + (t.sprintPoints || 0), 0)} points
          </p>
          <Button
            onClick={() => nav("/l/" + folder.sprintSettings?.backlogListId)}
          >
            Open Backlog
          </Button>
        </article>
        <h3>Completed</h3>
        <div className="card-grid">
          {sprints.filter((s) => s.status === "done").map((s) => card(s))}
        </div>
        <h3>Velocity</h3>
        <Velocity sprints={sprints} />
      </div>
    </div>
  );
}
export function Velocity({ sprints }) {
  const { state } = useStore(),
    items = [...sprints].sort((a, b) => a.index - b.index).slice(-4),
    max = Math.max(1, ...items.map((s) => s.forecastPoints || 0));
  const complete = (sp) =>
      sp.completedPoints ?? effort(state, sp, sprintTasks(state, sp)).done,
    done = items.filter((s) => s.status === "done");
  return (
    <div className="chart-card">
      <div className="chart-legend">
        <span>
          <i style={{ background: "#D9D2FB" }} />
          Committed
        </span>
        <span>
          <i style={{ background: "#7B68EE" }} />
          Completed
        </span>
        <span className="muted">
          Average velocity:{" "}
          {done.length
            ? (done.reduce((a, s) => a + complete(s), 0) / done.length).toFixed(
                1,
              )
            : 0}{" "}
          points
        </span>
      </div>
      <svg
        className="chart"
        viewBox="0 0 600 220"
        role="img"
        aria-label="Sprint velocity chart"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="36"
              y1={25 + i * 40}
              x2="580"
              y2={25 + i * 40}
              stroke="#F0F0F0"
            />
            <text x="2" y={29 + i * 40}>
              {Math.round((max * (4 - i)) / 4)}
            </text>
          </g>
        ))}
        {items.map((sp, i) => (
          <g key={sp.id}>
            <rect
              x={65 + i * 130}
              y={185 - ((sp.forecastPoints || 0) / max) * 160}
              width="28"
              height={((sp.forecastPoints || 0) / max) * 160}
              fill="#D9D2FB"
              rx="2"
            />
            <rect
              x={98 + i * 130}
              y={185 - (complete(sp) / max) * 160}
              width="28"
              height={Math.max(0, (complete(sp) / max) * 160)}
              fill="#7B68EE"
              rx="2"
            />
            <text x={70 + i * 130} y="210">
              Sprint {sp.index}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
export function SprintReport({ sprint: sp }) {
  const { state } = useStore(),
    [measure, setMeasure] = useState("points"),
    tasks = sprintTasks(state, sp).filter((t) => !t.parentId),
    e = effort(state, sp, tasks),
    total = measure === "tasks" ? tasks.length : e.total,
    done =
      measure === "tasks"
        ? tasks.filter((t) => isClosed(state, t)).length
        : e.done,
    span = Math.max(
      1,
      Math.round((+new Date(sp.endDate) - +new Date(sp.startDate)) / 86400000),
    ),
    days = Array.from({ length: span + 1 }, (_, i) =>
      plusDays(sp.startDate, i),
    ),
    end =
      sp.status === "done"
        ? span
        : Math.max(
            0,
            Math.min(
              span,
              Math.floor(
                (+new Date(dateKey()) - +new Date(sp.startDate)) / 86400000,
              ),
            ),
          ),
    completed = days.map((day) =>
      tasks
        .filter((t) => t.dateClosed && dateKey(t.dateClosed) <= day)
        .reduce(
          (a, t) =>
            a +
            (measure === "tasks"
              ? 1
              : e.time
                ? (t.timeEstimate || 0) / 60
                : t.sprintPoints || 0),
          0,
        ),
    );
  const xy = (i, n) =>
      `${40 + (i / span) * 520},${190 - (n / Math.max(1, total)) * 160}`,
    remaining = completed
      .slice(0, end + 1)
      .map((n, i) => xy(i, Math.max(0, total - n)))
      .join(" "),
    up = completed
      .slice(0, end + 1)
      .map((n, i) => xy(i, n))
      .join(" ");
  return (
    <div className="report">
      <div className="summary-tiles">
        {[
          ["Forecast", sp.forecastPoints ?? total],
          ["Completed", sp.completedPoints ?? done],
          ["Remaining", Math.max(0, total - done)],
          [
            "Tasks done",
            tasks.filter((t) => isClosed(state, t)).length +
              " / " +
              tasks.length,
          ],
          [
            "Days left",
            Math.max(
              0,
              Math.ceil(
                (+new Date(sp.endDate + "T23:59") - Date.now()) / 86400000,
              ),
            ),
          ],
          ["Spillover", arr(sp.spilloverTaskIds).length],
        ].map(([label, value]) => (
          <div className="summary-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="report-toolbar">
        <label>
          Measure
          <select value={measure} onChange={(e) => setMeasure(e.target.value)}>
            <option value="points">
              {e.time ? "Estimate hours" : "Points"}
            </option>
            <option value="tasks">Tasks</option>
          </select>
        </label>
      </div>
      {!tasks.length ? (
        <Empty
          title="No tasks in this sprint"
          text="Add tasks to see sprint reports."
        />
      ) : (
        <div className="card-grid">
          {["Burndown", "Burnup"].map((title, i) => (
            <div className="chart-card" key={title}>
              <h3>{title}</h3>
              <div className="chart-legend">
                <span>
                  <i style={{ background: i ? "#30A46C" : "#F76B15" }} />
                  {i ? "Completed" : "Actual remaining"}
                </span>
                <span>{i ? "Scope" : "Guideline"}</span>
              </div>
              <svg
                className="chart"
                role="img"
                aria-label={title + " chart"}
                viewBox="0 0 600 230"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <g key={n}>
                    <line
                      x1="40"
                      y1={30 + n * 40}
                      x2="560"
                      y2={30 + n * 40}
                      stroke="#F0F0F0"
                    />
                    <text x="5" y={34 + n * 40}>
                      {Math.round((total * (4 - n)) / 4)}
                    </text>
                  </g>
                ))}
                <line
                  x1="40"
                  y1="30"
                  x2="560"
                  y2={i ? 30 : 190}
                  stroke={i ? "#0091FF" : "#BBB"}
                  strokeDasharray={i ? undefined : "5 5"}
                />
                <polyline
                  points={i ? up : remaining}
                  fill="none"
                  stroke={i ? "#30A46C" : "#F76B15"}
                  strokeWidth="2.5"
                />
                {completed.slice(0, end + 1).map((n, j) => (
                  <circle
                    key={j}
                    cx={40 + (j / span) * 520}
                    cy={
                      190 -
                      ((i ? n : Math.max(0, total - n)) / Math.max(1, total)) *
                        160
                    }
                    r="3"
                    fill={i ? "#30A46C" : "#F76B15"}
                  />
                ))}
                <text x="40" y="218">
                  {shortDate(sp.startDate)}
                </text>
                <text x="500" y="218">
                  {shortDate(sp.endDate)}
                </text>
              </svg>
            </div>
          ))}
        </div>
      )}
      <h3>Velocity</h3>
      <Velocity
        sprints={state.sprints.filter((s) => s.folderId === sp.folderId)}
      />
    </div>
  );
}
