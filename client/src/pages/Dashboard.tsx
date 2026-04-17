import { LayoutDashboard, Plus, ClipboardList, Clock } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { PageLayout } from "@/components/PageLayout";

export default function Dashboard() {
  const { currentUser } = useLocalAuth();
  const nombre = currentUser?.displayName ?? currentUser?.username;

  const accesos = [
    { label: "Nueva Acta", desc: "Crear nuevo expediente de cliente", href: "/nuevo-expediente", icon: Plus, color: "blue" },
    { label: "Gestionar Catálogos", desc: "Configurar monedas, países y áreas", href: "/base-datos", icon: ClipboardList, color: "violet" },
    { label: "Ver Historial", desc: "Revisar registros y estados de EPs", href: "/historial", icon: Clock, color: "orange" },
  ] as const;

  return (
    <PageLayout
      title="Dashboard"
      subtitle={`Bienvenido, ${nombre}`}
      icon={<LayoutDashboard className="w-6 h-6 text-primary" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accesos.map(({ label, desc, href, icon: Icon, color }) => (
          <div
            key={label}
            onClick={() => navigate(href)}
            className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 flex items-center justify-center group-hover:bg-${color}-500/20 transition-colors`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{label}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
