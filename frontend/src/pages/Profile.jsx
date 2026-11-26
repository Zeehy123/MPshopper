import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../useSync";

export default function Profile() {
  const { user, updateUsername, changePassword } = useAuth();
  const { online } = useSync();

  const [username, setUsername] = useState(user?.username ?? "");
  const [nameMsg, setNameMsg] = useState({ type: "", text: "" });
  const [nameBusy, setNameBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [pwBusy, setPwBusy] = useState(false);

  async function handleUsername(e) {
    e.preventDefault();
    const clean = username.trim();
    if (clean === user.username) {
      return setNameMsg({ type: "error", text: "That is already your username." });
    }
    try {
      setNameBusy(true);
      setNameMsg({ type: "", text: "" });
      await updateUsername(clean);
      setUsername(clean);
      setNameMsg({ type: "ok", text: "Username updated." });
    } catch (err) {
      setNameMsg({ type: "error", text: err.message });
    } finally {
      setNameBusy(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    if (!current || !next) {
      return setPwMsg({ type: "error", text: "Fill in your current and new password." });
    }
    if (next !== confirm) {
      return setPwMsg({ type: "error", text: "The new passwords do not match." });
    }
    try {
      setPwBusy(true);
      setPwMsg({ type: "", text: "" });
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwMsg({
        type: "ok",
        text: "Password changed. Your other devices will ask you to log in again.",
      });
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <>
      <h1>Your profile</h1>
      {!online && (
        <p className="muted">
          You are offline. Reconnect to change your username or password.
        </p>
      )}

      <form className="card form" onSubmit={handleUsername}>
        <h2>Username</h2>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
          />
        </label>
        <p className="muted">3-30 letters, numbers, dots, dashes or underscores.</p>
        {nameMsg.text && (
          <p className={nameMsg.type === "ok" ? "notice" : "error"} role="status">
            {nameMsg.text}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" disabled={nameBusy || !online || !username.trim()}>
            {nameBusy ? "Saving..." : "Save username"}
          </button>
        </div>
      </form>

      <form className="card form" onSubmit={handlePassword}>
        <h2>Change password</h2>
        <label>
          Current password
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {pwMsg.text && (
          <p className={pwMsg.type === "ok" ? "notice" : "error"} role="status">
            {pwMsg.text}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" disabled={pwBusy || !online}>
            {pwBusy ? "Saving..." : "Change password"}
          </button>
        </div>
      </form>
    </>
  );
}
