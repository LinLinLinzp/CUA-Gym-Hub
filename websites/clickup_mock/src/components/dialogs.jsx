import { nextSprintStart } from "../utils/sprints.js";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, withSid } from "../utils/nav.jsx";
import {
  arr,
  uid,
  now,
  dateKey,
  plusDays,
  formatDuration,
  parseDuration,
  shortDate,
  sum,
  monday,
} from "../utils/format.js";
import {
  locationOf,
  billableDefault,
  locationText,
  isClosed,
  visibleTasks,
} from "../utils/tasks.js";
import {
  Modal,
  Button,
  Icon,
  Avatar,
  FieldPicker,
  Priority,
  StatusPill,
  AvatarStack,
  DateChip,
  Tag,
  SearchPicker,
  Popover,
  useUI,
  Progress,
} from "./UI.jsx";
export function Dialogs() {
  const ui = useUI(),
    { state, actions } = useStore(),
    nav = useNav(),
    d = ui.dialog;
  useEffect(() => {
    if (d?.type === "docCreate") {
      const id = uid("doc"),
        pageId = uid("pg");
      actions.createDoc({ id, pageId, location: d.location });
      ui.close();
      nav(`/d/${id}/${pageId}`);
    }
  }, [d]);
  if (!d || d.type === "docCreate") return null;
  const views = {
    confirm: Confirm,
    prompt: Prompt,
    taskCreate: CreateTask,
    time: TimeForm,
    search: GlobalSearch,
    sprintCreate: CreateSprints,
    sprintComplete: CompleteSprint,
    sprintSettings: SprintSettings,
    sprintDates: SprintDates,
    docShare: ShareDoc,
    entity: CreateEntity,
    statuses: Statuses,
    shortcuts: Shortcuts,
    submitSheet: SubmitSheet,
    reviewSheet: ReviewSheet,
  };
  const C = views[d.type];
  return C ? <C key={d.type + (d.id || d.taskId || "")} data={d} /> : null;
}
function Confirm({ data: d }) {
  const ui = useUI();
  return (
    <Modal title={d.title} onClose={ui.close}>
      <div className="modal-body">
        <p>{d.description || "Are you sure you want to continue?"}</p>
      </div>
      <footer>
        <Button onClick={ui.close}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            ui.close();
            d.onConfirm();
          }}
        >
          Confirm
        </Button>
      </footer>
    </Modal>
  );
}
function Prompt({ data: d }) {
  const ui = useUI(),
    [value, setValue] = useState(d.value || "");
  return (
    <Modal title={d.title} onClose={ui.close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) {
            d.onSave(value.trim());
            ui.close();
          }
        }}
      >
        <div className="modal-body">
          <input
            autoFocus
            aria-label={d.title}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button variant="primary" disabled={!value.trim()} type="submit">
            Save
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function CreateTask({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    loc = useLocation(),
    nav = useNav(),
    [error, setError] = useState(""),
    [q, setQ] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    listId: d.listId || state.lists[0]?.id || "",
    sprintId: d.sprintId || null,
    status: d.status || "",
    assigneeIds: [],
    startDate: null,
    dueDate: d.dueDate || null,
    priority: null,
    tags: [],
    sprintPoints: null,
    parentId: d.parentId || null,
  });
  const patch = (p) => setForm((f) => ({ ...f, ...p })),
    sp = state.spaces.find(
      (s) => s.id === state.lists.find((l) => l.id === form.listId)?.spaceId,
    ),
    task = {
      ...form,
      status: form.status || sp?.statuses?.[0]?.name || "to do",
    },
    sprintList = locationOf(state, task).folder?.isSprintFolder;
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Task name is required");
      return;
    }
    if (!form.listId) {
      setError("Choose a list first");
      return;
    }
    const id = uid("tsk");
    actions.createTask({ ...task, id });
    ui.close();
    ui.notify("Task created", {
      label: "Open",
      run: () => {
        const p = new URLSearchParams(loc.search);
        p.set("task", id);
        nav(loc.pathname + "?" + p);
      },
    });
  };
  return (
    <Modal
      title={d.parentId ? "Create subtask" : "Create Task"}
      width={600}
      onClose={ui.close}
    >
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.stopPropagation();
            submit(e);
          }
        }}
      >
        <div className="modal-body create-task">
          <label>
            Location
            <input
              placeholder="Search lists"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              aria-label="List"
              value={form.listId}
              onChange={(e) =>
                patch({ listId: e.target.value, status: "", sprintId: null })
              }
            >
              {state.lists
                .filter(
                  (l) =>
                    !l.archived &&
                    l.name.toLowerCase().includes(q.toLowerCase()),
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {state.spaces.find((s) => s.id === l.spaceId)?.name} /{" "}
                    {l.name}
                  </option>
                ))}
            </select>
          </label>
          <input
            autoFocus
            className={"task-name-input " + (error ? "error" : "")}
            placeholder="Task Name"
            aria-label="Task Name"
            value={form.name}
            onChange={(e) => {
              patch({ name: e.target.value });
              setError("");
            }}
          />
          {error && <p className="error-text">{error}</p>}
          <textarea
            placeholder="Add description"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
          <div className="chips wrap">
            <FieldPicker field="status" task={task} onChange={patch}>
              <StatusPill task={task} />
            </FieldPicker>
            <FieldPicker field="assigneeIds" task={task} onChange={patch}>
              <AvatarStack ids={form.assigneeIds} />
            </FieldPicker>
            <FieldPicker field="dueDate" task={task} onChange={patch}>
              <Icon name="Calendar" />
              <DateChip value={task.dueDate} task={task} />
            </FieldPicker>
            <FieldPicker field="priority" task={task} onChange={patch}>
              <Priority value={task.priority} />
            </FieldPicker>
            <FieldPicker field="tags" task={task} onChange={patch}>
              <Icon name="Tag" />
              Tags {form.tags.length || ""}
            </FieldPicker>
            {sprintList && (
              <>
                <FieldPicker field="sprintPoints" task={task} onChange={patch}>
                  ◆ {form.sprintPoints ?? "Sprint Points"}
                </FieldPicker>
                <FieldPicker field="sprintId" task={task} onChange={patch}>
                  {state.sprints.find((s) => s.id === form.sprintId)?.name ||
                    "Sprint"}
                </FieldPicker>
              </>
            )}
          </div>
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button variant="primary" type="submit">
            Create Task
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function TimeForm({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    entry = state.timeEntries.find((e) => e.id === d.entryId),
    timer = state.timer,
    [tab, setTab] = useState(d.tab || (entry ? "Manual" : "Timer")),
    [duration, setDuration] = useState(
      entry ? formatDuration(entry.duration) : "",
    ),
    [date, setDate] = useState(entry ? dateKey(entry.start) : dateKey()),
    [taskId, setTaskId] = useState(
      entry?.taskId || d.taskId || timer?.taskId || "",
    ),
    [showWhen, setShowWhen] = useState(!!entry),
    [description, setDescription] = useState(
      entry?.description || timer?.description || "",
    ),
    [billable, setBillable] = useState(
      entry?.billable ??
        (tab === "Timer" ? timer?.billable : undefined) ??
        billableDefault(state, taskId),
    ),
    [tags, setTags] = useState(arr(entry?.tagIds || timer?.tagIds)),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const seconds =
      tab === "Range"
        ? (+new Date(end) - +new Date(start)) / 1000
        : parseDuration(duration),
    valid = seconds > 0 && (tab !== "Range" || seconds <= 86400),
    running = tab === "Timer" && timer;
  const save = (e) => {
    e.preventDefault();
    if (tab === "Timer") {
      if (timer) {
        actions.act("TIMER_STOP");
        ui.notify("Time tracked");
      } else
        actions.act("TIMER_START", {
          taskId: taskId || null,
          description,
          billable,
          tagIds: tags,
        });
      ui.close();
      return;
    }
    if (!valid) return;
    let begin;
    if (tab === "Range") begin = new Date(start).toISOString();
    else if (entry) {
      const x = new Date(entry.start);
      const y = new Date(date + "T12:00");
      x.setFullYear(y.getFullYear(), y.getMonth(), y.getDate());
      begin = x.toISOString();
    } else {
      const x = new Date();
      const y = new Date(date + "T12:00");
      x.setFullYear(y.getFullYear(), y.getMonth(), y.getDate());
      begin = new Date(+x - seconds * 1000).toISOString();
    }
    const p = {
      taskId: taskId || null,
      start: begin,
      duration: seconds,
      description,
      billable,
      tagIds: tags,
    };
    if (entry) actions.act("EDIT_TIME", { id: entry.id, patch: p });
    else actions.act("ADD_TIME", p);
    ui.close();
    ui.notify("Time saved");
  };
  return (
    <Modal
      title={entry ? "Edit time entry" : "Track time"}
      width={360}
      className="time-tracker"
      onClose={ui.close}
    >
      <form onSubmit={save}>
        <div className="modal-body">
          <div className="tabs">
            {["Timer", "Manual", "Range"]
              .filter((x) => !entry || x !== "Timer")
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  <Icon
                    name={
                      { Timer: "Timer", Manual: "Pencil", Range: "ArrowLeft" }[
                        t
                      ]
                    }
                    size={15}
                  />
                  {t}
                </button>
              ))}
          </div>
          {tab === "Timer" ? (
            <div className="timer-display">
              {running ? "Timer is running" : "0:00:00"}
            </div>
          ) : tab === "Manual" ? (
            <label className="time-input">
              <span className="sr-only">Duration</span>
              <Icon name="Clock" />
              <input
                autoFocus
                placeholder="Enter time e.g. 3 hours 20 mins"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {duration && (
                <small className={valid ? "muted" : "error-text"}>
                  {valid
                    ? "= " + formatDuration(seconds)
                    : "Invalid time format"}
                </small>
              )}
            </label>
          ) : (
            <>
              <label>
                Start
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </label>
              <label>
                End
                <input
                  type="datetime-local"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
                {start && end && !valid && (
                  <small className="error-text">
                    End must follow start, up to 24 hours.
                  </small>
                )}
              </label>
            </>
          )}
          <Popover
            label="Select task"
            className="time-task-picker"
            trigger={
              <>
                <Icon name="CircleCheck" />
                <span className="ellipsis">
                  {state.tasks.find((task) => task.id === taskId)?.name ||
                    "Select task..."}
                </span>
                <Icon name="ChevronDown" size={14} />
              </>
            }
          >
            {(close) => (
              <SearchPicker
                placeholder="Search tasks"
                items={[
                  { value: "", label: "No task" },
                  ...visibleTasks(state).map((task) => ({
                    value: task.id,
                    label: task.name,
                  })),
                ]}
                onPick={(value) => {
                  setTaskId(value);
                  if (!entry) setBillable(billableDefault(state, value));
                  close();
                }}
              />
            )}
          </Popover>
          <label className="time-input">
            <span className="sr-only">Note</span>
            <Icon name="AlignLeft" />
            <input
              placeholder="Enter a note"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (running)
                  actions.act("TIMER_EDIT", { description: e.target.value });
              }}
            />
          </label>
          <div className="time-options">
            {tab === "Manual" && (
              <button
                type="button"
                className="time-when"
                onClick={() => setShowWhen((value) => !value)}
                aria-expanded={showWhen}
              >
                When:{" "}
                <u>{date === dateKey() && !entry ? "now" : shortDate(date)}</u>
              </button>
            )}
            <div className="grow" />
            <Popover
              label="Time tags"
              trigger={
                <>
                  <Icon name="Tag" />
                  {tags.length > 0 && <small>{tags.length}</small>}
                </>
              }
            >
              {state.timeTags.length ? (
                state.timeTags.map((tag) => (
                  <label className="check" key={tag.id}>
                    <input
                      type="checkbox"
                      checked={tags.includes(tag.id)}
                      onChange={() => {
                        const value = tags.includes(tag.id)
                          ? tags.filter((id) => id !== tag.id)
                          : [...tags, tag.id];
                        setTags(value);
                        if (running)
                          actions.act("TIMER_EDIT", { tagIds: value });
                      }}
                    />
                    {tag.name}
                  </label>
                ))
              ) : (
                <p className="muted">No time tags</p>
              )}
            </Popover>
            <button
              type="button"
              className={"time-billable " + (billable ? "active" : "")}
              aria-label="Billable"
              title="Billable"
              aria-pressed={billable}
              onClick={() => {
                setBillable(!billable);
                if (running) actions.act("TIMER_EDIT", { billable: !billable });
              }}
            >
              $
            </button>
          </div>
          {tab === "Manual" && showWhen && (
            <label>
              When
              <input
                aria-label="When"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
        </div>
        <footer>
          {running && (
            <Button
              variant="danger-text"
              onClick={() => {
                actions.act("TIMER_DISCARD");
                ui.close();
              }}
            >
              Discard
            </Button>
          )}
          <Button onClick={ui.close}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={tab !== "Timer" && !valid}
          >
            {tab === "Timer"
              ? running
                ? "Stop timer"
                : "Start timer"
              : "Save"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function GlobalSearch() {
  const ui = useUI(),
    { state } = useStore(),
    nav = useNav(),
    [q, setQ] = useState(""),
    [index, setIndex] = useState(0);
  const results = [];
  const add = (group, items, label, path, icon) =>
    items
      .filter((x) => String(label(x)).toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8)
      .forEach((x) =>
        results.push({ group, id: x.id, label: label(x), path: path(x), icon }),
      );
  if (q) {
    add(
      "Tasks",
      visibleTasks(state),
      (x) => x.name + " " + x.id,
      (x) => "/t/" + x.id,
      "CircleCheck",
    );
    add(
      "Docs",
      state.docs.filter((d) => !d.deleted),
      (x) => x.title || "Untitled",
      (x) => "/d/" + x.id,
      "FileText",
    );
    add(
      "Pages",
      state.docPages,
      (x) => x.title || "Untitled",
      (x) => "/d/" + x.docId + "/" + x.id,
      "File",
    );
    add(
      "Lists",
      state.lists,
      (x) => x.name,
      (x) => "/l/" + x.id,
      "List",
    );
    add(
      "Spaces",
      state.spaces,
      (x) => x.name,
      (x) => "/s/" + x.id,
      "Layers",
    );
    add(
      "People",
      state.users,
      (x) => x.name,
      (x) => "/everything?assignee=" + x.id,
      "UserRound",
    );
  } else
    ui.recent.forEach((r) => {
      const x = arr(state[r.type === "task" ? "tasks" : "docs"]).find(
        (x) => x.id === r.id,
      );
      if (x)
        results.push({
          group: "Recent",
          id: x.id,
          label: x.name || x.title,
          path: "/" + (r.type === "task" ? "t" : "d") + "/" + x.id,
          icon: r.type === "task" ? "CircleCheck" : "FileText",
        });
    });
  const pick = (r) => {
    ui.close();
    nav(r.path);
    if (r.path.startsWith("/t/")) ui.remember("task", r.id);
    if (r.path.startsWith("/d/")) ui.remember("doc", r.id);
  };
  return (
    <Modal title="Search" width={640} onClose={ui.close}>
      <div className="search-palette">
        <input
          autoFocus
          placeholder="Search tasks, docs, people, and more…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(results.length - 1, i + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter" && results[index]) pick(results[index]);
          }}
        />
        <div className="search-results">
          {results.map((r, i) => (
            <div key={r.group + r.id}>
              {results[i - 1]?.group !== r.group && (
                <div className="section-label">{r.group}</div>
              )}
              <button
                className={"menu-item " + (index === i ? "selected" : "")}
                onMouseEnter={() => setIndex(i)}
                onClick={() => pick(r)}
              >
                <Icon name={r.icon} />
                <span>{r.label}</span>
              </button>
            </div>
          ))}
          {!results.length && (
            <p className="muted">
              {q
                ? "No results found"
                : "Your recently opened work appears here."}
            </p>
          )}
        </div>
        <hr />
        {[
          ["Create task", "taskCreate"],
          ["Create doc", "docCreate"],
          ["Track time", "time"],
        ].map(([label, type]) => (
          <button
            key={type}
            className="menu-item"
            onClick={() => ui.open(type)}
          >
            <Icon name="Plus" />
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
function CreateSprints({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    folder = state.folders.find((f) => f.id === d.folderId),
    days = folder?.sprintSettings?.durationDays || 14,
    last = state.sprints
      .filter((s) => s.folderId === d.folderId)
      .sort((a, b) => b.index - a.index)[0],
    [offset, setOffset] = useState(0),
    [count, setCount] = useState(1),
    valid = Number.isInteger(+count) && +count >= 1 && +count <= 10;
  return (
    <Modal title="Create Sprints" onClose={ui.close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) {
            actions.act("CREATE_SPRINTS", {
              folderId: d.folderId,
              count: +count,
              startDate: plusDays(
                nextSprintStart(last?.endDate, folder?.sprintSettings),
                offset * days,
              ),
            });
            ui.close();
          }
        }}
      >
        <div className="modal-body">
          <p>Please select your dates to use for this sprint.</p>
          <label>
            Select sprint dates
            <select value={offset} onChange={(e) => setOffset(+e.target.value)}>
              {Array.from({ length: 6 }, (_, i) => (
                <option key={i} value={i}>
                  Sprint {(last?.index || 0) + i + 1} ·{" "}
                  {shortDate(
                    plusDays(
                      nextSprintStart(last?.endDate, folder?.sprintSettings),
                      i * days,
                    ),
                  )}{" "}
                  –{" "}
                  {shortDate(
                    plusDays(
                      nextSprintStart(last?.endDate, folder?.sprintSettings),
                      (i + 1) * days - 1,
                    ),
                  )}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            You can edit sprint names via sprint settings.
          </p>
          <label>
            How many sprints do you want to create?
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            {!valid && (
              <small className="error-text">
                Enter a whole number from 1 to 10.
              </small>
            )}
          </label>
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!valid}>
            Create
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function CompleteSprint({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    sp = state.sprints.find((s) => s.id === d.id),
    tasks = visibleTasks(state).filter(
      (t) => t.sprintId === sp?.id && !t.parentId,
    ),
    done = tasks.filter((t) => isClosed(state, t)),
    unfinished = tasks.filter((t) => !isClosed(state, t)),
    next = state.sprints
      .filter(
        (s) =>
          s.folderId === sp.folderId &&
          s.status === "not_started" &&
          s.index > sp.index,
      )
      .sort((a, b) => a.index - b.index)[0],
    f = state.folders.find((f) => f.id === sp.folderId),
    [ids, setIds] = useState(unfinished.map((t) => t.id)),
    [target, setTarget] = useState(
      f?.sprintSettings?.automations?.moveSpilloverToNext
        ? next?.id || "create"
        : "backlog",
    );
  return (
    <Modal title={"Complete Sprint " + sp.index} width={580} onClose={ui.close}>
      <div className="modal-body">
        <p>
          {done.length} of {tasks.length} tasks completed ·{" "}
          {done.reduce((a, t) => a + (t.sprintPoints || 0), 0)} of{" "}
          {tasks.reduce((a, t) => a + (t.sprintPoints || 0), 0)} points
        </p>
        {unfinished.length > 0 && (
          <>
            <div className="scroll-box">
              {unfinished.map((t) => (
                <label className="check" key={t.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(t.id)}
                    onChange={() =>
                      setIds((x) =>
                        x.includes(t.id)
                          ? x.filter((y) => y !== t.id)
                          : [...x, t.id],
                      )
                    }
                  />
                  {t.name}
                </label>
              ))}
            </div>
            <label>
              Move unfinished tasks to
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {state.sprints
                  .filter(
                    (s) =>
                      s.folderId === sp.folderId && s.status === "not_started",
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                {!next && (
                  <option value="create">
                    Create Sprint {sp.index + 1} and move
                  </option>
                )}
                <option value="backlog">Backlog</option>
                <option value="">Keep in Sprint {sp.index}</option>
              </select>
            </label>
          </>
        )}
        <p className="warning-text">This action cannot be undone.</p>
      </div>
      <footer>
        <Button onClick={ui.close}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            actions.act("SPRINT_COMPLETE", { id: sp.id, ids, target });
            ui.close();
            ui.notify("Sprint completed");
          }}
        >
          Complete Sprint
        </Button>
      </footer>
    </Modal>
  );
}
function SprintSettings({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    f = state.folders.find((f) => f.id === (d.folderId || d.id)),
    [form, setForm] = useState({ ...f?.sprintSettings });
  const patch = (p) => setForm((v) => ({ ...v, ...p })),
    automation = (p) => patch({ automations: { ...form.automations, ...p } });
  return (
    <Modal title="Sprint settings" width={620} onClose={ui.close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          actions.act("SPRINT_SETTINGS", { id: f.id, settings: form });
          ui.close();
        }}
      >
        <div className="modal-body">
          <label>
            Name template
            <input
              value={form.nameTemplate || ""}
              onChange={(e) => patch({ nameTemplate: e.target.value })}
            />
            <small className="muted">
              Use {"{INDEX}"}, {"{START_DATE}"}, {"{END_DATE}"}
            </small>
          </label>
          <div className="form-grid">
            <label>
              Sprint duration
              <select
                value={form.durationDays || 14}
                onChange={(e) => patch({ durationDays: +e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option value={n * 7} key={n}>
                    {n} week{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start day
              <select
                value={form.startDay || "monday"}
                onChange={(e) => patch({ startDay: e.target.value })}
              >
                {[
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].map((x) => (
                  <option key={x} value={x}>
                    {x[0].toUpperCase() + x.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Date format
            <select
              value={form.dateFormat || "M/D"}
              onChange={(e) => patch({ dateFormat: e.target.value })}
            >
              <option>M/D</option>
              <option>YYYY-MM-DD</option>
            </select>
          </label>
          <label>
            Measure of effort
            <select
              value={form.measureOfEffort || "sprint_points"}
              onChange={(e) => patch({ measureOfEffort: e.target.value })}
            >
              <option value="sprint_points">Sprint Points</option>
              <option value="time_estimates">Time Estimates</option>
            </select>
          </label>
          <h3>Sprints Automation</h3>
          <label className="check">
            <input
              type="checkbox"
              checked={!!form.automations?.autoCreate}
              onChange={(e) => automation({ autoCreate: e.target.checked })}
            />
            Create new sprints automatically
          </label>
          {form.automations?.autoCreate && (
            <label>
              Always create the next N sprints
              <input
                type="number"
                min="1"
                max="10"
                value={form.automations.autoCreateCount || 2}
                onChange={(e) =>
                  automation({
                    autoCreateCount: Math.max(1, Math.min(10, +e.target.value)),
                  })
                }
              />
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={!!form.automations?.autoMarkDone}
              onChange={(e) => automation({ autoMarkDone: e.target.checked })}
            />
            Automatically mark sprints as Done
          </label>
          <small className="muted">Takes effect at 11:59 PM on end date.</small>
          <label className="check">
            <input
              type="checkbox"
              checked={!!form.automations?.moveSpilloverToNext}
              onChange={(e) =>
                automation({ moveSpilloverToNext: e.target.checked })
              }
            />
            Move unfinished (spillover) tasks to next sprint
          </label>
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function SprintDates({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    sp = state.sprints.find((x) => x.id === d.id),
    [start, setStart] = useState(sp.startDate),
    [end, setEnd] = useState(sp.endDate);
  return (
    <Modal title="Edit sprint dates" onClose={ui.close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!start || !end || end < start) return;
          actions.act("SPRINT_EDIT", {
            id: sp.id,
            patch: { startDate: start, endDate: end },
          });
          ui.close();
        }}
      >
        <div className="modal-body">
          <label>
            Start date
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
            {end && start && end < start && (
              <small className="error-text">
                End date must be on or after the start date.
              </small>
            )}
          </label>
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!start || !end || end < start}
          >
            Save
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function ShareDoc({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    doc = state.docs.find((x) => x.id === d.id),
    sharing = doc.sharing || {},
    [q, setQ] = useState("");
  const patch = (p) =>
    actions.act("UPDATE_DOC", {
      id: d.id,
      patch: { sharing: { ...sharing, ...p } },
    });
  return (
    <Modal title="Share this Doc" width={540} onClose={ui.close}>
      <div className="modal-body">
        <label>
          Invite by name
          <input
            placeholder="Invite by name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {q &&
          state.users
            .filter(
              (u) =>
                u.name.toLowerCase().includes(q.toLowerCase()) &&
                !arr(sharing.memberIds).includes(u.id),
            )
            .map((u) => (
              <button
                className="menu-item"
                key={u.id}
                onClick={() => {
                  patch({
                    memberIds: [...arr(sharing.memberIds), u.id],
                    memberPermissions: {
                      ...sharing.memberPermissions,
                      [u.id]: "edit",
                    },
                  });
                  setQ("");
                }}
              >
                <Avatar user={u} />
                {u.name}
              </button>
            ))}
        {arr(sharing.memberIds).map((id) => (
          <div className="share-member" key={id}>
            <Avatar id={id} />
            <span>{state.users.find((u) => u.id === id)?.name || id}</span>
            <select
              aria-label={"Permission for " + id}
              value={sharing.memberPermissions?.[id] || "edit"}
              onChange={(e) =>
                patch({
                  memberPermissions: {
                    ...sharing.memberPermissions,
                    [id]: e.target.value,
                  },
                })
              }
            >
              {[
                ["full", "Full edit"],
                ["edit", "Can edit"],
                ["comment", "Can comment"],
                ["view", "Can view"],
              ].map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              className="icon-btn"
              aria-label="Remove member"
              onClick={() =>
                patch({ memberIds: sharing.memberIds.filter((x) => x !== id) })
              }
            >
              <Icon name="X" />
            </button>
          </div>
        ))}
        <label>
          Workspace
          <select
            value={sharing.visibility || "workspace"}
            onChange={(e) => patch({ visibility: e.target.value })}
          >
            <option value="workspace">Workspace can edit</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label>
          Default permission
          <select
            value={sharing.defaultPermission || "edit"}
            onChange={(e) => patch({ defaultPermission: e.target.value })}
          >
            <option value="edit">Can edit</option>
            <option value="comment">Can comment</option>
            <option value="view">Can view</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={!!sharing.publicLinkEnabled}
            onChange={(e) => patch({ publicLinkEnabled: e.target.checked })}
          />
          Share link publicly
        </label>
        {sharing.publicLinkEnabled && (
          <>
            <input
              readOnly
              value={"https://doc.clickup.com/9012/p/h/" + doc.id}
            />
            <Button
              onClick={() =>
                ui.copyText(
                  "https://doc.clickup.com/9012/p/h/" + doc.id,
                  "Link copied",
                )
              }
            >
              Copy link
            </Button>
          </>
        )}
      </div>
      <footer>
        <Button variant="primary" onClick={ui.close}>
          Done
        </Button>
      </footer>
    </Modal>
  );
}
function CreateEntity({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    [name, setName] = useState(""),
    [spaceId, setSpace] = useState(state.spaces[0]?.id || ""),
    [folderId, setFolder] = useState(""),
    [color, setColor] = useState("#3E63DD"),
    [template, setTemplate] = useState("standard");
  const type = d.entityType;
  return (
    <Modal title={"New " + type} onClose={ui.close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const collection =
              type === "Space"
                ? "spaces"
                : type === "List"
                  ? "lists"
                  : "folders",
            record = {
              id: uid(
                collection === "spaces"
                  ? "sp"
                  : collection === "lists"
                    ? "li"
                    : "fd",
              ),
              name: name.trim(),
              createdAt: now(),
              orderIndex: arr(state[collection]).length * 1000,
              color,
            };
          if (type === "Space") {
            record.icon = name[0];
            record.statuses = (
              state.spaces[0]?.statuses || [
                { name: "to do", color: "#87909E", type: "open" },
              ]
            )
              .filter(
                (st) =>
                  template !== "simple" || ["open", "done"].includes(st.type),
              )
              .map((s, i) => ({ ...s, id: uid("st"), orderIndex: i }));
            record.memberIds = state.users.map((u) => u.id);
          } else {
            record.spaceId = spaceId;
            if (type === "List") record.folderId = folderId || null;
            else record.isSprintFolder = type === "Sprint Folder";
          }
          actions.act("ADD_ENTITY", { collection, record });
          ui.close();
        }}
      >
        <div className="modal-body">
          <label>
            Name
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          {type === "Space" ? (
            <label>
              Statuses template
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="standard">Standard workflow</option>
                <option value="simple">Simple workflow</option>
              </select>
            </label>
          ) : (
            <label>
              Space
              <select
                value={spaceId}
                onChange={(e) => setSpace(e.target.value)}
              >
                {state.spaces.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "List" && (
            <label>
              Folder
              <select
                value={folderId}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="">No folder</option>
                {state.folders
                  .filter((f) => f.spaceId === spaceId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
        <footer>
          <Button onClick={ui.close}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!name.trim() || (type !== "Space" && !spaceId)}
          >
            Create
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function Statuses({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    sp = state.spaces.find((s) => s.id === d.spaceId),
    [statuses, setStatuses] = useState(arr(sp?.statuses));
  const patch = (i, p) =>
    setStatuses((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <Modal title="Edit statuses" width={620} onClose={ui.close}>
      <div className="modal-body">
        {statuses.map((st, i) => (
          <div className="status-editor" key={st.id}>
            <input
              aria-label="Status color"
              type="color"
              value={st.color}
              onChange={(e) => patch(i, { color: e.target.value })}
            />
            <input
              aria-label="Status name"
              value={st.name}
              onChange={(e) => patch(i, { name: e.target.value.toLowerCase() })}
            />
            <select
              value={st.type}
              onChange={(e) => patch(i, { type: e.target.value })}
            >
              {["open", "custom", "done", "closed"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              className="icon-btn"
              disabled={!i}
              onClick={() =>
                setStatuses((xs) => {
                  const a = [...xs];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  return a;
                })
              }
            >
              <Icon name="ArrowUp" />
            </button>
          </div>
        ))}
        <Button
          icon="Plus"
          onClick={() =>
            setStatuses((xs) => [
              ...xs,
              {
                id: uid("st"),
                name: "new status",
                color: "#87909E",
                type: "custom",
              },
            ])
          }
        >
          Add status
        </Button>
      </div>
      <footer>
        <Button onClick={ui.close}>Cancel</Button>
        <Button
          variant="primary"
          disabled={
            statuses.some((st) => !st.name.trim()) ||
            new Set(statuses.map((st) => st.name)).size !== statuses.length
          }
          onClick={() => {
            actions.act("STATUSES", {
              id: sp.id,
              statuses: statuses.map((x, i) => ({ ...x, orderIndex: i })),
              renames: statuses
                .map((x) => [
                  sp.statuses.find((st) => st.id === x.id)?.name,
                  x.name,
                ])
                .filter(([a, b]) => a && a !== b),
            });
            ui.close();
          }}
        >
          Save
        </Button>
      </footer>
    </Modal>
  );
}
function Shortcuts() {
  const ui = useUI();
  return (
    <Modal title="Keyboard shortcuts" onClose={ui.close}>
      <div className="modal-body">
        {[
          ["⌘ K", "Search"],
          ["T", "Create task"],
          ["L / B / C", "List / Board / Calendar"],
          ["Esc", "Close dialog"],
          ["S", "Change status in task"],
          ["M", "Assign task to me"],
          ["⌘ Enter", "Submit form"],
        ].map(([key, label]) => (
          <div className="shortcut" key={key}>
            <span>{label}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
function SubmitSheet({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    [note, setNote] = useState(""),
    entries = state.timeEntries.filter(
      (e) =>
        e.userId === state.currentUserId &&
        dateKey(e.start) >= d.week &&
        dateKey(e.start) <= plusDays(d.week, 6),
    );
  return (
    <Modal title="Submit timesheet for approval" onClose={ui.close}>
      <div className="modal-body">
        <p>
          {shortDate(d.week)} – {shortDate(plusDays(d.week, 6))}
        </p>
        <h2>{formatDuration(sum(entries))}</h2>
        <p>
          Billable: {formatDuration(sum(entries.filter((e) => e.billable)))}
        </p>
        {Array.from({ length: 7 }, (_, i) => (
          <div className="shortcut" key={i}>
            <span>{shortDate(plusDays(d.week, i))}</span>
            <span>
              {formatDuration(
                sum(
                  entries.filter(
                    (e) => dateKey(e.start) === plusDays(d.week, i),
                  ),
                ),
              )}
            </span>
          </div>
        ))}
        <p>
          Approver:{" "}
          {arr(state.timesheetSettings.approvers?.[state.currentUserId])
            .map((id) => state.users.find((u) => u.id === id)?.name || id)
            .join(", ") || "No approver assigned"}
        </p>
        <label>
          Optional note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <footer>
        <Button onClick={ui.close}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            actions.act("SUBMIT_TIMESHEET", { week: d.week, comment: note });
            ui.close();
          }}
        >
          Submit
        </Button>
      </footer>
    </Modal>
  );
}
function ReviewSheet({ data: d }) {
  const { actions } = useStore(),
    ui = useUI(),
    [comment, setComment] = useState("");
  return (
    <Modal title="Request changes" onClose={ui.close}>
      <div className="modal-body">
        <label>
          What needs to change?
          <textarea
            autoFocus
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {!comment.trim() && (
            <small className="error-text">A comment is required.</small>
          )}
        </label>
      </div>
      <footer>
        <Button onClick={ui.close}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!comment.trim()}
          onClick={() => {
            actions.act("REVIEW_TIMESHEET", {
              id: d.id,
              status: "changes_requested",
              comment,
            });
            ui.close();
          }}
        >
          Request changes
        </Button>
      </footer>
    </Modal>
  );
}
