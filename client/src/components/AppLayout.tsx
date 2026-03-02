import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  User,
  Shield,
  Users,
  History,
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
  badge?: string;
  adminOnly?: boolean;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/base-datos", label: "Base de Datos", icon: Database, adminOnly: true },
  { href: "/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
  { href: "/historial", label: "Historial", icon: History, adminOnly: true },
];

// Items para usuario normal
const USER_HOME_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: LayoutDashboard },
  { href: "/historial", label: "Historial", icon: History },
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
    if (href === "/" || href === "/home") return location === href;
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Sesión cerrada correctamente");
    navigate("/login");
  };

  const visibleAdminItems = ADMIN_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const initials = (currentUser?.nombre ?? currentUser?.username ?? "U")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const NavItemRow = ({ item, indent = false }: { item: NavItem; indent?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg mx-auto transition-all cursor-pointer",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-4 h-4" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link href={item.href}>
        <div
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer",
            indent && "pl-6",
            active
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
          onClick={() => setMobileOpen(false)}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold",
              active ? "bg-primary/20 text-primary" : "bg-sidebar-accent text-sidebar-foreground/40"
            )}>
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-4 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png"
          alt=""
          className={cn("object-contain flex-shrink-0", collapsed ? "w-8 h-8" : "h-8 w-auto")}
        />

      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">

        {/* Admin: sección General */}
        {isAdmin && visibleAdminItems.length > 0 && (
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 px-3 mb-1">
                General
              </p>
            )}
            <div className="space-y-0.5">
              {visibleAdminItems.map(item => (
                <NavItemRow key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Usuario normal: Inicio e Historial */}
        {!isAdmin && (
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 px-3 mb-1">
                Principal
              </p>
            )}
            <div className="space-y-0.5">
              {USER_HOME_ITEMS.map(item => (
                <NavItemRow key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}



      </nav>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        {!collapsed && currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback className={cn(
                    "text-[10px] font-bold",
                    isAdmin ? "bg-primary/20 text-primary" : "bg-sidebar-accent text-sidebar-foreground/70"
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
                      ? <Shield className="w-2.5 h-2.5 text-primary" />
                      : <User className="w-2.5 h-2.5 text-sidebar-foreground/40" />
                    }
                    <p className="text-[10px] text-sidebar-foreground/40">
                      {isAdmin ? "Administrador" : "Usuario"}
                    </p>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{currentUser?.nombre ?? currentUser?.username ?? currentUser.username}</p>
                <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {collapsed && currentUser && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="w-full flex justify-center py-1 cursor-pointer" onClick={handleLogout}>
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={cn(
                    "text-[10px] font-bold",
                    isAdmin ? "bg-primary/20 text-primary" : "bg-sidebar-accent text-sidebar-foreground/70"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{currentUser?.nombre ?? currentUser?.username ?? currentUser.username}</p>
              <p className="text-xs text-muted-foreground">Cerrar sesión</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {!collapsed && <span>Colapsar</span>}
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu className="w-4 h-4" />
          </Button>
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png"
            alt="CDLatadsadasm"
            className="h-6 w-auto"
          />
          {currentUser && (
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
