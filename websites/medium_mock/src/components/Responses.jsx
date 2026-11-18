import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { useStore } from "../store/AppStore";
import { responsesFor, myClapFor } from "../store/selectors";
import {
  A,
  Avatar,
  Button,
  IconButton,
  Menu,
  Item,
  Clap,
  Confirm,
  ReportModal,
  useUI,
} from "./UI";
import { dateLabel, sanitize } from "../utils/urls";
export function Composer({
  type = "story",
  target,
  parentId = null,
  onDone,
  quote = null,
}) {
  const { actions, user } = useStore(),
    { notify } = useUI(),
    [expanded, setExpanded] = useState(false),
    [body, setBody] = useState(""),
    [bold, setBold] = useState(false),
    [italic, setItalic] = useState(false),
    textarea = useRef(null);
  const wrap = (marker) => {
    const el = textarea.current;
    if (!el) return;
    const a = el.selectionStart,
      b = el.selectionEnd;
    if (a === b) {
      if (marker === "**") setBold(!bold);
      else setItalic(!italic);
      return;
    }
    setBody(
      body.slice(0, a) + marker + body.slice(a, b) + marker + body.slice(b),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marker.length, b + marker.length);
    });
  };
  if (type === "story" && target.allowResponses === false)
    return <p className="muted">Responses are turned off for this story.</p>;
  return (
    <div className="composer">
      {expanded ? (
        <>
          <div className="byline">
            <Avatar user={user} />
            {user.name}
          </div>
          {quote && <blockquote>{quote}</blockquote>}
          <textarea
            ref={textarea}
            aria-label={parentId ? "Reply" : "What are your thoughts?"}
            placeholder={
              parentId ? "Write a reply…" : "What are your thoughts?"
            }
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="row">
            <button
              aria-label="Bold"
              onClick={() => wrap("**")}
              style={{ fontWeight: 700, color: bold ? "#1A8917" : "" }}
            >
              B
            </button>
            <button
              aria-label="Italic"
              onClick={() => wrap("_")}
              style={{ fontStyle: "italic", color: italic ? "#1A8917" : "" }}
            >
              i
            </button>
            <span className="grow" />
            <Button
              variant="text"
              onClick={() => {
                setExpanded(false);
                onDone?.();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!body.trim()}
              onClick={() => {
                const id = actions.respond(
                  type,
                  target.id,
                  body,
                  parentId,
                  quote,
                );
                if ((bold || italic || /\*\*|_/.test(body)) && id)
                  actions.patch("responses", id, {
                    bodyHtml: `${bold ? "<strong>" : ""}${italic ? "<em>" : ""}${body
                      .replaceAll("&", "&amp;")
                      .replaceAll("<", "&lt;")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(
                        /_(.+?)_/g,
                        "<em>$1</em>",
                      )}${italic ? "</em>" : ""}${bold ? "</strong>" : ""}`,
                  });
                setBody("");
                setExpanded(false);
                notify("Response published");
                onDone?.();
              }}
            >
              Respond
            </Button>
          </div>
        </>
      ) : (
        <button
          className="muted"
          style={{ width: "100%", textAlign: "left" }}
          onClick={() => setExpanded(true)}
        >
          {parentId ? "Write a reply…" : "What are your thoughts?"}
        </button>
      )}
    </div>
  );
}
export function ResponseItem({
  response: r,
  target,
  type = "story",
  depth = 0,
}) {
  const { state, actions } = useStore(),
    { setModal, notify } = useUI(),
    [reply, setReply] = useState(false),
    [showReplies, setShowReplies] = useState(false),
    [editing, setEditing] = useState(false),
    [text, setText] = useState(r.body || ""),
    author = (state.users ?? []).find((u) => u.id === r.authorId),
    mine = r.authorId === state.currentUserId,
    isAuthor = target.authorId === state.currentUserId,
    children = (state.responses ?? []).filter(
      (x) => x.parentResponseId === r.id && !x.hidden,
    ),
    replies = children.filter((x) => !x.deleted);
  if (r.deleted && !children.length) return null;
  return (
    <article className="response">
      <div className="row">
        <Avatar user={author} />
        <div className="grow">
          <A to={"/@" + author?.username}>{author?.name || "Unknown reader"}</A>
          {r.authorId === target.authorId && <small> · Author</small>}
          <div>
            <small>
              {dateLabel(r.createdAt)} {r.edited ? "(edited)" : ""}
            </small>
          </div>
        </div>
        <Menu>
          {mine ? (
            <>
              <Item
                onClick={() => {
                  setEditing(true);
                  setText(r.body);
                }}
              >
                Edit response
              </Item>
              <Item
                danger
                onClick={() =>
                  setModal(
                    <Confirm
                      title="Delete response?"
                      text="Your response will be deleted."
                      onConfirm={() =>
                        actions.patch("responses", r.id, { deleted: true })
                      }
                    />,
                  )
                }
              >
                Delete response
              </Item>
            </>
          ) : (
            <>
              {isAuthor && (
                <Item
                  onClick={() =>
                    actions.patch("responses", r.id, {
                      hidden: !r.hidden,
                      hiddenById: r.hidden ? null : state.currentUserId,
                    })
                  }
                >
                  {r.hidden ? "Show response" : "Hide this response"}
                </Item>
              )}
              <Item onClick={() => setModal(<ReportModal target="response" />)}>
                Report response
              </Item>
            </>
          )}
        </Menu>
      </div>
      {r.quote && <blockquote className="note">{r.quote}</blockquote>}
      {editing ? (
        <>
          <textarea
            aria-label="Edit response"
            maxLength={4000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="actions">
            <Button variant="text" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              disabled={!text.trim()}
              onClick={() => {
                actions.patch("responses", r.id, {
                  body: text.trim(),
                  bodyHtml: null,
                  edited: true,
                });
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </>
      ) : r.deleted ? (
        <p className="muted">This response has been deleted.</p>
      ) : r.bodyHtml ? (
        <p dangerouslySetInnerHTML={{ __html: sanitize(r.bodyHtml) }} />
      ) : (
        <p>{r.body}</p>
      )}
      {!r.deleted && (
        <div className="meta">
          <Clap type="response" target={r} />
          {children.length > 0 && (
            <button onClick={() => setShowReplies(!showReplies)}>
              {showReplies ? "Hide replies" : `${replies.length} replies`}
            </button>
          )}
          <span className="grow" />
          <Button
            variant="text"
            onClick={() => {
              setReply(!reply);
              setShowReplies(true);
            }}
          >
            Reply
          </Button>
        </div>
      )}
      {reply && (
        <>
          <small>Replying to {author?.name}</small>
          <Composer
            target={target}
            type={type}
            parentId={depth >= 2 ? r.parentResponseId : r.id}
            onDone={() => setReply(false)}
          />
        </>
      )}
      {showReplies && depth < 3 && (
        <div className="replies">
          {children
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((c) => (
              <ResponseItem
                key={c.id}
                response={c}
                target={target}
                type={type}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </article>
  );
}
export function ResponseSection({
  target,
  type = "story",
  inline = false,
  onOpen,
  quote,
}) {
  const { state } = useStore(),
    [sort, setSort] = useState(
      state.settings?.defaultResponseSort || "relevant",
    ),
    [showHidden, setHidden] = useState(false),
    all = (state.responses ?? []).filter(
      (r) => r.targetType === type && r.targetId === target.id,
    ),
    visible = all.filter(
      (r) =>
        !r.parentResponseId &&
        !r.hidden &&
        (!r.deleted || all.some((c) => c.parentResponseId === r.id)),
    ),
    hidden = all.filter((r) => r.hidden),
    score = (r) =>
      (r.authorId === state.currentUserId ? 100000 : 0) +
      (r.clapCount || 0) +
      (myClapFor(state, "response", r.id)?.count || 0) +
      3 * all.filter((c) => c.parentResponseId === r.id).length;
  visible.sort((a, b) =>
    sort === "recent"
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : score(b) - score(a) || new Date(b.createdAt) - new Date(a.createdAt),
  );
  return (
    <>
      <Composer target={target} type={type} quote={quote} />
      {!inline && (
        <select
          className="underline"
          aria-label="Response sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="relevant">Most relevant</option>
          <option value="recent">Most recent</option>
        </select>
      )}
      {(inline ? visible.slice(0, 3) : visible).map((r) => (
        <ResponseItem key={r.id} response={r} target={target} type={type} />
      ))}
      {inline && (
        <Button variant="outline" onClick={onOpen}>
          See all responses
        </Button>
      )}
      {!inline &&
        target.authorId === state.currentUserId &&
        hidden.length > 0 && (
          <>
            <Button variant="text" onClick={() => setHidden(!showHidden)}>
              See hidden responses ({hidden.length})
            </Button>
            {showHidden &&
              hidden.map((r) => (
                <ResponseItem
                  response={r}
                  target={target}
                  type={type}
                  key={r.id}
                />
              ))}
          </>
        )}
    </>
  );
}
export function Responses({ target, type = "story", onClose, quote }) {
  const { state } = useStore();
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <aside className="drawer" role="dialog" aria-label="Responses">
      <div className="row spread">
        <h2>Responses ({responsesFor(state, type, target.id).length})</h2>
        <IconButton label="Close responses" onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <ResponseSection target={target} type={type} quote={quote} />
    </aside>
  );
}
