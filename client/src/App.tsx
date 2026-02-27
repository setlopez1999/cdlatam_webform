import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
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
import { useLocalAuth } from "./hooks/useLocalAuth";
import { Loader2 } from "lucide-react";

/**
 * Componente que protege rutas: redirige a /login si no hay sesión.
 * Opcionalmente restringe solo a admins.
 */
function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useLocalAuth();
  const [location] = useLocation();

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

  if (adminOnly && !isAdmin) {
    // Usuario normal intenta acceder a ruta de admin → redirigir a Inicio
    return <Redirect to="/home" />;
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

      {/* Rutas protegidas — admin ve todo */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} adminOnly />}
      </Route>
      <Route path="/resultado">
        {() => <ProtectedRoute component={ResultadoView} adminOnly />}
      </Route>
      <Route path="/base-datos">
        {() => <ProtectedRoute component={BaseDatos} adminOnly />}
      </Route>
      <Route path="/usuarios">
        {() => <ProtectedRoute component={Usuarios} adminOnly />}
      </Route>

      {/* Rutas accesibles para todos los usuarios autenticados */}
      <Route path="/home">
        {() => <ProtectedRoute component={UserHome} />}
      </Route>
      <Route path="/historial">
        {() => <ProtectedRoute component={Historial} />}
      </Route>
      <Route path="/nuevo-expediente">
        {() => <ProtectedRoute component={NuevoExpediente} />}
      </Route>
      <Route path="/expediente/:id/acta">
        {() => <ProtectedRoute component={ExpedienteActa} />}
      </Route>
      <Route path="/expediente/:id/ep">
        {() => <ProtectedRoute component={ExpedienteEP} />}
      </Route>
      <Route path="/expediente/:id/resultados">
        {() => <ProtectedRoute component={ExpedienteResultados} />}
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
