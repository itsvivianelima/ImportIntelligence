"use client";

import { FormEvent, useEffect, useState } from "react";

export function LoginPanel() {
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [checking, setChecking] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((response) => response.json())
      .then((data) => setMode(data.hasUsers ? "login" : "bootstrap"))
      .catch(() => setMessage("Authentication service is not ready. Try again in a moment."))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, displayName, email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(String(data.error ?? "Authentication failed. Check your email and password."));
      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-mark hero-mark">II</div>
        <p className="login-kicker">Import Operations Control</p>
        <h1>Import Operations</h1>
        <p>
          Precision workspace for suppliers, demands, shipments, freight contracts,
          delivery dates, and import performance.
        </p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <p className="login-kicker">Secure Access</p>
          <h2 id="login-title">Import Operations</h2>
          <p>
            {mode === "bootstrap"
              ? "Create the first administrator account for this operations workspace."
              : "Sign in to manage import operations."}
          </p>
          <form className="login-form" onSubmit={submit}>
            {mode === "bootstrap" ? (
              <label className="field">
                Display Name
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            ) : null}
            <label className="field">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            {message ? <p className="status-message">{message}</p> : null}
            <button className="primary-link" type="submit" disabled={checking}>
              {mode === "bootstrap" ? "Create First Admin" : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
