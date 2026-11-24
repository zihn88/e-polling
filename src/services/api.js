/**
 * Centralized API Service — Performance-First (Sat-Set Navigation):
 * - In-memory + sessionStorage Cache dengan TTL (bertahan antar-menu & refresh).
 * - In-flight Request Deduplication (0 request duplikat paralel).
 * - Selective Cache Invalidation saat ada mutasi data.
 * - Background Prefetch non-blocking agar pindah menu terasa < 15 ms (instan).
 */
import { APP_CONFIG, isLocalMockMode } from '../config.js';
import { store } from '../state/store.js';
import { executeMockAction } from './mockAdapter.js';

const CACHE_STORAGE_PREFIX = 'epbpd_cache_v1::';
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

function readPersistedCache(cacheKey) {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(CACHE_STORAGE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiresAt > Date.now()) {
      responseCache.set(cacheKey, parsed);
      return parsed;
    }
    sessionStorage.removeItem(CACHE_STORAGE_PREFIX + cacheKey);
  } catch { /* ignore storage quota errors */ }
  return null;
}

function writePersistedCache(cacheKey, entry) {
  responseCache.set(cacheKey, entry);
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(CACHE_STORAGE_PREFIX + cacheKey, JSON.stringify(entry));
  } catch { /* ignore storage quota errors */ }
}

export function hasFreshCache(action, payload = {}) {
  const key = makeCacheKey(action, payload);
  const mem = responseCache.get(key);
  if (mem && mem.expiresAt > Date.now()) return true;
  return Boolean(readPersistedCache(key));
}

export function seedCache(action, payload, data) {
  const ttl = APP_CONFIG.CACHE_TTL_MS[action] || 0;
  if (ttl <= 0) return;
  writePersistedCache(makeCacheKey(action, payload), {
    expiresAt: Date.now() + ttl,
    value: { ok: true, code: 'SUCCESS', message: 'OK', data, meta: { cached: true } }
  });
}

export function invalidateCache(prefixes = []) {
  if (!prefixes || prefixes.length === 0) {
    responseCache.clear();
    try {
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith(CACHE_STORAGE_PREFIX)) sessionStorage.removeItem(k);
        });
      }
    } catch { /* ignore */ }
    return;
  }
  for (const key of responseCache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      responseCache.delete(key);
    }
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((k) => {
        if (!k.startsWith(CACHE_STORAGE_PREFIX)) return;
        const inner = k.slice(CACHE_STORAGE_PREFIX.length);
        if (prefixes.some((p) => inner.startsWith(p))) sessionStorage.removeItem(k);
      });
    }
  } catch { /* ignore */ }
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
 * Prefetch diam-diam di background (tidak memblokir UI, tidak memanggil ulang jika sudah di cache).
 */
export function prefetchInBackground(tasks = []) {
  setTimeout(() => {
    for (const [action, payload] of tasks) {
      if (!hasFreshCache(action, payload || {})) {
        apiCall(action, payload || {}).catch(() => {});
      }
    }
  }, 50);
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

  // 1. Cek cache memori / sessionStorage jika bukan mutasi & tidak forceRefresh
  if (ttl > 0 && !forceRefresh) {
    const entry = responseCache.get(cacheKey) || readPersistedCache(cacheKey);
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

    if (!res.ok && (res.code === 'UNAUTHORIZED' || res.code === 'SESSION_EXPIRED') && requiresAuth) {
      store.clearAdminSession();
    }

    // Simpan ke cache memori + sessionStorage jika sukses & punya TTL
    if (res.ok && ttl > 0) {
      writePersistedCache(cacheKey, { expiresAt: Date.now() + ttl, value: res });
    }

    // Selective cache invalidation setelah mutasi sukses
    if (res.ok) {
      if (action === 'public.vote') invalidateCache(['public.bootstrap', 'public.results', 'admin.dashboard', 'admin.votes', 'admin.reports']);
      if (action.startsWith('admin.candidates.') && action !== 'admin.candidates.list') {
        invalidateCache(['admin.candidates', 'admin.dashboard', 'admin.reports', 'public.bootstrap', 'public.results']);
      }
      if (action.startsWith('admin.pollings.') && action !== 'admin.pollings.list') {
        invalidateCache(['admin.pollings', 'admin.dashboard', 'admin.reports', 'public.bootstrap', 'public.results']);
      }
      if (action === 'admin.settings.save') invalidateCache(['admin.settings', 'public.bootstrap']);
      if (action === 'admin.votes.void') invalidateCache(['admin.votes', 'admin.dashboard', 'admin.reports', 'public.results', 'admin.auditLogs']);
    }

    return res;
  })();

  if (ttl > 0) {
    inFlightRequests.set(cacheKey, execPromise);
    execPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return execPromise;
}
