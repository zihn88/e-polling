/**
 * router.js — Hash-based SPA Router (100% kompatibel GitHub Pages, zero full reload).
 * Performance-First: modul Admin di-lazy-load dengan dynamic import() hanya ketika dibutuhkan.
 */
import { mountHomePage } from './pages/public/HomePage.js';
import { mountCandidatesPage } from './pages/public/CandidatesPage.js';
import { mountResultsPage } from './pages/public/ResultsPage.js';

let activeNavId = 0;

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#/, '') || '/';
  const [path] = raw.split('?');
  return path.startsWith('/') ? path : '/' + path;
}

export async function handleRoute() {
  const navId = ++activeNavId;
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const route = parseRoute();

  // Route publik
  if (route === '/' || route === '/beranda') {
    await mountHomePage(appEl);
    return;
  }
  if (route === '/kandidat') {
    await mountCandidatesPage(appEl);
    return;
  }
  if (route === '/hasil') {
    await mountResultsPage(appEl);
    return;
  }

  // Lazy-load Admin Login
  if (route === '/admin/login' || route === '/admin') {
    const { mountAdminLoginPage } = await import('./pages/admin/AdminLoginPage.js');
    if (navId !== activeNavId) return;
    mountAdminLoginPage(appEl);
    return;
  }

  // Lazy-load Admin Dashboard Shell & Views
  if (route.startsWith('/admin/')) {
    const section = route.slice('/admin/'.length);
    const { mountAdminSection } = await import('./pages/admin/AdminShell.js');
    if (navId !== activeNavId) return;
    await mountAdminSection(appEl, section);
    return;
  }

  // Fallback ke Beranda
  location.hash = '#/';
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
