/**
 * Konfigurasi Publik Frontend (ZERO SECRETS).
 * Isi API_URL dengan URL Cloudflare Worker Proxy Anda setelah deployment.
 * Jika API_URL kosong, aplikasi otomatis berjalan pada Local Simulation Mode
 * agar dapat langsung diuji secara fungsional, keamanan, dan performa di lokal.
 */
export const APP_CONFIG = {
  API_URL: '', // https://epolling-bpd-proxy.ujek15.workers.dev/'
  REQUEST_TIMEOUT_MS: 12000,
  CACHE_TTL_MS: {
    'public.bootstrap': 30_000,
    'public.results': 15_000,
    'admin.dashboard': 15_000,
    'admin.pollings.list': 30_000,
    'admin.candidates.list': 30_000,
    'admin.settings.get': 60_000
  }
};

export function isLocalMockMode() {
  return !APP_CONFIG.API_URL;
}
