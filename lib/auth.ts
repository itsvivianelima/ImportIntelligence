import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { appSessions, appUsers } from "../db/schema";
import {
  createSupabaseSession,
  deleteSupabaseSession,
  findSupabaseUserBySession,
  isSupabaseConfigured,
  supabaseAppHasUsers,
} from "./supabase-store";

export type AppUser = {
  id: number;
  displayName: string;
  email: string;
  role: string;
};

export const sessionCookieName = "ii_session";
const sessionDays = 7;

export async function getCurrentAppUser(): Promise<AppUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    if (!token) return null;

    const tokenHash = await sha256(token);
    if (await isSupabaseConfigured()) {
      return await findSupabaseUserBySession(tokenHash, new Date().toISOString());
    }

    const db = await getDatabase();
    const [row] = await db
      .select({
        id: appUsers.id,
        displayName: appUsers.displayName,
        email: appUsers.email,
        role: appUsers.role,
      })
      .from(appSessions)
      .innerJoin(appUsers, eq(appSessions.userId, appUsers.id))
      .where(and(eq(appSessions.tokenHash, tokenHash), gt(appSessions.expiresAt, new Date().toISOString())))
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}

export async function appHasUsers() {
  if (await isSupabaseConfigured()) {
    return supabaseAppHasUsers();
  }

  const db = await getDatabase();
  const [user] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
  return Boolean(user);
}

export async function createPasswordHash(password: string, salt = randomToken(16)) {
  return {
    salt,
    hash: await sha256(`${salt}:${password}`),
  };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = await createPasswordHash(password, salt);
  return timingSafeEqual(candidate.hash, hash);
}

export async function createSession(userId: number, secure: boolean) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  if (await isSupabaseConfigured()) {
    await createSupabaseSession(userId, tokenHash, expiresAt.toISOString());
    return buildSessionCookie(token, expiresAt, secure);
  }

  const db = await getDatabase();
  await db.insert(appSessions).values({
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  return buildSessionCookie(token, expiresAt, secure);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    try {
      const tokenHash = await sha256(token);
      if (await isSupabaseConfigured()) {
        await deleteSupabaseSession(tokenHash);
      } else {
        const db = await getDatabase();
        await db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash));
      }
    } catch {
      // Sign out must still clear the browser cookie if storage is unavailable.
    }
  }
  return `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function buildSessionCookie(token: string, expiresAt: Date, secure: boolean) {
  const secureFlag = secure ? "; Secure" : "";
  return `${sessionCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}${secureFlag}`;
}

async function getDatabase() {
  const { getDb } = await import("../db");
  return getDb();
}

function randomToken(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
