import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Share2, ArrowUp, ArrowDown } from "lucide-react";
import { useStore } from "../store/AppStore";
import {
  A,
  useNav,
  Avatar,
  Button,
  Tabs,
  ListCard,
  ListForm,
  StoryCard,
  StoryLink,
  Menu,
  Item,
  Confirm,
  Empty,
  useUI,
  IconButton,
  Clap,
} from "../components/UI";
import { listUrl, dateLabel } from "../utils/urls";
import { NotFound } from "./Discovery";
import { Responses } from "../components/Responses";
export function Library({ tab = "" }) {
  const { state, actions } = useStore(),
    nav = useNav(),
    { setModal, notify } = useUI(),
    mine = (state.lists ?? [])
      .filter((l) => l.ownerId === state.currentUserId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    saved = (state.lists ?? []).filter((l) =>
      (state.listSaves ?? []).some(
        (s) => s.listId === l.id && s.userId === state.currentUserId,
      ),
    );
  return (
    <main className="main-column page" style={{ margin: "auto" }}>
      <div className="page-heading">
        <h1>Your library</h1>
        <Button onClick={() => setModal(<ListForm />)}>New list</Button>
      </div>
      <Tabs
        active={tab || "mine"}
        items={[
          { id: "mine", label: "Your lists" },
          { id: "saved", label: "Saved lists" },
          { id: "highlights", label: "Highlights" },
          { id: "reading-history", label: "Reading history" },
          { id: "responses", label: "Responses" },
        ]}
        onSelect={(id) => nav("/me/lists" + (id === "mine" ? "" : "/" + id))}
      />
      {!tab || tab === "mine" || tab === "saved" ? (
        <>
          {(tab === "saved" ? saved : mine).map((l) => (
            <div key={l.id} style={{ position: "relative" }}>
              <ListCard list={l} />
              <div style={{ position: "absolute", bottom: 18, right: 14 }}>
                <Menu>
                  {tab === "saved" ? (
                    <Item onClick={() => actions.saveList(l.id)}>
                      Remove from saved lists
                    </Item>
                  ) : (
                    <>
                      <Item onClick={() => setModal(<ListForm list={l} />)}>
                        Edit list info
                      </Item>
                      <Item
                        onClick={() =>
                          actions.patch("lists", l.id, {
                            visibility:
                              l.visibility === "public" ? "private" : "public",
                          })
                        }
                      >
                        Make list{" "}
                        {l.visibility === "public" ? "private" : "public"}
                      </Item>
                      {!l.isDefault && (
                        <Item
                          danger
                          onClick={() =>
                            setModal(
                              <Confirm
                                title="Delete list?"
                                text="This list will be permanently deleted."
                                onConfirm={() => actions.deleteList(l.id)}
                              />,
                            )
                          }
                        >
                          Delete list
                        </Item>
                      )}
                    </>
                  )}
                </Menu>
              </div>
            </div>
          ))}
          {!(tab === "saved" ? saved : mine).length && (
            <Empty>
              {tab === "saved"
                ? "Lists you save will appear here."
                : "Create a list to collect the stories you love."}
            </Empty>
          )}
        </>
      ) : tab === "reading-history" ? (
        <>
          {(state.readingHistory ?? []).length > 0 && (
            <div className="actions">
              <Button
                variant="text"
                onClick={() =>
                  setModal(
                    <Confirm
                      title="Clear reading history?"
                      label="Clear history"
                      text="Your reading history will be cleared."
                      onConfirm={() =>
                        actions.update((s) => {
                          s.readingHistory = [];
                        })
                      }
                    />,
                  )
                }
              >
                Clear history
              </Button>
            </div>
          )}
          {[...(state.readingHistory ?? [])]
            .sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
            .map((h) => (
              <div key={h.id}>
                <div className="row spread">
                  <small>Read {dateLabel(h.readAt)}</small>
                  <IconButton
                    label="Remove from history"
                    onClick={() => actions.remove("readingHistory", h.id)}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
                <StoryCard
                  story={(state.stories ?? []).find((s) => s.id === h.storyId)}
                  variant="compact"
                />
              </div>
            ))}
          {!(state.readingHistory ?? []).length && (
            <Empty>You haven’t read any stories yet.</Empty>
          )}
        </>
      ) : tab === "highlights" ? (
        <>
          {(state.highlights ?? []).map((h) => {
            const story = (state.stories ?? []).find((s) => s.id === h.storyId);
            return (
              <div className="story-row" key={h.id}>
                {story && (
                  <StoryLink story={story}>
                    <b>{story.title}</b>
                  </StoryLink>
                )}
                <blockquote className="note">{h.text}</blockquote>
                <div className="row spread">
                  <small>{dateLabel(h.createdAt)}</small>
                  <Button
                    variant="text"
                    onClick={() => actions.remove("highlights", h.id)}
                  >
                    Remove highlight
                  </Button>
                </div>
              </div>
            );
          })}
          {!(state.highlights ?? []).length && (
            <Empty>You haven’t highlighted any stories yet.</Empty>
          )}
        </>
      ) : (
        <>
          {(state.responses ?? [])
            .filter((r) => r.authorId === state.currentUserId && !r.deleted)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((r) => {
              const story = (state.stories ?? []).find(
                (s) => s.id === r.targetId,
              );
              return (
                <div className="story-row" key={r.id}>
                  <p>{r.body}</p>
                  {story && (
                    <A
                      className="muted"
                      to={"/p/" + story.id + "?responses=open"}
                    >
                      on {story.title}
                    </A>
                  )}
                  <small> · {dateLabel(r.createdAt)}</small>
                </div>
              );
            })}
        </>
      )}
    </main>
  );
}
export function ListPage({ list }) {
  const { state, actions } = useStore(),
    { setModal, notify } = useUI(),
    nav = useNav(),
    [reorder, setReorder] = useState(false),
    [responses, setResponses] = useState(false),
    owner = (state.users ?? []).find((u) => u.id === list.ownerId),
    mine = list.ownerId === state.currentUserId,
    items = list.items ?? [];
  if (!mine && list.visibility !== "public") return <NotFound />;
  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    actions.update((s) => {
      const l = s.lists.find((x) => x.id === list.id);
      const [item] = l.items.splice(from, 1);
      l.items.splice(to, 0, item);
      l.updatedAt = new Date().toISOString();
    });
  };
  return (
    <>
      <main className="article">
        <div className="byline">
          <Avatar user={owner} />
          <A to={"/@" + owner?.username}>{owner?.name || "Unknown writer"}</A>
          <small> · {dateLabel(list.updatedAt)}</small>
        </div>
        <h1>{list.name}</h1>
        <p className="dek">{list.description}</p>
        <p className="muted">
          {items.length} stories ·{" "}
          {list.visibility === "private" ? "Private 🔒" : "Public"}
        </p>
        <div className="row">
          <span className="grow" />
          {list.visibility === "public" && (
            <>
              <Clap type="list" target={list} />
              <Button variant="text" onClick={() => setResponses(true)}>
                Responses
              </Button>
            </>
          )}
          {!mine && (
            <Button variant="outline" onClick={() => actions.saveList(list.id)}>
              {(state.listSaves ?? []).some((x) => x.listId === list.id)
                ? "Saved list"
                : "Save list"}
            </Button>
          )}
          <IconButton
            label="Share list"
            onClick={() => {
              navigator.clipboard?.writeText(
                location.origin + listUrl(list, state),
              );
              notify("Link copied");
            }}
          >
            <Share2 />
          </IconButton>
          {mine && (
            <Menu>
              <Item onClick={() => setModal(<ListForm list={list} />)}>
                Edit list info
              </Item>
              <Item
                onClick={() =>
                  actions.patch("lists", list.id, {
                    visibility:
                      list.visibility === "public" ? "private" : "public",
                  })
                }
              >
                Make list {list.visibility === "public" ? "private" : "public"}
              </Item>
              <Item onClick={() => setReorder(!reorder)}>
                {reorder ? "Done reordering" : "Reorder items"}
              </Item>
              {!list.isDefault && (
                <Item
                  danger
                  onClick={() =>
                    setModal(
                      <Confirm
                        title="Delete list?"
                        text="This list will be permanently deleted."
                        onConfirm={() => {
                          actions.deleteList(list.id);
                          nav("/me/lists");
                        }}
                      />,
                    )
                  }
                >
                  Delete list
                </Item>
              )}
            </Menu>
          )}
        </div>
        {items.map((item, i) => (
          <div
            key={item.storyId}
            draggable={mine && reorder}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => reorder && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              move(Number(e.dataTransfer.getData("text/plain")), i);
            }}
          >
            <Note list={list} item={item} mine={mine} />
            {reorder && (
              <div className="row">
                <IconButton
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown />
                </IconButton>
              </div>
            )}
            <StoryCard
              story={(state.stories ?? []).find((s) => s.id === item.storyId)}
              variant="list-item"
            />
            {mine && (
              <div className="actions" style={{ marginTop: 8 }}>
                <Button
                  variant="text"
                  onClick={() => actions.toggleList(list.id, item.storyId)}
                >
                  Remove from list
                </Button>
              </div>
            )}
          </div>
        ))}
        {!items.length && (
          <Empty>
            No stories in this list yet. Tap the bookmark icon on any story to
            add it here.
          </Empty>
        )}
      </main>
      {responses && (
        <Responses
          type="list"
          target={list}
          onClose={() => setResponses(false)}
        />
      )}
    </>
  );
}
function Note({ list, item, mine }) {
  const { actions } = useStore(),
    [editing, setEditing] = useState(false),
    [note, setNote] = useState(item.note || "");
  return (
    <div className={item.note || editing ? "note" : ""}>
      {editing ? (
        <>
          <textarea
            aria-label="Item note"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="actions">
            <Button variant="text" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                actions.note(list.id, item.storyId, note);
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </>
      ) : (
        <>
          {item.note && <p>{item.note}</p>}
          {mine && (
            <Button variant="text" onClick={() => setEditing(true)}>
              {item.note ? "Edit note" : "Add a note"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
