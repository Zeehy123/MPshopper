import { useState } from "react";
import { ProduceSymbols, BasketHero } from "../components/Botanicals";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return setError("Enter your username and password.");
    if (mode === "register" && password !== confirm) return setError("Passwords do not match.");
    try {
      setBusy(true);
      setError("");
      await (mode === "login" ? login : register)(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <ProduceSymbols />
      <section className="auth-hero">
        <div className="hero-art">
          <BasketHero />
        </div>
        <h1>My Grocery Shopper</h1>
        <p>Keep your own price list, shop with a cart, and see what you really spend. It works without internet.</p>
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>{mode === "login" ? "Log in" : "Create your account"}</h2>

        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {mode === "register" && (
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
