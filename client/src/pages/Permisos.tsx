import { useMemo, useState } from "react";
import { Shield, Save, RefreshCw, AlertCircle } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { trpc } from "@/lib/trpc";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ROUTE_PERMISSIONS } from "@/config/permissions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Permisos() {
  const utils = trpc.useContext();
  
  // 1. Obtener Roles y Reglas actuales
  const { data: roles, isLoading: loadingRoles } = trpc.roles.list.useQuery();
  const { data: rules, isLoading: loadingRules } = trpc.permissions.getRules.useQuery();
  
  // 2. Mutación para sincronizar
  const syncMutation = trpc.permissions.syncRole.useMutation({
    onSuccess: () => {
      toast.success("Permisos actualizados correctamente");
      utils.permissions.getRules.invalidate();
    },
    onError: (err) => {
      toast.error("Error al actualizar permisos: " + err.message);
    }
  });

  // 3. Estado local para la matriz (para edición fluida)
  // Usamos un Set de "roleId:routePath" para búsqueda rápida
  const [localChanges, setLocalChanges] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Inicializar estado local desde la BD cuando cargue
  const activeRules = useMemo(() => {
    const set = new Set<string>();
    rules?.forEach(r => set.add(`${r.roleId}:${r.routePath}`));
    return set;
  }, [rules]);

  // Rutas disponibles (keys de ROUTE_PERMISSIONS)
  const routes = Object.keys(ROUTE_PERMISSIONS).sort();

  const handleToggle = (roleId: number, routePath: string) => {
    const key = `${roleId}:${routePath}`;
    const newRules = new Set(isDirty ? localChanges : activeRules);
    
    if (newRules.has(key)) {
      newRules.delete(key);
    } else {
      newRules.add(key);
    }
    
    setLocalChanges(newRules);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!roles) return;
    
    try {
      // Por cada rol, enviar su lista de rutas activas
      for (const role of roles) {
        const roleRoutes = Array.from(isDirty ? localChanges : activeRules)
          .filter(k => k.startsWith(`${role.id}:`))
          .map(k => k.split(":")[1]);
          
        await syncMutation.mutateAsync({
          roleId: role.id,
          routes: roleRoutes
        });
      }
      setIsDirty(false);
    } catch (e) {
      // El error ya lo maneja la mutación
    }
  };

  const handleReset = () => {
    setLocalChanges(new Set());
    setIsDirty(false);
  };

  const currentRules = isDirty ? localChanges : activeRules;
  const isLoading = loadingRoles || loadingRules;

  return (
    <PageLayout
      title="Matriz de Permisos"
      subtitle="Define qué roles tienen acceso a cada sección del sistema"
      icon={<Shield className="w-6 h-6 text-primary" />}
      actions={
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Descartar
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!isDirty || syncMutation.isPending}
            className="h-8 gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {syncMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      }
    >
      {/* Aviso de Beta */}
      <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-600">Configuración Dinámica Activa</p>
          <p className="text-amber-600/80">
            Los cambios realizados aquí afectarán la visibilidad del sidebar y el acceso a las rutas. 
            El rol <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">admin</Badge> siempre tendrá acceso total por seguridad.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[250px] sticky left-0 bg-muted/50 z-10 border-r border-border">Ruta / Pantalla</TableHead>
                {roles?.map(role => (
                  <TableHead key={role.id} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold">{role.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">{role.nombre}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(roles?.length || 0) + 1} className="h-32 text-center text-muted-foreground">
                    Cargando matriz de permisos...
                  </TableCell>
                </TableRow>
              ) : (
                routes.map(path => {
                  const config = ROUTE_PERMISSIONS[path];
                  return (
                    <TableRow key={path} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="sticky left-0 bg-card group-hover:bg-muted/30 z-10 border-r border-border">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{config.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{path}</span>
                        </div>
                      </TableCell>
                      {roles?.map(role => {
                        const isAllowed = currentRules.has(`${role.id}:${path}`);
                        const isAdmin = role.nombre === "admin";
                        
                        return (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox 
                              checked={isAllowed || isAdmin}
                              onCheckedChange={() => !isAdmin && handleToggle(role.id, path)}
                              disabled={isAdmin || syncMutation.isPending}
                              className="mx-auto"
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
}
