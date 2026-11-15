import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import { SiteContentProvider } from "./content/SiteContent.jsx";

// The dashboard is loaded only when someone opens /admin, so the public website stays light and fast.
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <SiteContentProvider>
              <App />
            </SiteContentProvider>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p style={{ padding: 40, fontFamily: "system-ui" }}>Loading dashboard…</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
