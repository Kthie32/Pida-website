import { Navigate, Route, Routes } from "react-router-dom";
import "./admin.css";
import { AuthProvider, RequireAuth, RequireRole } from "./AuthContext.jsx";
import { ConfirmProvider, ToastProvider } from "./ui.jsx";
import Layout from "./Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Enquiries from "./pages/Enquiries.jsx";
import { ProgrammeList, ProgrammeForm } from "./pages/Programmes.jsx";
import { NewsList, NewsForm } from "./pages/News.jsx";
import { PagesList, BlockEditor } from "./pages/PagesContent.jsx";
import Media from "./pages/Media.jsx";
import Users from "./pages/Users.jsx";
import Settings from "./pages/Settings.jsx";

const ADMINS = ["super_admin", "admin"];

// Everything under /admin. Public visitors never load this code.
export default function AdminApp() {
  return (
    <div className="ad-root">
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Routes>
              <Route path="login" element={<Login />} />
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="enquiries" element={<RequireRole roles={ADMINS}><Enquiries /></RequireRole>} />
                <Route path="programmes" element={<ProgrammeList />} />
                <Route path="programmes/new" element={<ProgrammeForm />} />
                <Route path="programmes/:id" element={<ProgrammeForm />} />
                <Route path="news" element={<NewsList />} />
                <Route path="news/new" element={<NewsForm />} />
                <Route path="news/:id" element={<NewsForm />} />
                <Route path="pages" element={<PagesList />} />
                <Route path="pages/:page/:section" element={<BlockEditor />} />
                <Route path="media" element={<Media />} />
                <Route path="users" element={<RequireRole roles={["super_admin"]}><Users /></RequireRole>} />
                <Route path="settings" element={<RequireRole roles={ADMINS}><Settings /></RequireRole>} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </div>
  );
}
