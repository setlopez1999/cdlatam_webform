import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
// vite y vite.config se importan dinámicamente para que esbuild no los bundlee en producción
import { ENV } from "./env";

/** Variables de entorno expuestas al cliente en runtime (sin rebuild) */
const runtimeEnv = () => ({
  APP_DEBUG: ENV.appDebug,
  USE_API: ENV.useApi,
});

export async function setupVite(app: Express, server: Server) {
  // Imports dinámicos — solo se ejecutan en desarrollo, no se bundlean por esbuild
  const { createServer: createViteServer } = await import("vite");
  const { default: viteConfig } = await import("../../vite.config");

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      // Inyectar window.__ENV__ directamente en el HTML (runtime config sin rebuild)
      const runtimeConfig = `<script>window.__ENV__ = ${JSON.stringify(runtimeEnv())};</script>`;
      template = template.replace(`</head>`, `${runtimeConfig}\n  </head>`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // En producción el frontend vive bajo /sga/ (base path de Vite)
  // Nginx hace proxy de /sga/* al Node.js, por eso servimos bajo /sga/
  const staticPrefix = process.env.NODE_ENV === "production" ? "/sga" : "";

  app.use(staticPrefix, express.static(distPath));

  // Endpoint /config.js para producción (modo static) — accesible bajo /sga/config.js
  app.get(`${staticPrefix}/config.js`, (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.send(`window.__ENV__ = ${JSON.stringify(runtimeEnv())};`);
  });

  // SPA fallback: cualquier ruta bajo /sga/* que no sea un archivo → index.html
  app.use(`${staticPrefix}/*`, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // Compatibilidad: ruta raíz también responde con index.html del SGA
  if (staticPrefix) {
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}
