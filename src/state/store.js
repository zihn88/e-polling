/**
 * Centralized Reactive Store — menjaga state antar-menu tanpa fetch ulang yang tidak perlu.
 */
const SESSION_KEY = 'epolling_bpd_admin_session';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const store = {
  adminSession: loadSession(),
  selectedPollingId: '',
  publicBootstrap: null,

  setAdminSession(session) {
    this.adminSession = session;
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  },

  getAdminToken() {
    return this.adminSession?.token || '';
  },

  clearAdminSession() {
    this.setAdminSession(null);
  }
};
