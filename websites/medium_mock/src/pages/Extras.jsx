import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store/AppStore";
import { publishedVisible, isFollowing } from "../store/selectors";
import {
  A,
  useNav,
  Avatar,
  Button,
  Tabs,
  Follow,
  useUI,
  Empty,
} from "../components/UI";
import { compact, now } from "../utils/urls";
import { colors } from "../utils/art";
import { Person } from "./Discovery";
export function Following() {
  const { state, actions } = useStore(),
    [tab, setTab] = useState("writers");
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <h1>Following</h1>
      <Tabs
        active={tab}
        items={[
          { id: "writers", label: "Writers & publications" },
          { id: "topics", label: "Topics" },
          { id: "muted", label: "Muted" },
        ]}
        onSelect={setTab}
      />
      {tab === "muted" ? (
        (state.mutes ?? []).map((m) => (
          <div className="settings-row" key={m.id}>
            <span>
              {(
                state[m.targetType === "user" ? "users" : "publications"] ?? []
              ).find((x) => x.id === m.targetId)?.name || "Unknown"}
            </span>
            <Button
              variant="outline"
              onClick={() => actions.remove("mutes", m.id)}
            >
              Unmute
            </Button>
          </div>
        ))
      ) : tab === "topics" ? (
        (state.topics ?? [])
          .filter((t) => isFollowing(state, "topic", t.id))
          .map((t) => (
            <div className="settings-row" key={t.id}>
              <A to={"/tag/" + t.slug}>{t.name}</A>
              <Follow type="topic" id={t.id} />
            </div>
          ))
      ) : (
        <>
          {(state.users ?? [])
            .filter((u) => isFollowing(state, "user", u.id))
            .map((u) => (
              <Person target={u} key={u.id} />
            ))}
          {(state.publications ?? [])
            .filter((p) => isFollowing(state, "publication", p.id))
            .map((p) => (
              <Person target={p} type="publication" key={p.id} />
            ))}
        </>
      )}
      <h2 style={{ marginTop: 48 }}>Suggestions</h2>
      {(state.users ?? [])
        .filter(
          (u) =>
            u.id !== state.currentUserId && !isFollowing(state, "user", u.id),
        )
        .slice(0, 8)
        .map((u) => (
          <Person target={u} key={u.id} />
        ))}
    </main>
  );
}
export function Settings({ tab = "account" }) {
  const { state, actions, user } = useStore(),
    nav = useNav(),
    { notify } = useUI(),
    [name, setName] = useState(user.name || ""),
    [bio, setBio] = useState(user.bio || ""),
    [pronouns, setPronouns] = useState(user.pronouns || ""),
    [username, setUsername] = useState(user.username || ""),
    [avatarColor, setColor] = useState(user.avatarColor || colors[0]),
    [about, setAbout] = useState(user.about || ""),
    [error, setError] = useState(""),
    settings = state.settings ?? {},
    change = (key, value) => {
      actions.update((s) => {
        s.settings = { ...s.settings, [key]: value };
      });
      notify("Settings saved");
    };
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <h1>Settings</h1>
      <Tabs
        active={tab}
        items={["Account", "Publishing", "Notifications", "Membership"].map(
          (x) => ({
            id: x.toLowerCase(),
            label: x === "Membership" ? "Membership & payment" : x,
          }),
        )}
        onSelect={(id) => nav("/me/settings/" + id)}
      />
      {tab === "publishing" ? (
        <>
          <div className="settings-row">
            <A to="/me/publications">Manage publications</A>
          </div>
          <label className="settings-row">
            Allow email replies
            <input
              type="checkbox"
              checked={settings.allowEmailReplies !== false}
              onChange={(e) => change("allowEmailReplies", e.target.checked)}
            />
          </label>
          <label className="settings-row">
            Default response sort
            <select
              aria-label="Default response sort"
              value={settings.defaultResponseSort || "relevant"}
              onChange={(e) => change("defaultResponseSort", e.target.value)}
            >
              <option value="relevant">Most relevant</option>
              <option value="recent">Most recent</option>
            </select>
          </label>
        </>
      ) : tab === "notifications" ? (
        Object.entries(settings.emailNotifications ?? {}).map(
          ([key, value]) => (
            <label className="settings-row" key={key}>
              {key.replace(/([A-Z])/g, " $1")}
              <input
                type="checkbox"
                aria-label={key}
                checked={value}
                onChange={(e) => {
                  actions.update((s) => {
                    s.settings.emailNotifications[key] = e.target.checked;
                  });
                  notify("Settings saved");
                }}
              />
            </label>
          ),
        )
      ) : tab === "membership" ? (
        <section style={{ paddingTop: 32 }}>
          <h2>Medium Member</h2>
          <p>Annual · Renews Mar 14, 2027</p>
          <Button disabled>Manage membership</Button>
        </section>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                setError("Name is required");
                return;
              }
              if (
                !/^[a-z0-9_-]+$/.test(username) ||
                (state.users ?? []).some(
                  (u) => u.id !== user.id && u.username === username,
                )
              ) {
                setError("That username is unavailable");
                return;
              }
              actions.patch("users", user.id, {
                name: name.trim(),
                bio,
                pronouns,
                username,
                avatarColor,
                about,
              });
              setError("");
              notify("Profile saved");
            }}
          >
            <h2>Profile information</h2>
            <Avatar user={{ name, avatarColor }} size={72} />
            <div className="swatches">
              {colors.map((c) => (
                <button
                  type="button"
                  aria-label={"Avatar colour " + c}
                  key={c}
                  className={c === avatarColor ? "selected" : ""}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <Button
              variant="text"
              type="button"
              onClick={() => setColor("#C7C7C7")}
            >
              Remove photo
            </Button>
            {[
              ["Name", name, setName, 50],
              ["Username", username, setUsername, 40],
              ["Pronouns", pronouns, setPronouns, 12],
              ["Short bio", bio, setBio, 160],
            ].map(([label, value, set, max]) => (
              <label className="settings-row" key={label}>
                {label}
                <input
                  aria-label={label}
                  className="underline"
                  style={{ width: "65%" }}
                  maxLength={max}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            ))}
            <label className="settings-row">
              Email
              <input
                aria-label="Email"
                className="underline"
                style={{ width: "65%" }}
                value={settings.email || ""}
                readOnly
              />
            </label>
            <h3>About Page</h3>
            <textarea
              aria-label="About Page"
              className="form-field"
              style={{ minHeight: 160 }}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <Button>Save</Button>
            </div>
          </form>
          <h2>Muted writers and publications</h2>
          {(state.mutes ?? []).map((m) => (
            <div className="settings-row" key={m.id}>
              <span>
                {(
                  state[m.targetType === "user" ? "users" : "publications"] ??
                  []
                ).find((x) => x.id === m.targetId)?.name || "Unknown"}
              </span>
              <Button
                variant="text"
                onClick={() => actions.remove("mutes", m.id)}
              >
                Unmute
              </Button>
            </div>
          ))}
          <h2>Blocked users</h2>
          <p className="muted">No blocked users.</p>
        </>
      )}
    </main>
  );
}
export function Stats() {
  const { state } = useStore(),
    nav = useNav(),
    loc = useLocation(),
    [tab, setTab] = useState("stories"),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    id = new URLSearchParams(loc.search).get("story"),
    stories = publishedVisible(state).filter(
      (s) => s.authorId === state.currentUserId && (!id || s.id === id),
    ),
    total = (field) => stories.reduce((n, s) => n + (Number(s[field]) || 0), 0);
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <h1>Your stats</h1>
      <Tabs
        active={tab}
        items={[
          { id: "stories", label: "Stories" },
          { id: "audience", label: "Audience" },
        ]}
        onSelect={setTab}
      />
      <label className="settings-row">
        Month
        <input
          aria-label="Stats month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </label>
      {tab === "audience" ? (
        <>
          <h2>
            {compact(
              (state.users ?? []).find((u) => u.id === state.currentUserId)
                ?.followerCount,
            )}{" "}
            followers
          </h2>
          <svg className="chart" viewBox="0 0 600 200">
            <path
              d="M0 180L50 170L100 163L150 155L200 140L250 130L300 121L350 100L400 95L450 71L500 52L550 30L600 20"
              fill="none"
              stroke="#1A8917"
              strokeWidth="3"
            />
          </svg>
        </>
      ) : (
        <>
          <div className="row spread">
            <h2>
              {compact(total("viewCount"))}
              <small> Views</small>
            </h2>
            <h2>
              {compact(total("readCount"))}
              <small> Reads</small>
            </h2>
            <h2>
              {compact(total("clapCount"))}
              <small> Claps</small>
            </h2>
          </div>
          {id && (
            <svg className="chart" viewBox="0 0 600 200">
              {Array.from({ length: 30 }, (_, i) => (
                <rect
                  key={i}
                  x={i * 20 + 2}
                  y={200 - (((i * 47) % 160) + 20)}
                  width="12"
                  height={((i * 47) % 160) + 20}
                  fill="#1A8917"
                />
              ))}
            </svg>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Story", "Views", "Reads", "Read ratio", "Claps"].map((x) => (
                  <th key={x} style={{ textAlign: "left", padding: 12 }}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stories.map((s) => (
                <tr
                  className="settings-row"
                  style={{ display: "table-row" }}
                  key={s.id}
                >
                  <td style={{ padding: 12 }}>
                    <A to={"/me/stats?story=" + s.id}>{s.title}</A>
                  </td>
                  <td>{compact(s.viewCount)}</td>
                  <td>{compact(s.readCount)}</td>
                  <td>
                    {Math.round(
                      ((s.readCount || 0) / Math.max(1, s.viewCount || 1)) *
                        100,
                    )}
                    %
                  </td>
                  <td>{compact(s.clapCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stories.length && <Empty>No published stories yet.</Empty>}
        </>
      )}
    </main>
  );
}
export function Plans() {
  return (
    <>
      <div className="plans-hero">
        <h1>Fuel great thinking.</h1>
        <p>Read without limits. Support the voices that matter to you.</p>
      </div>
      <main className="form-page">
        <h2>You’re already a Medium member</h2>
        <div className="grid">
          {["Reader", "Medium Member", "Friend of Medium"].map((x, i) => (
            <section
              className="list-card"
              style={{ height: "auto", display: "block", padding: 24 }}
              key={x}
            >
              <h2>{x}</h2>
              <p>
                {i
                  ? "Give more to the writers you love."
                  : "Unlimited access to every story."}
              </p>
              <Button disabled>
                {i === 1 ? "Your current plan" : "Already a member"}
              </Button>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
