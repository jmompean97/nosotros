/**
 * keepalive.js
 * Hace un ping ligero a Supabase cada 4 días para evitar que el proyecto
 * entre en pausa por inactividad (plan gratuito).
 */
const SupabaseKeepAlive = (() => {
  const STORAGE_KEY = 'nosotros_supabase_ping';
  const INTERVAL_MS = 4 * 24 * 60 * 60 * 1000; // 4 días en ms

  async function _ping() {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;

    try {
      await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/health`);
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // silencioso — si falla, simplemente lo intentará en la próxima visita
    }
  }

  function init() {
    // Solo si Supabase está configurado
    if (!CONFIG?.SUPABASE_URL || !CONFIG?.SUPABASE_KEY) return;

    const lastPing = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const now = Date.now();

    // Lanzar ping si han pasado más de 4 días (o nunca se ha hecho)
    if (now - lastPing >= INTERVAL_MS) {
      _ping();
    }

    // Programar el siguiente ping en el tiempo que reste hasta los 4 días
    const nextPingIn = Math.max(0, INTERVAL_MS - (now - lastPing));
    setTimeout(() => {
      _ping();
      // A partir de aquí, repetir cada 4 días mientras la pestaña esté abierta
      setInterval(_ping, INTERVAL_MS);
    }, nextPingIn);
  }

  return { init };
})();
