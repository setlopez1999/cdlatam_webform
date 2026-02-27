import { useState } from "react";
import { useLocation } from "wouter";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, isLoggingIn } = useLocalAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas.");
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#0A1628" }}>

      {/* ── Panel izquierdo: Branding ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D1F35 0%, #0A1628 60%, #061020 100%)" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #00E5CC, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #00E5CC, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.03]"
          style={{ border: "1px solid #00E5CC" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ border: "1px solid #00E5CC" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png"
            alt="CDLatam"
            className="h-10 w-auto"
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              Plataforma de<br />
              <span style={{ color: "#00E5CC" }}>Gestión Administrativa</span>
            </h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              Sistema centralizado para la gestión de Actas de Aceptación, Evaluaciones de Proyectos y análisis de resultados financieros.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Formularios interconectados en tiempo real",
              "Auto-cálculo de resultados y distribución",
              "Exportación PDF con membrete profesional",
              "Base de datos de catálogos integrada",
            ].map(feature => (
              <div key={feature} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,229,204,0.15)" }}
                >
                  <CheckCircle2 className="w-3 h-3" style={{ color: "#00E5CC" }} />
                </div>
                <span className="text-white/50 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/20 text-xs">
            Transformación Digital en Latinoamérica
          </p>
        </div>
      </div>

      {/* ── Panel derecho: Formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png"
            alt="CDLatam"
            className="h-9 w-auto mx-auto"
          />
        </div>

        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Bienvenido</h2>
            <p className="text-white/40 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/60 text-xs font-medium uppercase tracking-wider">
                Usuario
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={isLoggingIn}
                  className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = "1px solid rgba(0,229,204,0.4)";
                    e.currentTarget.style.background = "rgba(0,229,204,0.04)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/60 text-xs font-medium uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoggingIn}
                  className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = "1px solid rgba(0,229,204,0.4)";
                    e.currentTarget.style.background = "rgba(0,229,204,0.04)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn || !username || !password}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isLoggingIn || !username || !password
                  ? "rgba(0,229,204,0.3)"
                  : "linear-gradient(135deg, #00E5CC, #00BFA5)",
                color: "#0A1628",
              }}
            >
              {isLoggingIn ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</>
              ) : (
                <>Ingresar al sistema <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 text-center mb-3">
              Acceso de prueba
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillCredentials("admin", "1234")}
                className="text-left p-3 rounded-xl transition-all cursor-pointer"
                style={{
                  background: "rgba(0,229,204,0.06)",
                  border: "1px solid rgba(0,229,204,0.15)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,229,204,0.12)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,204,0.3)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,229,204,0.06)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,204,0.15)";
                }}
              >
                <p className="text-[10px] font-bold mb-1" style={{ color: "#00E5CC" }}>Administrador</p>
                <p className="text-xs text-white/40 font-mono">admin / 1234</p>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("usuario", "5678")}
                className="text-left p-3 rounded-xl transition-all cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.15)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.07)";
                }}
              >
                <p className="text-[10px] font-bold text-white/40 mb-1">Usuario</p>
                <p className="text-xs text-white/30 font-mono">usuario / 5678</p>
              </button>
            </div>
            <p className="text-[10px] text-white/15 text-center mt-3">
              Haz clic en una credencial para autocompletar
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-[10px] text-white/15">
          CDLatam © {new Date().getFullYear()} · Transformación Digital en Latinoamérica
        </p>
      </div>
    </div>
  );
}
