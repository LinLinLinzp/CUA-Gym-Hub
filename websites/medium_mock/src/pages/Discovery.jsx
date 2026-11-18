import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "../store/AppStore";
import { publishedVisible, isFollowing, canEditPub } from "../store/selectors";
import {
  A,
  useNav,
  Avatar,
  PubLogo,
  Button,
  Tabs,
  StoryCard,
  StoryLink,
  ListCard,
  ListForm,
  Follow,
  Footer,
  Empty,
  IconButton,
  useUI,
} from "../components/UI";
import { ProfileModal } from "../components/ProfileModal";
import { compact, listUrl } from "../utils/urls";
import { coverDataUri } from "../utils/art";
export function Home() {
  const { state, actions } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    params = new URLSearchParams(loc.search),
    active = params.get("tag") || params.get("feed") || "for-you",
    [limit, setLimit] = useState(10),
    sentinel = useRef(null),
    originalMutes = useRef(new Set((state.mutes ?? []).map((m) => m.id))),
    followed = (state.follows ?? [])
      .filter((f) => f.targetType === "topic")
      .map((f) => (state.topics ?? []).find((t) => t.id === f.targetId))
      .filter(Boolean);
  const follows = (type, id) => isFollowing(state, type, id),
    topic = (state.topics ?? []).find((t) => t.slug === active),
    muted = (s) =>
      (state.mutes ?? []).some(
        (m) =>
          (m.targetType === "user" && m.targetId === s.authorId) ||
          (m.targetType === "publication" && m.targetId === s.publicationId),
      ),
    score = (s) =>
      (s.topicIds ?? []).filter((id) => follows("topic", id)).length * 1e9 +
      (follows("user", s.authorId) || follows("publication", s.publicationId)
        ? 1e8
        : 0) +
      (s.clapCount || 0) /
        (1 + Math.max(0, (new Date() - new Date(s.publishedAt)) / 864e5));
  const stories = publishedVisible(state)
    .filter(
      (s) =>
        (active !== "for-you" || s.authorId !== state.currentUserId) &&
        !muted(s),
    )
    .filter((s) =>
      active === "following"
        ? follows("user", s.authorId) || follows("publication", s.publicationId)
        : active === "featured"
          ? (state.publications ?? []).some((p) =>
              (p.featuredStoryIds ?? []).includes(s.id),
            )
          : topic
            ? (s.topicIds ?? []).includes(topic.id)
            : true,
    )
    .sort((a, b) =>
      active === "for-you"
        ? score(b) - score(a)
        : new Date(b.publishedAt) - new Date(a.publishedAt),
    );
  const staff = (state.lists ?? []).find((l) => l.id === "lst_staff_picks"),
    staffStories = (staff?.items ?? [])
      .map((i) => publishedVisible(state).find((s) => s.id === i.storyId))
      .filter(Boolean)
      .slice(0, 3),
    reading = (state.lists ?? []).find(
      (l) => l.isDefault && l.ownerId === state.currentUserId,
    );
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !sentinel.current)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting))
          setLimit((n) => Math.min(n + 10, stories.length));
      },
      { rootMargin: "150px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [stories.length, limit]);
  return (
    <div className="columns">
      <main className="main-column">
        <div className="home-tabs">
          <IconButton
            label="Customize topics"
            onClick={() => nav("/explore-topics")}
          >
            <Plus />
          </IconButton>
          <Tabs
            scrollable
            active={active}
            items={[
              { id: "for-you", label: "For you" },
              { id: "following", label: "Following" },
              { id: "featured", label: "Featured" },
              ...followed.map((t) => ({ id: t.slug, label: t.name })),
            ]}
            onSelect={(id) => {
              setLimit(10);
              actions.update((s) => {
                s.ui = { ...s.ui, homeTab: id };
              });
              nav(
                followed.some((t) => t.slug === id)
                  ? "/?tag=" + id
                  : "/?feed=" + id,
              );
            }}
          />
        </div>
        {(state.mutes ?? [])
          .filter((m) => !originalMutes.current.has(m.id))
          .map((m) => (
            <div className="mute-notice" key={m.id}>
              {(
                state[m.targetType === "user" ? "users" : "publications"] ?? []
              ).find((x) => x.id === m.targetId)?.name || "Writer"}{" "}
              is muted.{" "}
              <button
                className="green"
                onClick={() => actions.remove("mutes", m.id)}
              >
                Undo
              </button>
            </div>
          ))}
        {stories.slice(0, limit).map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
        {!stories.length && (
          <Empty>
            {active === "following"
              ? "Stories from writers and publications you follow will appear here."
              : "No stories here yet."}
            <p>
              <A className="green" to="/me/following">
                See suggestions
              </A>
            </p>
          </Empty>
        )}
        {limit < stories.length && (
          <div className="empty" ref={sentinel}>
            <Button variant="outline" onClick={() => setLimit(limit + 10)}>
              Load more
            </Button>
          </div>
        )}
      </main>
      <aside className="right-rail">
        <section>
          <h3>Staff Picks</h3>
          {staffStories.map((s) => (
            <StoryCard story={s} key={s.id} variant="compact" />
          ))}
          {staff && (
            <A className="muted" to={listUrl(staff, state)}>
              See the full list
            </A>
          )}
        </section>
        <section>
          <h3>Recommended topics</h3>
          {(state.topics ?? [])
            .filter((t) => !follows("topic", t.id))
            .slice(0, 7)
            .map((t) => (
              <A className="pill" key={t.id} to={"/tag/" + t.slug}>
                {t.name}
              </A>
            ))}
          <p>
            <A className="muted" to="/explore-topics">
              See more topics
            </A>
          </p>
        </section>
        <section>
          <h3>Who to follow</h3>
          {(state.users ?? [])
            .filter(
              (u) => u.id !== state.currentUserId && !follows("user", u.id),
            )
            .slice(0, 3)
            .map((u) => (
              <Person key={u.id} target={u} type="user" />
            ))}
          <A className="muted" to="/me/following">
            See more suggestions
          </A>
        </section>
        <section>
          <h3>Recently saved</h3>
          {(reading?.items ?? []).slice(0, 4).map((i) => (
            <StoryCard
              key={i.storyId}
              story={(state.stories ?? []).find((s) => s.id === i.storyId)}
              variant="compact"
            />
          ))}
          {reading && (
            <A className="muted" to={listUrl(reading, state)}>
              See all ({reading.items?.length || 0})
            </A>
          )}
        </section>
        <Footer />
      </aside>
    </div>
  );
}
export function Person({ target, type = "user" }) {
  return (
    <div className="person">
      {type === "user" ? <Avatar user={target} /> : <PubLogo pub={target} />}
      <div className="info">
        <A to={type === "user" ? "/@" + target.username : "/" + target.slug}>
          <b>{target.name}</b>
        </A>
        <p>{target.bio || target.tagline}</p>
      </div>
      <Follow type={type} id={target.id} />
    </div>
  );
}
export function Profile({ user: person, tab = "" }) {
  const { state, user, actions } = useStore(),
    nav = useNav(),
    { setModal, notify } = useUI(),
    [editingAbout, setEditingAbout] = useState(false),
    [about, setAbout] = useState(person.about || ""),
    mine = person.id === user.id,
    stories = publishedVisible(state)
      .filter((s) => s.authorId === person.id)
      .sort(
        (a, b) =>
          Number(b.pinnedToProfile) - Number(a.pinnedToProfile) ||
          new Date(b.publishedAt) - new Date(a.publishedAt),
      );
  return (
    <div className="columns">
      <main className="main-column page">
        <div className="page-heading">
          <h1>{person.name}</h1>
          {mine && tab === "lists" && (
            <Button onClick={() => setModal(<ListForm />)}>New list</Button>
          )}
        </div>
        <Tabs
          active={tab || "home"}
          items={["Home", "Lists", "About"].map((x) => ({
            id: x.toLowerCase(),
            label: x,
          }))}
          onSelect={(id) =>
            nav("/@" + person.username + (id === "home" ? "" : "/" + id))
          }
        />
        {tab === "lists" ? (
          (state.lists ?? [])
            .filter(
              (l) =>
                l.ownerId === person.id && (mine || l.visibility === "public"),
            )
            .map((l) => <ListCard list={l} key={l.id} />)
        ) : tab === "about" ? (
          <div className="article-body">
            <p style={{ whiteSpace: "pre-line" }}>
              {person.about || person.bio}
            </p>
            {mine &&
              (editingAbout ? (
                <>
                  <textarea
                    className="form-field"
                    aria-label="Edit About Page"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                  <div className="actions">
                    <Button
                      variant="text"
                      onClick={() => setEditingAbout(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        actions.patch("users", person.id, { about });
                        setEditingAbout(false);
                        notify("About Page saved");
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="text" onClick={() => setEditingAbout(true)}>
                  Edit About Page
                </Button>
              ))}
            <small>
              Medium member since{" "}
              {new Date(person.joinedAt || "2020-01-01").toLocaleDateString(
                "en-US",
                { month: "long", year: "numeric" },
              )}
            </small>
            <p>
              {compact(person.followerCount)} Followers ·{" "}
              {compact(person.followingCount)} Following
            </p>
          </div>
        ) : stories.length ? (
          stories.map((s) => (
            <div key={s.id}>
              {s.pinnedToProfile && <p className="muted">Pinned</p>}
              <StoryCard story={s} />
            </div>
          ))
        ) : (
          <Empty>No published stories yet.</Empty>
        )}
      </main>
      <aside className="right-rail">
        <Avatar user={person} size={88} />
        <h3 style={{ marginTop: 20 }}>{person.name}</h3>
        <p className="muted">{compact(person.followerCount)} Followers</p>
        <p>{person.bio}</p>
        {mine ? (
          <button className="green" onClick={() => setModal(<ProfileModal />)}>
            Edit profile
          </button>
        ) : (
          <Follow type="user" id={person.id} />
        )}
        <section className="profile-lists">
          <h3>Lists</h3>
          {(state.lists ?? [])
            .filter((list) => list.ownerId === person.id && list.visibility === "public")
            .slice(0, 3)
            .map((list) => <A className="profile-list" key={list.id} to={listUrl(list, state)}>
              <span className="profile-list-covers">
                {Array.from({ length: 3 }, (_, i) => {
                  const story = (state.stories ?? []).find((s) => s.id === list.items?.[i]?.storyId);
                  return <span key={i}>{story?.coverImage && <img src={coverDataUri(story.coverImage)} alt="" />}</span>;
                })}
              </span>
              <span><strong>{list.name}</strong><small className="muted">{list.items?.length || 0} stories</small></span>
            </A>)}
          <A className="muted" to={"/@" + person.username + "/lists"}>View All</A>
        </section>
        <section style={{ marginTop: 48 }}>
          <h3>Following</h3>
          {(state.follows ?? [])
            .filter(
              (f) => f.followerId === person.id && f.targetType === "user",
            )
            .slice(0, 5)
            .map((f) => {
              const u = (state.users ?? []).find((u) => u.id === f.targetId);
              return u ? <Person key={f.id} target={u} /> : null;
            })}
          <A className="green" to="/me/following">
            See all ({person.followingCount || 0})
          </A>
        </section>
        <Footer />
      </aside>
    </div>
  );
}
export function Topic({ slug }) {
  const { state } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    t = (state.topics ?? []).find((t) => t.slug === slug);
  if (!t) return <NotFound />;
  const sort = new URLSearchParams(loc.search).get("sort") || "recommended",
    stories = publishedVisible(state)
      .filter((s) => (s.topicIds ?? []).includes(t.id))
      .sort((a, b) =>
        sort === "latest"
          ? new Date(b.publishedAt) - new Date(a.publishedAt)
          : (b.clapCount || 0) - (a.clapCount || 0),
      );
  return (
    <main className="form-page" style={{ maxWidth: 1000 }}>
      <div style={{ textAlign: "center" }}>
        {(t.relatedTopicIds ?? []).map((id) => {
          const r = (state.topics ?? []).find((x) => x.id === id);
          return r ? (
            <A className="pill" to={"/tag/" + r.slug} key={id}>
              {r.name}
            </A>
          ) : null;
        })}
        <h1 style={{ margin: "28px 0 12px" }}>{t.name}</h1>
        <p className="muted">
          Topic · {compact(t.storyCount)} stories · {compact(t.writerCount)}{" "}
          writers
        </p>
        <Follow type="topic" id={t.id} />
      </div>
      <Tabs
        active={sort}
        items={[
          { id: "recommended", label: "Recommended" },
          { id: "latest", label: "Latest" },
        ]}
        onSelect={(id) => nav("/tag/" + slug + "?sort=" + id)}
      />
      <div className="grid">
        {stories.map((s) => (
          <StoryCard story={s} key={s.id} variant="grid-card" />
        ))}
      </div>
      {!stories.length && <Empty>No stories about {t.name} yet.</Empty>}
    </main>
  );
}
export function Explore() {
  const { state } = useStore(),
    [q, setQ] = useState("");
  const groups = {
    Culture: [
      "Books",
      "Reading",
      "Literature",
      "Fiction",
      "Poetry",
      "Writing",
      "Writing Tips",
      "Essay",
      "Film",
      "Movies",
      "Television",
      "Music",
      "Art",
      "Photography",
      "Design",
      "Architecture",
      "Museums",
    ],
    Life: [
      "Food",
      "Travel",
      "Japan",
      "Self Improvement",
      "Productivity",
      "Psychology",
      "Relationships",
      "Life Lessons",
      "Mental Health",
    ],
    Tech: [
      "Technology",
      "Artificial Intelligence",
      "Programming",
      "Data Science",
      "Startup",
      "Science",
    ],
    Society: ["History", "Philosophy", "Culture", "Climate Change"],
  };
  return (
    <main className="form-page">
      <h1>Explore topics</h1>
      <input
        className="form-field"
        aria-label="Search all topics"
        placeholder="Search all topics"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div style={{ marginTop: 24 }}>
        {(state.topics ?? [])
          .filter((t) => t.name?.toLowerCase().includes(q.toLowerCase()))
          .map((t) => (
            <A className="pill" key={t.id} to={"/tag/" + t.slug}>
              {t.name}
            </A>
          ))}
      </div>
      {Object.entries(groups).map(([name, names]) => (
        <section key={name}>
          <h2 style={{ marginTop: 40 }}>{name}</h2>
          {(state.topics ?? [])
            .filter(
              (t) =>
                names.includes(t.name) &&
                t.name.toLowerCase().includes(q.toLowerCase()),
            )
            .map((t) => (
              <div className="settings-row" key={t.id}>
                <A to={"/tag/" + t.slug}>{t.name}</A>
                <Follow type="topic" id={t.id} />
              </div>
            ))}
        </section>
      ))}
    </main>
  );
}
export function SearchPage() {
  const { state } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    p = new URLSearchParams(loc.search),
    q = p.get("q") || "",
    type = p.get("type") || "stories",
    match = (...fields) =>
      fields.filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
    stories = publishedVisible(state).filter((s) =>
      match(
        s.title,
        s.subtitle,
        (s.body ?? []).map((b) => b.text || "").join(" "),
        (state.users ?? []).find((u) => u.id === s.authorId)?.name,
      ),
    ),
    people = (state.users ?? []).filter((u) =>
      match(u.name, u.username, u.bio),
    ),
    topics = (state.topics ?? []).filter((t) => match(t.name)),
    pubs = (state.publications ?? []).filter((p) => match(p.name, p.tagline)),
    lists = (state.lists ?? []).filter(
      (l) =>
        (l.visibility === "public" || l.ownerId === state.currentUserId) &&
        match(l.name, l.description),
    ),
    rows = { stories, people, topics, publications: pubs, lists }[type] || [];
  return (
    <div className="columns">
      <main className="main-column page">
        <h1>
          <span className="muted" style={{ fontSize: "inherit" }}>
            Results for{" "}
          </span>
          {q}
        </h1>
        <Tabs
          active={type}
          items={["Stories", "People", "Publications", "Topics", "Lists"].map(
            (x) => ({ id: x.toLowerCase(), label: x }),
          )}
          onSelect={(id) =>
            nav("/search?q=" + encodeURIComponent(q) + "&type=" + id)
          }
        />
        {rows.map((r) =>
          type === "stories" ? (
            <StoryCard key={r.id} story={r} />
          ) : type === "lists" ? (
            <ListCard key={r.id} list={r} />
          ) : type === "topics" ? (
            <div className="settings-row" key={r.id}>
              <A to={"/tag/" + r.slug}>{r.name}</A>
              <Follow type="topic" id={r.id} />
            </div>
          ) : (
            <Person
              key={r.id}
              target={r}
              type={type === "people" ? "user" : "publication"}
            />
          ),
        )}
        {!rows.length && (
          <Empty>
            Make sure all words are spelled correctly. Try different keywords.
            Try more general keywords.
          </Empty>
        )}
      </main>
      <aside className="right-rail">
        <h3>People matching {q}</h3>
        {people.slice(0, 3).map((u) => (
          <Person key={u.id} target={u} />
        ))}
        <h3>Topics matching {q}</h3>
        {topics.slice(0, 5).map((t) => (
          <A className="pill" key={t.id} to={"/tag/" + t.slug}>
            {t.name}
          </A>
        ))}
        <Footer />
      </aside>
    </div>
  );
}
export function Notifications({ tab }) {
  const { state, actions } = useStore(),
    nav = useNav(),
    all = state.notifications ?? [],
    rows = all.filter(
      (n) => tab !== "responses" || ["response", "reply"].includes(n.type),
    );
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <div className="page-heading">
        <h1>Notifications</h1>
        <Button
          variant="text"
          onClick={() =>
            actions.update((s) =>
              (s.notifications ?? []).forEach((n) => {
                n.read = true;
              }),
            )
          }
        >
          Mark all as read
        </Button>
      </div>
      <Tabs
        active={tab || "all"}
        items={[
          { id: "all", label: "All" },
          { id: "responses", label: "Responses" },
        ]}
        onSelect={(id) =>
          nav("/me/notifications" + (id === "all" ? "" : "/responses"))
        }
      />
      {rows.map((n) => {
        const actor = (state.users ?? []).find((u) => u.id === n.actorId),
          story = (state.stories ?? []).find((s) => s.id === n.storyId),
          pub = (state.publications ?? []).find(
            (p) => p.id === n.publicationId,
          ),
          action = {
            follow: "followed you",
            clap: "clapped for",
            response: "responded to",
            reply: "replied to your response on",
            list_add: "added to their list",
            submission_received: "submitted a story to",
            submission_approved: "published your story",
            submission_declined: "declined your submission",
            edits_requested: "requested edits on",
            publication_writer_added: "added you as a writer in",
            mention: "mentioned you in",
          }[n.type];
        return (
          <div
            className={"notification " + (!n.read ? "unread" : "")}
            key={n.id}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.click();
            }}
            onClick={() => {
              actions.update((s) => {
                const row = s.notifications.find((x) => x.id === n.id);
                row.read = true;
              });
              if (n.type === "follow") nav("/@" + actor?.username);
              else if (
                n.type === "submission_received" &&
                pub &&
                canEditPub(state, pub)
              )
                nav("/" + pub.slug + "/manage");
              else if (story)
                nav(
                  "/p/" +
                    story.id +
                    (["response", "reply"].includes(n.type)
                      ? "?responses=open"
                      : ""),
                );
            }}
          >
            <Avatar user={actor} />
            <div className="grow">
              <p>
                <b>
                  {[
                    "submission_approved",
                    "submission_declined",
                    "edits_requested",
                  ].includes(n.type)
                    ? pub?.name
                    : actor?.name || "A reader"}
                </b>{" "}
                {action}{" "}
                <b>
                  {n.type === "follow"
                    ? ""
                    : n.type === "submission_received" ||
                        n.type === "publication_writer_added"
                      ? pub?.name
                      : story?.title || "a story"}
                </b>
              </p>
              <small>
                {new Date(n.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </div>
            {!n.read && <i className="dot" />}
          </div>
        );
      })}
      {!rows.length && <Empty>You’re all caught up.</Empty>}
    </main>
  );
}
export function NotFound() {
  const { state } = useStore();
  return (
    <main className="not-found">
      <small>PAGE NOT FOUND</small>
      <div className="number">404</div>
      <h1>Out of nothing, something.</h1>
      <p>
        You can find (just about) anything on Medium — apparently even a page
        that doesn’t exist. Maybe these stories about finding what you didn’t
        know you were looking for will take you somewhere new?
      </p>
      <A className="green" to="/">
        Home
      </A>
      {publishedVisible(state)
        .slice(0, 3)
        .map((s) => (
          <div key={s.id}>
            <StoryLink story={s}>{s.title}</StoryLink>
          </div>
        ))}
    </main>
  );
}
