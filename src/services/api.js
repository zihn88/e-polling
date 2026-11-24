/**
 * Centralized API Service — Performance-First:
 * - In-flight Request Deduplication (mencegah request duplikat paralel).
 * - In-memory Cache dengan TTL per action (pindah menu instan tanpa request ulang).
 * - Selective Cache Invalidation ketika data berubah.
 * - Timeout protection & pesan error ramah pengguna.
 * - Telemetry bawaan untuk Audit Performa.
 */
import { APP_CONFIG, isLocalMockMode } from '../config.js';
import { store } from '../state/store.js';
import { executeMockAction } from './mockAdapter.js';

const responseCache = new Map(); // cacheKey -> { expiresAt, value }
const inFlightRequests = new Map(); // cacheKey -> Promise

const telemetry = {
  totalCalls: 0,
  networkCalls: 0,
  cacheHits: 0,
  dedupedCalls: 0,
  history: []
};

function makeCacheKey(action, payload) {
  return `${action}::${JSON.stringify(payload || {})}`;
}

export function hasFreshCache(action, payload = {}) {
  const entry = responseCache.get(makeCacheKey(action, payload));
  return Boolean(entry && entry.expiresAt > Date.now());
}

export function seedCache(action, payload, data) {
  const ttl = APP_CONFIG.CACHE_TTL_MS[action] || 0;
  if (ttl <= 0) return;
  responseCache.set(makeCacheKey(action, payload), {
    expiresAt: Date.now() + ttl,
    value: { ok: true, code: 'SUCCESS', message: 'OK', data, meta: { cached: true } }
  });
}

export function invalidateCache(prefixes = []) {
  if (!prefixes || prefixes.length === 0) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      responseCache.delete(key);
    }
  }
}

export function getApiTelemetry() {
  return {
    ...telemetry,
    cacheSize: responseCache.size
  };
}

export function resetApiTelemetry() {
  telemetry.totalCalls = 0;
  telemetry.networkCalls = 0;
  telemetry.cacheHits = 0;
  telemetry.dedupedCalls = 0;
  telemetry.history = [];
}

/**
 * Memanggil endpoint API dengan deduplikasi & cache otomatis.
 */
export async function apiCall(action, payload = {}, options = {}) {
  const { forceRefresh = false, requiresAuth = action.startsWith('admin.') && action !== 'admin.login' } = options;
  const startMs = performance.now();
  telemetry.totalCalls++;

  const ttl = APP_CONFIG.CACHE_TTL_MS[action] || 0;
  const cacheKey = makeCacheKey(action, payload);

  // 1. Cek cache memori jika bukan mutasi & tidak forceRefresh
  if (ttl > 0 && !forceRefresh) {
    const entry = responseCache.get(cacheKey);
    if (entry && entry.expiresAt > Date.now()) {
      telemetry.cacheHits++;
      telemetry.history.push({ action, source: 'cache', ms: Math.round((performance.now() - startMs) * 100) / 100 });
      return entry.value;
    }
  }

  // 2. Deduplikasi in-flight request untuk read action identik
  if (ttl > 0 && inFlightRequests.has(cacheKey)) {
    telemetry.dedupedCalls++;
    return inFlightRequests.get(cacheKey);
  }

  const token = requiresAuth ? store.getAdminToken() : '';

  const execPromise = (async () => {
    telemetry.networkCalls++;
    let res;

    if (isLocalMockMode()) {
      res = await executeMockAction(action, payload, token, options);
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), APP_CONFIG.REQUEST_TIMEOUT_MS);
      try {
        const httpRes = await fetch(APP_CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload, token }),
          signal: controller.signal
        });
        res = await httpRes.json();
      } catch (err) {
        if (err && err.name === 'AbortError') {
          res = { ok: false, code: 'TIMEOUT', message: 'Koneksi atau server belum merespons. Silakan coba lagi.', data: null };
        } else {
          res = { ok: false, code: 'NETWORK_ERROR', message: 'Koneksi atau server belum merespons. Periksa jaringan Anda.', data: null };
        }
      } finally {
        clearTimeout(timer);
      }
    }

    const elapsed = Math.round((performance.now() - startMs) * 100) / 100;
    telemetry.history.push({ action, source: isLocalMockMode() ? 'local-mock' : 'network', ms: elapsed, ok: res.ok });

    // Jika sesi admin berakhir, bersihkan session agar diarahkan ke login
    if (!res.ok && (res.code === 'UNAUTHORIZED' || res.code === 'SESSION_EXPIRED') && requiresAuth) {
      store.clearAdminSession();
    }

    // Simpan ke cache jika sukses & punya TTL
    if (res.ok && ttl > 0) {
      responseCache.set(cacheKey, { expiresAt: Date.now() + ttl, value: res });
    }

    // Selective cache invalidation setelah mutasi sukses
    if (res.ok) {
      if (action === 'public.vote') invalidateCache(['public.bootstrap', 'public.results', 'admin.dashboard', 'admin.votes']);
      if (action.startsWith('admin.candidates.')) invalidateCache(['admin.candidates', 'admin.dashboard', 'public.bootstrap', 'public.results']);
      if (action.startsWith('admin.pollings.')) invalidateCache(['admin.pollings', 'admin.dashboard', 'public.bootstrap', 'public.results']);
      if (action === 'admin.settings.save') invalidateCache(['admin.settings', 'public.bootstrap']);
      if (action === 'admin.votes.void') invalidateCache(['admin.votes', 'admin.dashboard', 'public.results']);
    }

    return res;
  })();

  if (ttl > 0) {
    inFlightRequests.set(cacheKey, execPromise);
    execPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return execPromise;
}
