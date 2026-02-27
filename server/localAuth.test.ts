/**
 * Tests para el sistema de autenticación local (username/password + JWT)
 * Ejecutar: pnpm test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signLocalJWT, verifyLocalJWT, type LocalAuthPayload } from "./localAuth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Mock Context ─────────────────────────────────────────────────────────────

function createCtx(role: "admin" | "user" = "admin", localUser?: LocalAuthPayload | null): TrpcContext {
  const user: User = {
    id: 1,
    openId: `local_${role}`,
    name: role === "admin" ? "Administrador" : "Usuario Regular",
    email: null,
    loginMethod: "local",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    localUser: localUser ?? {
      id: 1,
      username: role,
      displayName: role === "admin" ? "Administrador" : "Usuario Regular",
      role,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Password Hashing Tests ───────────────────────────────────────────────────

describe("Password Hashing (bcrypt)", () => {
  it("hashea una contraseña correctamente", async () => {
    const hash = await hashPassword("1234");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("1234");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("verifica contraseña correcta contra su hash", async () => {
    const hash = await hashPassword("1234");
    const valid = await verifyPassword("1234", hash);
    expect(valid).toBe(true);
  });

  it("rechaza contraseña incorrecta", async () => {
    const hash = await hashPassword("1234");
    const valid = await verifyPassword("wrong", hash);
    expect(valid).toBe(false);
  });

  it("rechaza contraseña vacía", async () => {
    const hash = await hashPassword("1234");
    const valid = await verifyPassword("", hash);
    expect(valid).toBe(false);
  });

  it("dos hashes del mismo password son diferentes (salt)", async () => {
    const hash1 = await hashPassword("5678");
    const hash2 = await hashPassword("5678");
    expect(hash1).not.toBe(hash2);
    // Pero ambos verifican correctamente
    expect(await verifyPassword("5678", hash1)).toBe(true);
    expect(await verifyPassword("5678", hash2)).toBe(true);
  });
});

// ─── JWT Tests ────────────────────────────────────────────────────────────────

describe("JWT Local Auth", () => {
  const adminPayload: LocalAuthPayload = {
    id: 1,
    username: "admin",
    displayName: "Administrador",
    role: "admin",
  };

  const userPayload: LocalAuthPayload = {
    id: 2,
    username: "usuario",
    displayName: "Usuario Regular",
    role: "user",
  };

  it("firma y verifica un JWT de admin correctamente", async () => {
    const token = await signLocalJWT(adminPayload);
    expect(token).toBeTruthy();
    const decoded = await verifyLocalJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.username).toBe("admin");
    expect(decoded?.role).toBe("admin");
    expect(decoded?.id).toBe(1);
  });

  it("firma y verifica un JWT de usuario regular", async () => {
    const token = await signLocalJWT(userPayload);
    const decoded = await verifyLocalJWT(token);
    expect(decoded?.role).toBe("user");
    expect(decoded?.username).toBe("usuario");
  });

  it("retorna null para un token inválido", async () => {
    const result = await verifyLocalJWT("token.invalido.aqui");
    expect(result).toBeNull();
  });

  it("retorna null para un token vacío", async () => {
    const result = await verifyLocalJWT("");
    expect(result).toBeNull();
  });

  it("preserva el displayName en el JWT", async () => {
    const token = await signLocalJWT(adminPayload);
    const decoded = await verifyLocalJWT(token);
    expect(decoded?.displayName).toBe("Administrador");
  });
});

// ─── Catalogs (acceso público) ────────────────────────────────────────────────

describe("catalogs.getAll (acceso público sin auth)", () => {
  it("retorna catálogos sin necesitar autenticación", async () => {
    const ctx: TrpcContext = {
      user: null,
      localUser: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const catalogs = await caller.catalogs.getAll();
    expect(catalogs.monedas.length).toBeGreaterThan(0);
    expect(catalogs.paises.length).toBeGreaterThan(0);
  });
});

// ─── Role-Based Access Control ────────────────────────────────────────────────

describe("Control de Acceso por Rol", () => {
  it("admin puede listar usuarios", async () => {
    const ctx = createCtx("admin");
    const caller = appRouter.createCaller(ctx);
    // No lanza error (aunque retorne array vacío sin DB real)
    await expect(caller.localAuth.listUsers()).resolves.toBeDefined();
  });

  it("usuario regular NO puede listar usuarios", async () => {
    const ctx = createCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.localAuth.listUsers()).rejects.toThrow("Acceso denegado");
  });

  it("admin puede crear usuarios (no lanza error de permisos)", async () => {
    const ctx = createCtx("admin");
    const caller = appRouter.createCaller(ctx);
    // El admin tiene permiso: puede resolver o lanzar error de DB/duplicado, pero NO de permisos
    let errorMessage = "";
    try {
      await caller.localAuth.createUser({
        username: "testuser_vitest_" + Date.now(),
        password: "test1234",
        displayName: "Test Vitest",
        role: "user",
      });
    } catch (e: unknown) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
    // No debe ser error de acceso denegado
    expect(errorMessage).not.toContain("Acceso denegado");
  });

  it("usuario regular NO puede crear usuarios", async () => {
    const ctx = createCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.localAuth.createUser({
        username: "testuser2",
        password: "test1234",
        role: "user",
      })
    ).rejects.toThrow("Acceso denegado");
  });
});

// ─── localAuth.me ─────────────────────────────────────────────────────────────

describe("localAuth.me", () => {
  it("retorna el usuario local autenticado", async () => {
    const payload: LocalAuthPayload = {
      id: 1, username: "admin", displayName: "Admin", role: "admin",
    };
    const ctx = createCtx("admin", payload);
    const caller = appRouter.createCaller(ctx);
    const me = await caller.localAuth.me();
    expect(me).not.toBeNull();
    expect(me?.username).toBe("admin");
    expect(me?.role).toBe("admin");
  });

  it("retorna null cuando no hay sesión local", async () => {
    const ctx: TrpcContext = {
      user: null,
      localUser: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.localAuth.me();
    expect(me).toBeNull();
  });
});
