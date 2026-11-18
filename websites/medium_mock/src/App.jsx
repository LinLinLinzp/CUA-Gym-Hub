import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Shell } from "./components/Shell";
import { useStore } from "./store/AppStore";
import { useNav } from "./components/UI";
import { storyUrl } from "./utils/urls";
import {
  Home,
  Profile,
  Topic,
  Explore,
  SearchPage,
  Notifications,
  NotFound,
} from "./pages/Discovery";
import Editor from "./pages/Editor";
import { YourStories, StorySettings, Story } from "./pages/Stories";
import { Library, ListPage } from "./pages/Library";
import {
  PublicationForm,
  MyPublications,
  Publication,
} from "./pages/Publications";
import { Following, Settings, Stats, Plans } from "./pages/Extras";
function CanonicalStory({ story }) {
  const { state } = useStore(),
    nav = useNav(),
    loc = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(loc.search);
    p.delete("sid");
    nav(storyUrl(story, state) + (p.size ? "?" + p.toString() : ""), {
      replace: true,
    });
  }, [story.id]);
  return <Story key={story.id} story={story} />;
}
export default function App() {
  const { state } = useStore(),
    loc = useLocation(),
    parts = decodeURIComponent(loc.pathname).split("/").filter(Boolean);
  let page,
    focus = false;
  if (parts[0] === "new-story" || (parts[0] === "p" && parts[2] === "edit"))
    return <Editor storyId={parts[1]} />;
  if (!parts.length) page = <Home />;
  else if (parts[0] === "search") page = <SearchPage />;
  else if (parts[0] === "tag") page = <Topic slug={parts[1]} />;
  else if (parts[0] === "explore-topics") page = <Explore />;
  else if (parts[0] === "new-publication") page = <PublicationForm />;
  else if (parts[0] === "plans") page = <Plans />;
  else if (parts[0] === "me")
    switch (parts[1]) {
      case "stories":
        page = <YourStories tab={parts[2] || "drafts"} />;
        break;
      case "lists":
        page = <Library tab={parts[2]} />;
        break;
      case "notifications":
        page = <Notifications tab={parts[2]} />;
        break;
      case "publications":
        page = <MyPublications />;
        break;
      case "following":
        page = <Following />;
        break;
      case "settings":
        page = <Settings tab={parts[2] || "account"} />;
        break;
      case "stats":
        page = <Stats />;
        break;
      default:
        page = <NotFound />;
    }
  else if (parts[0] === "p") {
    const story = (state.stories ?? []).find((s) => s.id === parts[1]);
    page = story ? (
      parts[2] === "settings" ? (
        <StorySettings key={story.id} story={story} />
      ) : (
        <CanonicalStory story={story} />
      )
    ) : (
      <NotFound />
    );
    focus = true;
  } else if (parts[0].startsWith("@")) {
    const person = (state.users ?? []).find(
      (u) => u.username === parts[0].slice(1),
    );
    if (parts[1] === "list") {
      const id = parts
          .slice(2)
          .join("/")
          .match(/(lst_[a-z0-9_]+)$/)?.[1],
        list = (state.lists ?? []).find((l) => l.id === id);
      page = list ? <ListPage key={list.id} list={list} /> : <NotFound />;
      focus = true;
    } else if (parts[1] && !["lists", "about"].includes(parts[1])) {
      const id = parts[1].match(/(st_[a-z0-9]+)$/)?.[1],
        story = (state.stories ?? []).find((s) => s.id === id);
      page = story ? <Story key={story.id} story={story} /> : <NotFound />;
      focus = true;
    } else
      page = person ? <Profile user={person} tab={parts[1]} /> : <NotFound />;
  } else {
    const pub = (state.publications ?? []).find((p) => p.slug === parts[0]);
    if (
      pub &&
      parts[1] &&
      !["about", "latest", "tagged", "manage"].includes(parts[1])
    ) {
      const id = parts[1].match(/(st_[a-z0-9]+)$/)?.[1],
        story = (state.stories ?? []).find((s) => s.id === id);
      page = story ? <Story key={story.id} story={story} /> : <NotFound />;
      focus = true;
    } else
      page = pub ? (
        <Publication key={pub.id} pub={pub} path={parts.slice(1)} />
      ) : (
        <NotFound />
      );
  }
  return <Shell focus={focus}>{page}</Shell>;
}
