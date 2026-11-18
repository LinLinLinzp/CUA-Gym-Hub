import React, { useState } from "react";
import { useStore } from "../store/AppStore";
import { canEditPub, canSubmit, publishedVisible } from "../store/selectors";
import {
  A,
  useNav,
  Avatar,
  PubLogo,
  Button,
  Menu,
  Item,
  Tabs,
  Follow,
  StoryCard,
  StoryLink,
  Confirm,
  Empty,
  Badge,
  useUI,
} from "../components/UI";
import { colors } from "../utils/art";
import { compact, slugify, newId, now, dateLabel } from "../utils/urls";
import { Person, NotFound } from "./Discovery";
export function SubmitModal({ story, publicationId }) {
  const { state, actions } = useStore(),
    { close, notify } = useUI(),
    [pubId, setPub] = useState(publicationId || ""),
    [storyId, setStory] = useState(story?.id || ""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    active = (state.submissions ?? []).find(
      (s) =>
        s.storyId === storyId &&
        ["pending", "in_review", "edits_requested"].includes(s.status),
    ),
    pub = (state.publications ?? []).find((p) => p.id === pubId);
  return (
    <>
      <h2>Submit to a publication</h2>
      {!story && (
        <label>
          Choose a draft
          <select
            className="form-field"
            aria-label="Choose a draft"
            value={storyId}
            onChange={(e) => setStory(e.target.value)}
          >
            <option value="">Choose a story</option>
            {(state.stories ?? [])
              .filter(
                (s) =>
                  s.authorId === state.currentUserId && s.status === "draft",
              )
              .map((s) => (
                <option value={s.id} key={s.id}>
                  {s.title || "Untitled story"}
                </option>
              ))}
          </select>
        </label>
      )}
      {active ? (
        <>
          <p>
            This story is already submitted to{" "}
            {(state.publications ?? []).find(
              (p) => p.id === active.publicationId,
            )?.name || "a publication"}
          </p>
          <Button
            variant="text"
            onClick={() => {
              actions.decide(active.id, "withdrawn");
              close();
              notify("Submission withdrawn");
            }}
          >
            Withdraw
          </Button>
        </>
      ) : (
        <>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {(state.publications ?? [])
              .filter((p) => canSubmit(state, p))
              .map((p) => (
                <label key={p.id} className="picker-row">
                  <input
                    type="radio"
                    name="publication"
                    value={p.id}
                    checked={pubId === p.id}
                    onChange={() => setPub(p.id)}
                  />
                  <PubLogo pub={p} />
                  <span>
                    {p.name}
                    <br />
                    <small>
                      {canEditPub(state, p)
                        ? "You are an editor"
                        : p.submissionPolicy === "open"
                          ? "Open to all"
                          : "Writers only"}
                    </small>
                  </span>
                </label>
              ))}
          </div>
          <label>
            Note to editors
            <textarea
              aria-label="Note to editors"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={!pubId || !storyId}
              onClick={() => {
                if (actions.submit(storyId, pubId, note)) {
                  close();
                  notify(
                    canEditPub(state, pub)
                      ? "Added to publication"
                      : "Story submitted",
                  );
                } else
                  setError(
                    "Unable to submit this story. Check its current submission.",
                  );
              }}
            >
              {canEditPub(state, pub) ? "Add to publication" : "Submit"}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
export function PublicationForm({ pub }) {
  const { state, actions, user } = useStore(),
    { notify } = useUI(),
    nav = useNav(),
    [form, setForm] = useState({
      name: pub?.name || "",
      tagline: pub?.tagline || "",
      description: pub?.description || "",
      logoColor: pub?.logoColor || colors[1],
      accentColor: pub?.accentColor || "#1F3A5F",
      headerStyle: pub?.headerStyle || "light",
      email: pub?.email || "",
      twitter: pub?.twitter || "",
      topicIds: pub?.topicIds || [],
      editorIds: pub?.editorIds || [user.id],
      navItems: pub?.navItems || [],
    }),
    [error, setError] = useState(""),
    [editorQuery, setEditorQuery] = useState(""),
    [navLabel, setNavLabel] = useState(""),
    [navTopic, setNavTopic] = useState(""),
    set = (k, v) => setForm({ ...form, [k]: v }),
    slug = pub?.slug || slugify(form.name),
    reserved = [
      "me",
      "p",
      "new-story",
      "new-publication",
      "search",
      "tag",
      "list",
      "settings",
      "plans",
      "membership",
      "about",
      "explore-topics",
    ];
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      setError("Name and description are required");
      return;
    }
    if (
      !slug ||
      reserved.includes(slug) ||
      (state.publications ?? []).some(
        (p) => p.slug === slug && p.id !== pub?.id,
      )
    ) {
      setError("That URL is already taken");
      return;
    }
    if (pub) {
      actions.patch("publications", pub.id, form);
      notify("Changes saved");
    } else {
      actions.createPublication({ ...form, name: form.name.trim(), slug });
      nav("/" + slug);
      notify("Your publication is live");
    }
  };
  return (
    <form className={pub ? "" : "form-page"} onSubmit={submit}>
      <h1>{pub ? "Info & homepage" : "Tell us about your publication"}</h1>
      {[
        ["name", "Publication name", 50, true],
        ["tagline", "Tagline", 100],
        ["description", "Description", 280, true],
      ].map(([key, label, max, required]) => (
        <label key={key}>
          {label}
          {required ? " *" : ""}
          {key === "description" ? (
            <textarea
              className="form-field"
              required
              maxLength={max}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          ) : (
            <input
              className="form-field"
              required={required}
              maxLength={max}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          )}
          <small>
            {form[key].length}/{max}
          </small>
        </label>
      ))}
      <p className="muted">medium.com/{slug}</p>
      <label>Logo colour</label>
      <div className="row">
        <PubLogo pub={form} size={56} />
        <div className="swatches">
          {colors.map((c) => (
            <button
              type="button"
              className={form.logoColor === c ? "selected" : ""}
              aria-label={"Logo colour " + c}
              key={c}
              style={{ background: c }}
              onClick={() => set("logoColor", c)}
            />
          ))}
        </div>
      </div>
      <label>Header style</label>
      <div className="row">
        {["light", "dark"].map((style) => (
          <label className="check" key={style}>
            <input
              type="radio"
              name="headerStyle"
              checked={form.headerStyle === style}
              onChange={() => set("headerStyle", style)}
            />
            {style === "light" ? "Light" : "Dark"}
          </label>
        ))}
        <input
          type="color"
          aria-label="Accent colour"
          value={form.accentColor}
          onChange={(e) => set("accentColor", e.target.value)}
        />
      </div>
      <label>Publication topics (up to 5)</label>
      <div>
        {form.topicIds.map((id) => (
          <button
            type="button"
            className="pill"
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
      </div>
      <select
        className="form-field"
        aria-label="Publication topics"
        value=""
        onChange={(e) => {
          if (form.topicIds.length < 5)
            set("topicIds", [...form.topicIds, e.target.value]);
          else setError("You can add up to 5 topics");
        }}
      >
        <option value="">Add a topic</option>
        {(state.topics ?? [])
          .filter((t) => !form.topicIds.includes(t.id))
          .map((t) => (
            <option value={t.id} key={t.id}>
              {t.name}
            </option>
          ))}
      </select>
      {[
        ["email", "Contact email"],
        ["twitter", "Twitter username"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            className="form-field"
            type={key === "email" ? "email" : "text"}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </label>
      ))}
      <label>Editors</label>
      <div>
        {form.editorIds.map((id) => (
          <button
            type="button"
            className="pill"
            key={id}
            disabled={id === (pub?.ownerId || user.id)}
            onClick={() =>
              set(
                "editorIds",
                form.editorIds.filter((x) => x !== id),
              )
            }
          >
            {(state.users ?? []).find((u) => u.id === id)?.name || id}{" "}
            {id !== user.id ? "×" : ""}
          </button>
        ))}
      </div>
      <input
        className="form-field"
        aria-label="Search editors"
        placeholder="Search by username"
        value={editorQuery}
        onChange={(e) => setEditorQuery(e.target.value)}
      />
      {editorQuery &&
        (state.users ?? [])
          .filter(
            (u) =>
              !form.editorIds.includes(u.id) &&
              (u.name + " " + u.username)
                .toLowerCase()
                .includes(editorQuery.toLowerCase()),
          )
          .slice(0, 5)
          .map((u) => (
            <button
              className="menu-item"
              type="button"
              key={u.id}
              onClick={() => {
                set("editorIds", [...form.editorIds, u.id]);
                setEditorQuery("");
              }}
            >
              {u.name} @{u.username}
            </button>
          ))}
      {pub && (
        <>
          <h2>Navigation</h2>
          {form.navItems.map((item, i) => (
            <div className="settings-row" key={item.id}>
              <span>{item.label}</span>
              <div>
                <button
                  type="button"
                  aria-label="Move navigation up"
                  disabled={i === 0}
                  onClick={() => {
                    const a = [...form.navItems];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    set("navItems", a);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move navigation down"
                  disabled={i === form.navItems.length - 1}
                  onClick={() => {
                    const a = [...form.navItems];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    set("navItems", a);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Delete navigation item"
                  onClick={() =>
                    set(
                      "navItems",
                      form.navItems.filter((n) => n.id !== item.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <input
            className="form-field"
            aria-label="Navigation label"
            placeholder="Navigation label"
            value={navLabel}
            onChange={(e) => setNavLabel(e.target.value)}
          />
          <select
            className="form-field"
            aria-label="Navigation topic"
            value={navTopic}
            onChange={(e) => setNavTopic(e.target.value)}
          >
            <option value="">Choose topic</option>
            {(state.topics ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={!navLabel.trim() || !navTopic}
            onClick={() => {
              set("navItems", [
                ...form.navItems,
                { id: newId("nav"), label: navLabel, topicId: navTopic },
              ]);
              setNavLabel("");
            }}
          >
            Add navigation item
          </Button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <Button type="button" variant="text" onClick={() => nav(-1)}>
          Cancel
        </Button>
        <Button>{pub ? "Save" : "Next"}</Button>
      </div>
    </form>
  );
}
export function MyPublications() {
  const { state, actions } = useStore(),
    { setModal } = useUI();
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <div className="page-heading">
        <h1>Publications</h1>
        <A className="btn btn-green" to="/new-publication">
          New publication
        </A>
      </div>
      {["owner", "editor", "writer"].map((role) => {
        const pubs = (state.publications ?? []).filter((p) =>
          role === "owner"
            ? p.ownerId === state.currentUserId
            : role === "editor"
              ? p.ownerId !== state.currentUserId &&
                (p.editorIds ?? []).includes(state.currentUserId)
              : !canEditPub(state, p) &&
                (p.writerIds ?? []).includes(state.currentUserId),
        );
        return pubs.length ? (
          <section key={role}>
            <h2>As {role === "writer" ? "a writer" : "an " + role}</h2>
            {pubs.map((p) => (
              <div className="settings-row" key={p.id}>
                <PubLogo pub={p} size={40} />
                <div className="grow">
                  <A to={"/" + p.slug}>
                    <b>{p.name}</b>
                  </A>
                  <div>
                    <small>
                      {compact(p.followerCount)} followers ·{" "}
                      {
                        publishedVisible(state).filter(
                          (s) => s.publicationId === p.id,
                        ).length
                      }{" "}
                      stories
                    </small>
                  </div>
                </div>
                <A className="green" to={"/" + p.slug}>
                  Homepage
                </A>
                {role !== "writer" ? (
                  <A className="green" to={"/" + p.slug + "/manage"}>
                    Manage
                  </A>
                ) : (
                  <Button
                    variant="text"
                    onClick={() =>
                      setModal(
                        <Confirm
                          title="Leave publication?"
                          label="Leave"
                          text="You will no longer be a writer in this publication."
                          onConfirm={() =>
                            actions.patch("publications", p.id, {
                              writerIds: (p.writerIds ?? []).filter(
                                (id) => id !== state.currentUserId,
                              ),
                            })
                          }
                        />,
                      )
                    }
                  >
                    Leave
                  </Button>
                )}
              </div>
            ))}
          </section>
        ) : null;
      })}
      {!(state.publications ?? []).some((p) => canSubmit(state, p)) && (
        <Empty>Create a publication to share stories with a community.</Empty>
      )}
    </main>
  );
}
export function Publication({ pub, path = [] }) {
  const { state } = useStore(),
    { setModal } = useUI(),
    nav = useNav(),
    [limit, setLimit] = useState(10),
    topic =
      path[0] === "tagged"
        ? (state.topics ?? []).find((t) => t.slug === path[1])
        : null,
    stories = publishedVisible(state)
      .filter(
        (s) =>
          s.publicationId === pub.id &&
          (!topic || (s.topicIds ?? []).includes(topic.id)),
      )
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    featured = (pub.featuredStoryIds ?? [])
      .map((id) => stories.find((s) => s.id === id))
      .filter(Boolean);
  if (path[0] === "manage")
    return <ManagePublication pub={pub} section={path[1]} />;
  return (
    <div className="pub-page">
      <header
        className={
          "publication-header " + (pub.headerStyle === "dark" ? "dark" : "")
        }
        style={
          pub.headerStyle === "dark"
            ? { background: pub.accentColor || "#1F3A5F" }
            : {}
        }
      >
        <div className="row">
          <PubLogo pub={pub} size={56} />
          <div className="grow">
            <A to={"/" + pub.slug}>
              <h1>{pub.name}</h1>
            </A>
            <div>{pub.tagline}</div>
          </div>
          <span>{compact(pub.followerCount)} followers</span>
          <Follow type="publication" id={pub.id} />
        </div>
        <div className="row spread">
          <Tabs
            active={topic?.id || path[0] || "home"}
            items={[
              { id: "home", label: "HOME" },
              ...(pub.navItems ?? []).map((n) => ({
                id: n.topicId,
                label: n.label,
              })),
              { id: "about", label: "ABOUT" },
            ]}
            onSelect={(id) => {
              const t = (state.topics ?? []).find((t) => t.id === id);
              nav(
                "/" +
                  pub.slug +
                  (id === "home"
                    ? ""
                    : id === "about"
                      ? "/about"
                      : "/tagged/" + t?.slug),
              );
            }}
          />
          {pub.submissionPolicy !== "closed" && (
            <Button
              variant="text"
              onClick={() => setModal(<SubmitModal publicationId={pub.id} />)}
            >
              SUBMIT
            </Button>
          )}
          {canEditPub(state, pub) && (
            <A to={"/" + pub.slug + "/manage"}>Manage</A>
          )}
        </div>
      </header>
      {path[0] === "about" ? (
        <main className="form-page">
          <h1>About {pub.name}</h1>
          <p>{pub.description}</p>
          <p>Followers {compact(pub.followerCount)}</p>
          <h2>Elsewhere</h2>
          <p>
            {pub.email}
            <br />
            {pub.twitter ? "@" + pub.twitter : ""}
          </p>
          <h2>Editors</h2>
          {(pub.editorIds ?? []).map((id) => {
            const u = (state.users ?? []).find((u) => u.id === id);
            return u ? <Person target={u} key={id} /> : null;
          })}
          <h2>Writers ({pub.writerIds?.length || 0})</h2>
          {(pub.writerIds ?? []).map((id) => {
            const u = (state.users ?? []).find((u) => u.id === id);
            return u ? <Person target={u} key={id} /> : null;
          })}
          <h2>Submission guidelines</h2>
          <p style={{ whiteSpace: "pre-line" }}>{pub.submissionGuidelines}</p>
          {pub.submissionPolicy !== "closed" && (
            <Button
              onClick={() => setModal(<SubmitModal publicationId={pub.id} />)}
            >
              Submit a story
            </Button>
          )}
        </main>
      ) : (
        <div className="columns">
          <main className="main-column page">
            {!topic && featured.length > 0 && (
              <>
                <div className="grid featured-layout">
                  {featured.slice(0, 3).map((s) => (
                    <StoryCard key={s.id} story={s} variant="grid-card" />
                  ))}
                </div>
                <h2>Latest</h2>
              </>
            )}
            {stories.slice(0, limit).map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
            {!stories.length && (
              <Empty>
                No stories yet.{" "}
                {(state.users ?? []).find((u) => u.id === pub.ownerId)?.name ||
                  "The owner"}{" "}
                hasn’t published anything in {pub.name}.
              </Empty>
            )}
            {limit < stories.length && (
              <Button variant="outline" onClick={() => setLimit(limit + 10)}>
                Load more
              </Button>
            )}
          </main>
          <aside className="right-rail">
            <h3>About {pub.name}</h3>
            <p>{pub.description}</p>
            <small>{compact(pub.followerCount)} followers</small>
            <h3 style={{ marginTop: 32 }}>Editors</h3>
            {(pub.editorIds ?? []).map((id) => {
              const u = (state.users ?? []).find((u) => u.id === id);
              return u ? <Person target={u} key={id} /> : null;
            })}
          </aside>
        </div>
      )}
    </div>
  );
}
export function DecisionModal({ submission, status }) {
  const { actions } = useStore(),
    { close, notify } = useUI(),
    [note, setNote] = useState("");
  return (
    <>
      <h2>
        {status === "edits_requested" ? "Request edits" : "Decline submission"}
      </h2>
      <label>
        Note to writer
        <textarea
          aria-label="Note to writer"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="actions">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={status === "edits_requested" && !note.trim()}
          onClick={() => {
            actions.decide(submission.id, status, note);
            close();
            notify("Submission updated");
          }}
        >
          {status === "edits_requested" ? "Request edits" : "Decline"}
        </Button>
      </div>
    </>
  );
}
export function SubmissionActions({ submission }) {
  const { actions } = useStore(),
    { setModal, notify } = useUI();
  return (
    <div className="row" style={{ flexWrap: "wrap", marginTop: 16 }}>
      {submission.status === "pending" && (
        <Button
          variant="outline"
          onClick={() => actions.decide(submission.id, "in_review")}
        >
          Mark in review
        </Button>
      )}
      {["pending", "in_review", "edits_requested"].includes(
        submission.status,
      ) && (
        <>
          <Button
            onClick={() => {
              actions.decide(submission.id, "approved");
              notify("Story approved and published");
            }}
          >
            Approve & publish
          </Button>
          <Button
            variant="text"
            onClick={() =>
              setModal(
                <DecisionModal
                  submission={submission}
                  status="edits_requested"
                />,
              )
            }
          >
            Request edits
          </Button>
          <Button
            variant="text"
            onClick={() =>
              setModal(
                <DecisionModal submission={submission} status="declined" />,
              )
            }
          >
            Decline
          </Button>
        </>
      )}
    </div>
  );
}
function ManagePublication({ pub, section = "submissions" }) {
  const { state, actions } = useStore(),
    { setModal, notify } = useUI(),
    [tab, setTab] = useState("pending"),
    [q, setQ] = useState(""),
    [policy, setPolicy] = useState(pub.submissionPolicy || "open"),
    [guidelines, setGuidelines] = useState(pub.submissionGuidelines || "");
  if (!canEditPub(state, pub)) return <NotFound />;
  const members = [
      ...new Set([
        pub.ownerId,
        ...(pub.editorIds ?? []),
        ...(pub.writerIds ?? []),
      ]),
    ],
    submissions = (state.submissions ?? []).filter(
      (s) => s.publicationId === pub.id,
    ),
    stories = publishedVisible(state).filter((s) => s.publicationId === pub.id),
    patch = (fields) => actions.patch("publications", pub.id, fields),
    navs = [
      ["submissions", "Submissions"],
      ["stories", "Stories"],
      ["people", "People"],
      ["info", "Info & homepage"],
      ["settings", "Submission settings"],
    ];
  return (
    <div className="manage-layout">
      <aside className="manage-nav">
        <h3>{pub.name}</h3>
        {navs.map(([id, label]) => (
          <A
            key={id}
            className={section === id ? "green" : ""}
            to={"/" + pub.slug + "/manage/" + id}
          >
            {label}
          </A>
        ))}
      </aside>
      <main className="manage-content">
        {section === "info" ? (
          <PublicationForm pub={pub} />
        ) : section === "settings" ? (
          <>
            <h1>Submission settings</h1>
            {[
              [
                "open",
                "Open to all — Any writer who follows your publication can submit",
              ],
              [
                "writers_only",
                "Writers only — Only approved writers can submit",
              ],
              ["closed", "Closed — Not accepting submissions"],
            ].map(([id, label]) => (
              <label className="check" key={id}>
                <input
                  type="radio"
                  name="policy"
                  checked={policy === id}
                  onChange={() => setPolicy(id)}
                />
                {label}
              </label>
            ))}
            <label>
              Submission guidelines
              <textarea
                className="form-field"
                aria-label="Submission guidelines"
                maxLength={2000}
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
              />
            </label>
            <div className="actions">
              <Button
                onClick={() => {
                  patch({
                    submissionPolicy: policy,
                    submissionGuidelines: guidelines,
                  });
                  notify("Changes saved");
                }}
              >
                Save
              </Button>
            </div>
          </>
        ) : section === "people" ? (
          <>
            <h1>People</h1>
            <h2>Add writer</h2>
            <input
              className="form-field"
              aria-label="Add writer"
              placeholder="Search by name or username"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q &&
              (state.users ?? [])
                .filter(
                  (u) =>
                    !members.includes(u.id) &&
                    (u.name + " " + u.username)
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                )
                .slice(0, 8)
                .map((u) => (
                  <button
                    key={u.id}
                    className="menu-item"
                    onClick={() => {
                      patch({ writerIds: [...(pub.writerIds ?? []), u.id] });
                      setQ("");
                      notify("Writer added");
                    }}
                  >
                    {u.name} @{u.username} · Add writer
                  </button>
                ))}
            {["Editors", "Writers"].map((role) => (
              <section key={role}>
                <h2>{role}</h2>
                {members
                  .filter((id) =>
                    role === "Editors"
                      ? id === pub.ownerId || (pub.editorIds ?? []).includes(id)
                      : !(pub.editorIds ?? []).includes(id) &&
                        id !== pub.ownerId,
                  )
                  .map((id) => {
                    const u = (state.users ?? []).find((u) => u.id === id);
                    return (
                      <div className="settings-row" key={id}>
                        <Avatar user={u} />
                        <div className="grow">
                          <b>{u?.name || "Unknown writer"}</b>
                          <div>
                            <small>
                              @{u?.username} ·{" "}
                              {id === pub.ownerId
                                ? "Owner"
                                : role === "Editors"
                                  ? "Editor"
                                  : "Writer"}
                            </small>
                          </div>
                        </div>
                        {id !== pub.ownerId && (
                          <Menu>
                            {pub.ownerId === state.currentUserId &&
                              !(pub.editorIds ?? []).includes(id) && (
                                <Item
                                  onClick={() =>
                                    patch({
                                      editorIds: [...(pub.editorIds ?? []), id],
                                      writerIds: (pub.writerIds ?? []).filter(
                                        (x) => x !== id,
                                      ),
                                    })
                                  }
                                >
                                  Promote to editor
                                </Item>
                              )}
                            <Item
                              danger
                              onClick={() =>
                                setModal(
                                  <Confirm
                                    title="Remove from publication?"
                                    label="Remove"
                                    text="This person will lose their publication role."
                                    onConfirm={() =>
                                      patch({
                                        editorIds: (pub.editorIds ?? []).filter(
                                          (x) => x !== id,
                                        ),
                                        writerIds: (pub.writerIds ?? []).filter(
                                          (x) => x !== id,
                                        ),
                                      })
                                    }
                                  />,
                                )
                              }
                            >
                              Remove from publication
                            </Item>
                          </Menu>
                        )}
                      </div>
                    );
                  })}
              </section>
            ))}
          </>
        ) : section === "stories" ? (
          <>
            <h1>Stories</h1>
            {stories.map((story) => (
              <div key={story.id} className="story-row">
                <div className="row spread">
                  <StoryLink story={story}>
                    <b>{story.title}</b>
                  </StoryLink>
                  <Menu>
                    <Item
                      onClick={() => {
                        const ids = pub.featuredStoryIds ?? [];
                        if (ids.includes(story.id))
                          patch({
                            featuredStoryIds: ids.filter((x) => x !== story.id),
                          });
                        else if (ids.length >= 5)
                          notify("You can feature up to 5 stories");
                        else patch({ featuredStoryIds: [...ids, story.id] });
                      }}
                    >
                      {(pub.featuredStoryIds ?? []).includes(story.id)
                        ? "Remove from featured"
                        : "Feature on homepage"}
                    </Item>
                    {["up", "down"].map((direction) => (
                      <Item
                        key={direction}
                        onClick={() => {
                          const ids = [...(pub.featuredStoryIds ?? [])],
                            i = ids.indexOf(story.id),
                            j = i + (direction === "up" ? -1 : 1);
                          if (i >= 0 && j >= 0 && j < ids.length) {
                            [ids[i], ids[j]] = [ids[j], ids[i]];
                            patch({ featuredStoryIds: ids });
                          }
                        }}
                      >
                        Move {direction}
                      </Item>
                    ))}
                    <Item
                      danger
                      onClick={() =>
                        setModal(
                          <Confirm
                            title="Remove story from publication?"
                            label="Remove"
                            text="The story will remain on the author’s profile."
                            onConfirm={() => {
                              actions.patch("stories", story.id, {
                                publicationId: null,
                              });
                              patch({
                                featuredStoryIds: (
                                  pub.featuredStoryIds ?? []
                                ).filter((id) => id !== story.id),
                              });
                            }}
                          />,
                        )
                      }
                    >
                      Remove from publication
                    </Item>
                  </Menu>
                </div>
                <p className="muted">
                  {
                    (state.users ?? []).find((u) => u.id === story.authorId)
                      ?.name
                  }{" "}
                  · {dateLabel(story.publishedAt)}{" "}
                  {(pub.featuredStoryIds ?? []).includes(story.id)
                    ? "· Featured"
                    : ""}
                </p>
              </div>
            ))}
            {!stories.length && <Empty>No published stories yet.</Empty>}
          </>
        ) : (
          <>
            <h1>Submissions</h1>
            <Tabs
              active={tab}
              items={[
                {
                  id: "pending",
                  label: "Pending",
                  count: submissions.filter((s) =>
                    ["pending", "in_review"].includes(s.status),
                  ).length,
                },
                { id: "edits_requested", label: "Edits requested" },
                { id: "declined", label: "Declined" },
                { id: "approved", label: "Approved" },
              ]}
              onSelect={setTab}
            />
            {submissions
              .filter((s) =>
                tab === "pending"
                  ? ["pending", "in_review"].includes(s.status)
                  : s.status === tab,
              )
              .map((sub) => {
                const story = (state.stories ?? []).find(
                    (s) => s.id === sub.storyId,
                  ),
                  u = (state.users ?? []).find(
                    (u) => u.id === sub.submittedById,
                  );
                return (
                  <div className="story-row" key={sub.id}>
                    <A to={"/p/" + sub.storyId}>
                      <h3>{story?.title || "Untitled story"}</h3>
                    </A>
                    <div className="byline">
                      <Avatar user={u} size={24} />
                      {u?.name}
                      <small>
                        {" "}
                        · Submitted {dateLabel(sub.createdAt)} ·{" "}
                        {story?.wordCount || 0} words
                      </small>
                      <Badge status={sub.status} />
                    </div>
                    <p>{sub.noteToEditors}</p>
                    {sub.editorNote && (
                      <blockquote className="note">{sub.editorNote}</blockquote>
                    )}
                    <SubmissionActions submission={sub} />
                  </div>
                );
              })}
            {!submissions.some((s) =>
              tab === "pending"
                ? ["pending", "in_review"].includes(s.status)
                : s.status === tab,
            ) && <Empty>No submissions here.</Empty>}
          </>
        )}
      </main>
    </div>
  );
}
