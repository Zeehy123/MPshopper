import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../db";
import { sync } from "../sync";
import {
  getAuth,
  setAuth,
  clearAuth,
  loginRequest,
  registerRequest,
  updateProfileRequest,
  changePasswordRequest,
} from "../auth";

const AuthContext = createContext(null);

async function clearLocalData() {
  await db.transaction("rw", db.tables, () =>
    Promise.all(db.tables.map((t) => t.clear())),
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const a = getAuth();
    return a ? { id: a.userId, username: a.username } : null;
  });

  // the server rejected our token: show the login screen but keep the local data
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  async function authenticate(request, username, password) {
    const data = await request(username, password);

    // a different person on this device must never see the previous person's data
    const previous = (await db.meta.get("userId"))?.value;
    if (previous !== data.user_id) await clearLocalData();
    await db.meta.put({ key: "userId", value: data.user_id });

    setAuth({
      token: data.token,
      userId: data.user_id,
      username: data.username,
    });
    try {
      await sync(); // first download of this account's data
    } catch (e) {
      console.warn("Sync skipped:", e.message);
    }
    setUser({ id: data.user_id, username: data.username });
  }

  const login = (u, p) => authenticate(loginRequest, u, p);
  const register = (u, p) => authenticate(registerRequest, u, p);

  async function updateUsername(username) {
    const data = await updateProfileRequest(username);
    setAuth({ ...getAuth(), username: data.username });
    setUser((u) => ({ ...u, username: data.username }));
  }

  async function changePassword(currentPassword, newPassword) {
    const data = await changePasswordRequest(currentPassword, newPassword);
    // the server signs out every old token, so keep the new one
    setAuth({
      token: data.token,
      userId: data.user_id,
      username: data.username,
    });
  }

  async function logout() {
    if (navigator.onLine) {
      try {
        await sync();
      } catch {
        /* checked below */
      }
    }
    const pending = await db.outbox.count();
    if (
      pending > 0 &&
      !window.confirm(
        `${pending} change(s) haven't reached the server and will be lost. Log out anyway?`,
      )
    ) {
      return;
    }
    await clearLocalData();
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
        user,
        login,
        register,
        logout,
        updateUsername,
        changePassword,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
