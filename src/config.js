/**
 * Config.gs — Konstanta skema database, TTL cache, dan konfigurasi aman via ScriptProperties.
 * Rahasia (APP_SECRET, PROXY_HMAC_SECRET, SPREADSHEET_ID, DRIVE_FOLDER_ID)
 * WAJIB disimpan di PropertiesService.getScriptProperties(), BUKAN di source code.
 */

var SHEETS = {
  SETTINGS: 'SETTINGS',
  ADMINS: 'ADMINS',
  POLLING: 'POLLING',
  CANDIDATES: 'CANDIDATES',
  VOTE_RESTRICTIONS: 'VOTE_RESTRICTIONS',
  VOTES: 'VOTES',
  AUDIT_LOGS: 'AUDIT_LOGS'
};

var SHEET_HEADERS = {
  SETTINGS: ['setting_id', 'setting_key', 'setting_value', 'updated_at'],
  ADMINS: ['admin_id', 'username', 'password_hash', 'role', 'status', 'created_at', 'updated_at'],
  POLLING: ['polling_id', 'title', 'village_name', 'description', 'start_at', 'end_at', 'status', 'result_visibility', 'created_at', 'updated_at'],
  CANDIDATES: ['candidate_id', 'polling_id', 'candidate_number', 'candidate_name', 'photo_file_id', 'profile', 'vision', 'mission', 'status', 'created_at', 'updated_at'],
  VOTE_RESTRICTIONS: ['restriction_id', 'polling_id', 'voter_key_hash', 'created_at', 'status'],
  VOTES: ['vote_id', 'polling_id', 'candidate_id', 'transaction_id', 'created_at', 'status'],
  AUDIT_LOGS: ['log_id', 'admin_id', 'action', 'target_type', 'target_id', 'description', 'created_at']
};

var CACHE_TTL = {
  SETTINGS: 600,        // 10 menit
  ADMINS: 300,          // 5 menit
  PUBLIC_BOOTSTRAP: 60, // 1 menit
  PUBLIC_RESULTS: 20,   // 20 detik
  DASHBOARD: 15         // 15 detik
};

var LIMITS = {
  MAX_PHOTO_BYTES: 2 * 1024 * 1024, // 2 MB
  ALLOWED_PHOTO_MIMES: ['image/jpeg', 'image/png', 'image/webp'],
  SESSION_TTL_SECONDS: 8 * 3600,    // 8 jam
  PROXY_MAX_SKEW_SECONDS: 300,      // 5 menit
  LOCK_TIMEOUT_MS: 10000            // 10 detik
};

var POLLING_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CLOSED'];
var RESULT_VISIBILITIES = ['HIDDEN', 'LIVE', 'AFTER_END'];

function getAppConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: (props.getProperty('SPREADSHEET_ID') || '').trim(),
    driveFolderId: (props.getProperty('DRIVE_FOLDER_ID') || '').trim(),
    appSecret: (props.getProperty('APP_SECRET') || '').trim(),
    proxyHmacSecret: (props.getProperty('PROXY_HMAC_SECRET') || '').trim(),
    requireProxySignature: (props.getProperty('REQUIRE_PROXY_SIGNATURE') || 'true').trim() === 'true'
  };
}

function nowIso_() {
  return new Date().toISOString();
}

function generateId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}
