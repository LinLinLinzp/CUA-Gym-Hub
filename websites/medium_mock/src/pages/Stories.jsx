import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Share2, PlayCircle } from "lucide-react";
import { useStore } from "../store/AppStore";
import {
  publishedVisible,
  published,
  canEditPub,
  responsesFor,
} from "../store/selectors";
import {
  A,
  useNav,
  Avatar,
  PubLogo,
  Button,
  IconButton,
  Tabs,
  Menu,
  Item,
  Badge,
  Confirm,
  ReportModal,
  Clap,
  BookmarkPicker,
  Follow,
  StoryCard,
  Empty,
  useUI,
} from "../components/UI";
import {
  storyUrl,
  slugify,
  dateLabel,
  sanitize,
  newId,
  now,
  compact,
  imageFile,
} from "../utils/urls";
import { ProfileModal } from "../components/ProfileModal";
import { coverDataUri } from "../utils/art";
import { NotFound } from "./Discovery";
import { SubmitModal, SubmissionActions } from "./Publications";
import { Responses, ResponseSection } from "../components/Responses";
export function YourStories({ tab = "drafts" }) {
  const { state, actions } = useStore(),
    { setModal, notify } = useUI(),
    nav = useNav(),
    mine = (state.stories ?? []).filter(
      (s) => s.authorId === state.currentUserId,
    ),
    submissions = (state.submissions ?? []).filter(
      (s) => s.submittedById === state.currentUserId,
    ),
    groups = {
      drafts: mine.filter((s) => s.status === "draft"),
      scheduled: mine.filter((s) => s.status === "scheduled" && !published(s)),
      public: mine.filter((s) => published(s) && s.visibility !== "unlisted"),
      unlisted: mine.filter((s) => published(s) && s.visibility === "unlisted"),
      submissions,
    },
    rows = groups[tab] || groups.drafts;
  const del = (s) =>
    setModal(
      <Confirm
        onConfirm={() => {
          actions.deleteStory(s.id);
          notify("Story deleted");
        }}
      />,
    );
  const importStory = () => setModal(<ImportStory />);
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <div className="page-heading">
        <h1>Your stories</h1>
        <div className="row">
          <Button variant="outline" onClick={importStory}>
            Import a story
          </Button>
          <A className="btn btn-green" to="/new-story">
            Write a story
          </A>
        </div>
      </div>
      <Tabs
        active={tab}
        items={[
          { id: "drafts", label: "Drafts", count: groups.drafts.length },
          ...(groups.scheduled.length
            ? [
                {
                  id: "scheduled",
                  label: "Scheduled",
                  count: groups.scheduled.length,
                },
              ]
            : []),
          { id: "public", label: "Published", count: groups.public.length },
          { id: "unlisted", label: "Unlisted", count: groups.unlisted.length },
          {
            id: "submissions",
            label: "Submissions",
            count: submissions.length,
          },
        ]}
        onSelect={(id) => nav("/me/stories/" + id)}
      />
      {rows.map((row) => {
        const sub = tab === "submissions" ? row : null,
          s = sub
            ? (state.stories ?? []).find((s) => s.id === sub.storyId)
            : row;
        if (!s) return null;
        const pub = (state.publications ?? []).find(
          (p) => p.id === (sub?.publicationId || s.publicationId),
        );
        return (
          <div className="story-row" key={row.id}>
            <div className="row spread">
              <A to={"/p/" + s.id + "/edit"}>
                <h3>{s.title || "Untitled story"}</h3>
              </A>
              <Menu>
                {sub ? (
                  <>
                    {["pending", "in_review", "edits_requested"].includes(
                      sub.status,
                    ) && (
                      <Item onClick={() => actions.decide(sub.id, "withdrawn")}>
                        Withdraw submission
                      </Item>
                    )}
                    {sub.status === "edits_requested" && (
                      <Item onClick={() => actions.decide(sub.id, "pending")}>
                        Resubmit
                      </Item>
                    )}
                    <Item onClick={() => nav("/p/" + s.id + "/edit")}>
                      Edit draft
                    </Item>
                  </>
                ) : (
                  <>
                    <Item onClick={() => nav("/p/" + s.id + "/edit")}>
                      {tab === "drafts" ? "Edit draft" : "Edit story"}
                    </Item>
                    {tab === "drafts" ? (
                      <Item onClick={() => setModal(<SubmitModal story={s} />)}>
                        Submit to publication…
                      </Item>
                    ) : tab === "scheduled" ? (
                      <>
                        <Item
                          onClick={() =>
                            actions.patch("stories", s.id, {
                              status: "draft",
                              scheduledFor: null,
                            })
                          }
                        >
                          Unschedule
                        </Item>
                        <Item
                          onClick={() =>
                            actions.publish(s.id, { scheduledFor: null })
                          }
                        >
                          Publish now
                        </Item>
                      </>
                    ) : (
                      <>
                        <Item onClick={() => nav("/p/" + s.id + "/settings")}>
                          Story settings
                        </Item>
                        <Item onClick={() => nav("/me/stats?story=" + s.id)}>
                          Story stats
                        </Item>
                        <Item
                          onClick={() =>
                            actions.patch("stories", s.id, {
                              pinnedToProfile: !s.pinnedToProfile,
                            })
                          }
                        >
                          {s.pinnedToProfile
                            ? "Unpin from profile"
                            : "Pin to profile"}
                        </Item>
                        <Item
                          onClick={() =>
                            actions.patch("stories", s.id, {
                              visibility:
                                s.visibility === "unlisted"
                                  ? "public"
                                  : "unlisted",
                            })
                          }
                        >
                          {s.visibility === "unlisted"
                            ? "Make public"
                            : "Unlist story"}
                        </Item>
                        {pub && (
                          <Item
                            onClick={() =>
                              actions.patch("stories", s.id, {
                                publicationId: null,
                              })
                            }
                          >
                            Remove from publication
                          </Item>
                        )}
                      </>
                    )}
                    <Item danger onClick={() => del(s)}>
                      {tab === "drafts" ? "Delete draft" : "Delete story"}
                    </Item>
                  </>
                )}
              </Menu>
            </div>
            {tab === "drafts" && (
              <p className="snippet">
                {(s.body ?? []).find((b) => b.text)?.text}
              </p>
            )}
            {sub ? (
              <>
                <p>
                  Submitted to {pub?.name || "Unknown publication"} ·{" "}
                  {dateLabel(sub.createdAt)} <Badge status={sub.status} />
                </p>
                {sub.editorNote && (
                  <blockquote className="note">{sub.editorNote}</blockquote>
                )}
              </>
            ) : (
              <small>
                {tab === "drafts"
                  ? `Last edited ${dateLabel(s.updatedAt)} · ${s.readingTime || 1} min read (${s.wordCount || 0} words) so far`
                  : tab === "scheduled"
                    ? `Scheduled for ${new Date(s.scheduledFor).toLocaleString("en-US")}`
                    : `Published ${dateLabel(s.publishedAt)} · ${s.readingTime || 1} min read`}
                {pub
                  ? " · " + (tab === "drafts" ? "Draft in " : "In ") + pub.name
                  : ""}
              </small>
            )}
          </div>
        );
      })}
      {!rows.length && (
        <Empty>
          {tab === "drafts"
            ? "You have no drafts."
            : tab === "submissions"
              ? "No submissions yet."
              : "You haven’t published any public stories yet."}
          <p>
            <A className="green" to="/new-story">
              Write a story
            </A>
          </p>
        </Empty>
      )}
    </main>
  );
}
function ImportStory() {
  const { actions } = useStore(),
    { close } = useUI(),
    nav = useNav(),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const u = new URL(url);
          if (!["https:", "http:"].includes(u.protocol)) throw Error();
          const id = actions.createDraft({
            title: u.hostname + u.pathname.replaceAll("/", " "),
            body: [{ id: newId("b"), type: "p", text: "Imported from " + url }],
          });
          close();
          nav("/p/" + id + "/edit");
        } catch {
          setError("Enter a valid URL");
        }
      }}
    >
      <h2>Import a story</h2>
      <input
        className="form-field"
        aria-label="Story URL"
        type="url"
        required
        placeholder="https://"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <Button>Import</Button>
      </div>
    </form>
  );
}
export function StorySettings({ story }) {
  const { state, actions } = useStore(),
    nav = useNav(),
    { notify, setModal } = useUI();
  const [form, setForm] = useState({
    ...story,
    slug: story.slug || slugify(story.title) || "untitled",
  });
  const set = (k, v) => setForm({ ...form, [k]: v });
  if (story.authorId !== state.currentUserId) return <NotFound />;
  const sections = [
    "Story preview",
    "Visibility",
    "Responses",
    "SEO Settings",
    "Customize story link",
    "Content licensing",
    "Topics",
    "Partner Program",
  ];
  return (
    <div className="manage-layout">
      <aside className="manage-nav">
        {sections.map((x) => (
          <a key={x} href={"#" + slugify(x)}>
            {x}
          </a>
        ))}
      </aside>
      <form
        className="manage-content"
        onSubmit={(e) => {
          e.preventDefault();
          if (!slugify(form.slug)) {
            notify("Enter a valid story URL");
            return;
          }
          actions.patch("stories", story.id, {
            visibility: form.visibility || "public",
            allowResponses: form.allowResponses !== false,
            slug: slugify(form.slug),
            seoTitle: form.seoTitle || "",
            seoDescription: form.seoDescription || "",
            canonicalUrl: form.canonicalUrl || "",
            license: form.license || "all_rights_reserved",
            subtitle: form.subtitle || "",
            previewTitle: form.previewTitle || null,
            previewSubtitle: form.previewSubtitle || null,
            previewImage: form.previewImage || null,
            topicIds: form.topicIds || [],
            memberOnly: !!form.memberOnly,
          });
          notify("Settings saved");
        }}
      >
        <h1>Story settings</h1>
        <h2 id="story-preview">Story preview</h2>
        <label>
          Preview title
          <input
            className="form-field"
            aria-label="Preview title"
            maxLength={100}
            value={form.previewTitle ?? story.title ?? ""}
            onChange={(e) => set("previewTitle", e.target.value)}
          />
        </label>
        <label>
          Preview subtitle
          <input
            className="form-field"
            aria-label="Preview subtitle"
            maxLength={140}
            value={form.previewSubtitle ?? story.subtitle ?? ""}
            onChange={(e) => set("previewSubtitle", e.target.value)}
          />
        </label>
        <label className="green">
          Change preview image
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              try {
                set("previewImage", await imageFile(e.target.files[0]));
              } catch {
                notify("Choose an image file");
              }
            }}
          />
        </label>
        <h2 id="visibility">Visibility</h2>
        {[
          ["public", "Public"],
          [
            "unlisted",
            "Unlisted — Only people with the link can see this story",
          ],
        ].map(([v, label]) => (
          <label className="check" key={v}>
            <input
              type="radio"
              name="visibility"
              checked={(form.visibility || "public") === v}
              onChange={() => set("visibility", v)}
            />
            {label}
          </label>
        ))}
        <h2 id="responses">Responses</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={form.allowResponses !== false}
            onChange={(e) => set("allowResponses", e.target.checked)}
          />
          Allow responses
        </label>
        <h2 id="seo-settings">SEO Settings</h2>
        {[
          ["seoTitle", "SEO title", 60],
          ["seoDescription", "SEO description", 156],
          ["canonicalUrl", "Canonical URL", 500],
          ["subtitle", "Subtitle", 280],
        ].map(([key, label, max]) => (
          <label key={key}>
            {label}
            <input
              className="form-field"
              aria-label={label}
              maxLength={max}
              value={form[key] || ""}
              onChange={(e) => set(key, e.target.value)}
            />
            <small>
              {(form[key] || "").length}/{max}
            </small>
          </label>
        ))}
        <h2 id="customize-story-link">Customize story link</h2>
        <label>
          Story URL
          <input
            className="form-field"
            aria-label="Story URL"
            value={form.slug || ""}
            onChange={(e) => set("slug", e.target.value)}
          />
        </label>
        <p className="muted">
          medium.com/@
          {(state.users ?? []).find((u) => u.id === story.authorId)?.username ||
            "unknown"}
          /{slugify(form.slug)}-{story.id}
        </p>
        <h2 id="content-licensing">Content licensing</h2>
        {[
          ["all_rights_reserved", "All rights reserved"],
          ["cc_by", "Some rights reserved (CC BY)"],
          ["cc_by_sa", "Some rights reserved (CC BY-SA)"],
          ["public_domain", "Public domain"],
        ].map(([v, label]) => (
          <label className="check" key={v}>
            <input
              type="radio"
              name="license"
              checked={(form.license || "all_rights_reserved") === v}
              onChange={() => set("license", v)}
            />
            {label}
          </label>
        ))}
        <h2 id="topics">Topics</h2>
        {(form.topicIds ?? []).map((id) => (
          <button
            className="pill"
            type="button"
            key={id}
            onClick={() =>
              set(
                "topicIds",
                form.topicIds.filter((t) => t !== id),
              )
            }
          >
            {(state.topics ?? []).find((t) => t.id === id)?.name || id} ×
          </button>
        ))}
        <select
          className="form-field"
          aria-label="Add a topic"
          value=""
          onChange={(e) => {
            if ((form.topicIds ?? []).length < 5)
              set("topicIds", [...(form.topicIds ?? []), e.target.value]);
            else notify("You can add up to 5 topics");
          }}
        >
          <option value="">Add a topic</option>
          {(state.topics ?? [])
            .filter((t) => !(form.topicIds ?? []).includes(t.id))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <h2 id="partner-program">Partner Program</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={!!form.memberOnly}
            onChange={(e) => set("memberOnly", e.target.checked)}
          />
          Meter my story — Member-only
        </label>
        <div className="actions">
          <Button
            type="button"
            variant="text"
            onClick={() => nav("/p/" + story.id + "/edit")}
          >
            Cancel
          </Button>
          <Button>Save</Button>
          <Button
            variant="danger"
            type="button"
            onClick={() =>
              setModal(
                <Confirm
                  onConfirm={() => {
                    actions.deleteStory(story.id);
                    nav("/me/stories");
                  }}
                />,
              )
            }
          >
            Delete story
          </Button>
        </div>
      </form>
    </div>
  );
}
export function Story({ story }) {
  const { state, actions, user } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    { notify, setModal } = useUI(),
    [drawer, setDrawer] = useState(
      new URLSearchParams(loc.search).get("responses") === "open",
    ),
    [selection, setSelection] = useState(null),
    [quote, setQuote] = useState(null),
    author = (state.users ?? []).find((u) => u.id === story.authorId),
    pub = (state.publications ?? []).find((p) => p.id === story.publicationId),
    mine = story.authorId === state.currentUserId,
    submission = (state.submissions ?? []).find(
      (s) =>
        s.storyId === story.id &&
        ["pending", "in_review", "edits_requested"].includes(s.status),
    ),
    editor = submission && canEditPub(state, pub);
  useEffect(() => {
    document.title = `${story.title || "Untitled story"} | by ${author?.name || "Unknown author"} | ${pub?.name || "Medium"}`;
    return () => {
      document.title = "Medium";
    };
  }, [story.title, author?.name, pub?.name]);
  if (
    (story.status === "scheduled" && !published(story)) ||
    (!published(story) && !mine && !editor)
  )
    return <NotFound />;
  const menu = (
    <Menu>
      {mine ? (
        <>
          <Item onClick={() => nav("/p/" + story.id + "/edit")}>
            Edit story
          </Item>
          <Item onClick={() => nav("/p/" + story.id + "/settings")}>
            Story settings
          </Item>
          <Item onClick={() => nav("/me/stats?story=" + story.id)}>
            Story stats
          </Item>
          <Item
            danger
            onClick={() =>
              setModal(
                <Confirm
                  onConfirm={() => {
                    actions.deleteStory(story.id);
                    nav("/me/stories");
                    notify("Story deleted");
                  }}
                />,
              )
            }
          >
            Delete story
          </Item>
        </>
      ) : (
        <>
          <Item onClick={() => actions.follow("user", story.authorId)}>
            Follow author
          </Item>
          <Item
            onClick={() => {
              actions.add("mutes", {
                id: newId("mut"),
                userId: user.id,
                targetType: "user",
                targetId: story.authorId,
                createdAt: now(),
              });
              notify("Writer muted");
            }}
          >
            Mute author
          </Item>
          <Item onClick={() => setModal(<ReportModal />)}>Report story…</Item>
        </>
      )}
      <Item
        onClick={() =>
          actions.update((s) => {
            s.claps = (s.claps ?? []).filter(
              (c) =>
                !(
                  c.userId === user.id &&
                  c.targetType === "story" &&
                  c.targetId === story.id
                ),
            );
          })
        }
      >
        Undo claps
      </Item>
    </Menu>
  );
  const bar = () => (
    <div className="actionbar">
      <Clap target={story} />
      <button
        className="row muted"
        style={{ gap: 8 }}
        aria-label="Respond"
        onClick={() => setDrawer(true)}
      >
        <MessageCircle size={21} strokeWidth={1.5} />
        {responsesFor(state, "story", story.id).length || ""}
      </button>
      <span className="grow" />
      <BookmarkPicker story={story} />
      <IconButton
        label="Listen"
        onClick={() => notify("Listen is available in the Medium app")}
      >
        <PlayCircle />
      </IconButton>
      <Menu label="Share" icon={<Share2 />}>
        {[
          "Copy link",
          "Share on X",
          "Share on LinkedIn",
          "Share on Facebook",
        ].map((x) => (
          <Item
            key={x}
            onClick={() => {
              navigator.clipboard?.writeText(
                location.origin + storyUrl(story, state),
              );
              notify("Link copied");
            }}
          >
            {x}
          </Item>
        ))}
      </Menu>
      {menu}
    </div>
  );
  const highlight = () => {
    if (mine && story.status === "draft") return;
    const s = window.getSelection();
    if (!s?.toString().trim() || !s.rangeCount) {
      setSelection(null);
      return;
    }
    const r = s.getRangeAt(0),
      el = (
        r.startContainer.nodeType === 1
          ? r.startContainer
          : r.startContainer.parentElement
      )?.closest("[data-block]");
    if (!el) return;
    const rect = r.getBoundingClientRect(),
      before = r.cloneRange();
    before.selectNodeContents(el);
    before.setEnd(r.startContainer, r.startOffset);
    setSelection({
      text: s.toString(),
      blockId: el.dataset.block,
      startOffset: before.toString().length,
      endOffset: before.toString().length + s.toString().length,
      left: Math.max(8, rect.left),
      top: Math.max(60, rect.top - 50),
    });
  };
  return (
    <>
      {editor && (
        <div className="form-page" style={{ margin: "16px auto" }}>
          <b>Submission to {pub.name}</b>
          <SubmissionActions submission={submission} />
        </div>
      )}
      <main className="article">
        {mine && story.status === "draft" && (
          <div className="draft-preview">
            Draft · Only you can see this{" "}
            <A className="green" to={"/p/" + story.id + "/edit"}>
              Edit
            </A>
          </div>
        )}
        {story.memberOnly && (
          <p className="muted">
            <span className="star">✦</span> Member-only story
          </p>
        )}
        {story.visibility === "unlisted" && mine && (
          <p className="muted">Unlisted</p>
        )}
        <h1>{story.title || "Untitled story"}</h1>
        {story.subtitle && <p className="dek">{story.subtitle}</p>}
        <div className="byline">
          <Avatar user={author} size={44} />
          <div>
            <div className="row" style={{ gap: 12 }}>
              <A to={"/@" + author?.username}>
                {author?.name || "Unknown author"}
              </A>
              {!mine && <Follow type="user" id={story.authorId} />}
            </div>
            <small>
              {pub && (
                <>
                  Published in <A to={"/" + pub.slug}>{pub.name}</A> ·{" "}
                </>
              )}
              {story.readingTime || 1} min read · {dateLabel(story.publishedAt)}
            </small>
          </div>
        </div>
        {bar()}
        <div className="article-body" onMouseUp={highlight}>
          {(story.body ?? []).map((b) => (
            <BodyBlock
              key={b.id}
              block={b}
              highlights={(state.highlights ?? []).filter(
                (h) => h.storyId === story.id && h.blockId === b.id,
              )}
              onRemove={(id) => actions.remove("highlights", id)}
            />
          ))}
        </div>
        <div style={{ marginTop: 48 }}>
          {(story.topicIds ?? []).map((id) => {
            const t = (state.topics ?? []).find((t) => t.id === id);
            return t ? (
              <A className="pill" key={id} to={"/tag/" + t.slug}>
                {t.name}
              </A>
            ) : null;
          })}
        </div>
        {bar()}
        <section className="author-card">
          <Avatar user={author} size={72} />
          <h2>Written by {author?.name || "Unknown author"}</h2>
          <p className="muted">
            {compact(author?.followerCount)} Followers ·{" "}
            {compact(author?.followingCount)} Following
          </p>
          <p>{author?.bio}</p>
          {mine ? (
            <button
              className="green"
              onClick={() => setModal(<ProfileModal />)}
            >
              Edit profile
            </button>
          ) : (
            <Follow type="user" id={story.authorId} />
          )}
        </section>
        {pub && (
          <section className="author-card">
            <PubLogo pub={pub} size={56} />
            <h2>Published in {pub.name}</h2>
            <p>{pub.tagline}</p>
            <p className="muted">{compact(pub.followerCount)} followers</p>
            <Follow type="publication" id={pub.id} />
          </section>
        )}
        <section>
          <h2>Responses ({responsesFor(state, "story", story.id).length})</h2>
          <ResponseSection
            target={story}
            inline
            onOpen={() => setDrawer(true)}
          />
        </section>
        <h2 style={{ marginTop: 64 }}>
          More from {author?.name || "this writer"}
        </h2>
        <div className="grid">
          {publishedVisible(state)
            .filter((s) => s.authorId === story.authorId && s.id !== story.id)
            .slice(0, 4)
            .map((s) => (
              <StoryCard story={s} variant="grid-card" key={s.id} />
            ))}
        </div>
        <A className="btn btn-outline" to={"/@" + author?.username}>
          See all from {author?.name || "this writer"}
        </A>
        <h2 style={{ marginTop: 64 }}>Recommended from Medium</h2>
        <div className="grid">
          {publishedVisible(state)
            .filter(
              (s) =>
                s.authorId !== story.authorId &&
                !(state.mutes ?? []).some(
                  (m) =>
                    m.targetId === s.authorId || m.targetId === s.publicationId,
                ),
            )
            .slice(0, 4)
            .map((s) => (
              <StoryCard story={s} variant="grid-card" key={s.id} />
            ))}
        </div>
      </main>
      {selection && (
        <div
          className="format-toolbar"
          style={{ left: selection.left, top: selection.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => {
              actions.add("highlights", {
                id: newId("hl"),
                userId: user.id,
                storyId: story.id,
                blockId: selection.blockId,
                text: selection.text,
                startOffset: selection.startOffset,
                endOffset: selection.endOffset,
                createdAt: now(),
              });
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
          >
            Highlight
          </button>
          <button
            onClick={() => {
              setQuote(selection.text);
              setDrawer(true);
              setSelection(null);
            }}
          >
            Respond
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(selection.text);
              notify("Copied");
              setSelection(null);
            }}
          >
            Share
          </button>
        </div>
      )}
      {drawer && (
        <Responses
          target={story}
          quote={quote}
          onClose={() => setDrawer(false)}
        />
      )}
    </>
  );
}
function HighlightText({ text, onRemove }) {
  const [open, setOpen] = useState(false), ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === "Escape" || (event.type === "pointerdown" && !ref.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return <span className="highlight-popover" ref={ref}>
    <mark role="button" tabIndex={0} aria-label="Highlight options" aria-expanded={open}
      style={{ background: "#E7F7E7", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
      onKeyDown={(event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          setOpen(!open);
        }
      }}>{text}</mark>
    {open && <span className="menu" role="menu">
      <Item onClick={onRemove}>Remove highlight</Item>
    </span>}
  </span>;
}
function BodyBlock({ block: b, highlights, onRemove }) {
  if (b.type === "image")
    return (
      <figure>
        <img src={coverDataUri(b.src)} alt={b.caption || ""} />
        <figcaption>{b.caption}</figcaption>
      </figure>
    );
  if (b.type === "hr") return <hr />;
  if (b.type === "ul" || b.type === "ol") {
    const Tag = b.type;
    return (
      <Tag data-block={b.id}>
        {(b.items ?? b.text?.split("\n") ?? []).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </Tag>
    );
  }
  const Tag =
    {
      h3: "h3",
      h4: "h4",
      blockquote: "blockquote",
      pullquote: "blockquote",
      code: "pre",
    }[b.type] || "p";
  if (highlights.length) {
    const text = b.text || "",
      parts = [];
    let cursor = 0;
    const ranges = highlights
      .map((h) => ({
        ...h,
        start:
          text.indexOf(h.text) >= 0
            ? text.indexOf(h.text)
            : Math.max(0, h.startOffset || 0),
      }))
      .sort((a, b) => a.start - b.start);
    for (const h of ranges) {
      if (h.start < cursor || h.start >= text.length) continue;
      parts.push(text.slice(cursor, h.start));
      const end = Math.min(text.length, h.start + h.text.length);
      parts.push(
        <HighlightText
          key={h.id}
          text={text.slice(h.start, end)}
          onRemove={() => onRemove(h.id)}
        />,
      );
      cursor = end;
    }
    parts.push(text.slice(cursor));
    return (
      <Tag className={b.type} data-block={b.id}>
        {parts}
      </Tag>
    );
  }
  return (
    <Tag
      className={b.type}
      data-block={b.id}
      dangerouslySetInnerHTML={{
        __html: sanitize(
          b.html ||
            String(b.text || "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;"),
        ),
      }}
    />
  );
}
