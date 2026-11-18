import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppContext } from "../src/store/AppStore.jsx";
import { normalize } from "../src/store/reducer.js";
import { createInitialData } from "../src/data/seed.js";
import { UIProvider } from "../src/components/UI.jsx";
import { Shell } from "../src/components/Shell.jsx";
import { TaskDetail } from "../src/components/TaskDetail.jsx";
import { TaskLocation } from "../src/pages/Tasks.jsx";
import {
  Inbox,
  MyTasks,
  Trash,
  Settings,
  Dashboards,
} from "../src/pages/Home.jsx";
import { DocsHub, DocEditor } from "../src/pages/Docs.jsx";
import { Timesheets, ApprovalDetail } from "../src/pages/Timesheets.jsx";
const routes = [
  ["/inbox", Inbox],
  ["/inbox/replies", Inbox],
  ["/inbox/assigned-comments", Inbox],
  ["/my-tasks", MyTasks],
  ["/everything", TaskLocation],
  ["/s/:spaceId", TaskLocation],
  ["/f/:folderId", TaskLocation],
  ["/l/:listId", TaskLocation],
  ["/sprint/:sprintId", TaskLocation],
  ["/t/:taskId", TaskDetail],
  ["/docs", DocsHub],
  ["/d/:docId", DocEditor],
  ["/d/:docId/:pageId", DocEditor],
  ["/timesheets", Timesheets],
  ["/timesheets/approvals/:timesheetId", ApprovalDetail],
  ["/trash", Trash],
  ["/settings", Settings],
  ["/dashboards", Dashboards],
];
export function checkRenders() {
  const seed = normalize(createInitialData()),
    empty = normalize({
      ...seed,
      ...Object.fromEntries(
        Object.entries(seed)
          .filter(([, v]) => Array.isArray(v))
          .map(([k]) => [k, []]),
      ),
      currentUserId: "unknown",
    }),
    large = {
      ...seed,
      tasks: Array.from({ length: 500 }, (_, i) => ({
        id: "large_" + i,
        name: "Review customer request " + i,
        listId: "li_backlog",
        status: "in progress",
        assigneeIds: i % 2 ? ["u_jordan"] : [],
        sprintId: i % 2 ? "spr_23" : null,
      })),
      timeEntries: Array.from({ length: 1000 }, (_, i) => ({
        ...seed.timeEntries[i % seed.timeEntries.length],
        id: "large_entry_" + i,
        taskId: "large_" + (i % 500),
      })),
    };
  let count = 0;
  const paths = [
    "/inbox",
    "/inbox/replies",
    "/inbox/assigned-comments",
    "/my-tasks",
    "/everything",
    "/everything?view=board",
    "/s/sp_eng",
    "/f/fd_sprints",
    "/f/fd_platform",
    "/l/li_backlog",
    "/l/li_launch?view=board",
    "/l/li_api?view=calendar",
    "/l/li_backlog?view=gantt",
    "/sprint/spr_23",
    "/sprint/spr_23?view=report",
    "/t/tsk_001",
    "/t/missing",
    "/docs",
    "/docs?tab=archived",
    "/d/doc_001",
    "/d/doc_001/pg_001",
    "/d/missing",
    "/timesheets",
    "/timesheets?tab=all",
    "/timesheets?tab=approvals",
    "/timesheets/approvals/tsh_003",
    "/timesheets/approvals/missing",
    "/trash",
    "/settings",
    "/dashboards",
  ];
  for (const [world, state] of Object.entries({ seed, empty, large })) {
    for (const path of paths) {
      const html = renderToString(
        <AppContext.Provider
          value={{
            state,
            dispatch: () => {},
            actions: {
              act: () => {},
              updateTask: () => {},
              createTask: () => {},
              createDoc: () => {},
            },
          }}
        >
          <MemoryRouter initialEntries={[path + "#render-check"]}>
            <UIProvider>
              <Routes>
                <Route element={<Shell />}>
                  {routes.map(([path, C]) => (
                    <Route key={path} path={path} element={<C />} />
                  ))}
                </Route>
              </Routes>
            </UIProvider>
          </MemoryRouter>
        </AppContext.Provider>,
      );
      if (!html.includes("main-panel"))
        throw Error(world + " " + path + " missing shell");
      count++;
    }
  }
  return { passed: count, worlds: 3, paths: paths.length };
}
