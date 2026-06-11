import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Search, Eye, Filter, Calendar } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { trpc } from "@/lib/trpc";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  UPDATE: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
  LOGIN: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  LOGOUT: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  LOGIN_FAILED: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  UPLOAD: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  PASSWORD_CHANGE: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  USERNAME_CHANGE: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

type Preset = "6h" | "today" | "yesterday" | "week" | "custom";

function unixSec(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function rangeForPreset(p: Preset): { fromSec?: number; toSec?: number } {
  const now = new Date();
  const toSec = unixSec(now);
  if (p === "6h") {
    return { fromSec: toSec - 6 * 3600, toSec };
  }
  if (p === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { fromSec: unixSec(start), toSec };
  }
  if (p === "yesterday") {
    const startYesterday = new Date(now);
    startYesterday.setDate(startYesterday.getDate() - 1);
    startYesterday.setHours(0, 0, 0, 0);
    const endYesterday = new Date(startYesterday);
    endYesterday.setHours(23, 59, 59, 999);
    return { fromSec: unixSec(startYesterday), toSec: unixSec(endYesterday) };
  }
  if (p === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { fromSec: unixSec(start), toSec };
  }
  return {};
}

type AuditRow = {
  id: number;
  userId: number | null;
  username: string;
  action: string;
  entity: string;
  expedienteId: number | null;
  changes: unknown;
  ip: string | null;
  createdAt: Date;
};

export default function AuditLog() {
  const [preset, setPreset] = useState<Preset>("6h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [usernameContains, setUsernameContains] = useState("");
  const [expedienteIdStr, setExpedienteIdStr] = useState("");
  const [userIdStr, setUserIdStr] = useState("");
  const [limit] = useState(150);
  const [pageCursor, setPageCursor] = useState<{ id: number; createdAtSec: number } | undefined>();
  const [allItems, setAllItems] = useState<AuditRow[]>([]);

  const range = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return {};
      const fromD = new Date(customFrom);
      const toD = new Date(customTo);
      toD.setHours(23, 59, 59, 999);
      return { fromSec: unixSec(fromD), toSec: unixSec(toD) };
    }
    return rangeForPreset(preset);
  }, [preset, customFrom, customTo]);

  const userId = userIdStr.trim() ? parseInt(userIdStr.trim(), 10) : undefined;
  const userIdQuery = userId != null && !Number.isNaN(userId) ? userId : undefined;
  const expedienteIdValue = expedienteIdStr.trim()
    ? parseInt(expedienteIdStr.trim(), 10)
    : undefined;
  const expedienteIdQuery = expedienteIdValue != null && !Number.isNaN(expedienteIdValue) ? expedienteIdValue : undefined;

  const customReady = preset !== "custom" || (Boolean(customFrom) && Boolean(customTo));

  const queryInput = useMemo(
    () => ({
      ...range,
      limit,
      usernameContains: usernameContains.trim() || undefined,
      expedienteId: expedienteIdQuery,
      userId: userIdQuery,
      cursor: pageCursor,
    }),
    [range, limit, usernameContains, expedienteIdQuery, userIdQuery, pageCursor]
  );

  useEffect(() => {
    setPageCursor(undefined);
    if (!customReady) setAllItems([]);
  }, [preset, customFrom, customTo, usernameContains, expedienteIdStr, userIdStr, limit, customReady]);
  const { data, isLoading, isFetching } = trpc.audit.list.useQuery(queryInput, {
    enabled: customReady,
  });

  useEffect(() => {
    if (!data?.items || isFetching) return;
    if (!pageCursor) setAllItems(data.items as AuditRow[]);
    else setAllItems((prev) => [...prev, ...(data.items as AuditRow[])]);
  }, [data, pageCursor, isFetching]);

  const rows: AuditRow[] = allItems;

  const filteredLogs = rows.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.username.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      String(log.userId ?? "").includes(q) ||
      String(log.expedienteId ?? "").includes(q)
    );
  });

  return (
    <PageLayout
      title="Log de Auditoría"
      subtitle="Registro de acciones (filtros en servidor por fecha, usuario y expediente)"
      icon={<ClipboardList className="w-6 h-6 text-primary" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar en página cargada…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-52"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            Rango
          </div>
          {(["6h", "today", "yesterday", "week", "custom"] as const).map((p) => (
            <Button
              key={p}
              variant={preset === p ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPreset(p)}
            >
              {p === "6h" ? "6 h" : p === "today" ? "Hoy" : p === "yesterday" ? "Ayer" : p === "week" ? "7 días" : "Rango"}
            </Button>
          ))}
          {preset === "custom" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Input type="datetime-local" className="h-8 w-44 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-muted-foreground text-xs">a</span>
              <Input type="datetime-local" className="h-8 w-44 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
          {(isLoading || isFetching) && (
            <span className="text-xs text-muted-foreground ml-2">Actualizando…</span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Filter className="w-3.5 h-3.5" />
            Filtros (SQL)
          </div>
          <Input
            placeholder="Usuario contiene…"
            className="h-8 w-40 text-xs"
            value={usernameContains}
            onChange={(e) => setUsernameContains(e.target.value)}
          />
          <Input
            placeholder="ID usuario"
            className="h-8 w-24 text-xs"
            value={userIdStr}
            onChange={(e) => setUserIdStr(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            placeholder="ID expediente"
            className="h-8 w-24 text-xs font-mono"
            value={expedienteIdStr}
            onChange={(e) => setExpedienteIdStr(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[160px]">Fecha y hora</TableHead>
                <TableHead className="w-[72px]">User ID</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead className="w-[72px]">Exp. ID</TableHead>
                <TableHead className="w-[120px]">IP</TableHead>
                <TableHead className="text-right w-[80px]">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !data ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Cargando registros…
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No se encontraron registros en este rango.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="font-medium text-xs">
                      <div className="flex flex-col">
                        <span>{format(new Date(log.createdAt), "dd MMM yyyy", { locale: es })}</span>
                        <span className="text-muted-foreground">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.userId ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                          {log.username[0] ?? "?"}
                        </div>
                        <span className="text-sm font-medium">{log.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0",
                          ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {log.entity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.expedienteId ?? "—"}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]" title={log.ip ?? ""}>
                      {log.ip || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.changes ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                Cambios — {log.entity}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-1 mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                              <pre className="text-xs font-mono leading-relaxed">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data?.nextCursor && (
          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => {
                const c = data.nextCursor!;
                const createdAtSec = Math.floor(
                  (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as unknown as string)).getTime() /
                    1000
                );
                setPageCursor({ id: c.id, createdAtSec });
              }}
            >
              Cargar más
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
