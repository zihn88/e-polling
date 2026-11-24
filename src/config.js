/**
 * Konfigurasi Publik Frontend (ZERO SECRETS).
 * Cache TTL dibuat cukup panjang (3 menit) karena setiap aksi simpan/edit/hapus/vote
 * otomatis meng-invalidate cache terkait — sehingga perpindahan antar-menu instan (< 50 ms).
 */
export const APP_CONFIG = {
  API_URL: 'https://epolling-bpd-proxy.ujek15.workers.dev',
  REQUEST_TIMEOUT_MS: 15000,
  CACHE_TTL_MS: {
    'public.bootstrap': 60_000,
    'public.results': 30_000,
    'admin.dashboard': 180_000,
    'admin.pollings.list': 180_000,
    'admin.candidates.list': 180_000,
    'admin.votes.summary': 180_000,
    'admin.reports.get': 180_000,
    'admin.auditLogs.list': 120_000,
    'admin.settings.get': 300_000
  }
};

export function isLocalMockMode() {
  return !APP_CONFIG.API_URL;
}
