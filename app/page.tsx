import type { Metadata } from "next";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "./chatgpt-auth";
import { ImportIntelligenceApp } from "./components/ImportIntelligenceApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IMPORT INTELLIGENCE",
  description: "Import management platform for demands, shipments, costs, and intelligence.",
};

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-panel" aria-labelledby="login-title">
          <div className="brand-mark">II</div>
          <p className="login-kicker">IMPORT MANAGEMENT PLATFORM</p>
          <h1 id="login-title">IMPORT INTELLIGENCE</h1>
          <p>
            Sign in to manage suppliers, demands, shipments, contracts, costs,
            reports, and operational intelligence from an empty greenfield database.
          </p>
          <a className="primary-link" href={chatGPTSignInPath("/")}>
            SIGN IN
          </a>
        </section>
      </main>
    );
  }

  return (
    <ImportIntelligenceApp
      user={{ displayName: user.displayName, email: user.email }}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
