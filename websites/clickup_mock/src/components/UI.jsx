import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlignLeft,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Archive,
  Bell,
  BookOpen,
  Calendar,
  ChartGantt,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePlus,
  Clock,
  Columns3,
  Copy,
  CopyPlus,
  Diamond,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  File,
  FilePlus,
  FileText,
  Filter,
  Flag,
  Folder,
  FolderInput,
  GitBranch,
  Globe,
  GripVertical,
  Heart,
  Hourglass,
  House,
  Inbox,
  IterationCw,
  Layers,
  LayoutDashboard,
  Link,
  List,
  ListFilter,
  Lock,
  Mail,
  MailOpen,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Paperclip,
  PanelLeft,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Settings2,
  Square,
  Star,
  Tag as TagIcon,
  Tags,
  Timer,
  Trash2,
  Type,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
const Icons = {
  Activity,
  AlignLeft,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Archive,
  Bell,
  BookOpen,
  Calendar,
  ChartGantt,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePlus,
  Clock,
  Columns3,
  Copy,
  CopyPlus,
  Diamond,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  File,
  FilePlus,
  FileText,
  Filter,
  Flag,
  Folder,
  FolderInput,
  GitBranch,
  Globe,
  GripVertical,
  Heart,
  Hourglass,
  House,
  Inbox,
  IterationCw,
  Layers,
  LayoutDashboard,
  Link,
  List,
  ListFilter,
  Lock,
  Mail,
  MailOpen,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Paperclip,
  PanelLeft,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Settings2,
  Square,
  Star,
  Tag: TagIcon,
  Tags,
  Timer,
  Trash2,
  Type,
  UserRound,
  UsersRound,
  X,
  Zap,
};
import {
  arr,
  formatDuration,
  relativeDate,
  dateKey,
  plusDays,
  uid,
} from "../utils/format.js";
import { useStore } from "../store/AppStore.jsx";
import { statusOf, isClosed, locationOf } from "../utils/tasks.js";
export function Icon({ name, size = 16, ...props }) {
  const C = Icons[name] || Icons.Circle;
  return <C size={size} strokeWidth={1.75} {...props} />;
}
const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);
export function UIProvider({ children }) {
  const [dialog, setDialog] = useState(null),
    [toast, setToast] = useState(null),
    [recent, setRecent] = useState([]);
  const notify = (message, action) =>
    setToast({ message, action, id: Date.now() });
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const open = (type, data = {}) => setDialog({ type, ...data }),
    close = () => setDialog(null),
    remember = (type, id) =>
      setRecent((r) =>
        [{ type, id }, ...r.filter((x) => x.id !== id)].slice(0, 5),
      );
  return (
    <UIContext.Provider
      value={{
        dialog,
        open,
        close,
        notify,
        copyText: async (value, message = "Copied") => {
          try {
            if (!navigator.clipboard?.writeText)
              throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(value);
            notify(message);
          } catch {
            notify("Copy failed — " + value);
          }
        },
        recent,
        remember,
        confirm: (title, onConfirm, description = "") =>
          open("confirm", { title, onConfirm, description }),
        prompt: (title, value, onSave) =>
          open("prompt", { title, value, onSave }),
      }}
    >
      {children}
      {toast && (
        <div className="toast">
          {toast.message}
          {toast.action && (
            <button
              onClick={() => {
                toast.action.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </UIContext.Provider>
  );
}
export function Avatar({ id, user, size = 24 }) {
  const { state } = useStore();
  user = user ||
    state.users.find((u) => u.id === id) || {
      name: "Unassigned",
      initials: "?",
      color: "#ddd",
    };
  return (
    <span
      className="avatar"
      title={user.name}
      style={{
        width: size,
        height: size,
        background: user.color || "#7B68EE",
        fontSize: size < 25 ? 10 : 12,
      }}
    >
      {user.initials ||
        arr(user.name?.split(" "))
          .map((s) => s[0])
          .join("") ||
        "?"}
    </span>
  );
}
export function AvatarStack({ ids = [] }) {
  return (
    <span className="avatar-stack">
      {arr(ids)
        .slice(0, 3)
        .map((id) => (
          <Avatar key={id} id={id} />
        ))}
      {!ids?.length && (
        <span className="empty-avatar">
          <Icon name="UserRound" size={14} />
        </span>
      )}
      {ids?.length > 3 && <span>+{ids.length - 3}</span>}
    </span>
  );
}
export function StatusIcon({ task }) {
  const { state } = useStore(),
    st = statusOf(state, task);
  return (
    <span
      className={
        "status-icon " +
        (isClosed(state, task) ? "done" : st.type === "open" ? "open" : "")
      }
      style={{
        color: st.color,
        background: isClosed(state, task) ? st.color : undefined,
      }}
    >
      {isClosed(state, task) && <Icon name="Check" size={10} />}
    </span>
  );
}
export function StatusPill({ task, status }) {
  const { state } = useStore(),
    st = status || statusOf(state, task);
  return (
    <span
      className="status-pill"
      style={{
        background: st.type === "open" ? "#F0F0F0" : st.color || "#87909E",
        color: st.type === "open" ? "#646464" : "white",
      }}
    >
      {st.name}
    </span>
  );
}
export function Priority({ value, label = true }) {
  return (
    <span
      className="priority"
      style={{
        color:
          {
            urgent: "#C62A2F",
            high: "#E5AD12",
            normal: "#3E63DD",
            low: "#838383",
          }[value] || "#BBB",
      }}
    >
      <Icon name="Flag" size={14} fill={value ? "currentColor" : "none"} />
      {label && (
        <span>{value ? value[0].toUpperCase() + value.slice(1) : "Empty"}</span>
      )}
    </span>
  );
}
export function Tag({ name }) {
  const { state } = useStore(),
    t = state.tags.find((t) => t.name === name);
  return (
    <span
      className="tag"
      style={{ color: t?.fg || "#646464", background: t?.bg || "#F0F0F0" }}
    >
      {name}
    </span>
  );
}
export function DateChip({ value, task }) {
  const { state } = useStore();
  return (
    <span
      className={
        value && value <= dateKey() && !isClosed(state, task)
          ? "overdue"
          : value === plusDays(dateKey(), 1)
            ? "tomorrow"
            : !value
              ? "muted"
              : ""
      }
    >
      {relativeDate(value)}
    </span>
  );
}
export function Button({
  children,
  icon,
  type = "button",
  variant = "",
  className = "",
  ...props
}) {
  return (
    <button type={type} className={`btn ${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} />} {children}
    </button>
  );
}
export function Empty({ title = "No results", text, action }) {
  return (
    <div className="empty">
      <Icon name="Inbox" size={45} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  width = 480,
  className = "",
}) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + className}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const form = e.currentTarget.querySelector("form");
            if (form) form.requestSubmit();
            else
              e.currentTarget
                .querySelector("footer .btn.primary:not(:disabled)")
                ?.click();
          }
        }}
        style={{ width }}
      >
        <header>
          <strong>{title}</strong>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="X" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
const PopoverPath = createContext([]);
export function Popover({ trigger, children, label, className = "" }) {
  const ancestors = useContext(PopoverPath),
    id = useId(),
    path = [...ancestors, id];
  const [open, setOpen] = useState(false),
    [pos, setPos] = useState({}),
    ref = useRef(null),
    pop = useRef(null);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const r = ref.current.getBoundingClientRect(),
        bounds = pop.current.getBoundingClientRect(),
        width = bounds.width,
        below = window.innerHeight - r.bottom - 13,
        above = r.top - 13,
        flip =
          below <
            Math.min(Math.max(pop.current.scrollHeight, bounds.height), 260) &&
          above > below;
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        ...(flip
          ? { bottom: Math.max(8, window.innerHeight - r.top + 5) }
          : {
              top: Math.max(8, Math.min(r.bottom + 5, window.innerHeight - 8)),
            }),
        maxHeight: Math.max(0, flip ? above : below),
      });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
        const path = e.target.closest?.("[data-popover-path]")?.dataset
          .popoverPath;
        if (path?.split(" ").includes(id)) return;
        if (
          !pop.current?.contains(e.target) &&
          !ref.current?.contains(e.target)
        )
          setOpen(false);
      },
      key = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key, true);
    };
  }, [open, id]);
  const toggle = (e) => {
    e?.stopPropagation();
    setOpen((v) => !v);
  };
  return (
    <PopoverPath.Provider value={path}>
      <span ref={ref} className={"popover-anchor " + className}>
        <button
          type="button"
          className="trigger"
          aria-label={label}
          aria-expanded={open}
          onClick={toggle}
        >
          {trigger}
        </button>
        {open &&
          createPortal(
            <div
              role="dialog"
              aria-label={label}
              ref={pop}
              className="popover"
              data-popover-path={path.join(" ")}
              style={pos}
              onClick={(e) => e.stopPropagation()}
            >
              {typeof children === "function"
                ? children(() => setOpen(false))
                : children}
            </div>,
            document.body,
          )}
      </span>
    </PopoverPath.Provider>
  );
}
export function Menu({
  trigger = <Icon name="Ellipsis" />,
  label = "More actions",
  items,
}) {
  return (
    <Popover trigger={trigger} label={label}>
      {(close) =>
        items.filter(Boolean).map((item, i) =>
          item.divider ? (
            <hr key={i} />
          ) : (
            <button
              className={"menu-item " + (item.danger ? "danger" : "")}
              key={i}
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                close();
                item.onClick?.();
              }}
            >
              <Icon name={item.icon || "ChevronRight"} />
              <span>{item.label}</span>
            </button>
          ),
        )
      }
    </Popover>
  );
}
export function SearchPicker({
  items,
  onPick,
  placeholder = "Search…",
  multi = [],
  empty = "No results",
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter((i) =>
    String(i.label || "")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <input
        autoFocus
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="picker-list">
        {filtered.map((i) => (
          <button
            key={i.value ?? i.label}
            className="menu-item"
            onClick={() => onPick(i.value)}
          >
            {i.icon}
            {i.color && (
              <span className="color-dot" style={{ background: i.color }} />
            )}
            <span>{i.label}</span>
            {multi.includes(i.value) && <Icon name="Check" />}
          </button>
        ))}
        {!filtered.length && <p className="muted">{empty}</p>}
      </div>
    </>
  );
}
export function FieldPicker({ field, task, onChange, children, label }) {
  const { state, actions } = useStore(),
    patch = onChange || ((p) => actions.updateTask(task.id, p)),
    { space } = locationOf(state, task);
  return (
    <Popover
      label={
        label ||
        "Edit " +
          ({
            assigneeIds: "Assignees",
            dueDate: "Due date",
            startDate: "Start date",
            sprintPoints: "Sprint Points",
            sprintId: "Sprint",
            timeEstimate: "Time estimate",
          }[field] || field)
      }
      trigger={
        children || (
          <span>
            {task[field] || "Empty"} <Icon name="ChevronDown" size={12} />
          </span>
        )
      }
    >
      {(close) => {
        if (field === "status")
          return (
            <SearchPicker
              items={arr(space?.statuses).map((st) => ({
                value: st.name,
                label: st.name.toUpperCase(),
                color: st.color,
              }))}
              onPick={(value) => {
                patch({ status: value });
                close();
              }}
            />
          );
        if (field === "priority")
          return (
            <>
              {["urgent", "high", "normal", "low", null].map((v) => (
                <button
                  key={v || "none"}
                  className="menu-item"
                  onClick={() => {
                    patch({ priority: v });
                    close();
                  }}
                >
                  <Priority value={v} />
                  {v === null && "Clear"}
                </button>
              ))}
            </>
          );
        if (field === "assigneeIds")
          return (
            <>
              <button
                className="menu-item"
                onClick={() =>
                  patch({
                    assigneeIds: [
                      ...new Set([
                        ...arr(task.assigneeIds),
                        state.currentUserId,
                      ]),
                    ],
                  })
                }
              >
                Assign to me
              </button>
              <SearchPicker
                items={state.users.map((u) => ({
                  value: u.id,
                  label: u.name,
                  icon: <Avatar user={u} />,
                }))}
                multi={arr(task.assigneeIds)}
                onPick={(v) =>
                  patch({
                    assigneeIds: arr(task.assigneeIds).includes(v)
                      ? task.assigneeIds.filter((x) => x !== v)
                      : [...arr(task.assigneeIds), v],
                  })
                }
              />
              <Button onClick={close}>Done</Button>
            </>
          );
        if (field === "dueDate" || field === "startDate")
          return (
            <div className="date-picker">
              <div>
                {[
                  ["Today", 0],
                  ["Tomorrow", 1],
                  ["Next week", 7],
                  ["2 weeks", 14],
                  ["4 weeks", 28],
                ].map(([name, n]) => (
                  <button
                    className="menu-item"
                    key={name}
                    onClick={() => {
                      patch({ [field]: plusDays(dateKey(), n) });
                      close();
                    }}
                  >
                    {name}
                  </button>
                ))}
                <button
                  className="menu-item"
                  onClick={() => {
                    patch({ [field]: null });
                    close();
                  }}
                >
                  Clear
                </button>
              </div>
              <div>
                <label>
                  Start date
                  <input
                    aria-label="Start date"
                    type="date"
                    value={task.startDate || ""}
                    onChange={(e) =>
                      patch({ startDate: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Due date
                  <input
                    aria-label="Due date"
                    type="date"
                    min={task.startDate || undefined}
                    value={task.dueDate || ""}
                    onChange={(e) => patch({ dueDate: e.target.value || null })}
                  />
                </label>
                <Button onClick={close}>Done</Button>
              </div>
            </div>
          );
        if (field === "sprintPoints")
          return (
            <>
              <div className="quick-points">
                {arr(state.workspace.sprintPointScale).map((n) => (
                  <Button
                    key={n}
                    onClick={() => {
                      patch({ sprintPoints: n });
                      close();
                    }}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="Custom points (0–100)"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    Number.isInteger(+e.target.value) &&
                    +e.target.value >= 0 &&
                    +e.target.value <= 100
                  ) {
                    patch({ sprintPoints: +e.target.value });
                    close();
                  }
                }}
              />
              <Button
                onClick={() => {
                  patch({ sprintPoints: null });
                  close();
                }}
              >
                Clear
              </Button>
            </>
          );
        if (field === "sprintId")
          return (
            <>
              <SearchPicker
                items={state.sprints
                  .filter((s) => s.status !== "done")
                  .map((s) => ({ value: s.id, label: s.name }))}
                onPick={(v) => {
                  patch({ sprintId: v });
                  close();
                }}
              />
              <button
                className="menu-item"
                onClick={() => {
                  patch({ sprintId: null });
                  close();
                }}
              >
                Remove from sprint
              </button>
            </>
          );
        if (field === "tags")
          return (
            <TagPicker
              value={arr(task.tags)}
              onChange={(tags) => patch({ tags })}
              spaceId={space?.id}
              onDone={close}
            />
          );
        return null;
      }}
    </Popover>
  );
}
export function TagPicker({ value, onChange, spaceId, onDone }) {
  const { state, dispatch } = useStore(),
    [q, setQ] = useState("");
  return (
    <>
      <input
        autoFocus
        placeholder="Search or create tags"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {state.tags
        .filter(
          (t) =>
            (!spaceId || t.spaceId === spaceId) &&
            t.name.includes(q.toLowerCase()),
        )
        .map((t) => (
          <button
            className="menu-item"
            key={t.name}
            onClick={() =>
              onChange(
                value.includes(t.name)
                  ? value.filter((x) => x !== t.name)
                  : [...value, t.name],
              )
            }
          >
            <Tag name={t.name} />
            {value.includes(t.name) && <Icon name="Check" />}
          </button>
        ))}
      {q && !state.tags.some((t) => t.name === q) && (
        <button
          className="menu-item"
          onClick={() => {
            dispatch({
              type: "ADD_TAG",
              payload: { name: q, spaceId, fg: "#8E4EC6", bg: "#F3E8FF" },
            });
            onChange([...value, q]);
            setQ("");
          }}
        >
          Create tag “{q}”
        </button>
      )}
      <Button onClick={onDone}>Done</Button>
    </>
  );
}
export function Favorite({ type, id }) {
  const { state, actions } = useStore(),
    active = state.favorites.some((f) => f.type === type && f.id === id);
  return (
    <button
      title={active ? "Remove from Favorites" : "Add to Favorites"}
      aria-label="Favorite"
      className="icon-btn"
      onClick={() => actions.act("FAVORITE", { type, id })}
    >
      <Icon
        name="Star"
        size={16}
        fill={active ? "#FFC53D" : "none"}
        color={active ? "#D9A300" : undefined}
      />
    </button>
  );
}
export function Progress({ value, total, color = "#7B68EE" }) {
  return (
    <div className="progress">
      <span
        style={{
          width: Math.min(100, total ? (value / total) * 100 : 0) + "%",
          background: color,
        }}
      />
    </div>
  );
}
export function EstimatePicker({ task, children }) {
  const { actions } = useStore();
  return (
    <Popover
      label="Time Estimate"
      trigger={children || formatDuration((task.timeEstimate || 0) * 60)}
    >
      {(close) => (
        <EstimateForm
          task={task}
          save={(v) => {
            actions.updateTask(task.id, { timeEstimate: v });
            close();
          }}
        />
      )}
    </Popover>
  );
}
import { parseDuration } from "../utils/format.js";
function EstimateForm({ task, save }) {
  const [v, setV] = useState(
    task.timeEstimate ? formatDuration(task.timeEstimate * 60) : "",
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseDuration(v);
        if (n) save(Math.round(n / 60));
      }}
    >
      <label>
        Time Estimate
        <input
          autoFocus
          placeholder="e.g. 2h 30m"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <Button onClick={() => save(null)}>Clear</Button>
        <Button variant="primary" type="submit" disabled={!parseDuration(v)}>
          Save
        </Button>
      </div>
    </form>
  );
}
