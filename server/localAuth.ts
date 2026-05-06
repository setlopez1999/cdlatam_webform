/**
 * localAuth.ts — Autenticación local con username/password
 *
 * Flujo:
 *  1. El usuario envía username + password al endpoint tRPC localAuth.login
 *  2. Se verifica el hash con bcrypt
 *  3. Se firma un JWT con id, username, role
 *  4. El JWT se guarda en cookie httpOnly
 *
 * TODO: Para producción, rotar el JWT_SECRET y configurar expiración adecuada.
 */

import bcrypt from "bcryptjs";
import * as jose from "jose";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, roles, userRoles, type User, type InsertUser } from "../drizzle/schema";
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

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

/** @deprecated Usar findUserByUsername */
export const findLocalUserByUsername = findUserByUsername;

export async function findUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

/** @deprecated Usar findUserById */
export const findLocalUserById = findUserById;

export async function createUser(data: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(data);
}

/** @deprecated Usar createUser */
export const createLocalUser = createUser;

export async function updateLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, id));
}

export async function getAllUsers(): Promise<Omit<User, "passwordHash">[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      roleId: users.roleId,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users);
  return result;
}

/** @deprecated Usar getAllUsers */
export const getAllLocalUsers = getAllUsers;

// ─── Seed de usuarios predefinidos ───────────────────────────────────────────

/**
 * Crea los roles base si no existen (idempotente).
 * Incluye el rol gestor_horarios para la pantalla de Gestor de Horarios.
 */
export async function seedDefaultRoles(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const defaultRoles: Array<{ nombre: string; label: string; descripcion: string }> = [
    { nombre: "admin",            label: "Administrador",      descripcion: "Acceso total al sistema" },
    { nombre: "viewer",           label: "Solo lectura",        descripcion: "Acceso de solo lectura" },
    { nombre: "user",             label: "Usuario",             descripcion: "Acceso basico al sistema" },
    { nombre: "gestor_horarios",  label: "Gestor de Horarios",  descripcion: "Acceso a la pantalla de gestion de horarios" },
  ];

  for (const r of defaultRoles) {
    const existing = await db.select().from(roles).where(eq(roles.nombre, r.nombre)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values({ nombre: r.nombre, label: r.label, descripcion: r.descripcion, activo: 1 });
      console.log(`[LocalAuth] Created default role: ${r.nombre}`);
    }
  }
}

/**
 * Crea los usuarios predefinidos si no existen y sincroniza sus roles en user_roles.
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
    let dbUser = await findUserByUsername(u.username);
    if (!dbUser) {
      const passwordHash = await hashPassword(u.password);
      await createUser({
        username: u.username,
        passwordHash,
        displayName: u.displayName,
        role: u.role,
        isActive: 1,
      });
      dbUser = await findUserByUsername(u.username);
      console.log(`[LocalAuth] Created default user: ${u.username} (${u.role})`);
    }

    // Sincronizar user_roles: asignar el rol correspondiente si no lo tiene
    if (dbUser) {
      const roleRow = await db.select().from(roles).where(eq(roles.nombre, u.role)).limit(1);
      if (roleRow.length > 0) {
        const existing = await db.select().from(userRoles)
          .where(eq(userRoles.userId, dbUser.id)).limit(1);
        if (existing.length === 0) {
          await db.insert(userRoles).values({ userId: dbUser.id, roleId: roleRow[0].id });
          console.log(`[LocalAuth] Assigned role '${u.role}' to user '${u.username}' in user_roles`);
        }
      }
    }
  }
}

// ─── Rutas REST (eliminadas — el cliente usa tRPC exclusivamente) ─────────────
// Los endpoints /api/auth/login, /api/auth/logout y /api/auth/me fueron eliminados.
// Toda la autenticación pasa por el router tRPC `localAuth` en server/routers.ts,
// que usa ds_findUserByUsername de dataSource.ts como única fuente de verdad.

export function registerLocalAuthRoutes(_app: Express) {
  // No-op: rutas REST eliminadas. Toda la auth pasa por tRPC.
  // app.post("/api/auth/login", ...) → reemplazado por trpc.localAuth.login
  // app.post("/api/auth/logout", ...) → reemplazado por trpc.localAuth.logout
  // app.get("/api/auth/me", ...) → reemplazado por trpc.localAuth.me
}
