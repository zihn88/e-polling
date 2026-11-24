/**
 * Utility helpers: XSS escaping, date formatting, UUID, status badges, CSV export.
 */

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pollingStatusBadge(status) {
  const map = {
    DRAFT: ['Draft', 'badge-neutral'],
    SCHEDULED: ['Terjadwal', 'badge-info'],
    ACTIVE: ['Aktif / Berlangsung', 'badge-success'],
    COMPLETED: ['Selesai', 'badge-neutral'],
    CLOSED: ['Ditutup Admin', 'badge-danger']
  };
  const [label, cls] = map[status] || [status || '-', 'badge-neutral'];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export function visibilityLabel(vis) {
  const map = {
    HIDDEN: 'Tersembunyi',
    LIVE: 'Tampil Selama Polling',
    AFTER_END: 'Tampil Setelah Selesai'
  };
  return map[vis] || vis || '-';
}

export function downloadCsv(filename, headers, rows) {
  const escapeCsv = (val) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.map(escapeCsv).join(',')]
    .concat(rows.map((r) => r.map(escapeCsv).join(',')))
    .join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
