export const currentUser = (s) =>
  (s.users ?? []).find((u) => u.id === s.currentUserId) ?? {
    id: s.currentUserId || "u_maya",
    name: "Maya Lindqvist",
    username: "mayalindqvist",
  };
export const storyById = (s, id) => (s.stories ?? []).find((x) => x.id === id);
export const storiesByAuthor = (s, id) =>
  (s.stories ?? []).filter((x) => x.authorId === id);
export const published = (s) =>
  s.status === "published" ||
  (s.status === "scheduled" && new Date(s.scheduledFor) <= new Date());
export const publishedVisible = (s) =>
  (s.stories ?? []).filter((x) => published(x) && x.visibility !== "unlisted");
export const responsesFor = (s, type, id) =>
  (s.responses ?? []).filter(
    (x) =>
      x.targetType === type && x.targetId === id && !x.deleted && !x.hidden,
  );
export const myClapFor = (s, type, id) =>
  (s.claps ?? []).find(
    (x) =>
      x.userId === s.currentUserId &&
      x.targetType === type &&
      x.targetId === id,
  );
export const listsOf = (s, id) =>
  (s.lists ?? []).filter((x) => x.ownerId === id);
export const isFollowing = (s, type, id) =>
  (s.follows ?? []).some(
    (x) =>
      x.followerId === s.currentUserId &&
      x.targetType === type &&
      x.targetId === id,
  );
export const unreadCount = (s) =>
  (s.notifications ?? []).filter((x) => !x.read).length;
export const canEditPub = (s, p) =>
  p &&
  (p.ownerId === s.currentUserId ||
    (p.editorIds ?? []).includes(s.currentUserId));
export const canSubmit = (s, p) =>
  canEditPub(s, p) ||
  (p?.submissionPolicy !== "closed" &&
    (p?.submissionPolicy === "open" ||
      (p?.writerIds ?? []).includes(s.currentUserId)));
