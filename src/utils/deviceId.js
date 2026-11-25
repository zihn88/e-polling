/**
 * deviceId.js — Identitas Perangkat Ringan (< 5 ms, 0 library luar)
 * untuk pembatasan "1 HP/Browser = 1 Suara" + deteksi Mode Samaran (Incognito).
 *
 * - device_token: token acak persisten (localStorage + cookie) agar 1 HP tetap dikenali meski pindah Wi-Fi <-> 4G.
 * - device_fp   : sidik jari karakteristik perangkat ringan (layar, GPU/WebGL, CPU, timezone, canvas)
 *                 yang tetap konsisten saat membuka Mode Samaran / menghapus cache.
 */

const TOKEN_KEY = 'epolling_bpd_dev_tok_v1';
let cachedIdentity = null;

function readCookie(name) {
  try {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function writeCookie(name, value) {
  try {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch { /* ignore */ }
}

function getOrCreateDeviceToken() {
  let tok = '';
  try {
    if (typeof localStorage !== 'undefined') tok = localStorage.getItem(TOKEN_KEY) || '';
  } catch { /* ignore */ }

  if (!tok) tok = readCookie(TOKEN_KEY);

  if (!tok || tok.length < 16) {
    const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '')
      : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    tok = 'dev_' + rand.slice(0, 28);
  }

  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, tok);
  } catch { /* ignore */ }
  writeCookie(TOKEN_KEY, tok);
  return tok;
}

function fastHash32(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function getCanvasSignature() {
  try {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#0ea5c6';
    ctx.fillRect(4, 4, 60, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('BPD-Grogol-2026', 8, 8);
    return fastHash32(canvas.toDataURL());
  } catch {
    return '';
  }
}

function getWebglRenderer() {
  try {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  } catch {
    return '';
  }
}

function computeDeviceFingerprint() {
  if (typeof navigator === 'undefined') return 'node_test_fp';
  const scr = typeof screen !== 'undefined'
    ? `${screen.width}x${screen.height}x${screen.colorDepth || 0}`
    : '';
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const tz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
  })();

  const signals = [
    navigator.platform || '',
    navigator.language || '',
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
    navigator.maxTouchPoints || 0,
    scr,
    dpr,
    tz,
    getWebglRenderer(),
    getCanvasSignature()
  ].join('|');

  return 'fp_' + fastHash32(signals);
}

export function getDeviceIdentity() {
  if (cachedIdentity) return cachedIdentity;
  cachedIdentity = {
    device_token: getOrCreateDeviceToken(),
    device_fp: computeDeviceFingerprint()
  };
  return cachedIdentity;
}
