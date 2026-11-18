import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppProvider } from "./store/AppStore.jsx";
import { UIProvider, Empty } from "./components/UI.jsx";
import { Shell } from "./components/Shell.jsx";
import { TaskDetail, PickerDialogs } from "./components/TaskDetail.jsx";
import { TaskLocation } from "./pages/Tasks.jsx";
import { Inbox, MyTasks, Trash, Settings, Dashboards } from "./pages/Home.jsx";
import { DocsHub, DocEditor } from "./pages/Docs.jsx";
import { Timesheets, ApprovalDetail } from "./pages/Timesheets.jsx";
import { SLink } from "./utils/nav.jsx";
function Redirect() {
  const loc = useLocation();
  return <Navigate to={"/inbox" + loc.search} replace />;
}
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <UIProvider>
          <PickerDialogs />
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Redirect />} />
              {["inbox", "inbox/replies", "inbox/assigned-comments"].map(
                (path) => (
                  <Route key={path} path={path} element={<Inbox />} />
                ),
              )}
              <Route path="my-tasks" element={<MyTasks />} />
              {[
                "everything",
                "s/:spaceId",
                "f/:folderId",
                "l/:listId",
                "sprint/:sprintId",
              ].map((path) => (
                <Route key={path} path={path} element={<TaskLocation />} />
              ))}
              <Route path="t/:taskId" element={<TaskDetail />} />
              <Route path="docs" element={<DocsHub />} />
              <Route path="d/:docId" element={<DocEditor />} />
              <Route path="d/:docId/:pageId" element={<DocEditor />} />
              <Route path="timesheets" element={<Timesheets />} />
              <Route
                path="timesheets/approvals/:timesheetId"
                element={<ApprovalDetail />}
              />
              <Route path="trash" element={<Trash />} />
              <Route path="settings" element={<Settings />} />
              <Route path="dashboards" element={<Dashboards />} />
              <Route
                path="*"
                element={
                  <Empty
                    title="Page not found"
                    action={<SLink to="/inbox">Back to Inbox</SLink>}
                  />
                }
              />
            </Route>
          </Routes>
        </UIProvider>
      </BrowserRouter>
    </AppProvider>
  );
}
