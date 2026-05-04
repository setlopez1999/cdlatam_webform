import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ResultadoView from "./pages/ResultadoView";
import BaseDatos from "./pages/BaseDatos";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Usuarios from "./pages/Usuarios";
import UserHome from "./pages/UserHome";
import Historial from "./pages/Historial";
import NuevoExpediente from "./pages/NuevoExpediente";
import ExpedienteActa from "./pages/ExpedienteActa";
import ExpedienteEP from "./pages/ExpedienteEP";
import ExpedienteResultados from "./pages/ExpedienteResultados";
import ExpedienteImplementacion from "./pages/ExpedienteImplementacion";
import SpreadsheetView from "./pages/SpreadsheetView";
import GestorHorarios from "./pages/GestorHorarios";
import AuditLog from "./pages/AuditLog";
import { useLocalAuth } from "./hooks/useLocalAuth";
import { Loader2 } from "lucide-react";
import { ROUTE_PERMISSIONS, evaluatePermission, ROLE_ANY } from "@/config/permissions";

/**
 * Componente que protege rutas consultando ROUTE_PERMISSIONS (permissions.ts).
 *
 * El parámetro `routePath` debe coincidir exactamente con una clave de
 * ROUTE_PERMISSIONS. Si la ruta no está registrada, se deniega el acceso.
 *
 * Para rutas sin restricción (accesibles a cualquier usuario autenticado),
 * registrarlas en ROUTE_PERMISSIONS con roles: ["*"].
 */
function ProtectedRoute({
  component: Component,
  routePath,
  fullscreen = false,
}: {
  component: React.ComponentType<any>;
  /** Path de la ruta tal como está definido en ROUTE_PERMISSIONS */
  routePath: string;
  fullscreen?: boolean;
}) {
  const { isAuthenticated, isAdmin, myRoles, isLoading } = useLocalAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Obtener los roles requeridos desde la fuente única de verdad
  const perm = ROUTE_PERMISSIONS[routePath];
  if (!perm) {
    // Ruta no registrada en permissions.ts → denegar por defecto
    console.warn(`[ProtectedRoute] Ruta "${routePath}" no registrada en ROUTE_PERMISSIONS`);
    return <Redirect to="/home" />;
  }

  // Construir el array de roles efectivos del usuario
  const userRoles = [
    ...(isAdmin ? ["admin"] : []),
    ...myRoles,
  ];

  if (!evaluatePermission(userRoles, perm.roles)) {
    return <Redirect to="/home" />;
  }

  if (fullscreen || perm.fullscreen) {
    return <Component />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

/**
 * Ruta de login: redirige al dashboard si ya está autenticado.
 */
function LoginRoute() {
  const { isAuthenticated, isAdmin, isLoading } = useLocalAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to={isAdmin ? "/" : "/home"} />;
  }

  return <Login />;
}

function Router() {
  return (
    <Switch>
      {/* Ruta pública de login */}
      <Route path="/login" component={LoginRoute} />

      {/* Rutas protegidas — los permisos viven en client/src/config/permissions.ts */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} routePath="/" />}
      </Route>
      <Route path="/resultado">
        {() => <ProtectedRoute component={ResultadoView} routePath="/resultado" />}
      </Route>
      <Route path="/base-datos/spreadsheet">
        {() => <ProtectedRoute component={SpreadsheetView} routePath="/base-datos/spreadsheet" />}
      </Route>
      <Route path="/base-datos">
        {() => <ProtectedRoute component={BaseDatos} routePath="/base-datos" />}
      </Route>
      <Route path="/usuarios">
        {() => <ProtectedRoute component={Usuarios} routePath="/usuarios" />}
      </Route>
      <Route path="/auditoria">
        {() => <ProtectedRoute component={AuditLog} routePath="/auditoria" />}
      </Route>

      {/* Rutas protegidas por rol RBAC */}
      <Route path="/gestor-horarios">
        {() => <ProtectedRoute component={GestorHorarios} routePath="/gestor-horarios" />}
      </Route>

      {/* Rutas para todos los usuarios autenticados */}
      <Route path="/home">
        {() => <ProtectedRoute component={UserHome} routePath="/home" />}
      </Route>
      <Route path="/historial">
        {() => <ProtectedRoute component={Historial} routePath="/historial" />}
      </Route>
      <Route path="/nuevo-expediente">
        {() => <ProtectedRoute component={NuevoExpediente} routePath="/nuevo-expediente" />}
      </Route>
      <Route path="/expediente/:id/acta">
        {() => <ProtectedRoute component={ExpedienteActa} routePath="/expediente/:id/acta" />}
      </Route>
      <Route path="/expediente/:id/ep">
        {() => <ProtectedRoute component={ExpedienteEP} routePath="/expediente/:id/ep" />}
      </Route>
      <Route path="/expediente/:id/resultados">
        {() => <ProtectedRoute component={ExpedienteResultados} routePath="/expediente/:id/resultados" />}
      </Route>
      <Route path="/expediente/:id/implementacion">
        {() => <ProtectedRoute component={ExpedienteImplementacion} routePath="/expediente/:id/implementacion" />}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
