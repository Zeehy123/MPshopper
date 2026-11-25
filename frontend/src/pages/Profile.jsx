import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword) {
      setError("Enter your current password to confirm these changes.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (username.trim() === user?.username && !newPassword) {
      setError("There are no profile changes to save.");
      return;
    }

    try {
      setBusy(true);
      await updateProfile({
        username: username.trim(),
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Your profile has been updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Your profile</h1>
      <p className="muted profile-intro">
        Update your username or password. We’ll ask for your current password
        before saving.
      </p>
      <form className="card form profile-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
            minLength={3}
            maxLength={30}
          />
        </label>

        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label>
          New password <span className="muted">(leave blank to keep it)</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        {newPassword && (
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="profile-success" role="status">{message}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save profile"}
        </button>
      </form>
    </>
  );
}
