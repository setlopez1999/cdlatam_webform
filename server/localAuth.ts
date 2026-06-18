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
import { eq, inArray, sql } from "drizzle-orm";
import { getDb, USE_POSTGRES } from "./db";
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
    .set({ lastSignedIn: USE_POSTGRES ? sql`to_timestamp(${Math.floor(Date.now() / 1000)})` : new Date() })
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
    { nombre: "admin",                  label: "Administrador",           descripcion: "Acceso total al sistema" },
    { nombre: "user",                   label: "Usuario",                descripcion: "Acceso basico al sistema" },
    { nombre: "gestor_horarios",        label: "Gestor de Horarios",     descripcion: "Acceso a la pantalla de gestion de horarios" },
    { nombre: "perfil_full",            label: "Perfil Full",            descripcion: "Acceso completo: F1-Acta, F2-EP, Resultados e Implementacion" },
    { nombre: "perfil_ventas",          label: "Perfil Ventas",          descripcion: "Acceso restringido unicamente al modulo F1-Acta" },
    { nombre: "perfil_implementacion",  label: "Perfil Implementacion",  descripcion: "Acceso restringido unicamente al modulo de Implementacion" },
  ];

  for (const r of defaultRoles) {
    const existing = await db.select().from(roles).where(eq(roles.nombre, r.nombre)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values({ nombre: r.nombre, label: r.label, descripcion: r.descripcion, activo: 1 });
      console.log(`[LocalAuth] Created default role: ${r.nombre}`);
    }
  }

  // Eliminar roles obsoletos
  await db.delete(roles).where(inArray(roles.nombre, ['viewer', 'manager']));
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < 20; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

/**
 * Crea el usuario admin si no existe y le asigna el rol admin.
 *
 * La contraseña se toma de la variable de entorno DEFAULT_ADMIN_PASSWORD.
 * Si no está definida, se genera aleatoriamente y se muestra en consola.
 */
export async function seedDefaultUsers(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[LocalAuth] Skipping seed: database not available");
    return;
  }

  const adminPwd = ENV.defaultAdminPassword || generateRandomPassword();

  let dbUser = await findUserByUsername("admin");
  if (!dbUser) {
    const passwordHash = await hashPassword(adminPwd);
    await createUser({
      username: "admin",
      passwordHash,
      displayName: "Administrador",
      role: "admin",
      isActive: 1,
    });
    dbUser = await findUserByUsername("admin");
    console.log(`[LocalAuth] Created default user: admin`);
  }
  if (dbUser) {
    const roleRow = await db.select().from(roles).where(eq(roles.nombre, "admin")).limit(1);
    if (roleRow.length > 0) {
      const existing = await db.select().from(userRoles)
        .where(eq(userRoles.userId, dbUser.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(userRoles).values({ userId: dbUser.id, roleId: roleRow[0].id });
        console.log(`[LocalAuth] Assigned role 'admin' to user 'admin' in user_roles`);
      }
    }
  }

  if (!ENV.defaultAdminPassword) {
    console.log(`[LocalAuth] 🔑 Admin password (no persistirá entre reinicios): ${adminPwd}`);
    console.log(`[LocalAuth] 🔑 Defina DEFAULT_ADMIN_PASSWORD en .env para fijarla`);
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
