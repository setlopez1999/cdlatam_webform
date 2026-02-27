/**
 * core/services/trpc.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente tRPC para el frontend.
 * Todos los hooks de datos (useQuery, useMutation) se generan desde aquí.
 *
 * Para consumir un endpoint del backend:
 *   import { trpc } from "@/core/services/trpc";
 *   const { data } = trpc.localAuth.me.useQuery();
 */
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
