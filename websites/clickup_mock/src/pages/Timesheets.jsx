import { Fragment, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink } from "../utils/nav.jsx";
import {
  arr,
  dateKey,
  monday,
  plusDays,
  shortDate,
  stamp,
  sum,
  formatDuration,
  parseDuration,
} from "../utils/format.js";
import { visibleTasks, locationText } from "../utils/tasks.js";
import {
  Icon,
  StatusIcon,
  Button,
  Avatar,
  Menu,
  Popover,
  SearchPicker,
  Empty,
  Progress,
  useUI,
} from "../components/UI.jsx";
import { TimeEntries, useTaskOpen } from "../components/TaskDetail.jsx";
const statusLabel = (x) =>
  ({
    submitted: "Submitted",
    approved: "Approved",
    changes_requested: "Changes requested",
    withdrawn: "Withdrawn",
    open: "Open",
  })[x] || "Open";
export function Timesheets() {
  const { state, actions } = useStore(),
    ui = useUI(),
    nav = useNav(),
    [params] = useSearchParams(),
    tab = params.get("tab") || "my",
    weekParam = params.get("week"),
    week =
      /^\d{4}-\d{2}-\d{2}$/.test(weekParam || "") &&
      !Number.isNaN(+new Date(weekParam))
        ? monday(weekParam + "T12:00")
        : monday(),
    [billable, setBillable] = useState("all"),
    [tag, setTag] = useState(""),
    [display, setDisplay] = useState("Timesheet"),
    [extra, setExtra] = useState([]),
    [member, setMember] = useState("all"),
    [expanded, setExpanded] = useState({});
  const end = plusDays(week, 6),
    allEntries = state.timeEntries.filter(
      (e) => dateKey(e.start) >= week && dateKey(e.start) <= end,
    ),
    mine = allEntries.filter((e) => e.userId === state.currentUserId),
    entries = mine.filter(
      (e) =>
        (billable === "all" || e.billable === (billable === "billable")) &&
        (!tag || arr(e.tagIds).includes(tag)),
    ),
    sheet = state.timesheets.find(
      (s) => s.userId === state.currentUserId && s.periodStart === week,
    ),
    locked = ["submitted", "approved"].includes(sheet?.status),
    reviewCount = state.timesheets.filter(
      (s) =>
        arr(s.approverIds).includes(state.currentUserId) &&
        s.status === "submitted",
    ).length;
  const go = (patch) => {
      const p = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => p.set(k, v));
      nav("/timesheets?" + p);
    },
    changeWeek = (n) => {
      go({ week: plusDays(week, n * 7) });
      setExtra([]);
    };
  return (
    <div className="hub timesheets">
      <div className="hub-header">
        <h2>Timesheets</h2>
        <div className="grow" />
        <Button icon="Plus" onClick={() => ui.open("time", { tab: "Manual" })}>
          Track time
        </Button>
      </div>
      <div className="hub-tabs tabs">
        {[
          ["my", "My timesheet"],
          ["all", "All timesheets"],
          ["approvals", "Approvals"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={value === tab ? "active" : ""}
            onClick={() => go({ tab: value })}
          >
            {label}
            {value === "approvals" && reviewCount > 0 && (
              <span className="count-chip">{reviewCount}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "approvals" ? (
        <Approvals />
      ) : (
        <>
          <div className="timesheet-toolbar">
            <Button onClick={() => changeWeek(-1)} aria-label="Previous week">
              ‹
            </Button>
            <Button onClick={() => changeWeek(1)} aria-label="Next week">
              ›
            </Button>
            <Popover
              label="Choose week"
              trigger={
                <span>
                  {shortDate(week)} – {shortDate(end)}{" "}
                  <Icon name="ChevronDown" size={13} />
                </span>
              }
            >
              <label>
                Week
                <input
                  type="date"
                  value={week}
                  onChange={(e) => {
                    if (e.target.value)
                      go({ week: monday(e.target.value + "T12:00") });
                  }}
                />
              </label>
            </Popover>
            <Button onClick={() => go({ week: monday() })}>This week</Button>
            <div className="grow" />
            {tab === "my" ? (
              <>
                <Popover
                  label="Time filters"
                  trigger={
                    <span>
                      <Icon name="ListFilter" />
                      Filters
                    </span>
                  }
                >
                  <label>
                    Billable
                    <select
                      value={billable}
                      onChange={(e) => setBillable(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="billable">Billable</option>
                      <option value="non">Non-billable</option>
                    </select>
                  </label>
                  <label>
                    Tags
                    <select
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                    >
                      <option value="">All tags</option>
                      {state.timeTags.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </Popover>
                <select
                  aria-label="Display"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                >
                  <option>Timesheet</option>
                  <option>Time entries</option>
                </select>
                <span className={"sheet-status " + (sheet?.status || "open")}>
                  {statusLabel(sheet?.status)}
                </span>
                {sheet?.status === "submitted" ? (
                  <Button
                    onClick={() =>
                      ui.confirm("Withdraw timesheet?", () =>
                        actions.act("REVIEW_TIMESHEET", {
                          id: sheet.id,
                          status: "withdrawn",
                        }),
                      )
                    }
                  >
                    Withdraw
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={sum(mine) === 0 || locked}
                    onClick={() => ui.open("submitSheet", { week })}
                  >
                    Submit for approval
                  </Button>
                )}
              </>
            ) : (
              <select
                aria-label="Member filter"
                value={member}
                onChange={(e) => setMember(e.target.value)}
              >
                <option value="all">All members</option>
                <optgroup label="People">
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Teams">
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>
          <div className="timesheet-content">
            {tab === "my" ? (
              <>
                <TimeSummary entries={entries} week={week} />
                {locked && (
                  <div className="banner">
                    This timesheet is {statusLabel(sheet.status).toLowerCase()}.
                    Time entries are locked.
                  </div>
                )}
                {display === "Timesheet" ? (
                  <>
                    <WeekGrid
                      entries={entries}
                      week={week}
                      editable={!locked && !tag && billable === "all"}
                      extra={extra}
                    />
                    <div className="add-timesheet-task">
                      <Popover
                        label="Add task to timesheet"
                        trigger={
                          <span>
                            <Icon name="Plus" />
                            Add task
                          </span>
                        }
                      >
                        <SearchPicker
                          items={visibleTasks(state).map((t) => ({
                            value: t.id,
                            label: t.name,
                          }))}
                          onPick={(id) =>
                            setExtra((xs) => [...new Set([...xs, id])])
                          }
                        />
                      </Popover>
                    </div>
                  </>
                ) : (
                  <TimeEntries entries={entries} />
                )}
              </>
            ) : (
              <>
                <TimeSummary
                  entries={allEntries}
                  week={week}
                  title="Team time"
                />
                <table className="data-table all-timesheets">
                  <thead>
                    <tr>
                      <th>Member</th>
                      {Array.from({ length: 7 }, (_, i) => (
                        <th key={i}>
                          {new Date(
                            plusDays(week, i) + "T12:00",
                          ).toLocaleDateString("en-US", { weekday: "short" })}
                        </th>
                      ))}
                      <th>Total</th>
                      <th>Billable</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.users
                      .filter(
                        (u) =>
                          member === "all" ||
                          u.id === member ||
                          arr(
                            state.teams.find((t) => t.id === member)?.memberIds,
                          ).includes(u.id),
                      )
                      .map((u) => {
                        const es = allEntries.filter((e) => e.userId === u.id),
                          sh = state.timesheets.find(
                            (s) => s.userId === u.id && s.periodStart === week,
                          );
                        return (
                          <MemberRows
                            key={u.id}
                            user={u}
                            entries={es}
                            sheet={sh}
                            week={week}
                            expanded={expanded[u.id]}
                            toggle={() =>
                              setExpanded((xs) => ({
                                ...xs,
                                [u.id]: !xs[u.id],
                              }))
                            }
                          />
                        );
                      })}
                  </tbody>
                </table>
                <h3>Insights</h3>
                <div className="summary-tiles">
                  <div className="summary-tile">
                    <span>Total tracked</span>
                    <strong>{formatDuration(sum(allEntries))}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Billable</span>
                    <strong>
                      {Math.round(
                        (sum(allEntries.filter((e) => e.billable)) /
                          Math.max(1, sum(allEntries))) *
                          100,
                      )}
                      %
                    </strong>
                  </div>
                </div>
                <h4>Top tasks</h4>
                {[...new Set(allEntries.map((e) => e.taskId))]
                  .map((id) => ({
                    id,
                    seconds: sum(allEntries.filter((e) => e.taskId === id)),
                  }))
                  .sort((a, b) => b.seconds - a.seconds)
                  .slice(0, 5)
                  .map((t) => (
                    <div className="shortcut" key={t.id || "none"}>
                      <span>
                        {state.tasks.find((x) => x.id === t.id)?.name ||
                          "No task"}
                      </span>
                      <strong>{formatDuration(t.seconds)}</strong>
                    </div>
                  ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function MemberRows({
  user: u,
  entries: es,
  sheet: sh,
  week,
  expanded,
  toggle,
}) {
  const { state } = useStore();
  return (
    <>
      <tr>
        <td>
          <button className="chips" onClick={toggle}>
            <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={12} />
            <Avatar user={u} />
            {u.name}
          </button>
        </td>
        {Array.from({ length: 7 }, (_, i) => (
          <td key={i}>
            {formatDuration(
              sum(es.filter((e) => dateKey(e.start) === plusDays(week, i))),
            )}
          </td>
        ))}
        <td>
          <strong>{formatDuration(sum(es))}</strong>
        </td>
        <td>{formatDuration(sum(es.filter((e) => e.billable)))}</td>
        <td>
          {sh ? (
            <SLink
              to={"/timesheets/approvals/" + sh.id}
              className={"sheet-status " + sh.status}
            >
              {statusLabel(sh.status)}
            </SLink>
          ) : (
            "Open"
          )}
        </td>
      </tr>
      {expanded &&
        [...new Set(es.map((e) => e.taskId))].map((id) => (
          <tr key={id || "none"} className="member-task-row">
            <td>{state.tasks.find((t) => t.id === id)?.name || "No task"}</td>
            {Array.from({ length: 7 }, (_, i) => (
              <td key={i}>
                {formatDuration(
                  sum(
                    es.filter(
                      (e) =>
                        e.taskId === id &&
                        dateKey(e.start) === plusDays(week, i),
                    ),
                  ),
                )}
              </td>
            ))}
            <td>{formatDuration(sum(es.filter((e) => e.taskId === id)))}</td>
            <td colSpan="2" />
          </tr>
        ))}
    </>
  );
}
export function TimeSummary({ entries, week, title = "Your time" }) {
  const total = sum(entries),
    billable = sum(entries.filter((e) => e.billable));
  return (
    <section className="time-summary">
      <div className="time-summary-main">
        <div>
          <Icon name="Clock" size={14} /> {title}{" "}
          <span className="muted">
            / {shortDate(week)} – {shortDate(plusDays(week, 6))}
          </span>
        </div>
        <small>Tracked time</small>
        <h2>
          {formatDuration(total)} <span className="muted">/40h</span>
        </h2>
        <Progress value={total} total={40 * 3600} color="#5AB8E8" />
      </div>
      <div
        className="donut"
        style={{
          background: `conic-gradient(#45B5A2 0% ${(billable / Math.max(1, total)) * 100}%,#E8E8E8 ${(billable / Math.max(1, total)) * 100}% 100%)`,
        }}
      />
      <div className="billable-summary">
        <small>Billable</small>
        <strong>{formatDuration(billable)}</strong>
      </div>
      <div className="billable-summary">
        <small>Non-billable</small>
        <strong>{formatDuration(total - billable)}</strong>
      </div>
    </section>
  );
}
export function WeekGrid({ entries, week, editable = false, extra = [] }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    openTask = useTaskOpen(),
    [expandedEntries, setExpandedEntries] = useState({}),
    ids = [...new Set([...entries.map((e) => e.taskId || null), ...extra])],
    days = Array.from({ length: 7 }, (_, i) => plusDays(week, i));
  return (
    <div className="week-grid-wrap">
      <table className="week-grid">
        <thead>
          <tr>
            <th>Task/Location</th>
            {days.map((day) => (
              <th key={day} className={day === dateKey() ? "today" : ""}>
                <span>
                  {new Date(day + "T12:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <strong>
                  {formatDuration(
                    sum(entries.filter((e) => dateKey(e.start) === day)),
                  )}
                </strong>
                <Progress
                  value={sum(entries.filter((e) => dateKey(e.start) === day))}
                  total={8 * 3600}
                  color={
                    sum(entries.filter((e) => dateKey(e.start) === day)) >
                    8 * 3600
                      ? "#E5484D"
                      : "#5AB8E8"
                  }
                />
              </th>
            ))}
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const task = state.tasks.find((t) => t.id === id),
              es = entries.filter((e) => (e.taskId || null) === id);
            return (
              <Fragment key={id || "none"}>
                <tr>
                  <td>
                    <div className="timesheet-task">
                      <button
                        className="icon-btn"
                        aria-label={
                          "Show time entries for " + (task?.name || "No task")
                        }
                        aria-expanded={!!expandedEntries[id]}
                        onClick={() =>
                          setExpandedEntries((xs) => ({ ...xs, [id]: !xs[id] }))
                        }
                      >
                        <Icon
                          name={
                            expandedEntries[id] ? "ChevronDown" : "ChevronRight"
                          }
                          size={12}
                        />
                      </button>
                      <button
                        onClick={() => id && openTask(id)}
                        className="text-left timesheet-task-name"
                        disabled={!id}
                      >
                        <span>{task?.name || "No task"}</span>
                        <small>
                          {task && <StatusIcon task={task} />}
                          {task ? locationText(state, task) : "Workspace"}
                        </small>
                      </button>
                      <button
                        className={
                          "play-btn " +
                          (state.timer?.taskId === id && state.timer
                            ? "running"
                            : "")
                        }
                        aria-label={
                          (state.timer?.taskId === id && state.timer
                            ? "Stop timer for "
                            : "Start timer for ") + (task?.name || "No task")
                        }
                        title={
                          state.timer?.taskId === id && state.timer
                            ? "Stop timer"
                            : "Start timer"
                        }
                        onClick={() =>
                          actions.act(
                            state.timer?.taskId === id && state.timer
                              ? "TIMER_STOP"
                              : "TIMER_START",
                            { taskId: id },
                          )
                        }
                      >
                        <Icon
                          name={
                            state.timer?.taskId === id && state.timer
                              ? "Square"
                              : "Play"
                          }
                          size={12}
                          fill="currentColor"
                        />
                      </button>
                    </div>
                  </td>
                  {days.map((day) => {
                    const cell = es.filter((e) => dateKey(e.start) === day),
                      value = sum(cell);
                    return (
                      <td key={day}>
                        <TimeCell
                          value={value}
                          editable={editable && !cell.some((e) => e.locked)}
                          onSave={(duration) => {
                            const save = () =>
                              actions.act("CELL_TIME", {
                                taskId: id,
                                day,
                                duration,
                              });
                            if (!duration && value)
                              ui.confirm("Delete time for this day?", save);
                            else save();
                          }}
                          label={(task?.name || "No task") + " " + day}
                        />
                      </td>
                    );
                  })}
                  <td>
                    <strong>{formatDuration(sum(es))}</strong>
                  </td>
                  <td>
                    {editable && !es.some((e) => e.locked) && (
                      <Menu
                        items={[
                          {
                            label: "Delete row",
                            danger: true,
                            onClick: () =>
                              ui.confirm(
                                "Delete all time entries for this task this week?",
                                () =>
                                  actions.act("DELETE_TIME", {
                                    ids: es.map((e) => e.id),
                                  }),
                              ),
                          },
                        ]}
                      />
                    )}
                  </td>
                </tr>
                {expandedEntries[id] && (
                  <tr>
                    <td colSpan={10}>
                      <TimeEntries entries={es} readOnly={!editable} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            {days.map((day) => (
              <td key={day}>
                {formatDuration(
                  sum(entries.filter((e) => dateKey(e.start) === day)),
                )}
              </td>
            ))}
            <td>{formatDuration(sum(entries))}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      {!ids.length && (
        <Empty
          title="No time entries this week"
          text="Add a task or track time to get started."
        />
      )}
    </div>
  );
}
function TimeCell({ value, editable, onSave, label }) {
  const [editing, setEditing] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState(false);
  const save = () => {
    const v =
      text.trim() === "" || Number(text) === 0 ? 0 : parseDuration(text);
    if (v === null) {
      setError(true);
      return;
    }
    onSave(v);
    setEditing(false);
  };
  return editing ? (
    <input
      autoFocus
      className={"time-cell-input " + (error ? "error" : "")}
      aria-label={label}
      value={text}
      placeholder="e.g. 1h 30m"
      onChange={(e) => {
        setText(e.target.value);
        setError(false);
      }}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  ) : (
    <button
      className="time-cell"
      aria-label={label}
      disabled={!editable}
      onClick={() => {
        setText(value ? formatDuration(value) : "");
        setEditing(true);
      }}
    >
      {value ? formatDuration(value) : "–"}
    </button>
  );
}
function Approvals() {
  const { state } = useStore(),
    nav = useNav(),
    [status, setStatus] = useState("submitted"),
    [owner, setOwner] = useState(""),
    [week, setWeek] = useState("");
  const sheets = state.timesheets.filter(
    (s) =>
      arr(s.approverIds).includes(state.currentUserId) &&
      (status === "all" || s.status === status) &&
      (!owner || s.userId === owner) &&
      (!week || s.periodStart === monday(week + "T12:00")),
  );
  return (
    <div className="approvals-content">
      <div className="tabs">
        {[
          ["submitted", "To review"],
          ["changes_requested", "Changes requested"],
          ["approved", "Approved"],
          ["all", "All"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={status === v ? "active" : ""}
            onClick={() => setStatus(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="timesheet-toolbar">
        <label>
          Timesheet owner
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">All owners</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time period
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Period</th>
            <th>Total</th>
            <th>Billable</th>
            <th>Submitted</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((s) => (
            <tr
              key={s.id}
              className="clickable"
              role="button"
              tabIndex={0}
              aria-label={
                "Review timesheet for " +
                (state.users.find((u) => u.id === s.userId)?.name ||
                  "Teammate") +
                ", " +
                shortDate(s.periodStart) +
                " – " +
                shortDate(s.periodEnd)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  nav("/timesheets/approvals/" + s.id);
                }
              }}
              onClick={() => nav("/timesheets/approvals/" + s.id)}
            >
              <td>
                <span className="chips">
                  <Avatar id={s.userId} />
                  {state.users.find((u) => u.id === s.userId)?.name ||
                    "Teammate"}
                </span>
              </td>
              <td>
                {shortDate(s.periodStart)} – {shortDate(s.periodEnd)}
              </td>
              <td>{formatDuration(s.totalSeconds)}</td>
              <td>{formatDuration(s.billableSeconds)}</td>
              <td>{stamp(s.submittedAt)}</td>
              <td>
                <span className={"sheet-status " + s.status}>
                  {statusLabel(s.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sheets.length && <Empty title="No timesheets to review" />}
    </div>
  );
}
export function ApprovalDetail() {
  const { timesheetId } = useParams(),
    { state, actions } = useStore(),
    ui = useUI(),
    sheet = state.timesheets.find((s) => s.id === timesheetId),
    [comment, setComment] = useState("");
  if (!sheet) return <Empty title="This item doesn't exist or was deleted" />;
  const owner = sheet.userId === state.currentUserId,
    approver = arr(sheet.approverIds).includes(state.currentUserId),
    entries = state.timeEntries.filter((e) =>
      arr(sheet.entryIds).includes(e.id),
    );
  return (
    <div className="hub">
      <div className="hub-header">
        <SLink to="/timesheets?tab=approvals" className="icon-btn">
          <Icon name="ArrowLeft" />
        </SLink>
        <Avatar id={sheet.userId} size={32} />
        <h2>
          {state.users.find((u) => u.id === sheet.userId)?.name || "Teammate"}’s
          timesheet
        </h2>
        <span className={"sheet-status " + sheet.status}>
          {statusLabel(sheet.status)}
        </span>
        <div className="grow" />
        {approver && sheet.status === "submitted" && (
          <>
            <Button onClick={() => ui.open("reviewSheet", { id: sheet.id })}>
              Request changes
            </Button>
            <Button
              variant="primary"
              icon="Check"
              onClick={() => {
                actions.act("REVIEW_TIMESHEET", {
                  id: sheet.id,
                  status: "approved",
                });
                ui.notify("Timesheet approved");
              }}
            >
              Approve
            </Button>
          </>
        )}
        {owner && sheet.status === "submitted" && (
          <Button
            onClick={() =>
              ui.confirm("Withdraw timesheet?", () =>
                actions.act("REVIEW_TIMESHEET", {
                  id: sheet.id,
                  status: "withdrawn",
                }),
              )
            }
          >
            Withdraw
          </Button>
        )}
        {approver && sheet.status === "approved" && (
          <Button
            onClick={() =>
              ui.confirm("Reopen timesheet?", () =>
                actions.act("REVIEW_TIMESHEET", {
                  id: sheet.id,
                  status: "changes_requested",
                  comment: "Reopened for updates.",
                }),
              )
            }
          >
            Reopen
          </Button>
        )}
      </div>
      <div className="hub-content">
        <p>
          {shortDate(sheet.periodStart)} – {shortDate(sheet.periodEnd)}
        </p>
        <TimeSummary entries={entries} week={sheet.periodStart} />
        {sheet.reviewComment && (
          <div className="banner warning">{sheet.reviewComment}</div>
        )}
        <WeekGrid entries={entries} week={sheet.periodStart} />
        <h3>History</h3>
        {arr(sheet.history).map((h, i) => (
          <div className="history-line" key={i}>
            <Avatar id={h.userId} size={22} />
            <span>
              {h.action.replaceAll("_", " ")} by{" "}
              {state.users.find((u) => u.id === h.userId)?.name || "Teammate"} ·{" "}
              {stamp(h.at)}
              {h.comment && <p>{h.comment}</p>}
            </span>
          </div>
        ))}
        <h3>Comments</h3>
        {arr(sheet.comments).map((c) => (
          <div className="comment" key={c.id}>
            <div className="chips">
              <Avatar id={c.userId} />
              <strong>
                {state.users.find((u) => u.id === c.userId)?.name || "Teammate"}
              </strong>
              <small className="muted">{stamp(c.createdAt)}</small>
            </div>
            <p>{c.text}</p>
          </div>
        ))}
        <form
          className="sheet-comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim()) {
              actions.act("SHEET_COMMENT", { id: sheet.id, text: comment });
              setComment("");
            }
          }}
        >
          <textarea
            aria-label="Timesheet comment"
            placeholder="Add a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button variant="primary" type="submit" disabled={!comment.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
