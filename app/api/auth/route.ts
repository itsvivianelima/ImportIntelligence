import { eq } from "drizzle-orm";
import { appUsers } from "../../../db/schema";
import {
  appHasUsers,
  createPasswordHash,
  createSession,
  verifyPassword,
} from "../../../lib/auth";
import {
  createSupabaseUser,
  findSupabaseUserByEmail,
  isSupabaseConfigured,
} from "../../../lib/supabase-store";

type AuthPayload = {
  mode?: "login" | "bootstrap";
  email?: string;
  password?: string;
  displayName?: string;
};

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("D1 binding") || message.includes("no such table")) {
    return "Authentication database is not initialized yet.";
  }
  return message;
}

export async function GET() {
  try {
    return Response.json({ hasUsers: await appHasUsers() });
  } catch (error) {
    return Response.json({ error: authError(error), hasUsers: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AuthPayload;
    const mode = payload.mode ?? "login";
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const displayName = payload.displayName?.trim() || email;

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "Password must have at least 8 characters." }, { status: 400 });
    }

    const secure = new URL(request.url).protocol === "https:";
    const useSupabase = await isSupabaseConfigured();

    if (mode === "bootstrap") {
      if (await appHasUsers()) {
        return Response.json({ error: "First admin already exists." }, { status: 409 });
      }

      const { hash, salt } = await createPasswordHash(password);
      const user = useSupabase
        ? await createSupabaseUser({
            email,
            displayName,
            passwordHash: hash,
            passwordSalt: salt,
            role: "ADMIN",
          })
        : await createD1User({ email, displayName, passwordHash: hash, passwordSalt: salt });

      if (!user) throw new Error("Could not create the first admin user.");

      return Response.json(
        { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } },
        { status: 201, headers: { "set-cookie": await createSession(user.id, secure) } },
      );
    }

    const user = useSupabase ? await findSupabaseUserByEmail(email) : await findD1UserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    return Response.json(
      { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } },
      { headers: { "set-cookie": await createSession(user.id, secure) } },
    );
  } catch (error) {
    return Response.json({ error: authError(error) }, { status: 500 });
  }
}

async function getDatabase() {
  const { getDb } = await import("../../../db");
  return getDb();
}

async function findD1UserByEmail(email: string) {
  const db = await getDatabase();
  const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
  return user ?? null;
}

async function createD1User(input: {
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  const db = await getDatabase();
  const [user] = await db
    .insert(appUsers)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      role: "ADMIN",
    })
    .returning();
  return user ?? null;
}
