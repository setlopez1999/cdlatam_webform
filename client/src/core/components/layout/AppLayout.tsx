import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
  LogOut,
  User,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Indicadores y estado general",
    adminOnly: true,
  },
  {
    href: "/acta",
    label: "Acta",
    icon: FileText,
    description: "Acta de Aceptación de Servicios",
    badge: "F1",
  },
  {
    href: "/ep",
    label: "Evaluación de Proyecto",
    icon: ClipboardList,
    description: "EP - Desglose de costos",
    badge: "F2",
  },
  {
    href: "/resultado",
    label: "Resultado",
    icon: BarChart3,
    description: "Resultado Evaluación (auto-fill)",
    badge: "F3",
    adminOnly: true,
  },
  {
    href: "/base-datos",
    label: "Base de Datos",
    icon: Database,
    description: "Registros y catálogos",
    adminOnly: true,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    description: "Gestión de usuarios del sistema",
    adminOnly: true,
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { currentUser, isAdmin, logout } = useLocalAuth();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Sesión cerrada correctamente");
    navigate("/login");
  };

  // Filtrar nav items por rol
  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const initials = (currentUser?.nombre ?? currentUser?.username ?? "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-3"
      )}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">Gestión Admin</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Sistema de Documentos</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-all duration-150 cursor-pointer",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active && "text-white")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", active ? "text-white" : "")}>
                    {item.label}
                  </p>
                  {!active && (
                    <p className="text-xs text-sidebar-foreground/40 truncate group-hover:text-sidebar-accent-foreground/60">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.badge && (
                  <span className={cn(
                    "text-xs font-mono px-1.5 py-0.5 rounded font-semibold flex-shrink-0",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-sidebar-accent text-sidebar-foreground/50"
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        {/* User info */}
        {!collapsed && currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className={cn(
                    "text-xs font-semibold",
                    isAdmin ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {currentUser?.nombre ?? currentUser?.username ?? currentUser.username}
                  </p>
                  <div className="flex items-center gap-1">
                    {isAdmin
                      ? <Shield className="w-2.5 h-2.5 text-amber-400" />
                      : <User className="w-2.5 h-2.5 text-blue-400" />
                    }
                    <p className="text-xs text-sidebar-foreground/40 capitalize">
                      {isAdmin ? "Administrador" : "Usuario"}
                    </p>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{currentUser?.nombre ?? currentUser?.username ?? currentUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Collapsed: solo avatar */}
        {collapsed && currentUser && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                className="w-full flex justify-center py-1 cursor-pointer"
                onClick={handleLogout}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={cn(
                    "text-xs font-semibold",
                    isAdmin ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{currentUser?.nombre ?? currentUser?.username ?? currentUser.username}</p>
              <p className="text-xs text-muted-foreground">Click para cerrar sesión</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {!collapsed && <span className="text-xs">Colapsar sidebar</span>}
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">Gestión Admin</span>
          </div>
          {currentUser && (
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
