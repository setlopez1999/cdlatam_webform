/**
 * EasterEggOverlay — Overlay fullscreen con la animación Lottie del easter egg.
 * Se muestra al activar/desactivar el rol gestor_horarios con 5 clicks en el ícono del Dashboard.
 * La animación dura ~3 segundos (180 frames a 60fps) y luego desaparece sola.
 */
import Lottie from "lottie-react";

interface EasterEggOverlayProps {
  active: boolean;
  onComplete: () => void;
}

export function EasterEggOverlay({ active, onComplete }: EasterEggOverlayProps) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      {/* Fondo semitransparente */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Animación centrada */}
      <div className="relative w-80 h-80 md:w-96 md:h-96">
        <Lottie
          animationData={undefined}
          path="/go.json"
          loop={false}
          autoplay={true}
          onComplete={onComplete}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
