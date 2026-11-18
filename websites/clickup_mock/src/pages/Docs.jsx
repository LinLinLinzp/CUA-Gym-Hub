import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "../store/AppStore.jsx";
import { useNav, SLink, withSid } from "../utils/nav.jsx";
import { arr, uid, now, stamp, shortDate } from "../utils/format.js";
import {
  Icon,
  Button,
  Avatar,
  AvatarStack,
  Favorite,
  Menu,
  Popover,
  SearchPicker,
  Empty,
  Tag,
  useUI,
} from "../components/UI.jsx";
import { Comments, useTaskOpen } from "../components/TaskDetail.jsx";
const locationLabel = (state, location) =>
  location?.type === "workspace" || !location
    ? "Workspace"
    : arr(
        state[
          { space: "spaces", folder: "folders", list: "lists" }[location.type]
        ],
      ).find((x) => x.id === location.id)?.name || "Workspace";
export function DocMenu({ doc, focusTitle }) {
  const { state, actions } = useStore(),
    ui = useUI(),
    nav = useNav();
  const update = (patch) => actions.act("UPDATE_DOC", { id: doc.id, patch });
  return (
    <Menu
      label={"Actions for " + (doc.title || "Untitled")}
      items={[
        { label: "Open", onClick: () => nav("/d/" + doc.id) },
        {
          label: "Rename",
          onClick: () =>
            focusTitle
              ? focusTitle()
              : ui.prompt("Rename Doc", doc.title || "", (title) =>
                  update({ title }),
                ),
        },
        {
          label: "Favorite",
          icon: "Star",
          onClick: () => actions.act("FAVORITE", { type: "doc", id: doc.id }),
        },
        {
          label: doc.isWiki ? "Remove Wiki" : "Mark as Wiki",
          icon: "BookOpen",
          onClick: () => update({ isWiki: !doc.isWiki }),
        },
        {
          label: "Add tags",
          icon: "Tag",
          onClick: () =>
            ui.prompt(
              "Add tags (comma-separated)",
              arr(doc.tags).join(", "),
              (text) =>
                update({
                  tags: text
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                }),
            ),
        },
        {
          label: "Move",
          icon: "FolderInput",
          onClick: () => ui.open("docMove", { id: doc.id }),
        },
        {
          label: "Duplicate",
          icon: "Copy",
          onClick: () => {
            actions.act("DUPLICATE_DOC", { id: doc.id });
            ui.notify("Doc duplicated");
          },
        },
        {
          label: "Copy link",
          icon: "Link",
          onClick: () => {
            ui.copyText(
              window.location.origin + withSid("/d/" + doc.id),
              "Link copied",
            );
          },
        },
        {
          label: "Export",
          icon: "Download",
          onClick: () => ui.notify("Export started"),
        },
        {
          label: doc.archived ? "Unarchive" : "Archive",
          icon: "Archive",
          onClick: () => update({ archived: !doc.archived }),
        },
        {
          label: "Delete",
          danger: true,
          icon: "Trash2",
          onClick: () =>
            ui.confirm(
              "Delete Doc?",
              () => {
                update({
                  deleted: true,
                  deletedAt: now(),
                  deletedBy: state.currentUserId,
                });
                nav("/docs");
              },
              "This Doc will be moved to Trash.",
            ),
        },
      ]}
    />
  );
}
export function DocMoveDialog() {
  const { state, actions } = useStore(),
    ui = useUI(),
    d = ui.dialog;
  if (d?.type !== "docMove") return null;
  return <DocMoveContent data={d} />;
}
import { Modal } from "../components/UI.jsx";
function DocMoveContent({ data: d }) {
  const { state, actions } = useStore(),
    ui = useUI();
  const items = [
    { value: "workspace:", label: "Workspace" },
    ...["spaces", "folders", "lists"].flatMap((collection) =>
      state[collection].map((x) => ({
        value:
          { spaces: "space", folders: "folder", lists: "list" }[collection] +
          ":" +
          x.id,
        label: x.name,
      })),
    ),
  ];
  return (
    <Modal title="Move Doc" onClose={ui.close}>
      <div className="modal-body">
        <SearchPicker
          items={items}
          onPick={(value) => {
            const [type, id] = value.split(":");
            actions.act("UPDATE_DOC", {
              id: d.id,
              patch: { location: { type, id: id || null } },
            });
            ui.close();
          }}
        />
      </div>
    </Modal>
  );
}
export function DocsHub() {
  const { state } = useStore(),
    ui = useUI(),
    nav = useNav(),
    loc = useLocation(),
    [params] = useSearchParams(),
    tab = params.get("tab") || "all",
    [q, setQ] = useState(""),
    [sort, setSort] = useState("updatedAt"),
    [dir, setDir] = useState(-1);
  const docs = state.docs
      .filter(
        (d) =>
          !d.deleted &&
          (tab === "archived" ? d.archived : !d.archived) &&
          (tab === "mine"
            ? d.ownerId === state.currentUserId
            : tab === "wikis"
              ? d.isWiki
              : tab === "shared"
                ? d.ownerId !== state.currentUserId &&
                  (d.sharing?.visibility === "workspace" ||
                    arr(d.sharing?.memberIds).includes(state.currentUserId))
                : true) &&
          (d.title || "Untitled").toLowerCase().includes(q.toLowerCase()),
      )
      .sort(
        (a, b) =>
          String(a[sort] || "").localeCompare(String(b[sort] || "")) * dir,
      ),
    open = (d) => {
      ui.remember("doc", d.id);
      nav("/d/" + d.id);
    },
    sortBy = (field) => {
      setSort(field);
      setDir((v) => -v);
    };
  const card = (title, items) => (
    <div className="doc-recent-card">
      <h4>{title}</h4>
      {items.slice(0, 4).map((d) => (
        <button key={d.id} onClick={() => open(d)}>
          <span>{d.icon || "📄"}</span>
          <div>
            <strong>{d.title || "Untitled"}</strong>
            <small>{locationLabel(state, d.location)}</small>
          </div>
        </button>
      ))}
      {!items.length && <p className="muted">No Docs yet</p>}
    </div>
  );
  return (
    <div className="hub docs-hub">
      <div className="hub-header">
        <h2>Docs</h2>
        <div className="grow" />
        <div className="task-search">
          <Icon name="Search" />
          <input
            placeholder="Search Docs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          icon="Plus"
          onClick={() => ui.open("docCreate")}
        >
          New Doc
        </Button>
      </div>
      <div className="hub-tabs tabs">
        {[
          ["all", "All"],
          ["mine", "My Docs"],
          ["shared", "Shared with me"],
          ["wikis", "Wikis"],
          ["archived", "Archived"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => nav("/docs?tab=" + v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="hub-content">
        {tab === "all" && (
          <div className="doc-recents">
            {card(
              "Recent",
              [...docs].sort((a, b) =>
                String(b.lastViewedAt).localeCompare(String(a.lastViewedAt)),
              ),
            )}
            {card(
              "Favorites",
              docs.filter((d) =>
                state.favorites.some((f) => f.id === d.id && f.type === "doc"),
              ),
            )}
            {card(
              "Created by Me",
              docs.filter((d) => d.createdBy === state.currentUserId),
            )}
          </div>
        )}
        <table className="data-table docs-table">
          <thead>
            <tr>
              {[
                ["title", "Name"],
                ["location", "Location"],
                ["tags", "Tags"],
                ["updatedAt", "Date updated"],
                ["lastViewedAt", "Date viewed"],
                ["sharing", "Sharing"],
              ].map(([field, title]) => (
                <th key={field}>
                  <button onClick={() => sortBy(field)}>
                    {title}
                    <Icon name="ArrowDownUp" size={11} />
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <button className="doc-title-cell" onClick={() => open(d)}>
                    <span className="doc-icon">{d.icon || "📄"}</span>
                    {d.title || "Untitled"}
                    {d.isWiki && <span className="wiki-badge">Wiki</span>}
                  </button>
                </td>
                <td>{locationLabel(state, d.location)}</td>
                <td>
                  {arr(d.tags).map((t) => (
                    <Tag key={t} name={t} />
                  ))}
                </td>
                <td>{shortDate(d.updatedAt)}</td>
                <td>{shortDate(d.lastViewedAt)}</td>
                <td>
                  <div className="chips">
                    <Icon
                      name={
                        d.sharing?.visibility === "private" ? "Lock" : "Globe"
                      }
                      size={14}
                    />
                    <AvatarStack ids={arr(d.sharing?.memberIds)} />
                  </div>
                </td>
                <td>
                  <DocMenu doc={d} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!docs.length && (
          <Empty
            title="No Docs found"
            action={
              <Button onClick={() => ui.open("docCreate")}>+ New Doc</Button>
            }
          />
        )}
      </div>
      <DocMoveDialog />
    </div>
  );
}
const blockTypes = [
  ["h1", "Heading 1"],
  ["h2", "Heading 2"],
  ["h3", "Heading 3"],
  ["paragraph", "Text"],
  ["bullet", "Bulleted list"],
  ["numbered", "Numbered list"],
  ["todo", "Checklist"],
  ["quote", "Quote"],
  ["code", "Code block"],
  ["divider", "Divider"],
  ["callout", "Callout"],
  ["task_link", "Task"],
];
const gradients = [
  "linear-gradient(135deg,#8930FD,#49CCF9)",
  "linear-gradient(135deg,#FF02F0,#FFC800)",
  "linear-gradient(135deg,#12A594,#49CCF9)",
  "linear-gradient(135deg,#FFB224,#E5484D)",
  "linear-gradient(135deg,#3E63DD,#AB4ABA)",
  "linear-gradient(135deg,#87909E,#D9D9D9)",
];
const emojis = [
  "📘",
  "🗓️",
  "🔌",
  "🚨",
  "🚀",
  "✍️",
  "🎨",
  "🤝",
  "✅",
  "📝",
  "📄",
  "📚",
  "💡",
  "🎯",
  "⭐",
  "🧭",
  "🌱",
  "🏆",
  "📊",
  "🔧",
  "🌈",
  "💬",
  "🛠️",
  "🧪",
  "🔒",
  "⚡",
  "🎉",
  "📣",
  "🌍",
  "🔎",
  "🗂️",
  "💎",
  "📌",
  "🌟",
  "🧩",
  "📋",
  "🕒",
  "💻",
  "🏗️",
  "🍀",
];
export function DocEditor() {
  const { docId, pageId } = useParams(),
    { state, actions } = useStore(),
    ui = useUI(),
    nav = useNav(),
    openTask = useTaskOpen(),
    doc = state.docs.find((d) => d.id === docId && !d.deleted),
    pages = state.docPages
      .filter((p) => p.docId === docId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    page = pageId ? pages.find((p) => p.id === pageId) : pages[0],
    [showPages, setShowPages] = useState(true),
    [query, setQuery] = useState(""),
    [showComments, setComments] = useState(false),
    [commentContext, setCommentContext] = useState({}),
    [collapsed, setCollapsed] = useState({}),
    titleRef = useRef(null),
    viewed = useRef(null);
  useEffect(() => {
    if (doc && viewed.current !== docId) {
      viewed.current = docId;
      actions.act("VIEW_DOC", { id: docId });
      ui.remember("doc", docId);
    }
  }, [docId, doc]);
  const updatePage = (patch) =>
      actions.act("UPDATE_PAGE", { id: page.id, patch }),
    updateDoc = (patch) => actions.act("UPDATE_DOC", { id: docId, patch }),
    addPage = (parentPageId) => {
      const id = uid("pg");
      actions.act("CREATE_PAGE", { id, docId, parentPageId });
      nav(`/d/${docId}/${id}`);
    },
    blocks = arr(page?.blocks),
    setBlocks = (blocks) => updatePage({ blocks });
  if (!doc || !page)
    return <Empty title="This item doesn't exist or was deleted" />;
  const pageRow = (p, level = 0, seen = []) => {
    if (seen.includes(p.id)) return null;
    const children = pages.filter((x) => x.parentPageId === p.id);
    return (
      <div key={p.id}>
        <div
          className={"page-tree-row " + (p.id === page.id ? "active" : "")}
          style={{ paddingLeft: 8 + level * 14 }}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("page", p.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("page");
            const descendants = (root, visited = new Set()) => {
              if (visited.has(root)) return visited;
              visited.add(root);
              pages
                .filter((x) => x.parentPageId === root)
                .forEach((x) => descendants(x.id, visited));
              return visited;
            };
            if (id && id !== p.id && !descendants(id).has(p.id))
              actions.act("UPDATE_PAGE", {
                id,
                patch: {
                  parentPageId: e.shiftKey ? p.parentPageId || null : p.id,
                  orderIndex: e.shiftKey ? (p.orderIndex || 0) - 1 : Date.now(),
                },
              });
          }}
        >
          {children.length > 0 ? (
            <button
              className="caret"
              aria-label={
                (collapsed[p.id] ? "Expand " : "Collapse ") +
                (p.title || "Untitled")
              }
              onClick={() =>
                setCollapsed((xs) => ({ ...xs, [p.id]: !xs[p.id] }))
              }
            >
              <Icon
                name={collapsed[p.id] ? "ChevronRight" : "ChevronDown"}
                size={12}
              />
            </button>
          ) : (
            <Icon name="FileText" size={14} />
          )}
          <button
            className="grow ellipsis text-left"
            aria-label={"Open page " + (p.title || "Untitled")}
            onClick={() => nav(`/d/${docId}/${p.id}`)}
          >
            {p.icon || ""} {p.title || "Untitled"}
          </button>
          <button
            className="icon-btn"
            title="Add subpage"
            aria-label={"Add subpage to " + (p.title || "Untitled")}
            onClick={() => addPage(p.id)}
          >
            <Icon name="Plus" size={12} />
          </button>
          <Menu
            label={"Page actions " + (p.title || "Untitled")}
            items={[
              {
                label: "Rename",
                onClick: () =>
                  ui.prompt("Rename page", p.title || "", (title) =>
                    actions.act("UPDATE_PAGE", { id: p.id, patch: { title } }),
                  ),
              },
              {
                label: "Duplicate",
                onClick: () => actions.act("DUPLICATE_PAGE", { id: p.id }),
              },
              {
                label: "Move up",
                onClick: () => {
                  const siblings = pages.filter(
                      (x) => x.parentPageId === p.parentPageId,
                    ),
                    i = siblings.findIndex((x) => x.id === p.id),
                    prev = siblings[i - 1];
                  if (prev) {
                    actions.act("UPDATE_PAGE", {
                      id: p.id,
                      patch: { orderIndex: prev.orderIndex },
                    });
                    actions.act("UPDATE_PAGE", {
                      id: prev.id,
                      patch: { orderIndex: p.orderIndex },
                    });
                  }
                },
              },
              {
                label: "Move down",
                onClick: () => {
                  const siblings = pages.filter(
                      (x) => x.parentPageId === p.parentPageId,
                    ),
                    i = siblings.findIndex((x) => x.id === p.id),
                    next = siblings[i + 1];
                  if (next) {
                    actions.act("UPDATE_PAGE", {
                      id: p.id,
                      patch: { orderIndex: next.orderIndex },
                    });
                    actions.act("UPDATE_PAGE", {
                      id: next.id,
                      patch: { orderIndex: p.orderIndex },
                    });
                  }
                },
              },
              {
                label: "Delete",
                danger: true,
                disabled: pages.length <= 1,
                onClick: () =>
                  ui.confirm(
                    "Delete page?",
                    () => {
                      actions.act("DELETE_PAGE", { id: p.id });
                      nav("/d/" + docId);
                    },
                    "Subpages will also be deleted.",
                  ),
              },
            ]}
          />
        </div>
        {!collapsed[p.id] &&
          children.map((c) => pageRow(c, level + 1, [...seen, p.id]))}
      </div>
    );
  };
  return (
    <div className="doc-editor">
      <header className="doc-header">
        <button
          className="icon-btn"
          title={showPages ? "Hide pages" : "Show pages"}
          aria-label={showPages ? "Hide pages" : "Show pages"}
          aria-expanded={showPages}
          onClick={() => setShowPages((v) => !v)}
        >
          <Icon name="PanelLeft" />
        </button>
        <div className="breadcrumb">
          <span>{locationLabel(state, doc.location)}</span>
          <Icon name="ChevronRight" size={12} />
          <input
            className="doc-name"
            aria-label="Doc title"
            value={doc.title || ""}
            placeholder="Untitled"
            onChange={(e) => updateDoc({ title: e.target.value })}
          />
          {doc.isWiki && <span className="wiki-badge">Wiki</span>}
          <Favorite type="doc" id={docId} />
        </div>
        <div className="grow" />
        <Popover
          label="Linked tasks"
          trigger={"Linked tasks (" + arr(doc.linkedTaskIds).length + ")"}
        >
          {(close) => (
            <>
              {arr(doc.linkedTaskIds).map((id) => (
                <div className="menu-item" key={id}>
                  <button
                    className="grow text-left"
                    onClick={() => openTask(id)}
                  >
                    {state.tasks.find((t) => t.id === id)?.name || id}
                  </button>
                  <button
                    aria-label="Unlink task"
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
                </div>
              ))}
              <Button
                onClick={() => {
                  close();
                  ui.open("linkTask", { docId });
                }}
              >
                + Link task
              </Button>
            </>
          )}
        </Popover>
        <Button icon="MessageSquare" onClick={() => setComments((v) => !v)}>
          Comments{" "}
          {
            state.comments.filter(
              (c) =>
                c.parentType === "doc" && c.parentId === docId && !c.resolved,
            ).length
          }
        </Button>
        <Button onClick={() => ui.open("docShare", { id: docId })}>
          Share
        </Button>
        <DocMenu
          doc={doc}
          focusTitle={() =>
            document.querySelector('[aria-label="Doc title"]')?.focus()
          }
        />
      </header>
      {doc.archived && (
        <div className="banner warning">
          This Doc is archived ·{" "}
          <button onClick={() => updateDoc({ archived: false })}>
            Unarchive
          </button>
        </div>
      )}
      <div className="doc-layout">
        {showPages && (
          <aside className="pages-sidebar">
            <div className="section-label">Pages</div>
            <input
              placeholder="Search pages"
              aria-label="Search pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div>
              {query
                ? pages
                    .filter((p) =>
                      (p.title || "Untitled")
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((p) => pageRow({ ...p, parentPageId: null }))
                : pages
                    .filter(
                      (p) =>
                        !p.parentPageId ||
                        !pages.some((x) => x.id === p.parentPageId),
                    )
                    .map((p) => pageRow(p))}
            </div>
            <Button icon="Plus" onClick={() => addPage(null)}>
              Add page
            </Button>
          </aside>
        )}
        <div className="doc-scroll">
          {page.cover && (
            <div
              className="doc-cover"
              style={{ background: page.cover.value }}
            />
          )}
          <article className="doc-content">
            <div className="doc-cover-actions">
              <Popover
                label="Choose cover"
                trigger={page.cover ? "Change cover" : "Add cover"}
              >
                {(close) => (
                  <>
                    <div className="gradient-picker">
                      {gradients.map((value) => (
                        <button
                          key={value}
                          style={{ background: value }}
                          onClick={() => {
                            updatePage({ cover: { type: "gradient", value } });
                            close();
                          }}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        updatePage({ cover: null });
                        close();
                      }}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </Popover>
              <Popover label="Choose icon" trigger={page.icon || "Add icon"}>
                {(close) => (
                  <div className="emoji-picker">
                    {emojis.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => {
                          updatePage({ icon });
                          close();
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </Popover>
            </div>
            {page.icon && <div className="page-icon">{page.icon}</div>}
            <input
              key={page.id}
              autoFocus={!page.title}
              ref={titleRef}
              className="page-title"
              aria-label="Page title"
              value={page.title || ""}
              placeholder="Untitled"
              onChange={(e) => {
                updatePage({ title: e.target.value });
                if (
                  !doc.title ||
                  (page.id === pages[0]?.id && doc.title === page.title)
                )
                  updateDoc({ title: e.target.value });
              }}
            />
            <div className="contributors">
              <AvatarStack
                ids={[
                  ...new Set([page.createdBy, page.updatedBy].filter(Boolean)),
                ]}
              />
              <span>
                Contributors · Last updated {stamp(page.updatedAt)} by{" "}
                {state.users.find((u) => u.id === page.updatedBy)?.name ||
                  "You"}
              </span>
              <span className="saved-indicator">Saved</span>
            </div>
            <div className="blocks">
              {blocks.map((block, i) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={i}
                  blocks={blocks}
                  setBlocks={setBlocks}
                  onComment={() => {
                    setCommentContext({
                      blockId: block.id,
                      quote:
                        window.getSelection()?.toString() || block.text || "",
                    });
                    setComments(true);
                  }}
                />
              ))}
              <button
                className="new-block"
                onClick={() =>
                  setBlocks([
                    ...blocks,
                    { id: uid("b"), type: "paragraph", text: "" },
                  ])
                }
              >
                + Add block · Type / for commands
              </button>
            </div>
          </article>
        </div>
        {showComments && (
          <aside className="doc-comments">
            <div className="activity-heading">
              <strong>Comments</strong>
              <button className="icon-btn" onClick={() => setComments(false)}>
                <Icon name="X" />
              </button>
            </div>
            <Comments
              parentType="doc"
              parentId={docId}
              pageId={page.id}
              {...commentContext}
            />
          </aside>
        )}
      </div>
      <DocMoveDialog />
    </div>
  );
}
function BlockEditor({ block: b, index, blocks, setBlocks, onComment }) {
  const { state } = useStore(),
    ui = useUI(),
    openTask = useTaskOpen(),
    ref = useRef(null),
    [slash, setSlash] = useState(false),
    [filter, setFilter] = useState(""),
    [activeCommand, setActiveCommand] = useState(0),
    [editing, setEditing] = useState(false);
  const update = (p) =>
      setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, ...p } : x))),
    focus = (id) =>
      requestAnimationFrame(() =>
        document.querySelector(`[data-block="${id}"]`)?.focus(),
      ),
    insert = (i, type = "paragraph", text = "") => {
      const id = uid("b");
      setBlocks([
        ...blocks.slice(0, i + 1),
        { id, type, text },
        ...blocks.slice(i + 1),
      ]);
      focus(id);
    },
    remove = () => {
      if (blocks.length <= 1) {
        update({ type: "paragraph", text: "" });
        return;
      }
      setBlocks(blocks.filter((x) => x.id !== b.id));
      focus(blocks[Math.max(0, index - 1)]?.id);
    },
    convert = (type) => {
      if (type === "task_link") {
        setSlash(false);
        ui.open("blockTask", {
          onPick: (taskId) => update({ type, taskId, text: "" }),
        });
      } else {
        update({ type, text: slash ? "" : b.text });
        setSlash(false);
        focus(b.id);
      }
    };
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [b.text, b.type]);
  const onChange = (e) => {
    let text = e.target.value,
      type = b.type;
    const shortcuts = [
      ["### ", "h3"],
      ["## ", "h2"],
      ["# ", "h1"],
      ["- ", "bullet"],
      ["1. ", "numbered"],
      ["[] ", "todo"],
      ["> ", "quote"],
      ["```", "code"],
    ];
    for (const [start, target] of shortcuts) {
      if (text.startsWith(start) && b.type === "paragraph") {
        text = text.slice(start.length);
        type = target;
        break;
      }
    }
    update({ text, type });
    setSlash(text.startsWith("/"));
    setFilter(text.slice(1).toLowerCase());
    setActiveCommand(0);
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.style.height = ref.current.scrollHeight + "px";
      }
    });
  };
  const commands = blockTypes.filter(
    ([type, label]) =>
      label.toLowerCase().includes(filter) || type.includes(filter),
  );
  const keyDown = (e) => {
    if (slash && ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") setSlash(false);
      else if (e.key === "Enter") {
        if (commands[activeCommand]) convert(commands[activeCommand][0]);
      } else if (commands.length) {
        setActiveCommand(
          (i) =>
            (i + (e.key === "ArrowDown" ? 1 : -1) + commands.length) %
            commands.length,
        );
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && ["b", "i"].includes(e.key)) {
      e.preventDefault();
      const el = e.currentTarget,
        a = el.selectionStart,
        z = el.selectionEnd,
        mark = e.key === "b" ? "**" : "*";
      update({
        text:
          b.text.slice(0, a) +
          mark +
          b.text.slice(a, z) +
          mark +
          b.text.slice(z),
      });
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      if (!b.text && ["bullet", "numbered", "todo"].includes(b.type)) {
        update({ type: "paragraph" });
        return;
      }
      const caret = e.currentTarget.selectionStart,
        text = b.text || "",
        id = uid("b"),
        first = { ...b, text: text.slice(0, caret) },
        next = {
          id,
          type: ["bullet", "numbered", "todo"].includes(b.type)
            ? b.type
            : "paragraph",
          text: text.slice(caret),
          checked: false,
        };
      setBlocks([
        ...blocks.slice(0, index),
        first,
        next,
        ...blocks.slice(index + 1),
      ]);
      focus(id);
    }
    if (e.key === "Backspace" && !b.text) {
      e.preventDefault();
      remove();
    }
  };
  return (
    <div className={"doc-block block-" + b.type}>
      <div className="block-handle">
        <Menu
          trigger={<Icon name="GripVertical" size={14} />}
          label="Block actions"
          items={[
            ...blockTypes.map(([type, label]) => ({
              label: "Turn into " + label,
              onClick: () => convert(type),
            })),
            {
              label: "Duplicate",
              onClick: () => {
                const copy = { ...b, id: uid("b") };
                setBlocks([
                  ...blocks.slice(0, index + 1),
                  copy,
                  ...blocks.slice(index + 1),
                ]);
              },
            },
            { label: "Delete", danger: true, onClick: remove },
          ]}
        />
      </div>
      {b.type === "divider" ? (
        <hr />
      ) : b.type === "task_link" ? (
        <button
          className="linked-task-block"
          onClick={() => openTask(b.taskId)}
        >
          <Icon name="CircleCheck" />
          {state.tasks.find((t) => t.id === b.taskId)?.name ||
            "Task unavailable"}
        </button>
      ) : (
        <>
          {b.type === "todo" && (
            <input
              aria-label={"Check " + b.text}
              type="checkbox"
              checked={!!b.checked}
              onChange={(e) => update({ checked: e.target.checked })}
            />
          )}
          <span className="block-prefix">
            {b.type === "bullet"
              ? "•"
              : b.type === "numbered"
                ? index + 1 + "."
                : b.type === "callout"
                  ? "💡"
                  : ""}
          </span>
          <textarea
            ref={ref}
            className={
              b.type !== "code" && /\*|`|\]\(/.test(b.text || "") && !editing
                ? "marked-source"
                : ""
            }
            data-block={b.id}
            aria-label={
              blockTypes.find((x) => x[0] === b.type)?.[1] || "Text block"
            }
            value={b.text || ""}
            placeholder={b.type === "paragraph" ? "Type '/' for commands" : ""}
            onChange={onChange}
            onKeyDown={keyDown}
            onFocus={(e) => {
              setEditing(true);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onBlur={() => setEditing(false)}
            style={{ textDecoration: b.checked ? "line-through" : undefined }}
          />
          {b.type !== "code" && /\*|`|\]\(/.test(b.text || "") && !editing && (
            <div
              className="inline-preview"
              onMouseDown={(e) => {
                e.preventDefault();
                setEditing(true);
                requestAnimationFrame(() => ref.current?.focus());
              }}
            >
              <InlineText text={b.text || ""} />
            </div>
          )}
          {slash && (
            <div className="slash-menu">
              {commands.map(([type, label], i) => (
                <button
                  key={type}
                  className={i === activeCommand ? "active" : ""}
                  onMouseEnter={() => setActiveCommand(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => convert(type)}
                >
                  <Icon
                    name={type === "task_link" ? "CircleCheck" : "Type"}
                    size={14}
                  />
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <button
        className="block-comment icon-btn"
        aria-label="Comment on block"
        onClick={onComment}
      >
        <Icon name="MessageSquare" size={14} />
      </button>
    </div>
  );
}
function InlineText({ text }) {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={i}>{part.slice(1, -1)}</code>;
      const link = /^\[([^\]]+)\]\(([^\)]+)\)$/.exec(part);
      if (link && /^(https?:\/\/|\/)/.test(link[2]))
        return (
          <a
            key={i}
            href={link[2].startsWith("/") ? withSid(link[2]) : link[2]}
          >
            {link[1]}
          </a>
        );
      return part;
    });
}
export function BlockTaskDialog() {
  const ui = useUI(),
    { state } = useStore(),
    d = ui.dialog;
  if (d?.type !== "blockTask") return null;
  return (
    <Modal title="Link task" onClose={ui.close}>
      <div className="modal-body">
        <SearchPicker
          items={state.tasks
            .filter((t) => !t.deleted)
            .map((t) => ({ value: t.id, label: t.name }))}
          onPick={(id) => {
            d.onPick(id);
            ui.close();
          }}
        />
      </div>
    </Modal>
  );
}
