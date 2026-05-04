import { useState } from "react";
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

/** 
 * Colores para las acciones 
 */
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  UPDATE: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
  LOGIN: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  LOGOUT: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);

  const { data: logs, isLoading } = trpc.expediente.auditLog.useQuery({ limit });

  // Filtro simple por texto
  const filteredLogs = logs?.filter(log => 
    log.username.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout
      title="Log de Auditoría"
      subtitle="Registro histórico de acciones y cambios en el sistema"
      icon={<ClipboardList className="w-6 h-6 text-primary" />}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar por usuario, acción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-64"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Filter className="w-3.5 h-3.5" />
            Límite: {limit}
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[180px]">Fecha y Hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>ID Entidad</TableHead>
              <TableHead className="text-right">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Cargando registros...
                </TableCell>
              </TableRow>
            ) : filteredLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs?.map((log) => (
                <TableRow key={log.id} className="group">
                  <TableCell className="font-medium text-xs">
                    <div className="flex flex-col">
                      <span>{format(new Date(log.createdAt), "dd MMM yyyy", { locale: es })}</span>
                      <span className="text-muted-foreground">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                        {log.username[0]}
                      </div>
                      <span className="text-sm font-medium">{log.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0", ACTION_COLORS[log.action])}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">
                      {log.entity}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entityId || "—"}
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
                              Detalles del Cambio - {log.entity} #{log.entityId}
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
                      <span className="text-[10px] text-muted-foreground italic">Sin detalles</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
}
