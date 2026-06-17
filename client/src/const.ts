export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirige al login local (autenticación username/password)
// window.location.href es absoluto — necesita el base path completo
export const getLoginUrl = () => {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/login`;
};
