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
      .catch(() => setMessage("AUTHENTICATION DATABASE IS NOT READY"))
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
      setMessage(String(data.error ?? "AUTHENTICATION FAILED").toUpperCase());
      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-mark hero-mark">II</div>
        <p className="login-kicker">IMPORT OPERATIONS CONTROL</p>
        <h1>IMPORT INTELLIGENCE</h1>
        <p>
          Precision workspace for suppliers, demands, shipments, freight contracts,
          delivery dates, and import performance.
        </p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <p className="login-kicker">SECURE ACCESS</p>
          <h2 id="login-title">IMPORT INTELLIGENCE</h2>
          <p>
            {mode === "bootstrap"
              ? "Create the first administrator account for this new empty IMPORT INTELLIGENCE environment."
              : "Sign in with your IMPORT INTELLIGENCE account to manage import operations."}
          </p>
          <form className="login-form" onSubmit={submit}>
            {mode === "bootstrap" ? (
              <label className="field">
                DISPLAY NAME
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            ) : null}
            <label className="field">
              EMAIL
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              PASSWORD
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
              {mode === "bootstrap" ? "CREATE FIRST ADMIN" : "SIGN IN"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
