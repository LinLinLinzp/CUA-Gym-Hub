import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Bell,
  Plus,
  Image as ImageIcon,
  Code,
  Minus,
  Link2,
  X,
  Type,
  Quote,
} from "lucide-react";
import { useStore } from "../store/AppStore";
import { canEditPub, canSubmit } from "../store/selectors";
import {
  A,
  useNav,
  Logo,
  Avatar,
  Button,
  IconButton,
  Menu,
  Item,
  Confirm,
  useUI,
} from "../components/UI";
import {
  newId,
  now,
  slugify,
  storyUrl,
  sanitize,
  imageFile,
} from "../utils/urls";
import { coverDataUri } from "../utils/art";
import { SubmitModal } from "./Publications";
import { NotFound } from "./Discovery";
export default function Editor({ storyId }) {
  const { state, actions, user } = useStore(),
    { setModal, notify } = useUI(),
    baseNav = useNav(),
    initial = (state.stories ?? []).find((s) => s.id === storyId),
    idRef = useRef(storyId),
    [title, setTitle] = useState(initial?.title || ""),
    [blocks, setBlocks] = useState(
      initial?.body?.length
        ? initial.body
        : [{ id: newId("b"), type: "p", text: "" }],
    ),
    [saved, setSaved] = useState(true),
    [publishing, setPublishing] = useState(false),
    [insert, setInsert] = useState(false),
    [focused, setFocused] = useState(null),
    [selection, setSelection] = useState(null),
    [formats, setFormats] = useState({}),
    [showLink, setShowLink] = useState(false),
    [url, setUrl] = useState(""),
    timer = useRef(),
    latest = useRef(),
    blockRefs = useRef({}),
    fileRef = useRef(),
    toolbarRef = useRef(),
    range = useRef(),
    published = initial?.status === "published",
    dirty = useRef(false);
  const nav = (to, options) => {
    if (
      published &&
      dirty.current &&
      !window.confirm("You have unpublished changes. Leave anyway?")
    )
      return;
    return baseNav(to, options);
  };
  latest.current = { title, body: blocks };
  const save = () => {
    clearTimeout(timer.current);
    if (!dirty.current || published) return;
    if (idRef.current) {
      actions.saveStory(idRef.current, latest.current);
      dirty.current = false;
      setSaved(true);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  const dismissSelection = () => {
    range.current = null;
    setSelection(null);
    setShowLink(false);
  };
  const positionSelection = (r) => {
    const rect = r.getBoundingClientRect();
    setSelection({
      left: Math.max(8, rect.left),
      top: Math.max(66, rect.top - 50),
      visibility: rect.bottom <= 65 || rect.top >= window.innerHeight
        ? "hidden" : "visible",
    });
  };
  useEffect(() => {
    const inBlock = (node) => Object.values(blockRefs.current).some(
      (el) => el?.contains(node),
    );
    const selectionChanged = () => {
      // Link entry temporarily moves focus away from the selected text.
      if (toolbarRef.current?.contains(document.activeElement)) return;
      const s = window.getSelection();
      if (!s?.rangeCount || s.isCollapsed || !s.toString().trim() ||
          !inBlock(s.getRangeAt(0).commonAncestorContainer))
        dismissSelection();
    };
    const outside = (e) => {
      if (!toolbarRef.current?.contains(e.target) && !inBlock(e.target))
        dismissSelection();
    };
    const escape = (e) => {
      if (e.key === "Escape") dismissSelection();
    };
    const scroll = () => {
      // A dismissed selection must stay dismissed, even if its text is selected.
      if (!range.current) return;
      selectionChanged();
      if (!range.current) return;
      if (!toolbarRef.current?.contains(document.activeElement))
        range.current = window.getSelection().getRangeAt(0).cloneRange();
      positionSelection(range.current);
    };
    document.addEventListener("selectionchange", selectionChanged);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("selectionchange", selectionChanged);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("scroll", scroll, true);
    };
  }, []);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      saveRef.current();
    },
    [],
  );
  useEffect(() => {
    const guard = (e) => {
      if (published && dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const links = (e) => {
      const a = e.target.closest("a");
      if (
        a &&
        published &&
        dirty.current &&
        !window.confirm("You have unpublished changes. Leave anyway?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", links, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", links, true);
    };
  }, [published]);
  if (storyId && (!initial || initial.authorId !== user.id))
    return <NotFound />;
  const changed = (newTitle, newBlocks) => {
    latest.current = { title: newTitle, body: newBlocks };
    dirty.current = true;
    setSaved(false);
    if (
      !idRef.current &&
      (newTitle.trim() ||
        newBlocks.some((b) => b.text?.trim() || b.type === "image"))
    ) {
      const id = actions.createDraft({ title: newTitle, body: newBlocks });
      idRef.current = id;
      nav("/p/" + id + "/edit", { replace: true });
    }
    clearTimeout(timer.current);
    if (!published) timer.current = setTimeout(() => saveRef.current(), 800);
  };
  const bodyChange = (next) => {
    setBlocks(next);
    changed(title, next);
  };
  const updateBlock = (id, patch) =>
    bodyChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const focusBlock = (id) => {
    const el = blockRefs.current[id];
    el?.focus();
    const selection = window.getSelection();
    if (el) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      selection.removeAllRanges();
      selection.addRange(r);
    }
  };
  const insertAndFocus = (next, id) => {
    flushSync(() => bodyChange(next));
    focusBlock(id);
  };
  const addBlock = (type, extra = {}) => {
    const block = { id: newId("b"), type, text: "", ...extra },
      idx = blocks.findIndex((b) => b.id === focused),
      next = [...blocks];
    next.splice(idx >= 0 ? idx + 1 : next.length, 0, block);
    flushSync(() => {
      bodyChange(next);
      setInsert(false);
    });
    focusBlock(block.id);
  };
  const input = (b, el) => {
    let type = b.type,
      text = el.innerText,
      html = sanitize(el.innerHTML);
    if (text === "* " || text === "1. ") {
      type = text === "* " ? "ul" : "ol";
      text = "";
      html = "";
      el.innerHTML = "";
    }
    if (text === "```") {
      type = "code";
      text = "";
      html = "";
      el.innerHTML = "";
    }
    if (text.trim()) setInsert(false);
    updateBlock(b.id, {
      text,
      html,
      type,
      ...(["ul", "ol"].includes(type) ? { items: text.split("\n") } : {}),
    });
  };
  const format = (command, value) => {
    const liveSelection = window.getSelection(), el = blockRefs.current[focused];
    if (document.activeElement === el && liveSelection?.rangeCount &&
        el.contains(liveSelection.getRangeAt(0).commonAncestorContainer)) {
      range.current = liveSelection.getRangeAt(0).cloneRange();
    }
    if (!el || !range.current || !el.contains(range.current.commonAncestorContainer))
      return;
    el.focus();
    liveSelection.removeAllRanges();
    liveSelection.addRange(range.current);
    document.execCommand(command, false, value);
    const id = focused;
    if (el) {
      input(
        blocks.find((b) => b.id === id),
        el,
      );
    }
    selectionChanged();
  };
  const chooseType = (type) => {
    updateBlock(focused, { type });
    dismissSelection();
  };
  const selectionChanged = () => {
    const s = window.getSelection();
    if (s?.toString().trim() && s.rangeCount) {
      const r = s.getRangeAt(0);
      if (
        !document.querySelector(".editor")?.contains(r.commonAncestorContainer)
      ) {
        dismissSelection();
        return;
      }
      const blockId = Object.keys(blockRefs.current).find((id) =>
        blockRefs.current[id]?.contains(r.commonAncestorContainer),
      );
      if (!blockId) {
        dismissSelection();
        return;
      }
      setFocused(blockId);
      range.current = r.cloneRange();
      const node = r.startContainer.nodeType === 1
        ? r.startContainer : r.startContainer.parentElement;
      setFormats({
        bold: document.queryCommandState?.("bold") || !!node?.closest("b, strong"),
        italic: document.queryCommandState?.("italic") || !!node?.closest("i, em"),
        link: !!node?.closest("a"),
        type: blocks.find((b) => b.id === blockId)?.type,
      });
      positionSelection(r);
    } else dismissSelection();
  };
  const currentStory = (state.stories ?? []).find(
    (s) => s.id === idRef.current,
  );
  const menu = (
    <Menu>
      {[
        "Share draft link",
        "Change featured image",
        "Change display title / subtitle",
        "Change topics",
        "Add to publication",
        "More settings",
        "Hints and keyboard shortcuts",
        "Delete story",
      ].map((label, i) => (
        <Item
          key={label}
          danger={i === 7}
          onClick={() => {
            save();
            if (i === 0) {
              navigator.clipboard?.writeText(
                location.origin + storyUrl(currentStory, state),
              );
              notify("Link copied");
            } else if (i >= 1 && i <= 3) setPublishing(true);
            else if (i === 4) setModal(<SubmitModal story={currentStory} />);
            else if (i === 5) nav("/p/" + idRef.current + "/settings");
            else if (i === 6)
              setModal(
                <>
                  <h2>Hints and keyboard shortcuts</h2>
                  <p>
                    ⌘/Ctrl+B — Bold
                    <br />
                    ⌘/Ctrl+I — Italic
                    <br />
                    ⌘/Ctrl+K — Link
                    <br />
                    ⌘/Ctrl+Alt+1 — Heading
                    <br />
                    ⌘/Ctrl+Alt+2 — Subheading
                    <br />
                    ⌘/Ctrl+Alt+5 — Quote
                    <br />
                    ⌘/Ctrl+Enter — New part
                    <br />
                    Enter — New paragraph
                    <br />
                    Shift+F — Featured image
                  </p>
                </>,
              );
            else
              setModal(
                <Confirm
                  onConfirm={() => {
                    dirty.current = false;
                    actions.deleteStory(idRef.current);
                    nav("/me/stories/drafts");
                    notify("Story deleted");
                  }}
                />,
              );
          }}
          disabled={!idRef.current && i !== 6}
        >
          {label}
        </Item>
      ))}
    </Menu>
  );
  return (
    <>
      <header className="editor-bar">
        <Logo small />
        <span>
          {published
            ? "Published" +
              (currentStory?.publicationId
                ? " in " +
                  (state.publications ?? []).find(
                    (p) => p.id === currentStory.publicationId,
                  )?.name
                : "")
            : "Draft in " + user.name}
        </span>
        <small>{saved ? "Saved" : "Saving…"}</small>
        <span className="grow" />
        <Button
          disabled={
            !title.trim() &&
            !blocks.some((b) => b.text?.trim() || b.type === "image")
          }
          style={{ padding: "4px 12px" }}
          onClick={() => {
            if (published) {
              actions.saveStory(idRef.current, latest.current);
              dirty.current = false;
              setSaved(true);
              notify("Your changes have been published");
              nav("/p/" + idRef.current);
            } else {
              save();
              setPublishing(true);
            }
          }}
        >
          {published ? "Save and publish" : "Publish"}
        </Button>
        {menu}
        <A aria-label="Notifications" to="/me/notifications">
          <Bell size={22} />
        </A>
        <Avatar user={user} />
      </header>
      <main
        className="editor"
        onMouseUp={selectionChanged}
        onKeyUp={(e) => e.key === "Escape" ? dismissSelection() : selectionChanged()}
      >
        <textarea
          className="editor-title"
          aria-label="Title"
          placeholder="Title"
          value={title}
          rows={Math.max(1, Math.ceil(title.length / 30))}
          onChange={(e) => {
            setTitle(e.target.value);
            changed(e.target.value, blocks);
          }}
          onFocus={() => {
            setFocused(null);
            setInsert(false);
          }}
          onBlur={() => saveRef.current()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              focusBlock(blocks[0]?.id);
            }
          }}
        />
        {blocks.map((b, index) => (
          <div key={b.id} className={"editor-block " + b.type}>
            {focused === b.id && !["image", "hr"].includes(b.type) &&
              !b.text?.trim() && !(b.items ?? []).some((item) => item.trim()) && (
              <div className="insert-tools" onMouseDown={(e) => e.preventDefault()}>
                <IconButton label="Insert content" onClick={() => setInsert(!insert)}>
                  <Plus />
                </IconButton>
                {insert && (
                  <>
                    <IconButton label="Image" onClick={() => fileRef.current.click()}>
                      <ImageIcon />
                    </IconButton>
                    <Button
                      variant="text"
                      onClick={() =>
                        setModal(
                          <>
                            <h2>Choose an image</h2>
                            <div className="grid">
                              {Array.from({ length: 12 }, (_, i) => (
                                <button
                                  key={i}
                                  aria-label={"Choose image " + (i + 1)}
                                  onClick={() => {
                                    addBlock("image", { src: "cover:picker:" + i });
                                    setModal(null);
                                  }}
                                >
                                  <img
                                    width="100%"
                                    src={coverDataUri("cover:picker:" + i)}
                                    alt=""
                                  />
                                </button>
                              ))}
                            </div>
                          </>,
                        )
                      }
                    >
                      Unsplash
                    </Button>
                    <IconButton
                      label="Video or embed"
                      onClick={() => {
                        const url = prompt(
                          "Paste a YouTube, Vimeo, or other link, and press Enter",
                        );
                        if (url) addBlock("p", { text: url, html: url });
                      }}
                    >
                      <Link2 />
                    </IconButton>
                    <IconButton label="Code block" onClick={() => addBlock("code")}>
                      <Code />
                    </IconButton>
                    <IconButton label="New part" onClick={() => addBlock("hr")}>
                      <Minus />
                    </IconButton>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    try {
                      addBlock("image", {
                        src: await imageFile(e.target.files[0]),
                        caption: "",
                      });
                    } catch {
                      notify("Choose an image file");
                    }
                  }}
                />
              </div>
            )}
            {b.type === "image" ? (
              <>
                <img
                  src={coverDataUri(b.src)}
                  alt={b.caption || ""}
                  tabIndex={0}
                  onFocus={() => setFocused(b.id)}
                  onKeyDown={(e) => {
                    if (e.shiftKey && e.key.toLowerCase() === "f") {
                      actions.patch("stories", idRef.current, {
                        coverImage: b.src,
                      });
                      notify("Featured image updated");
                    }
                  }}
                />
                <input
                  className="underline"
                  aria-label="Image caption"
                  placeholder="Type caption for image (optional)"
                  value={b.caption || ""}
                  onChange={(e) =>
                    updateBlock(b.id, { caption: e.target.value })
                  }
                />
              </>
            ) : b.type === "hr" ? (
              <div style={{ textAlign: "center", padding: 20 }}>· · ·</div>
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label={
                  index === 0
                    ? "Tell your story…"
                    : "Story block " + (index + 1)
                }
                data-placeholder={index === 0 ? "Tell your story…" : ""}
                ref={(el) => {
                  if (el && !el.dataset.initialized) {
                    el.innerHTML = sanitize(
                      b.html || b.text || b.items?.join("<br>") || "",
                    );
                    el.dataset.initialized = "true";
                  }
                  blockRefs.current[b.id] = el;
                }}
                onFocus={() => {
                  if (focused !== b.id) setInsert(false);
                  setFocused(b.id);
                }}
                onInput={(e) => input(b, e.currentTarget)}
                onBlur={() => saveRef.current()}
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    ["b", "i"].includes(e.key.toLowerCase())
                  ) {
                    e.preventDefault();
                    format(e.key.toLowerCase() === "b" ? "bold" : "italic");
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    addBlock("hr");
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.altKey) {
                    const map = { 1: "h3", 2: "h4", 5: "blockquote" };
                    if (map[e.key]) {
                      e.preventDefault();
                      chooseType(map[e.key]);
                      return;
                    }
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                    e.preventDefault();
                    selectionChanged();
                    setShowLink(true);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    if (el.innerText === "---") {
                      el.innerHTML = "";
                      const block = { id: newId("b"), type: "p", text: "" };
                      const next = blocks.map((x) =>
                        x.id === b.id
                          ? { ...x, type: "hr", text: "", html: "" }
                          : x,
                      );
                      next.splice(index + 1, 0, block);
                      insertAndFocus(next, block.id);
                      return;
                    }
                    const sel = window.getSelection(),
                      r = sel?.rangeCount ? sel.getRangeAt(0) : null;
                    let tail = "";
                    if (r && el.contains(r.startContainer)) {
                      const end = r.cloneRange();
                      end.setEnd(el, el.childNodes.length);
                      tail = end.toString();
                      end.deleteContents();
                    }
                    const first = {
                        ...b,
                        text: el.innerText,
                        html: sanitize(el.innerHTML),
                      },
                      newBlock = {
                        id: newId("b"),
                        type: ["ul", "ol"].includes(b.type) ? b.type : "p",
                        text: tail,
                        html: tail,
                      },
                      next = blocks.map((x) => (x.id === b.id ? first : x));
                    next.splice(index + 1, 0, newBlock);
                    insertAndFocus(next, newBlock.id);
                  } else if (
                    e.key === "Backspace" &&
                    !e.currentTarget.innerText &&
                    blocks.length > 1
                  ) {
                    e.preventDefault();
                    insertAndFocus(
                      blocks.filter((x) => x.id !== b.id),
                      blocks[Math.max(0, index - 1)].id,
                    );
                  } else if (
                    e.key === "ArrowUp" &&
                    index > 0 &&
                    window.getSelection()?.anchorOffset === 0
                  ) {
                    focusBlock(blocks[index - 1].id);
                  } else if (
                    e.key === "ArrowDown" &&
                    index < blocks.length - 1 &&
                    window.getSelection()?.anchorOffset ===
                      e.currentTarget.innerText.length
                  ) {
                    focusBlock(blocks[index + 1].id);
                  }
                }}
              />
            )}
          </div>
        ))}
      </main>
      {selection && (
        <div
          ref={toolbarRef}
          className="format-toolbar"
          style={selection}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button aria-label="Bold" aria-pressed={!!formats.bold} className={formats.bold ? "active" : ""} onClick={() => format("bold")}>
            <b>B</b>
          </button>
          <button aria-label="Italic" aria-pressed={!!formats.italic} className={formats.italic ? "active" : ""} onClick={() => format("italic")}>
            <i>i</i>
          </button>
          <button aria-label="Link" aria-pressed={!!formats.link} className={formats.link ? "active" : ""} onClick={() => setShowLink(!showLink)}>
            <Link2 size={18} />
          </button>
          <button aria-label="Heading" aria-pressed={formats.type === "h3"} className={formats.type === "h3" ? "active" : ""} onClick={() => chooseType("h3")}>
            T
          </button>
          <button aria-label="Subheading" aria-pressed={formats.type === "h4"} className={formats.type === "h4" ? "active" : ""} onClick={() => chooseType("h4")}>
            t
          </button>
          <button
            aria-label="Quote"
            aria-pressed={["blockquote", "pullquote"].includes(formats.type)}
            className={["blockquote", "pullquote"].includes(formats.type) ? "active" : ""}
            onClick={() =>
              chooseType(
                blocks.find((b) => b.id === focused)?.type === "blockquote"
                  ? "pullquote"
                  : blocks.find((b) => b.id === focused)?.type === "pullquote"
                    ? "p"
                    : "blockquote",
              )
            }
          >
            <Quote size={18} />
          </button>
          {showLink && (
            <>
            <input
              aria-label="Link URL"
              placeholder="Paste or type a link…"
              value={url}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (/^https?:\/\//.test(url)) format("createLink", url);
                  setShowLink(false);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setShowLink(false);
                }
              }}
            />
            <IconButton label="Cancel link" onClick={() => setShowLink(false)}><X size={16} /></IconButton>
            </>
          )}
        </div>
      )}
      {publishing && currentStory && (
        <PublishOverlay
          story={currentStory}
          onClose={() => setPublishing(false)}
        />
      )}
    </>
  );
}
export function PublishOverlay({ story, onClose }) {
  const { state, actions, user } = useStore(),
    { notify, setModal, modalOnRoute } = useUI(),
    nav = useNav(),
    [previewTitle, setTitle] = useState(
      story.previewTitle || story.title || "",
    ),
    [subtitle, setSubtitle] = useState(
      story.previewSubtitle || story.subtitle || "",
    ),
    [image, setImage] = useState(
      story.previewImage ||
        story.coverImage ||
        (story.body ?? []).find((b) => b.type === "image")?.src ||
        null,
    ),
    [topics, setTopics] = useState(story.topicIds || []),
    [query, setQuery] = useState(""),
    [member, setMember] = useState(story.memberOnly || false),
    [email, setEmail] = useState(story.emailSubscribers !== false),
    [pubId, setPub] = useState(story.publicationId || ""),
    [schedule, setSchedule] = useState(false),
    [time, setTime] = useState(""),
    [error, setError] = useState(""),
    pub = (state.publications ?? []).find((p) => p.id === pubId),
    submit = pub && !canEditPub(state, pub);
  const commit = () => {
    if (schedule && (!time || new Date(time) <= new Date())) {
      setError("Choose a time in the future");
      return;
    }
    const fields = {
      previewTitle,
      previewSubtitle: subtitle,
      previewImage: image,
      topicIds: topics,
      memberOnly: member,
      emailSubscribers: email,
      publicationId: pubId || null,
    };
    if (submit) {
      const result = actions.submit(story.id, pubId);
      if (!result) {
        setError("This story is already submitted to a publication");
        return;
      }
      actions.patch("stories", story.id, fields);
      onClose();
      nav("/me/stories/submissions");
      notify("Story submitted");
      return;
    }
    const slug = story.slug || slugify(previewTitle || story.title) || "untitled";
    actions.publish(story.id, {
      ...fields,
      slug,
      scheduledFor: schedule ? new Date(time).toISOString() : null,
    });
    onClose();
    if (schedule) {
      nav("/me/stories/scheduled");
      notify("Story scheduled");
    } else {
      const publishedUrl = storyUrl({ ...story, ...fields, slug }, state);
      modalOnRoute(
            <>
              <h2>Your story is published</h2>
              <p>Share your story with the world.</p>
              <input className="underline" aria-label="Published story URL" readOnly value={location.origin + publishedUrl} />
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    location.origin + publishedUrl,
                  );
                  notify("Link copied");
                }}
              >
                Copy link
              </Button>
              <Button variant="text" onClick={() => setModal(null)}>View story</Button>
              <Button variant="text" onClick={() => {
                navigator.clipboard?.writeText(location.origin + publishedUrl);
                notify("Link copied — ready to share on X");
              }}>Share on X</Button>
            </>,
            publishedUrl,
      );
      nav(publishedUrl);
    }
  };
  return (
    <div className="publish-overlay" role="dialog" aria-label="Publish story">
      <IconButton label="Close publish" onClick={onClose}>
        <X />
      </IconButton>
      <div className="publish-columns">
        <div>
          <h3>Story Preview</h3>
          <div className="publish-preview">
            {image ? (
              <img src={coverDataUri(image)} alt="Story preview" />
            ) : (
              <p style={{ padding: 24 }}>
                Include a high-quality image in your story to make it more
                inviting to readers.
              </p>
            )}
          </div>
          <label className="green">
            Upload
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                try {
                  setImage(await imageFile(e.target.files[0]));
                } catch {
                  setError("Choose an image file");
                }
              }}
            />
          </label>
          <div className="row">
            {(story.body ?? [])
              .filter((b) => b.type === "image")
              .map((b) => (
                <button key={b.id} onClick={() => setImage(b.src)}>
                  <img
                    width="70"
                    src={coverDataUri(b.src)}
                    alt="Choose preview"
                  />
                </button>
              ))}
          </div>
          <input
            aria-label="Preview title"
            className="underline"
            maxLength={100}
            value={previewTitle}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontWeight: 700, fontSize: 22 }}
          />
          <input
            aria-label="Preview subtitle"
            placeholder="Write a preview subtitle…"
            className="underline"
            maxLength={140}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <small>
            Note: Changes here will affect how your story appears in public
            places like Medium’s homepage and in subscribers’ inboxes — not the
            contents of the story itself.
          </small>
        </div>
        <div>
          <p>
            Publishing to: <b>{pub?.name || user.name}</b>
          </p>
          <select
            aria-label="Publishing to"
            className="underline"
            value={pubId}
            onChange={(e) => setPub(e.target.value)}
          >
            <option value="">{user.name} (your profile)</option>
            {(state.publications ?? [])
              .filter((p) => canSubmit(state, p))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {canEditPub(state, p) ? "Publish" : "Submit"}
                </option>
              ))}
          </select>
          <p>
            Add or change topics (up to 5) so readers know what your story is
            about
          </p>
          <div>
            {topics.map((id) => (
              <button
                className="pill"
                key={id}
                onClick={() => setTopics(topics.filter((t) => t !== id))}
              >
                {(state.topics ?? []).find((t) => t.id === id)?.name || id} ×
              </button>
            ))}
          </div>
          <input
            className="form-field"
            aria-label="Add a topic"
            placeholder="Add a topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query &&
            (state.topics ?? [])
              .filter(
                (t) =>
                  t.name.toLowerCase().includes(query.toLowerCase()) &&
                  !topics.includes(t.id),
              )
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t.id}
                  className="menu-item"
                  onClick={() => {
                    if (topics.length >= 5)
                      setError("You can add up to 5 topics");
                    else {
                      setTopics([...topics, t.id]);
                      setQuery("");
                    }
                  }}
                >
                  {t.name}
                </button>
              ))}
          <p>
            <button
              className="green"
              onClick={() =>
                setModal(
                  <>
                    <h2>Publishing on Medium</h2>
                    <p>
                      Your story appears on your profile and in relevant topics.
                    </p>
                    <p>
                      Publications review submitted drafts before publishing.
                    </p>
                    <p>You can edit or unlist your story at any time.</p>
                  </>,
                )
              }
            >
              Learn more about what happens to your post when you publish.
            </button>
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={member}
              onChange={(e) => setMember(e.target.checked)}
            />
            Meter my story — Readers will need a Medium membership to read past
            the preview.
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
            />
            Email this story to your {user.emailSubscriberCount || 0}{" "}
            subscribers
          </label>
          {schedule && (
            <label>
              Schedule for
              <input
                className="form-field"
                aria-label="Schedule date and time"
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Button onClick={commit}>
              {submit
                ? "Submit to publication"
                : schedule
                  ? "Schedule to publish"
                  : "Publish now"}
            </Button>
            {!submit && (
              <Button variant="text" onClick={() => setSchedule(!schedule)}>
                {schedule ? "Cancel schedule" : "Schedule for later"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
