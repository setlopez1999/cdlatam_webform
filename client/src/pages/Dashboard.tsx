import { useState, useRef, useCallback } from "react";
import { LayoutDashboard, Plus, ClipboardList, Clock } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { PageLayout } from "@/components/PageLayout";
import { trpc } from "@/lib/trpc";

// ─── Easter Egg: 5 clicks en el ícono del Dashboard togglean gestor_horarios ──
const EASTER_EGG_CLICKS = 5;
const EASTER_EGG_WINDOW_MS = 3000;

function useEasterEgg(refetchRoles: () => void) {
  const clickCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flash, setFlash] = useState<"on" | "off" | null>(null);

  const toggleMutation = trpc.userRoles.toggleHorarios.useMutation({
    onSuccess: (data) => {
      setFlash(data.active ? "on" : "off");
      refetchRoles();
      setTimeout(() => setFlash(null), 1500);
    },
  });

  const handleIconClick = useCallback(() => {
    clickCount.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { clickCount.current = 0; }, EASTER_EGG_WINDOW_MS);
    if (clickCount.current >= EASTER_EGG_CLICKS) {
      clickCount.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      toggleMutation.mutate();
    }
  }, [toggleMutation]);

  return { handleIconClick, flash };
}

export default function Dashboard() {
  const { currentUser, refetchRoles } = useLocalAuth();
  const nombre = currentUser?.displayName ?? currentUser?.username;
  const { handleIconClick, flash } = useEasterEgg(refetchRoles);

  const accesos = [
    { label: "Nueva Acta", desc: "Crear nuevo expediente de cliente", href: "/nuevo-expediente", icon: Plus, color: "blue" },
    { label: "Gestionar Catálogos", desc: "Configurar monedas, países y áreas", href: "/base-datos", icon: ClipboardList, color: "violet" },
    { label: "Ver Historial", desc: "Revisar registros y estados de EPs", href: "/historial", icon: Clock, color: "orange" },
  ] as const;

  return (
    <PageLayout
      title="Dashboard"
      subtitle={`Bienvenido, ${nombre}`}
      icon={
        <span
          onClick={handleIconClick}
          className={[
            "cursor-default select-none transition-all duration-300",
            flash === "on"  ? "drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]"  : "",
            flash === "off" ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]"  : "",
          ].join(" ")}
        >
          <LayoutDashboard className="w-6 h-6 text-primary" />
        </span>
      }
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
