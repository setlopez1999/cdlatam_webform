/**
 * useNavGuard
 *
 * Bloquea la navegación SPA (wouter) y la salida del browser cuando hay
 * cambios sin guardar en un formulario. Cuando `when` es true:
 *   - intercepta `history.pushState`/`replaceState` (clicks de Link, navigate)
 *   - revierte `popstate` (back/forward del browser)
 *   - escucha `beforeunload` para mostrar el dialog estándar al cerrar tab/F5
 *
 * Cuando se intenta navegar, llama a `onAttempt(to)` con el path destino.
 * El componente que monta este hook decide qué hacer (mostrar modal, etc.)
 * y luego llama `confirm()` para continuar la navegación o `cancel()` para
 * abortar.
 *
 * El patch de history se instala una sola vez al montar el componente que
 * usa el hook y se desinstala al desmontarse. La decisión de bloquear o
 * dejar pasar se hace consultando `whenRef.current` en cada llamada. Esto
 * evita race conditions: cuando `when` cambia tras guardar/descartar, el
 * cleanup del effect NO corre (la dep es `[]`), así `confirm()` siempre
 * tiene acceso al `pushState` original capturado al inicio.
 *
 * Convive con wouter porque:
 *   - wouter patchea `history.pushState` antes (en el primer render del Router).
 *   - este hook captura ese `pushState` (que ya es el de wouter) y lo
 *     invoca desde `confirm()` para que la navegación llegue a wouter.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface UseNavGuardOpts {
  when: boolean;
  onAttempt?: (to: string) => void;
}

interface UseNavGuardResult {
  pendingTo: string | null;
  confirm: () => void;
  cancel: () => void;
}

function urlToPath(url: string | URL | null | undefined): string {
  if (url == null) return window.location.pathname + window.location.search;
  if (url instanceof URL) return url.pathname + url.search;
  // Strings pueden venir como "/foo", "?bar", o url absoluta
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search;
  } catch {
    return String(url);
  }
}

export function useNavGuard({ when, onAttempt }: UseNavGuardOpts): UseNavGuardResult {
  const [pendingTo, setPendingTo] = useState<string | null>(null);

  // Refs sincronizados en cada render. Evitan stale closures dentro del patch
  // que se instala una sola vez al montar.
  const whenRef = useRef(when);
  whenRef.current = when;
  const onAttemptRef = useRef<typeof onAttempt>(onAttempt);
  onAttemptRef.current = onAttempt;

  // Refs a las funciones originales de history. Se llenan al instalar el
  // patch y se restauran al desmontar.
  const origPushRef = useRef<typeof window.history.pushState | null>(null);
  const origReplaceRef = useRef<typeof window.history.replaceState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    origPushRef.current = origPush;
    origReplaceRef.current = origReplace;

    // Guarda la URL "actual" para revertir popstate
    let lastUrl = window.location.pathname + window.location.search;

    const patchedPush: typeof window.history.pushState = function (
      this: History,
      data,
      unused,
      url
    ) {
      const target = urlToPath(url ?? null);
      const current = window.location.pathname + window.location.search;
      // Misma URL: no hay navegación real, dejar pasar
      if (target === current) {
        lastUrl = target;
        return origPush.call(this, data, unused, url ?? null);
      }
      // Sin guard activo: dejar pasar
      if (!whenRef.current) {
        lastUrl = target;
        return origPush.call(this, data, unused, url ?? null);
      }
      // Con guard activo: bloquear y notificar
      setPendingTo(target);
      onAttemptRef.current?.(target);
    };

    const patchedReplace: typeof window.history.replaceState = function (
      this: History,
      data,
      unused,
      url
    ) {
      const target = urlToPath(url ?? null);
      const current = window.location.pathname + window.location.search;
      if (target === current) {
        lastUrl = target;
        return origReplace.call(this, data, unused, url ?? null);
      }
      if (!whenRef.current) {
        lastUrl = target;
        return origReplace.call(this, data, unused, url ?? null);
      }
      setPendingTo(target);
      onAttemptRef.current?.(target);
    };

    window.history.pushState = patchedPush;
    window.history.replaceState = patchedReplace;

    const handlePopstate = () => {
      const attempted = window.location.pathname + window.location.search;
      if (attempted === lastUrl) return;
      if (!whenRef.current) {
        lastUrl = attempted;
        return;
      }
      // Revertir el back/forward usando la API original
      origPush.call(window.history, null, "", lastUrl);
      setPendingTo(attempted);
      onAttemptRef.current?.(attempted);
    };
    window.addEventListener("popstate", handlePopstate);

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", handlePopstate);
      origPushRef.current = null;
      origReplaceRef.current = null;
    };
    // Dep `[]` intencional: el patch debe persistir mientras el componente
    // que usa este hook esté montado. La decisión de bloquear se consulta
    // dinámicamente vía `whenRef.current`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeunload depende de `when`: solo registramos el listener cuando hay
  // cambios pendientes para no molestar al usuario en otras navegaciones.
  useEffect(() => {
    if (!when || typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Compatibilidad con browsers viejos
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);

  const confirm = useCallback(() => {
    const to = pendingTo;
    setPendingTo(null);
    if (!to) return;
    // En este momento el patch sigue activo (sólo se desinstala al desmontar)
    // así que `origPushRef.current` apunta al `pushState` original (de wouter).
    // Si por alguna razón es null, fallback a `history.pushState` directo.
    const pushFn = origPushRef.current ?? window.history.pushState.bind(window.history);
    pushFn.call(window.history, null, "", to);
    // Algunas implementaciones de wouter escuchan popstate además del patch
    // de pushState; disparamos el evento por si acaso.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [pendingTo]);

  const cancel = useCallback(() => {
    setPendingTo(null);
  }, []);

  return { pendingTo, confirm, cancel };
}
