import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { login, logout, me } from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const ROLE_LABEL = { super_admin: "Super administrator", admin: "Administrator", editor: "Editor" };

// Holds who is signed in. The login itself lives in an http-only cookie set by the server,
// so this only asks the server "who am I?". Accounts are created by a super administrator.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, profile: null, notice: "" });

  const load = useCallback(async () => {
    try {
      const { user } = await me();
      setState({ loading: false, profile: user, notice: "" });
    } catch (e) {
      setState({ loading: false, profile: null, notice: e.status === 401 ? "" : e.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({
    loading: state.loading,
    notice: state.notice,
    profile: state.profile,
    user: state.profile, // same object: has .id and .email
    role: state.profile?.role,
    async signIn(email, password) {
      const { user } = await login(email.trim(), password);
      setState({ loading: false, profile: user, notice: "" });
    },
    async signOut() {
      try { await logout(); } catch { /* signed out locally anyway */ }
      setState({ loading: false, profile: null, notice: "" });
    },
    refreshProfile: load,
  }), [state, load]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// Sends signed-out visitors to the login page.
export function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <div className="ad-boot"><span className="ad-spin" /> Checking your session…</div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

// The menu hides links by role, and this also blocks the pages. The real enforcement is on the server.
export function RequireRole({ roles, children }) {
  const { role } = useAuth();
  if (!roles.includes(role)) {
    return (
      <div className="ad-card ad-empty">
        <h2>Not available for your role</h2>
        <p>You do not have permission to open this page. If you think this is a mistake, ask a super administrator.</p>
      </div>
    );
  }
  return children;
}
