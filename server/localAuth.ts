/**
 * localAuth.ts — Autenticación local con username/password
 *
 * Flujo:
 *  1. El usuario envía username + password al endpoint login
 *  2. Se verifica el hash con bcrypt
 *  3. Se firma un JWT con id, username, role
 *  4. El JWT se guarda en cookie httpOnly (mismo mecanismo que el auth de Manus)
 *
 * TODO: Para producción, rotar el JWT_SECRET y configurar expiración adecuada.
 */

import bcrypt from "bcryptjs";
import * as jose from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { localUsers, type LocalUser, type InsertLocalUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 12;
const JWT_EXPIRY = "8h"; // Sesión de 8 horas
const LOCAL_AUTH_COOKIE = "local_session";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface LocalAuthPayload {
  id: number;
  username: string;
  displayName: string | null;
  role: "user" | "admin";
}

// ─── Helpers de contraseña ────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Helpers JWT ──────────────────────────────────────────────────────────────

export async function signLocalJWT(payload: LocalAuthPayload): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifyLocalJWT(token: string): Promise<LocalAuthPayload | null> {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as LocalAuthPayload;
  } catch {
    return null;
  }
}

// ─── Nombre de la cookie ──────────────────────────────────────────────────────

export { LOCAL_AUTH_COOKIE };

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function findLocalUserByUsername(username: string): Promise<LocalUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.username, username))
    .limit(1);
  return result[0];
}

export async function findLocalUserById(id: number): Promise<LocalUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.id, id))
    .limit(1);
  return result[0];
}

export async function createLocalUser(data: InsertLocalUser): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(localUsers).values(data);
}

export async function updateLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(localUsers)
    .set({ lastSignedIn: new Date() })
    .where(eq(localUsers.id, id));
}

export async function getAllLocalUsers(): Promise<Omit<LocalUser, "passwordHash">[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: localUsers.id,
      username: localUsers.username,
      displayName: localUsers.displayName,
      role: localUsers.role,
      isActive: localUsers.isActive,
      createdAt: localUsers.createdAt,
      updatedAt: localUsers.updatedAt,
      lastSignedIn: localUsers.lastSignedIn,
    })
    .from(localUsers);
  return result;
}

// ─── Seed de usuarios predefinidos ───────────────────────────────────────────

/**
 * Crea los usuarios predefinidos si no existen.
 * Se llama al iniciar el servidor.
 *
 * Credenciales:
 *   admin   / 1234  → rol admin  (acceso total)
 *   usuario / 5678  → rol user   (solo formularios propios)
 *
 * TODO: En producción, cambiar estas contraseñas y usar variables de entorno.
 */
export async function seedDefaultUsers(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[LocalAuth] Skipping seed: database not available");
    return;
  }

  const defaultUsers: Array<{ username: string; password: string; displayName: string; role: "admin" | "user" }> = [
    { username: "admin",   password: "1234", displayName: "Administrador",  role: "admin" },
    { username: "usuario", password: "5678", displayName: "Usuario Regular", role: "user"  },
  ];

  for (const u of defaultUsers) {
    const existing = await findLocalUserByUsername(u.username);
    if (!existing) {
      const passwordHash = await hashPassword(u.password);
      await createLocalUser({
        username: u.username,
        passwordHash,
        displayName: u.displayName,
        role: u.role,
        isActive: 1,
      });
      console.log(`[LocalAuth] Created default user: ${u.username} (${u.role})`);
    }
  }
}
