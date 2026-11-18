import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { loadState, saveState } from "../utils/dataManager";
import { createInitialData } from "../data/seed";
import { newId, now, slugify } from "../utils/urls";
import { storyMetrics } from "../utils/storyMetrics";
import {
  canEditPub,
  canSubmit,
  isFollowing,
  myClapFor,
  currentUser,
} from "./selectors";
export const AppStoreContext = createContext(null);
const Context = AppStoreContext;
export const useStore = () => useContext(Context);
export function AppStore({ children }) {
  const [state, setState] = useState(null),
    ref = useRef(null);
  useEffect(() => {
    let live = true;
    loadState("medium", createInitialData).then((s) => {
      if (live) {
        ref.current = s;
        setState(s);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  const update = (fn) => {
    const next = structuredClone(ref.current);
    const result = fn(next);
    if (result === false) return false;
    ref.current = next;
    setState(next);
    saveState("medium", next);
    return result ?? true;
  };
  const actions = createActions(ref, update);
  if (!state)
    return (
      <div className="loading">
        <img src="/favicon.svg" width="52" alt="Loading Medium" />
      </div>
    );
  return (
    <Context.Provider value={{ state, actions, user: currentUser(state) }}>
      {children}
    </Context.Provider>
  );
}

export function createActions(ref, update) {
  const patch = (key, id, fields) =>
    update((s) => {
      const row = (s[key] ?? []).find((x) => x.id === id);
      if (!row) return false;
      Object.assign(row, fields, { updatedAt: now() });
    });
  const add = (key, record) =>
    update((s) => {
      (s[key] ??= []).unshift(record);
      return record.id;
    });
  const remove = (key, id) =>
    update((s) => {
      s[key] = (s[key] ?? []).filter((x) => x.id !== id);
    });
  const actions = {
    update,
    patch,
    add,
    remove,
    createDraft(fields = {}) {
      const id = newId("st"),
        t = now();
      add("stories", {
        id,
        authorId: ref.current.currentUserId,
        publicationId: null,
        status: "draft",
        title: "",
        subtitle: "",
        body: [],
        visibility: "public",
        topicIds: [],
        memberOnly: false,
        allowResponses: true,
        license: "all_rights_reserved",
        coverImage: null,
        previewTitle: null,
        previewSubtitle: null,
        previewImage: null,
        emailSubscribers: true,
        pinnedToProfile: false,
        wordCount: 0,
        readingTime: 1,
        clapCount: 0,
        viewCount: 0,
        readCount: 0,
        slug: "",
        createdAt: t,
        updatedAt: t,
        publishedAt: null,
        scheduledFor: null,
        ...fields,
      });
      return id;
    },
    saveStory(id, fields) {
      const body = fields.body ?? [];
      patch("stories", id, {
        ...fields,
        ...storyMetrics(body),
      });
    },
    publish(id, fields = {}) {
      return update((s) => {
        const story = (s.stories ?? []).find((x) => x.id === id);
        if (!story || story.authorId !== s.currentUserId) return false;
        const pub = (s.publications ?? []).find(
          (x) =>
            x.id ===
            (Object.hasOwn(fields, "publicationId")
              ? fields.publicationId
              : story.publicationId),
        );
        if (pub && !canEditPub(s, pub)) return false;
        Object.assign(story, fields, {
          status: fields.scheduledFor ? "scheduled" : "published",
          publishedAt: fields.scheduledFor ? null : story.publishedAt || now(),
          slug:
            fields.slug ||
            story.slug ||
            slugify(fields.previewTitle || story.title) ||
            "untitled",
          updatedAt: now(),
        });
      });
    },
    deleteStory(id) {
      update((s) => {
        s.stories = (s.stories ?? []).filter((x) => x.id !== id);
        for (const sub of s.submissions ?? [])
          if (sub.storyId === id) {
            sub.status = "withdrawn";
            sub.updatedAt = now();
          }
        for (const list of s.lists ?? []) {
          const items = (list.items ?? []).filter((x) => x.storyId !== id);
          if (items.length !== (list.items ?? []).length) {
            list.items = items;
            list.updatedAt = now();
          }
        }
        for (const pub of s.publications ?? [])
          pub.featuredStoryIds = (pub.featuredStoryIds ?? []).filter(
            (x) => x !== id,
          );
      });
    },
    recordRead(storyId) {
      update((s) => {
        const row = (s.readingHistory ??= []).find(
          (x) => x.storyId === storyId && x.userId === s.currentUserId,
        );
        if (row) row.readAt = now();
        else
          s.readingHistory.unshift({
            id: newId("rh"),
            userId: s.currentUserId,
            storyId,
            readAt: now(),
          });
      });
    },
    follow(type, id) {
      if (type === "user" && id === ref.current.currentUserId) return;
      update((s) => {
        const following = isFollowing(s, type, id);
        s.follows = (s.follows ?? []).filter(
          (f) =>
            !(
              f.followerId === s.currentUserId &&
              f.targetType === type &&
              f.targetId === id
            ),
        );
        if (!following)
          s.follows.push({
            id: newId("fol"),
            followerId: s.currentUserId,
            targetType: type,
            targetId: id,
            createdAt: now(),
          });
        const target = (
          s[
            type === "user"
              ? "users"
              : type === "publication"
                ? "publications"
                : "topics"
          ] ?? []
        ).find((x) => x.id === id);
        if (target)
          target.followerCount = Math.max(
            0,
            (target.followerCount || 0) + (following ? -1 : 1),
          );
        const me = (s.users ?? []).find((x) => x.id === s.currentUserId);
        if (me)
          me.followingCount = Math.max(
            0,
            (me.followingCount || 0) + (following ? -1 : 1),
          );
      });
    },
    clap(type, id) {
      return update((s) => {
        if (
          type === "story" &&
          (s.stories ?? []).find((x) => x.id === id)?.authorId ===
            s.currentUserId
        )
          return false;
        const c = myClapFor(s, type, id);
        if (c?.count >= 50) return false;
        if (c) {
          c.count++;
          c.updatedAt = now();
        } else
          (s.claps ??= []).push({
            id: newId("clp"),
            userId: s.currentUserId,
            targetType: type,
            targetId: id,
            count: 1,
            createdAt: now(),
            updatedAt: now(),
          });
        return true;
      });
    },
    createList(fields, storyId) {
      const id = newId("lst"),
        t = now();
      add("lists", {
        id,
        ownerId: ref.current.currentUserId,
        isDefault: false,
        items: storyId ? [{ storyId, note: "", addedAt: t }] : [],
        clapCount: 0,
        createdAt: t,
        updatedAt: t,
        ...fields,
      });
      return id;
    },
    toggleList(listId, storyId) {
      update((s) => {
        const l = (s.lists ?? []).find(
          (x) => x.id === listId && x.ownerId === s.currentUserId,
        );
        if (!l) return false;
        l.items = l.items ?? [];
        if (l.items.some((x) => x.storyId === storyId))
          l.items = l.items.filter((x) => x.storyId !== storyId);
        else l.items.unshift({ storyId, note: "", addedAt: now() });
        l.updatedAt = now();
      });
    },
    note(listId, storyId, note) {
      update((s) => {
        const l = (s.lists ?? []).find((x) => x.id === listId),
          item = l?.items?.find((x) => x.storyId === storyId);
        if (!item) return false;
        item.note = note;
        l.updatedAt = now();
      });
    },
    deleteList(id) {
      update((s) => {
        if ((s.lists ?? []).find((x) => x.id === id)?.isDefault) return false;
        s.lists = (s.lists ?? []).filter((x) => x.id !== id);
        s.listSaves = (s.listSaves ?? []).filter((x) => x.listId !== id);
      });
    },
    saveList(id) {
      update((s) => {
        const exists = (s.listSaves ?? []).some(
          (x) => x.listId === id && x.userId === s.currentUserId,
        );
        s.listSaves = (s.listSaves ?? []).filter(
          (x) => !(x.listId === id && x.userId === s.currentUserId),
        );
        if (!exists)
          s.listSaves.push({
            id: newId("ls"),
            userId: s.currentUserId,
            listId: id,
            createdAt: now(),
          });
      });
    },
    respond(type, id, body, parentResponseId = null, quote = null) {
      if (!body.trim()) return;
      const t = now();
      return add("responses", {
        id: newId("rsp"),
        authorId: ref.current.currentUserId,
        targetType: type,
        targetId: id,
        parentResponseId,
        body: body.trim(),
        bodyHtml: null,
        quote,
        clapCount: 0,
        hidden: false,
        hiddenById: null,
        edited: false,
        deleted: false,
        createdAt: t,
        updatedAt: t,
      });
    },
    submit(storyId, publicationId, noteToEditors = "") {
      return update((s) => {
        const story = (s.stories ?? []).find((x) => x.id === storyId),
          pub = (s.publications ?? []).find((x) => x.id === publicationId);
        if (!story || story.authorId !== s.currentUserId || !canSubmit(s, pub))
          return false;
        const active = (s.submissions ?? []).find(
          (x) =>
            x.storyId === storyId &&
            ["pending", "in_review", "edits_requested"].includes(x.status),
        );
        if (active) return false;
        story.publicationId = publicationId;
        story.updatedAt = now();
        if (!canEditPub(s, pub))
          (s.submissions ??= []).push({
            id: newId("sub"),
            storyId,
            publicationId,
            submittedById: s.currentUserId,
            status: "pending",
            noteToEditors,
            editorNote: null,
            decidedById: null,
            decidedAt: null,
            createdAt: now(),
            updatedAt: now(),
          });
      });
    },
    decide(id, status, editorNote = "") {
      return update((s) => {
        const sub = (s.submissions ?? []).find((x) => x.id === id);
        if (!sub) return false;
        const pub = (s.publications ?? []).find(
            (x) => x.id === sub.publicationId,
          ),
          story = (s.stories ?? []).find((x) => x.id === sub.storyId);
        if (["withdrawn", "pending"].includes(status)) {
          if (sub.submittedById !== s.currentUserId) return false;
        } else if (!canEditPub(s, pub)) return false;
        if (status === "edits_requested" && !editorNote.trim()) return false;
        Object.assign(sub, { status, updatedAt: now() });
        if (["approved", "declined", "edits_requested"].includes(status))
          Object.assign(sub, {
            editorNote,
            decidedById: s.currentUserId,
            decidedAt: now(),
          });
        if (story) {
          story.updatedAt = now();
          if (status === "approved")
            Object.assign(story, {
              status: "published",
              publicationId: sub.publicationId,
              publishedAt: now(),
              slug: story.slug || slugify(story.title),
            });
          if (status === "withdrawn" || status === "declined")
            story.publicationId = null;
          if (status === "pending") story.publicationId = sub.publicationId;
        }
      });
    },
    createPublication(fields) {
      const id = newId("pub"),
        t = now();
      add("publications", {
        id,
        ownerId: ref.current.currentUserId,
        editorIds: [ref.current.currentUserId],
        writerIds: [],
        featuredStoryIds: [],
        navItems: [],
        followerCount: 0,
        submissionPolicy: "open",
        submissionGuidelines: "",
        createdAt: t,
        updatedAt: t,
        ...fields,
      });
      return id;
    },
  };
  return actions;
}
