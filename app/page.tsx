import type { Metadata } from "next";
import { ImportIntelligenceApp } from "./components/ImportIntelligenceApp";
import { LoginPanel } from "./components/LoginPanel";
import { getCurrentAppUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import Operations",
  description: "Import management platform for demands, shipments, costs, and intelligence.",
};

export default async function Home() {
  const user = await getCurrentAppUser();

  if (!user) {
    return <LoginPanel />;
  }

  return (
    <ImportIntelligenceApp
      user={{ displayName: user.displayName, email: user.email }}
      signOutPath="/api/auth/signout"
    />
  );
}
