import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { seedDefaultUsers, seedDefaultRoles, registerLocalAuthRoutes } from "../localAuth";
import { runMigrations, seedCatalogMeta } from "../db";
import { registerDbManagementRoutes } from "./dbManagement";
import { registerClausulasUpload } from "../routes/clausulas-upload";
import { ENV } from "./env";
import type { Request, Response, NextFunction } from "express";
import { join } from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Seguridad HTTP
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Rate limiting solo para API (no afecta assets estáticos ni la SPA)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes a la API, intente más tarde", code: 429 },
  });
  app.use("/api/trpc", apiLimiter);

  // Configure body parser
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Run DB migrations
  await runMigrations();

  // Seed catalog_meta (tablas fijas del sistema)
  seedCatalogMeta();

  // Seed default roles (admin, viewer, user, gestor_horarios)
  await seedDefaultRoles().catch(err => console.error("[Seed] Roles failed:", err));
  // Seed default users (credenciales desde .env o generadas aleatoriamente)
  await seedDefaultUsers().catch(err => console.error("[Seed] Users failed:", err));

  // Custom REST auth routes
  registerLocalAuthRoutes(app);

  // DB Management Routes (Export/Import)
  registerDbManagementRoutes(app);

  // Clausulas Upload Route
  registerClausulasUpload(app);

  // ─── Runtime config endpoint ──────────────────────────────────────────────
  // Expone variables de entorno al cliente SIN necesidad de rebuild.
  // El cliente carga este script en index.html y lee window.__ENV__
  app.get("/config.js", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store"); // nunca cachear — siempre fresco
    res.send(`window.__ENV__ = ${JSON.stringify({ APP_DEBUG: ENV.appDebug, USE_API: ENV.useApi })};`);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Serve static files for clause PDFs
  app.use('/clauses', express.static(join(process.cwd(), 'data', 'clauses')));

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ─── Middleware de error global ────────────────────────────────────────────
  // Siempre devuelve JSON (nunca HTML), con o sin stack según APP_DEBUG
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    console.error(`[Error ${status}]`, err.message, ENV.appDebug ? err.stack : "");
    if (ENV.appDebug) {
      return res.status(status).json({
        error: err.message ?? "Error interno del servidor",
        code: status,
        stack: err.stack ?? null,
      });
    }
    return res.status(status).json({
      error: status === 401 ? "No autorizado"
           : status === 403 ? "Acceso denegado"
           : status === 404 ? "Recurso no encontrado"
           : "Error interno del servidor",
      code: status,
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
