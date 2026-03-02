import { useState } from "react";
import { useLocation } from "wouter";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, User, ShieldCheck, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, isLoggingIn } = useLocalAuth();
  const [, navigate] = useLocation();

  // ... dentro de Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log("Intentando iniciar sesión con:", username); // <--- LOG 1

    try {
      await login(username.trim(), password);
      console.log("Login exitoso, navegando..."); // <--- LOG 2
      navigate("/");
    } catch (err: unknown) {
      console.error("Error en login:", err); // <--- LOG 3
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión. Intente nuevamente."
      );
    }
  };

  // Cambiamos handleSubmit por una función de acción directa
  const handleLoginAction = async () => {
    setError(null);
    console.log("Acción de login iniciada"); // Log para verificar

    try {
      await login(username.trim(), password);
      console.log("Login exitoso"); // Log para verificar
      navigate("/");
    } catch (err: unknown) {
      console.error("Error en login:", err);
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02em0xMiAwaDZ2NmgtNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Gestión Administrativa
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sistema de Documentos Empresariales
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-700/50 bg-slate-800/80 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Iniciar Sesión</h2>
              <p className="text-slate-400 text-sm">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-sm font-medium">
                  Usuario
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                    autoComplete="username"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                    autoComplete="current-password"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"

                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 transition-all duration-200 mt-2"
                disabled={isLoggingIn || !username || !password}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ingresar al Sistema"
                )}
              </Button>
            </form>

            {/* Divider + credentials hint */}
            <div className="mt-6 pt-5 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center mb-3">
                Credenciales de acceso
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-700/40 border border-slate-600/40 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-medium text-slate-300">Administrador</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Usuario: <span className="text-slate-300 font-mono">admin</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Contraseña: <span className="text-slate-300 font-mono">1234</span>
                  </p>
                </div>
                <div className="rounded-lg bg-slate-700/40 border border-slate-600/40 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-medium text-slate-300">Usuario</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Usuario: <span className="text-slate-300 font-mono">usuario</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Contraseña: <span className="text-slate-300 font-mono">5678</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Sistema de Gestión Administrativa © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
