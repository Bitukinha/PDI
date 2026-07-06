import { useSession as getSessionManager, updateSession, clearSession } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import { queryOne } from "./db.server";

type SessionData = { userId: string };
export type CurrentUser = { id: string; email: string };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("Missing SESSION_SECRET environment variable.");
  return {
    password,
    name: "pdi_session",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function requireUserId(): Promise<string> {
  const session = await getSessionManager<SessionData>(sessionConfig());
  const userId = session.data.userId;
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}

export async function getSessionUser(): Promise<CurrentUser | null> {
  const session = await getSessionManager<SessionData>(sessionConfig());
  const userId = session.data.userId;
  if (!userId) return null;
  return queryOne<CurrentUser>("SELECT id, email FROM users WHERE id = $1", [userId]);
}

export async function registerUser(email: string, password: string): Promise<CurrentUser | null> {
  const normalizedEmail = email.toLowerCase();
  const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing) throw new Error("Este e-mail já está cadastrado.");
  const passwordHash = await bcrypt.hash(password, 10);
  return queryOne<CurrentUser>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [normalizedEmail, passwordHash],
  );
}

export async function authenticateUser(email: string, password: string): Promise<CurrentUser> {
  const normalizedEmail = email.toLowerCase();
  const user = await queryOne<{ id: string; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [normalizedEmail],
  );
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error("E-mail ou senha inválidos.");
  }
  await updateSession(sessionConfig(), { userId: user.id });
  return { id: user.id, email: user.email };
}

export async function endSession(): Promise<void> {
  await clearSession(sessionConfig());
}
