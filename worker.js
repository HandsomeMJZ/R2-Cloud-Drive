/**
 * R2 Cloud Drive - Cloudflare Worker
 * Material Design Style
 * By HandsomeMJZ
 * ============================================
 * 配置说明 (Configuration)
 * ============================================
 *
 * 1. R2 存储桶 (必须)
 *    在 wrangler.toml 中绑定 R2 存储桶:
 *    [[r2_buckets]]
 *    binding = "R2_BUCKET"
 *    bucket_name = "your-bucket-name"
 *
 * 2. D1 数据库 (必须 - 用于文件路径映射和上传会话)
 *    在 wrangler.toml 中绑定 D1:
 *    [[d1_databases]]
 *    binding = "DB"
 *    database_name = "your-db-name"
 *    database_id = "your-database-id"
 *
 * 3. 访问密码 (可选 - 不设置则为公开访问)
 *    在 Worker 环境变量中设置:
 *    ACCESS_PASSWORD = "your-password"
 *
 * 4. 站点标题 (可选)
 *    SITE_TITLE = "My Cloud Drive"
 *
 * 5. 云盘图标 (可选 - 图片链接)
 *    CLOUD_ICON_URL = "https://example.com/icon.png"
 *
 * 6. 登录页背景图 (可选 - 图片链接，不设置则为淡灰色)
 *    LOGIN_BACKGROUND_URL = "https://example.com/login-bg.jpg"
 *
 * 7. 存储节点密钥 (可选 - 节点 Worker 接收分片时使用)
 *    STORAGE_NODE_TOKEN = "your-node-token"
 */

const MIME_TYPES = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
  // Videos
  mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', avi: 'video/x-msvideo',
  mov: 'video/quicktime', mkv: 'video/x-matroska',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
  m4a: 'audio/mp4', opus: 'audio/opus',
  // Documents
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
  html: 'text/html', css: 'text/css', js: 'text/javascript',
  json: 'application/json', xml: 'application/xml',
  // Archives
  zip: 'application/zip', tar: 'application/x-tar', gz: 'application/gzip',
  rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
};

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'opus'];
  const docExts = ['pdf', 'doc', 'docx'];
  const sheetExts = ['xls', 'xlsx', 'csv'];
  const slideExts = ['ppt', 'pptx'];
  const codeExts = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yaml', 'yml'];
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z'];
  const textExts = ['txt', 'md', 'log'];

  if (imageExts.includes(ext)) return { icon: 'image', color: '#34A853' };
  if (videoExts.includes(ext)) return { icon: 'movie', color: '#EA4335' };
  if (audioExts.includes(ext)) return { icon: 'audio_file', color: '#FBBC04' };
  if (docExts.includes(ext)) return { icon: 'description', color: '#4285F4' };
  if (sheetExts.includes(ext)) return { icon: 'table_chart', color: '#34A853' };
  if (slideExts.includes(ext)) return { icon: 'slideshow', color: '#FF6D00' };
  if (codeExts.includes(ext)) return { icon: 'code', color: '#9C27B0' };
  if (archiveExts.includes(ext)) return { icon: 'folder_zip', color: '#795548' };
  if (textExts.includes(ext)) return { icon: 'article', color: '#607D8B' };
  return { icon: 'insert_drive_file', color: '#5F6368' };
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });
}

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value = '') {
  return escapeAttr(value);
}

function jsString(value = '') {
  return JSON.stringify(String(value ?? ''));
}

function jsAttr(source = '') {
  return escapeAttr(source);
}

function renderLogoIcon(iconUrl = '', fallbackIcon = 'cloud') {
  const url = String(iconUrl || '').trim();
  if (url) {
    return `<div class="logo-icon logo-icon-custom"><img src="${escapeAttr(url)}" alt=""></div>`;
  }
  return `<div class="logo-icon"><span class="material-icons-round">${fallbackIcon}</span></div>`;
}

function renderHTML(content, title = 'R2 云盘') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link href="https://cdn.jsdelivr.net/npm/material-icons@1.13.12/iconfont/round.css" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
    --primary: #1A73E8;
    --primary-light: #E8F0FE;
    --primary-dark: #1557B0;
    --surface: #FFFFFF;
    --background: #F8F9FA;
    --on-surface: #202124;
    --on-surface-variant: #5F6368;
    --outline: #DADCE0;
    --error: #D93025;
    --success: #1E8E3E;
    --warning: #F29900;
    --shadow-1: 0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    --shadow-2: 0 1px 3px rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15);
    --shadow-3: 0 4px 8px 3px rgba(60,64,67,.15), 0 1px 3px rgba(60,64,67,.3);
    --radius-s: 4px;
    --radius-m: 8px;
    --radius-l: 16px;
    --radius-xl: 28px;
    --font-display: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    --font-body: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif;
  }

  /* ── Dark Mode ── */
  [data-theme="dark"] {
    --primary: #8AB4F8;
    --primary-light: #1A2332;
    --primary-dark: #C6DAFC;
    --surface: #1E1E1E;
    --background: #121212;
    --on-surface: #E8EAED;
    --on-surface-variant: #9AA0A6;
    --outline: #3C4043;
    --error: #F28B82;
    --success: #81C995;
    --warning: #FDD663;
    --shadow-1: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
    --shadow-2: 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15);
    --shadow-3: 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3);
  }
  [data-theme="dark"] .snackbar { background: #3C4043; color: #E8EAED; }
  [data-theme="dark"] .snackbar-action { color: #8AB4F8; }
  [data-theme="dark"] .selection-bar { background: #1A2332; color: #8AB4F8; }
  [data-theme="dark"] .selection-bar .icon-btn { color: #8AB4F8; }
  [data-theme="dark"] .login-card { background: #1E1E1E; }
  [data-theme="dark"] .file-card-icon[style*="FFF8E1"] { background: #3C2E00 !important; }

  html, body { height: 100vh; overflow: hidden; }
  body {
    font-family: var(--font-body);
    background: var(--background);
    color: var(--on-surface);
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Top App Bar ── */
  .app-bar {
    z-index: 100;
    height: 64px;
    background: var(--surface);
    border-bottom: 1px solid var(--outline);
    display: flex; align-items: center;
    padding: 0 24px; gap: 16px;
    box-shadow: var(--shadow-1);
  }
  .app-bar-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: inherit;
  }
  .logo-icon {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, #FFB74D 0%, #FB8C00 100%);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 20px;
    overflow: hidden; flex-shrink: 0;
  }
  /* Material Icons Round：jsDelivr CDN 提供 @font-face 和基础样式，此处增强对齐和尺寸稳定性 */
  .material-icons-round {
    font-family: "Material Icons Round";
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    flex-shrink: 0;
    vertical-align: middle;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "liga";
  }
  .logo-icon .material-icons-round { font-size: inherit; }
  .logo-icon-custom { background: transparent; }
  .logo-icon-custom img {
    width: 100%; height: 100%;
    display: block; object-fit: cover;
  }
  .app-bar-title {
    font-family: var(--font-display);
    font-size: 22px; font-weight: 400;
    color: var(--on-surface);
  }
  .app-bar-spacer { flex: 1; }
  .app-bar-actions { display: flex; align-items: center; gap: 8px; }

  /* ── Icon Button ── */
  .icon-btn {
    width: 40px; height: 40px;
    border: none; background: transparent; cursor: pointer;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--on-surface-variant);
    transition: background .2s;
    position: relative;
  }
  .icon-btn:hover { background: rgba(60,64,67,.08); }
  .icon-btn:active { background: rgba(60,64,67,.12); }
  .icon-btn .material-icons-round { font-size: 20px; }

  .theme-ripple {
    position: fixed; left: 0; top: 0; z-index: 10000;
    width: 1px; height: 1px; border-radius: 50%;
    pointer-events: none; transform: translate(-50%, -50%) scale(0);
    transition: transform .55s cubic-bezier(.4, 0, .2, 1);
    will-change: transform;
  }
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
  }

  /* ── Layout ── */
  .layout { display: flex; flex: 1; min-height: 0; }

  /* ── Sidebar ── */
  .sidebar {
    width: 256px; flex-shrink: 0;
    background: var(--surface);
    padding: 8px 0;
    border-right: 1px solid var(--outline);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar-section { padding: 8px 0; }
  .sidebar-label {
    font-family: var(--font-display);
    font-size: 11px; font-weight: 500;
    color: var(--on-surface-variant);
    letter-spacing: .8px; text-transform: uppercase;
    padding: 8px 16px 4px;
  }
  .sidebar-item {
    display: flex; align-items: center; gap: 12px;
    padding: 0 16px; height: 40px; cursor: pointer;
    border-radius: var(--radius-xl); margin: 2px 8px;
    border: none; background: transparent;
    color: var(--on-surface-variant);
    transition: background .15s;
    text-decoration: none; font-size: 14px;
    font-family: var(--font-body); font-weight: 500;
    width: calc(100% - 16px); text-align: left;
  }
  .sidebar-item:hover { background: rgba(60,64,67,.08); }
  .sidebar-item.active {
    background: var(--primary-light);
    color: var(--primary-dark);
    font-weight: 700;
  }
  .sidebar-item.active .material-icons-round { color: var(--primary); }
  .sidebar-item .material-icons-round { font-size: 20px; }
  .sidebar-divider { height: 1px; background: var(--outline); margin: 8px 16px; }

  /* ── Main Content ── */
  .main { flex: 1; padding: 24px 32px; overflow-x: hidden; overflow-y: auto; min-height: 0; }

  /* ── Breadcrumb ── */
  .breadcrumb {
    display: flex; align-items: center; gap: 4px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .breadcrumb-item {
    display: flex; align-items: center; gap: 4px;
    font-family: var(--font-display); font-size: 14px;
  }
  .breadcrumb-link {
    color: var(--on-surface-variant); text-decoration: none;
    padding: 4px 8px; border-radius: var(--radius-s);
    transition: background .15s;
  }
  .breadcrumb-link:hover { background: rgba(60,64,67,.08); color: var(--on-surface); }
  .breadcrumb-current { color: var(--on-surface); font-weight: 500; padding: 4px 8px; }
  .breadcrumb-sep { color: var(--on-surface-variant); font-size: 18px; }

  /* ── Toolbar ── */
  .toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 16px; flex-wrap: wrap;
  }
  .toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

  /* ── FAB ── */
  .fab {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--primary); color: white;
    border: none; border-radius: var(--radius-xl);
    padding: 0 24px; height: 48px; cursor: pointer;
    font-family: var(--font-display); font-size: 14px; font-weight: 500;
    box-shadow: var(--shadow-2); transition: box-shadow .2s, background .2s;
    letter-spacing: .25px;
  }
  .fab:hover { background: var(--primary-dark); box-shadow: var(--shadow-3); }
  .fab .material-icons-round { font-size: 18px; }

  /* ── Outlined Button ── */
  .btn-outlined {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: var(--primary);
    border: 1px solid var(--outline); border-radius: var(--radius-xl);
    padding: 0 20px; height: 40px; cursor: pointer;
    font-family: var(--font-display); font-size: 14px; font-weight: 500;
    transition: background .15s, border-color .15s;
  }
  .btn-outlined:hover { background: var(--primary-light); border-color: var(--primary); }
  .btn-outlined .material-icons-round { font-size: 18px; }

  /* ── File Grid ── */
  .file-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 32px;
  }
  .file-card {
    background: var(--surface);
    border: 1px solid var(--outline);
    border-radius: var(--radius-m);
    padding: 12px;
    cursor: pointer;
    transition: box-shadow .15s, border-color .15s;
    display: flex; flex-direction: column; gap: 8px;
    position: relative; user-select: none;
  }
  .file-card:hover { box-shadow: var(--shadow-2); border-color: transparent; }
  .file-card.selected { border-color: var(--primary); background: var(--primary-light); }
  .file-card-icon {
    width: 48px; height: 48px;
    border-radius: var(--radius-s);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
  }
  .file-card-name {
    font-size: 13px; font-weight: 500;
    color: var(--on-surface);
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    line-height: 1.4;
  }
  .file-card-meta {
    font-size: 11px; color: var(--on-surface-variant);
    display: flex; flex-direction: column; gap: 2px;
  }
  .file-card-actions {
    position: absolute; top: 8px; right: 8px;
    opacity: 0; transition: opacity .15s;
  }
  .file-card:hover .file-card-actions { opacity: 1; }

  /* ── File List (Table) ── */
  .file-list { width: 100%; border-collapse: collapse; }
  .file-list th {
    text-align: left; padding: 8px 12px;
    font-size: 12px; font-weight: 500;
    color: var(--on-surface-variant);
    border-bottom: 1px solid var(--outline);
    white-space: nowrap; cursor: pointer; user-select: none;
  }
  .file-list th:hover { color: var(--on-surface); }
  .file-list th .th-inner { display: flex; align-items: center; gap: 4px; }
  .file-list td { padding: 6px 12px; border-bottom: 1px solid var(--outline); }
  .file-list tr:hover td { background: rgba(60,64,67,.04); }
  .file-list tr.selected td { background: var(--primary-light); }
  .file-row-icon { display: flex; align-items: center; gap: 12px; }
  .file-row-name {
    font-size: 14px; color: var(--on-surface); cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;
  }
  .file-row-name:hover { color: var(--primary); text-decoration: underline; }
  .file-row-meta { font-size: 13px; color: var(--on-surface-variant); white-space: nowrap; }
  .file-row-actions { opacity: 0; display: flex; gap: 4px; }
  tr:hover .file-row-actions { opacity: 1; }

  /* ── Empty State ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 80px 0; gap: 16px;
    color: var(--on-surface-variant);
  }
  .empty-state > .material-icons-round { font-size: 80px; opacity: .4; color: var(--primary); }
  .empty-state h3 { font-family: var(--font-display); font-size: 20px; font-weight: 400; }
  .empty-state p { font-size: 14px; text-align: center; max-width: 300px; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.6);
    display: flex; align-items: center; justify-content: center;
    padding: 24px; opacity: 0; pointer-events: none;
    transition: opacity .2s;
  }
  .modal-overlay.open { opacity: 1; pointer-events: all; }
  .modal {
    background: var(--surface); border-radius: var(--radius-l);
    width: 100%; max-width: 480px;
    box-shadow: var(--shadow-3);
    transform: translateY(20px) scale(.97);
    transition: transform .2s;
    overflow: hidden;
  }
  .modal-overlay.open .modal { transform: none; }
  .modal-header {
    padding: 24px 24px 16px;
    display: flex; align-items: center; gap: 12px;
  }
  .modal-title { font-family: var(--font-display); font-size: 20px; font-weight: 400; }
  .modal-body { padding: 0 24px 16px; }
  .modal-footer {
    padding: 8px 16px 16px;
    display: flex; justify-content: flex-end; gap: 8px;
  }
  .share-summary {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; margin-bottom: 16px;
    border: 1px solid var(--outline); border-radius: var(--radius-m);
    background: rgba(60,64,67,.04);
  }
  .share-summary .material-icons-round { color: var(--primary); }
  .share-summary-main { min-width: 0; flex: 1; }
  .share-summary-label { font-size: 12px; color: var(--on-surface-variant); margin-bottom: 2px; }
  .share-summary-path { font-size: 14px; color: var(--on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .share-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .share-form-grid .full { grid-column: 1 / -1; }
  .share-hint { font-size: 12px; color: var(--on-surface-variant); margin-top: 6px; line-height: 1.45; }
  .share-result {
    display: none; margin-top: 16px; padding: 12px;
    border: 1px solid var(--outline); border-radius: var(--radius-m);
    background: var(--primary-light);
  }
  .share-result.open { display: block; }
  .share-link-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
  .share-link-row .text-field { flex: 1; min-width: 0; }
  .share-records {
    margin-top: 18px; border-top: 1px solid var(--outline);
    padding-top: 14px; display: flex; flex-direction: column; gap: 8px;
    max-height: 260px; overflow-y: auto;
  }
  .share-record-row {
    border: 1px solid var(--outline); border-radius: var(--radius-m);
    padding: 10px 12px; background: var(--surface);
  }
  .share-record-row.editing { border-color: var(--primary); background: var(--primary-light); }
  .share-record-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .share-record-url {
    flex: 1; min-width: 0; font-size: 13px; color: var(--primary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .share-record-meta { font-size: 12px; color: var(--on-surface-variant); line-height: 1.5; }
  .share-record-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .share-record-actions .btn-outlined { height: 32px; padding: 0 10px; font-size: 12px; }
  .share-record-empty {
    padding: 14px; border: 1px dashed var(--outline); border-radius: var(--radius-m);
    color: var(--on-surface-variant); font-size: 13px; text-align: center;
  }
  @media (max-width: 640px) {
    .share-form-grid { grid-template-columns: 1fr; }
    .share-link-row { flex-direction: column; align-items: stretch; }
  }

  /* ── Upload Zone ── */
  .upload-zone {
    border: 2px dashed var(--outline); border-radius: var(--radius-m);
    padding: 40px 24px; text-align: center;
    cursor: pointer; transition: border-color .15s, background .15s;
    margin-bottom: 16px;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: var(--primary); background: var(--primary-light);
  }
  .upload-zone .material-icons-round { font-size: 48px; color: var(--primary); margin-bottom: 12px; }
  .upload-zone h4 { font-family: var(--font-display); font-size: 16px; margin-bottom: 4px; }
  .upload-zone p { font-size: 13px; color: var(--on-surface-variant); }

  /* ── Preview Modal ── */
  .preview-overlay {
    position: fixed; inset: 0; z-index: 220;
    background: rgba(0,0,0,.7);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    opacity: 0; pointer-events: none;
    transition: opacity .2s;
  }
  .preview-overlay.open { opacity: 1; pointer-events: all; }
  .preview-modal {
    background: var(--surface); border-radius: var(--radius-l);
    width: 100%; max-width: 92vw;
    height: 88vh;
    box-shadow: var(--shadow-3);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .preview-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--outline);
    flex-shrink: 0;
  }
  .preview-title {
    font-family: var(--font-display);
    font-size: 16px; font-weight: 500;
    flex: 1; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .preview-header-actions {
    display: flex; align-items: center; gap: 4px;
  }
  .preview-body {
    flex: 1; min-height: 0;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    background: var(--background);
  }
  .preview-body img {
    max-width: 100%; max-height: 100%;
    object-fit: contain;
    padding: 8px;
  }
  .preview-body video {
    max-width: 100%; max-height: 100%;
    width: 100%; padding: 8px;
  }
  .preview-body audio {
    width: 80%; padding: 0 24px;
  }
  .preview-body iframe,
  .preview-body embed {
    width: 100%; height: 100%;
    border: none;
  }
  .preview-body .preview-text-wrap {
    width: 100%; height: 100%;
    overflow: auto;
    padding: 16px 24px;
  }
  .preview-body .preview-text-wrap pre {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--on-surface);
    margin: 0;
  }
  .preview-loading {
    display: flex; flex-direction: column;
    align-items: center; gap: 12px;
    color: var(--on-surface-variant);
  }
  .preview-unavailable {
    display: flex; flex-direction: column;
    align-items: center; gap: 12px;
    color: var(--on-surface-variant);
    padding: 24px; text-align: center;
  }
  .preview-unavailable .material-icons-round { font-size: 64px; opacity: .4; }
  .preview-unavailable h3 { font-family: var(--font-display); font-size: 18px; font-weight: 400; margin: 0; }
  .preview-unavailable p { font-size: 14px; margin: 0; max-width: 360px; }

  /* ── Progress ── */
  .progress-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
  .progress-item { display: flex; flex-direction: column; gap: 4px; }
  .progress-item-name { font-size: 13px; display: flex; justify-content: space-between; }
  .progress-bar { height: 4px; background: var(--outline); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--primary); border-radius: 2px; transition: width .3s; }
  .progress-fill.done { background: var(--success); }
  .progress-fill.error { background: var(--error); }

  /* ── Input ── */
  .text-field {
    width: 100%; padding: 12px 16px;
    border: 1px solid var(--outline); border-radius: var(--radius-s);
    font-family: var(--font-body); font-size: 14px; color: var(--on-surface);
    background: var(--surface); outline: none; transition: border-color .15s;
  }
  .text-field:focus { border-color: var(--primary); border-width: 2px; }
  .field-label {
    display: block; font-size: 12px; font-weight: 500;
    color: var(--on-surface-variant); margin-bottom: 6px;
  }

  /* ── Chip ── */
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 12px; height: 32px; border-radius: 16px;
    border: 1px solid var(--outline); background: transparent;
    font-size: 13px; cursor: pointer; font-family: var(--font-body);
    color: var(--on-surface); transition: background .15s;
  }
  .chip:hover { background: rgba(60,64,67,.08); }
  .chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary-dark); }
  .chip .material-icons-round { font-size: 16px; }

  /* ── Snackbar ── */
  .snackbar {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px);
    background: #323232; color: white; border-radius: var(--radius-s);
    padding: 12px 24px; font-size: 14px; z-index: 300;
    display: flex; align-items: center; gap: 16px;
    box-shadow: var(--shadow-3); transition: transform .3s cubic-bezier(.4,0,.2,1);
    white-space: nowrap;
  }
  .snackbar.show { transform: translateX(-50%) translateY(0); }
  .snackbar-action { color: #BB86FC; font-weight: 500; cursor: pointer; background: none; border: none; font-size: 14px; }

  /* ── Login ── */
  .login-wrap {
    flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
    background: #F1F3F4;
    position: relative; overflow: hidden; padding: 24px;
  }
  [data-theme="dark"] .login-wrap { background: var(--background); }
  .login-bg-image {
    position: absolute; inset: 0; z-index: 0;
    width: 100%; height: 100%; object-fit: cover;
  }
  .login-theme-toggle {
    position: fixed; top: 24px; right: 24px; z-index: 2;
    background: var(--surface); box-shadow: var(--shadow-1);
  }
  .login-card {
    background: var(--surface); border-radius: var(--radius-l);
    padding: 48px 40px; width: 400px; max-width: 100%;
    box-shadow: var(--shadow-2); text-align: center;
    position: relative; z-index: 1;
  }
  .login-logo { margin-bottom: 32px; }
  .login-logo .logo-icon { width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 20px; font-size: 32px; }
  .login-title { font-family: var(--font-display); font-size: 28px; font-weight: 400; margin-bottom: 8px; }
  .login-sub { color: var(--on-surface-variant); font-size: 14px; margin-bottom: 32px; }
  .login-btn {
    width: 100%; height: 48px; background: var(--primary); color: white;
    border: none; border-radius: var(--radius-xl); cursor: pointer;
    font-family: var(--font-display); font-size: 16px; font-weight: 500;
    margin-top: 16px; transition: background .15s; box-shadow: var(--shadow-1);
  }
  .login-btn:hover { background: var(--primary-dark); }
  .login-error { color: var(--error); font-size: 13px; margin-top: 8px; min-height: 20px; }

  /* ── View Toggle ── */
  .view-toggle { display: flex; border: 1px solid var(--outline); border-radius: var(--radius-m); overflow: hidden; }
  .view-toggle-btn {
    width: 40px; height: 36px; border: none; background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--on-surface-variant); transition: background .15s;
  }
  .view-toggle-btn:hover { background: rgba(60,64,67,.08); }
  .view-toggle-btn.active { background: var(--primary-light); color: var(--primary); }
  .view-toggle-btn .material-icons-round { font-size: 20px; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { padding: 16px; }
    .file-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .app-bar-title { font-size: 18px; }
    .login-theme-toggle { top: 16px; right: 16px; }
  }

  /* ── Context Menu ── */
  .context-menu {
    position: fixed; z-index: 250;
    background: var(--surface); border-radius: var(--radius-m);
    box-shadow: var(--shadow-3); padding: 4px 0; min-width: 180px;
    display: none;
  }
  .context-menu.open { display: block; }
  .context-menu-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; cursor: pointer; font-size: 14px;
    color: var(--on-surface); transition: background .1s;
  }
  .context-menu-item:hover { background: rgba(60,64,67,.08); }
  .context-menu-item.danger { color: var(--error); }
  .context-menu-item .material-icons-round { font-size: 18px; color: var(--on-surface-variant); }
  .context-menu-item.danger .material-icons-round { color: var(--error); }
  .context-menu-divider { height: 1px; background: var(--outline); margin: 4px 0; }

  /* ── Storage Bar ── */
  .storage-info { padding: 16px; margin-top: auto; border: none; background: transparent; text-align: left; width: 100%; cursor: pointer; }
  .storage-info:hover { background: rgba(60,64,67,.08); }
  .storage-bar { height: 4px; background: var(--outline); border-radius: 2px; overflow: hidden; margin: 6px 0; }
  .storage-fill { height: 100%; background: var(--primary); border-radius: 2px; }
  .storage-text { font-size: 12px; color: var(--on-surface-variant); }
  .storage-details { display: none; margin-top: 12px; gap: 10px; flex-direction: column; }
  .storage-info.expanded .storage-details { display: flex; }
  .storage-node-name { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--on-surface); }
  .storage-node-meta { font-size: 11px; color: var(--on-surface-variant); margin-top: 2px; }

  /* ── Selection Bar ── */
  .selection-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
    background: var(--primary); color: white; height: 56px;
    display: flex; align-items: center; padding: 0 24px; gap: 16px;
    transform: translateY(100%); transition: transform .25s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 -2px 8px rgba(0,0,0,.2);
  }
  .selection-bar.open { transform: none; }
  .selection-bar-count { font-family: var(--font-display); font-size: 16px; font-weight: 500; flex: 1; }
    .selection-bar .icon-btn { color: white; }
  .selection-bar .icon-btn:hover { background: rgba(255,255,255,.15); }

  /* ── Action Bar (Horizontal) ── */
  .action-bar {
    display: flex; align-items: center; gap: 4px;
    background: var(--surface);
    border: 1px solid var(--outline);
    border-radius: var(--radius-m);
    padding: 4px 8px;
    margin-bottom: 16px;
    min-height: 48px;
    flex-wrap: wrap;
    box-shadow: var(--shadow-1);
    transition: opacity .2s;
  }
  .action-bar:empty { display: none; }
  .action-bar-count {
    font-size: 13px; font-weight: 500;
    color: var(--on-surface-variant);
    padding: 0 8px; white-space: nowrap;
  }
  .action-bar-divider {
    width: 1px; height: 28px;
    background: var(--outline); margin: 0 4px;
  }
  .action-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 12px;
    border: none; background: transparent;
    border-radius: var(--radius-s);
    cursor: pointer;
    font-family: var(--font-body); font-size: 13px; font-weight: 500;
    color: var(--on-surface-variant);
    transition: background .15s, color .15s;
    white-space: nowrap;
  }
  .action-btn:hover { background: rgba(60,64,67,.08); color: var(--on-surface); }
  .action-btn:active { background: rgba(60,64,67,.12); }
  .action-btn .material-icons-round { font-size: 18px; }
  .action-btn.danger:hover { color: var(--error); background: rgba(217,48,37,.08); }
  .action-btn:disabled {
    opacity: .38; cursor: default; pointer-events: none;
  }
  [data-theme="dark"] .action-btn:hover { background: rgba(232,234,237,.08); color: var(--on-surface); }
  [data-theme="dark"] .action-btn.danger:hover { background: rgba(242,139,130,.08); }
  .action-bar.download-only { display: none; }
  .action-bar.download-only.has-download { display: flex; }
  .download-progress {
    display: none; align-items: center; gap: 10px;
    margin-left: auto; min-width: 260px; max-width: 560px;
    flex: 1 1 360px; padding: 2px 4px;
  }
  .download-progress.open { display: flex; }
  .download-progress .material-icons-round {
    font-size: 18px; color: var(--primary); flex: 0 0 auto;
  }
  .download-progress-main {
    display: flex; flex-direction: column; gap: 5px;
    min-width: 0; flex: 1;
  }
  .download-progress-top {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; min-width: 0; font-size: 12px;
  }
  .download-progress-name {
    min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--on-surface); font-weight: 500;
  }
  .download-progress-stats {
    color: var(--on-surface-variant); white-space: nowrap; flex: 0 0 auto;
  }
  .download-progress-bar {
    height: 6px; border-radius: 999px; overflow: hidden;
    background: var(--outline);
  }
  .download-progress-fill {
    width: 0%; height: 100%; border-radius: inherit;
    background: var(--primary); transition: width .15s linear, background .15s;
  }
  .download-progress.done .download-progress-fill { background: var(--success); }
  .download-progress.error .download-progress-fill { background: var(--error); }
  @media (max-width: 720px) {
    .download-progress { min-width: 100%; margin-left: 0; }
  }

  .node-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .node-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border: 1px solid var(--outline);
    border-radius: var(--radius-m); background: var(--background);
  }
  .node-row-main { flex: 1; min-width: 0; }
  .node-row-title { font-size: 14px; font-weight: 500; color: var(--on-surface); }
  .node-row-sub { font-size: 12px; color: var(--on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .node-row-bar { height: 4px; background: var(--outline); border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .node-row-fill { height: 100%; background: var(--primary); border-radius: 2px; }
  .node-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .node-form-grid .full { grid-column: 1 / -1; }
  @media (max-width: 560px) {
    .node-form-grid { grid-template-columns: 1fr; }
  }

  /* ── R2 File Viewer (in storage node modal) ── */
  .r2file-view { display: none; flex-direction: column; gap: 0; }
  .r2file-view.open { display: flex; }
  .r2file-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .r2file-toolbar .node-row-title { flex: 1; }
  .r2file-list { display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow-y: auto; margin-bottom: 12px; }
  .r2file-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: var(--radius-s);
    border: 1px solid transparent;
    font-size: 13px; font-family: 'Consolas','Monaco',monospace;
    color: var(--on-surface);
  }
  .r2file-row:hover { background: rgba(60,64,67,.06); }
  .r2file-key {
    flex: 1; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .r2file-size { font-size: 12px; color: var(--on-surface-variant); white-space: nowrap; flex-shrink: 0; }
  .r2file-stats { font-size: 12px; color: var(--on-surface-variant); margin-bottom: 8px; }
  .r2file-load-more { text-align: center; margin-top: 4px; }
  .r2file-load-more button {
    padding: 6px 20px; border: 1px solid var(--outline);
    border-radius: var(--radius-xl); background: transparent;
    cursor: pointer; font-size: 13px; color: var(--primary);
    transition: background .15s;
  }
  .r2file-load-more button:hover { background: rgba(60,64,67,.08); }
  .r2file-load-more button:disabled { opacity: .38; cursor: default; }
  .node-view-toggle { display: none; }
  .node-view-toggle.open { display: flex; }

  /* ── Orphan Cleanup ── */
  .orphan-list { display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow-y: auto; margin-bottom: 12px; }
  .orphan-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: var(--radius-s);
    cursor: pointer; transition: background .1s;
    border: 1px solid transparent;
  }
  .orphan-row:hover { background: rgba(60,64,67,.06); }
  .orphan-row:has(input:checked) { background: var(--primary-light); border-color: var(--primary); }
  .orphan-check { width: 18px; height: 18px; flex-shrink: 0; cursor: pointer; accent-color: var(--primary); }
  .orphan-key {
    flex: 1; min-width: 0; font-size: 13px; font-family: 'Consolas','Monaco',monospace;
    color: var(--on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .orphan-size { font-size: 12px; color: var(--on-surface-variant); white-space: nowrap; flex-shrink: 0; }
  .orphan-select-all { display: flex; align-items: center; gap: 8px; padding: 4px 12px; margin-bottom: 4px; font-size: 13px; color: var(--on-surface-variant); cursor: pointer; }
  .orphan-stats { font-size: 12px; color: var(--on-surface-variant); padding: 0 12px; margin-bottom: 8px; }
  @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Dark Mode Toggle ── */
  /* Icon is handled by JS toggleDarkMode() */

  /* ── Foot Bar ── */
  .foot-bar {
    background: var(--surface);
    border-top: 1px solid var(--outline);
    padding: 12px 24px;
    font-size: 12px;
    color: var(--on-surface-variant);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    text-align: center;
    line-height: 1.6;
  }
  .foot-bar a {
    color: var(--primary);
    text-decoration: none;
  }
  .foot-bar a:hover {
    text-decoration: underline;
  }
  .foot-bar-sep {
    color: var(--outline);
    user-select: none;
  }
  @media (max-width: 768px) {
    .foot-bar {
      padding: 10px 16px;
      flex-direction: column;
      gap: 6px;
    }
    .foot-bar-sep {
      display: none;
    }
  }

  /* ── Version Update Badge ── */
  .version-info {
    display: inline-flex; align-items: center; gap: 6px;
    cursor: pointer; position: relative;
    text-decoration: none; color: inherit;
    transition: color .15s;
    /* Expand hover area upward so the mouse doesn't lose hover when bridging to tooltip */
    padding-top: 6px; margin-top: -6px;
  }
  .version-info:hover { color: var(--primary); }
  .version-badge {
    display: none;
    font-size: 10px; font-weight: 700;
    background: var(--error); color: #fff;
    border-radius: 10px; padding: 1px 7px;
    line-height: 1.6; white-space: nowrap;
    animation: versionPulse 2s ease-in-out infinite;
  }
  .version-badge.show { display: inline; }
  @keyframes versionPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .65; }
  }
  /* Transparent hover bridge — keeps :hover active while cursor crosses the gap */
  .version-info::before {
    content: ''; position: absolute;
    bottom: 100%; left: 0; right: 0;
    height: 22px;
    background: transparent;
  }
  .version-tooltip {
    opacity: 0; visibility: hidden;
    pointer-events: none;
    position: absolute; bottom: calc(100% + 4px); left: 50%;
    transform: translateX(-50%) translateY(6px);
    background: var(--surface);
    border: 1px solid var(--outline); border-radius: var(--radius-m);
    box-shadow: var(--shadow-3); padding: 14px 18px; min-width: 260px;
    z-index: 500; text-align: left; cursor: default;
    transition: opacity .2s ease, visibility .2s ease, transform .2s cubic-bezier(.4,0,.2,1);
    transition-delay: .3s; /* delay hiding — gives time to reach the link */
  }
  .version-info:hover .version-tooltip {
    opacity: 1; visibility: visible;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
    transition-delay: 0s; /* show instantly */
  .version-tooltip-title {
    font-size: 14px; font-weight: 600; color: var(--on-surface); margin-bottom: 6px;
  }
  .version-tooltip-body { font-size: 12px; color: var(--on-surface-variant); line-height: 1.6; margin-bottom: 10px; }
  .version-tooltip-link {
    font-size: 12px; color: var(--primary); text-decoration: none; font-weight: 500;
  }
  .version-tooltip-link:hover { text-decoration: underline; }
</style>
</head>
<body>
${content}

<footer class="foot-bar">
  <span class="version-info" id="versionInfo" title="检查更新">
    <span>v1.1.9</span>
    <span class="version-badge" id="versionBadge">有新版本</span>
    <span class="version-tooltip" id="versionTooltip">
      <div class="version-tooltip-title">版本更新检查</div>
      <div class="version-tooltip-body" id="versionTooltipBody">正在检查...</div>
      <a class="version-tooltip-link" id="versionTooltipLink" href="https://github.com/HandsomeMJZ/R2-Cloud-Drive" target="_blank" rel="noopener noreferrer">前往 GitHub 查看 →</a>
    </span>
  </span>
  <span class="foot-bar-sep">|</span>
  <a href="https://github.com/HandsomeMJZ" target="_blank" rel="noopener noreferrer">Github@HandsomeMJZ</a>
  <span class="foot-bar-sep">|</span>
  <span>用户存储之内容需符合当地法律法规，本程序不承担法律责任。</span>
</footer>

<div class="snackbar" id="snackbar">
  <span id="snackbar-msg"></span>
  <button class="snackbar-action" onclick="hideSnackbar()" style="display:none" id="snackbar-action-btn"></button>
</div>

<div class="preview-overlay" id="previewOverlay" onclick="if(event.target===this)closePreview()">
  <div class="preview-modal">
    <div class="preview-header">
      <span class="material-icons-round" style="color:var(--primary)">visibility</span>
      <span class="preview-title" id="previewTitle">预览</span>
      <div class="preview-header-actions">
        <button class="icon-btn" id="previewDlBtn" title="下载" onclick="doPreviewDownload()">
          <span class="material-icons-round">download</span>
        </button>
        <button class="icon-btn" onclick="closePreview()" title="关闭">
          <span class="material-icons-round">close</span>
        </button>
      </div>
    </div>
    <div class="preview-body" id="previewBody">
      <div class="preview-loading">
        <span class="material-icons-round" style="font-size:48px;opacity:.4">hourglass_empty</span>
        <p>加载中...</p>
      </div>
    </div>
  </div>
</div>

<div class="context-menu" id="contextMenu">
  <div class="context-menu-item" onclick="ctxCopy()">
    <span class="material-icons-round">content_copy</span><span>复制</span>
  </div>
  <div class="context-menu-item" onclick="ctxCut()">
    <span class="material-icons-round">content_cut</span><span>剪切</span>
  </div>
  <div class="context-menu-item" onclick="ctxPaste()">
    <span class="material-icons-round">content_paste</span><span>粘贴</span>
  </div>
  <div class="context-menu-item" onclick="ctxShare()">
    <span class="material-icons-round">ios_share</span><span>分享设置</span>
  </div>
  <div class="context-menu-divider"></div>
  <div class="context-menu-item" onclick="ctxPreview()">
    <span class="material-icons-round">visibility</span><span>预览</span>
  </div>
  <div class="context-menu-item" onclick="ctxDownload()">
    <span class="material-icons-round">download</span><span>下载</span>
  </div>
  <div class="context-menu-item" onclick="ctxRename()">
    <span class="material-icons-round">drive_file_rename_outline</span><span>重命名</span>
  </div>
  <div class="context-menu-item" onclick="ctxCopyLink()">
    <span class="material-icons-round">link</span><span>复制链接</span>
  </div>
  <div class="context-menu-divider"></div>
  <div class="context-menu-item danger" onclick="ctxDelete()">
    <span class="material-icons-round">delete_outline</span><span>删除</span>
  </div>
</div>

<script>
// ── State ──
let viewMode = localStorage.getItem('viewMode') || 'grid';
let selectedFiles = new Set();
let ctxTarget = null;
let currentPath = '';
let sortBy = 'name';
let sortDir = 1;

// ── Helper (client-side) ──
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── Clipboard (Copy/Cut) ──
let clipboard = { items: [], action: null, sourcePath: '' }; // action: 'copy' or 'cut'

// ── Storage ──
const STORAGE_TOTAL = 10 * 1024 * 1024 * 1024; // 10 GB per account/node
let storageUsed = 0;
let storageExpanded = false;

// ── Snackbar ──
let snackbarTimer;
function showSnackbar(msg, action, actionCb) {
  const el = document.getElementById('snackbar');
  const msgEl = document.getElementById('snackbar-msg');
  const btnEl = document.getElementById('snackbar-action-btn');
  msgEl.textContent = msg;
  if (action && actionCb) {
    btnEl.textContent = action; btnEl.style.display = ''; btnEl.onclick = actionCb;
  } else { btnEl.style.display = 'none'; }
  el.classList.add('show');
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(hideSnackbar, 4000);
}
function hideSnackbar() { document.getElementById('snackbar').classList.remove('show'); }

const RANGED_DOWNLOAD_THRESHOLD = 512 * 1024 * 1024;
const RANGED_DOWNLOAD_CHUNK = 512 * 1024 * 1024;
const RANGED_DOWNLOAD_RETRIES = 3;
let activeDownloadId = 0;
let downloadProgressTimer;

function downloadUrl(path) {
  return '/api/download?path=' + encodeURIComponent(path);
}

const CSRF_HEADER = { 'X-R2Drive-CSRF': 'same-origin' };
function jsonHeaders(extra) {
  return Object.assign({ 'Content-Type': 'application/json' }, CSRF_HEADER, extra || {});
}

function getFileSizeByName(name) {
  for (const el of document.querySelectorAll('[data-name]')) {
    if (el.dataset.name === name) return Number(el.dataset.size || 0);
  }
  return 0;
}

function downloadProgressElements() {
  const bar = document.getElementById('actionBar');
  const panel = document.getElementById('downloadProgress');
  if (!bar || !panel) return null;
  return {
    bar,
    panel,
    name: document.getElementById('downloadProgressName'),
    stats: document.getElementById('downloadProgressStats'),
    fill: document.getElementById('downloadProgressFill')
  };
}

function showDownloadProgress(filename, size) {
  clearTimeout(downloadProgressTimer);
  const els = downloadProgressElements();
  if (!els) return false;
  els.bar.classList.add('has-download');
  els.panel.classList.add('open');
  els.panel.classList.remove('done', 'error');
  if (els.name) els.name.textContent = filename;
  if (els.stats) els.stats.textContent = '0% · 0 B / ' + formatSize(size) + ' · 0 B/s';
  if (els.fill) els.fill.style.width = '0%';
  return true;
}

function updateDownloadProgress(filename, downloaded, size, speed) {
  const els = downloadProgressElements();
  if (!els) return false;
  const pct = size > 0 ? Math.min(100, downloaded / size * 100) : 0;
  if (els.name) els.name.textContent = filename;
  if (els.stats) {
    els.stats.textContent = Math.floor(pct) + '% · ' + formatSize(downloaded) + ' / ' + formatSize(size) + ' · ' + formatSize(speed) + '/s';
  }
  if (els.fill) els.fill.style.width = pct.toFixed(2) + '%';
  return true;
}

function finishDownloadProgress(filename, size, ok) {
  const els = downloadProgressElements();
  if (!els) return false;
  els.panel.classList.toggle('done', ok);
  els.panel.classList.toggle('error', !ok);
  if (els.name) els.name.textContent = filename;
  if (els.stats) els.stats.textContent = ok ? '100% · ' + formatSize(size) + ' · 完成' : '下载失败';
  if (els.fill) els.fill.style.width = ok ? '100%' : els.fill.style.width;
  downloadProgressTimer = setTimeout(() => {
    els.panel.classList.remove('open', 'done', 'error');
    els.bar.classList.remove('has-download');
  }, ok ? 2400 : 6000);
  return true;
}

async function fetchDownloadRange(path, start, end) {
  let lastError;
  for (let attempt = 0; attempt < RANGED_DOWNLOAD_RETRIES; attempt++) {
    try {
      const res = await fetch(downloadUrl(path), {
        headers: { 'Range': 'bytes=' + start + '-' + end }
      });
      if (res.status !== 206 || !res.body) throw new Error('range request failed: ' + res.status);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < RANGED_DOWNLOAD_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function downloadInRanges(path, size) {
  const filename = path.split('/').pop() || 'download';
  const downloadId = ++activeDownloadId;
  let writable;
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: filename });
    writable = await handle.createWritable();
    showDownloadProgress(filename, size);
    let downloaded = 0;
    let lastSpeedBytes = 0;
    let lastSpeedAt = performance.now();
    let speed = 0;
    while (downloaded < size) {
      const start = downloaded;
      const end = Math.min(size - 1, start + RANGED_DOWNLOAD_CHUNK - 1);
      const expected = end - start + 1;
      const res = await fetchDownloadRange(path, start, end);
      const reader = res.body.getReader();
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        downloaded += value.byteLength;
        await writable.write(value);
        const now = performance.now();
        const elapsed = (now - lastSpeedAt) / 1000;
        if (elapsed >= 0.4 || downloaded >= size) {
          const instantSpeed = (downloaded - lastSpeedBytes) / Math.max(elapsed, 0.001);
          speed = speed ? speed * 0.65 + instantSpeed * 0.35 : instantSpeed;
          lastSpeedBytes = downloaded;
          lastSpeedAt = now;
          if (downloadId === activeDownloadId) updateDownloadProgress(filename, downloaded, size, speed);
        }
      }
      if (received !== expected) throw new Error('range ended early');
    }
    await writable.close();
    if (downloadId === activeDownloadId) finishDownloadProgress(filename, size, true);
  } catch (err) {
    if (writable) await writable.abort().catch(() => {});
    if (err?.name !== 'AbortError') {
      console.error(err);
      if (downloadId === activeDownloadId) finishDownloadProgress(filename, size, false);
      showSnackbar('Download failed');
    }
  }
}

function startDownload(path, size = 0) {
  if (size >= RANGED_DOWNLOAD_THRESHOLD && 'showSaveFilePicker' in window) {
    downloadInRanges(path, size);
    return;
  }
  window.open(downloadUrl(path));
}

// ── View Mode ──
function setView(mode) {
  viewMode = mode; localStorage.setItem('viewMode', mode);
  document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.view === mode));
  const grid = document.getElementById('fileGrid');
  const list = document.getElementById('fileList');
  if (grid && list) { grid.style.display = mode === 'grid' ? '' : 'none'; list.style.display = mode === 'list' ? '' : 'none'; }
}

// ── Preview ──
let previewPath = '';
let previewName = '';

function getPreviewType(name) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg','jpeg','png','gif','webp','svg','bmp','ico'];
  const videoExts = ['mp4','webm','ogg','avi','mov','mkv'];
  const audioExts = ['mp3','wav','flac','aac','m4a','opus'];
  const textExts = ['txt','md','html','css','js','ts','py','java','c','cpp','h','hpp','go','rs','rb','php','json','xml','yaml','yml','log','sh','bash','sql','conf','ini','cfg','toml','env','gitignore','Makefile','Dockerfile','cmake','gradle','svelte','vue','jsx','tsx','mjs','cjs'];
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (textExts.includes(ext)) return 'text';
  if (['doc','docx','xls','xlsx','ppt','pptx'].includes(ext)) return 'office';
  return null;
}

function openPreview(path, name) {
  previewPath = path;
  previewName = name;
  const overlay = document.getElementById('previewOverlay');
  document.getElementById('previewTitle').textContent = name;
  overlay.classList.add('open');
  loadPreview(path, name);
}

function closePreview() {
  const overlay = document.getElementById('previewOverlay');
  if (!overlay || !overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  const body = document.getElementById('previewBody');
  if (body) {
    body.innerHTML = '<div class="preview-loading"><span class="material-icons-round" style="font-size:48px;opacity:.4">hourglass_empty</span><p>加载中...</p></div>';
  }
  previewPath = '';
  previewName = '';
}

function doPreviewDownload() {
  if (previewPath && previewName) {
    const size = getFileSizeByName(previewName);
    startDownload(previewPath, size || 0);
  }
}

function loadPreview(path, name) {
  var body = document.getElementById('previewBody');
  if (!body) return;
  var type = getPreviewType(name);
  var url = downloadUrl(path);
  body.innerHTML = '';

  if (type === 'image') {
    var img = document.createElement('img');
    img.src = url;
    img.alt = name;
    img.onerror = function() {
      body.innerHTML = '<div class="preview-unavailable"><span class="material-icons-round">broken_image</span><h3>图片加载失败</h3><p>请尝试下载查看</p></div>';
    };
    body.appendChild(img);

  } else if (type === 'video') {
    var vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.style.cssText = 'max-height:100%;max-width:100%';
    body.appendChild(vid);

  } else if (type === 'audio') {
    var aud = document.createElement('audio');
    aud.src = url;
    aud.controls = true;
    aud.autoplay = true;
    aud.style.cssText = 'width:100%';
    body.appendChild(aud);

  } else if (type === 'pdf') {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = name;
    body.appendChild(iframe);

  } else if (type === 'text') {
    body.innerHTML = '<div class="preview-text-wrap"><pre id="previewTextContent">加载中...</pre></div>';
    fetch(url)
      .then(function(r) { if (!r.ok) throw new Error('Failed to load'); return r.text(); })
      .then(function(text) {
        var el = document.getElementById('previewTextContent');
        if (el) el.textContent = text;
      })
      .catch(function() {
        var el = document.getElementById('previewTextContent');
        if (el) el.textContent = '文件加载失败，请尝试下载查看。';
      });

  } else if (type === 'office') {
    body.innerHTML = '<div class="preview-unavailable"><span class="material-icons-round">description</span><h3>暂不支持在线预览</h3><p>Office / WPS 文档暂不支持在线预览，请下载后使用本地软件查看。</p><button class="fab" style="box-shadow:none;margin-top:8px" onclick="doPreviewDownload()"><span class="material-icons-round">download</span> 下载文件</button></div>';

  } else {
    body.innerHTML = '<div class="preview-unavailable"><span class="material-icons-round">insert_drive_file</span><h3>暂不支持预览</h3><p>此文件类型暂不支持在线预览，请下载查看。</p><button class="fab" style="box-shadow:none;margin-top:8px" onclick="doPreviewDownload()"><span class="material-icons-round">download</span> 下载文件</button></div>';
  }
}

// ── Selection ──
// ── File Click: single click selects, double click previews (or downloads for unsupported types)
function handleFileClick(event, name) {
  if (event.detail === 1) {
    toggleSelect(name, event.currentTarget);
  } else if (event.detail === 2) {
    const path = currentPath ? currentPath + '/' + name : name;
    const type = getPreviewType(name);
    if (type) {
      openPreview(path, name);
    } else {
      const size = Number(event.currentTarget?.dataset.size || getFileSizeByName(name) || 0);
      startDownload(path, size);
    }
  }
}

// ── Folder Click: single click selects, double click navigates
function handleFolderClick(event, name, href) {
  if (event.ctrlKey || event.metaKey) {
    toggleSelect(name, event.currentTarget);
    return;
  }
  // Check if this is a single click or part of a double click
  if (event.detail === 1) {
    // Single click: toggle select (to allow rename, copy, etc.)
    toggleSelect(name, event.currentTarget);
  } else if (event.detail === 2) {
    // Double click: navigate into folder
    location.href = href;
  }
}

function toggleSelect(name, el) {
  if (selectedFiles.has(name)) { selectedFiles.delete(name); el?.classList.remove('selected'); }
  else { selectedFiles.add(name); el?.classList.add('selected'); }
  updateSelectionBar();
  updateActionBar();
}
function clearSelection() {
  selectedFiles.clear();
  document.querySelectorAll('.file-card.selected, .file-list tr.selected').forEach(el => el.classList.remove('selected'));
  updateSelectionBar();
  updateActionBar();
}
function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  if (!bar) return;
  const n = selectedFiles.size;
  bar.classList.toggle('open', n > 0);
  const countEl = document.getElementById('selectionCount');
  if (countEl) countEl.textContent = n + ' 个已选中';
}
function updateActionBar() {
  const bar = document.getElementById('actionBar');
  if (!bar) return;
  const countEl = document.getElementById('actionBarCount');
  const n = selectedFiles.size;
  if (countEl) countEl.textContent = n > 0 ? '已选 ' + n + ' 项' : '未选中';
  // Update paste button state (check clipboard in memory)
  const pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn) {
    pasteBtn.disabled = !clipboard.items.length;
  }
}

// ── Async check clipboard from metadata store on load ──
async function checkClipboardFromStore() {
  const pasteBtn = document.getElementById('pasteBtn');
  if (!pasteBtn) return;
  try {
    const res = await fetch('/api/clipboard?id=' + getClipboardId());
    const data = await res.json();
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      clipboard = { items: data.items, action: data.action || null, sourcePath: data.sourcePath || '' };
      pasteBtn.disabled = false;
    }
  } catch(e) { /* ignore */ }
}

// ── Dark Mode ──
function applyDarkMode(isDark) {
  const html = document.documentElement;
  if (isDark) html.setAttribute('data-theme', 'dark');
  else html.removeAttribute('data-theme');
  localStorage.setItem('theme', isDark ? 'dark' : '');
  document.querySelectorAll('#darkModeToggle .material-icons-round').forEach(icon => {
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  });
}

function getThemeRipplePoint(event) {
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return { x: event.clientX, y: event.clientY };
  }
  return { x: window.innerWidth - 48, y: 48 };
}

function getThemeRippleRadius(x, y) {
  return Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );
}

function animateThemeRipple(event, toDark, applyTheme) {
  const { x, y } = getThemeRipplePoint(event);
  const radius = getThemeRippleRadius(x, y);

  if (document.startViewTransition) {
    const transition = document.startViewTransition(applyTheme);
    transition.ready.then(() => {
      document.documentElement.animate({
        clipPath: [
          'circle(0px at ' + x + 'px ' + y + 'px)',
          'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'
        ]
      }, {
        duration: 550,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        pseudoElement: '::view-transition-new(root)'
      });
    });
    return;
  }

  const ripple = document.createElement('span');
  const diameter = radius * 2;
  ripple.className = 'theme-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = diameter + 'px';
  ripple.style.height = diameter + 'px';
  ripple.style.background = toDark ? '#121212' : '#F1F3F4';
  document.body.appendChild(ripple);

  requestAnimationFrame(() => {
    ripple.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  window.setTimeout(applyTheme, 500);
  window.setTimeout(() => ripple.remove(), 620);
}

function toggleDarkMode(event) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const toDark = !isDark;
  animateThemeRipple(event, toDark, () => applyDarkMode(toDark));
}
function initDarkMode() {
  applyDarkMode(localStorage.getItem('theme') === 'dark');
}

// ── Clipboard ID (random per browser session, survives navigation) ──
function getClipboardId() {
  let id = sessionStorage.getItem('r2clipboardId');
  if (!id) {
    id = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('r2clipboardId', id);
  }
  return id;
}

// ── Clipboard Persistence via metadata API (survives page navigation) ──
async function saveClipboard() {
  try {
    await fetch('/api/clipboard?id=' + getClipboardId(), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(clipboard)
    });
  } catch(e) { /* ignore */ }
}
async function loadClipboard() {
  try {
    const res = await fetch('/api/clipboard?id=' + getClipboardId());
    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      clipboard = { items: data.items, action: data.action || null, sourcePath: data.sourcePath || '' };
    } else {
      clipboard = { items: [], action: null, sourcePath: '' };
    }
  } catch(e) { clipboard = { items: [], action: null, sourcePath: '' }; }
}
async function clearClipboard() {
  clipboard = { items: [], action: null, sourcePath: '' };
  try {
    await fetch('/api/clipboard?id=' + getClipboardId(), { method: 'DELETE', headers: CSRF_HEADER });
  } catch(e) { /* ignore */ }
  updateActionBar();
}

// ── Clipboard Operations ──
async function copySelected() {
  if (!selectedFiles.size) return;
  clipboard.items = [...selectedFiles];
  clipboard.action = 'copy';
  clipboard.sourcePath = currentPath;
  await saveClipboard();
  showSnackbar('已复制 ' + clipboard.items.length + ' 项，请进入目标文件夹后粘贴', '清除', () => clearClipboard());
  updateActionBar();
}
async function cutSelected() {
  if (!selectedFiles.size) return;
  clipboard.items = [...selectedFiles];
  clipboard.action = 'cut';
  clipboard.sourcePath = currentPath;
  await saveClipboard();
  showSnackbar('已剪切 ' + clipboard.items.length + ' 项，请进入目标文件夹后粘贴', '清除', () => clearClipboard());
  updateActionBar();
}
async function pasteFiles() {
  // Reload clipboard from metadata store in case of page navigation
  await loadClipboard();
  if (!clipboard.items.length) return;
  const action = clipboard.action || 'copy';
  const pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn) pasteBtn.disabled = true;
  showSnackbar('正在粘贴 ' + clipboard.items.length + ' 项...');

  try {
    const res = await fetch('/api/clipboard/paste', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        action,
        items: clipboard.items,
        sourcePath: clipboard.sourcePath || '',
        targetPath: currentPath || ''
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'paste failed');

    const results = Array.isArray(data.results) ? data.results : [];
    const failed = results.filter(item => !item.ok);
    if (failed.length) {
      clipboard.items = failed.map(item => item.name).filter(Boolean);
      await saveClipboard();
      showSnackbar('操作完成，失败 ' + failed.length + ' 项，正在刷新...');
      setTimeout(() => location.reload(), 600);
    } else {
      if (action === 'cut') await clearClipboard();
      else updateActionBar();
      showSnackbar('操作完成，正在刷新...');
      setTimeout(() => location.reload(), 600);
    }
  } catch(e) {
    showSnackbar('粘贴失败');
    updateActionBar();
  }
}

// ── Rename Selected ──
function renameSelected() {
  if (selectedFiles.size !== 1) { showSnackbar('请只选择一个文件进行重命名'); return; }
  const name = [...selectedFiles][0];
  const newName = prompt('重命名为:', name);
  if (!newName || newName === name) return;
  const oldPath = currentPath ? currentPath + '/' + name : name;
  const newPath = currentPath ? currentPath + '/' + newName : newName;
  fetch('/api/rename', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ from: oldPath, to: newPath })
  }).then(r => r.ok ? (showSnackbar('已重命名'), location.reload()) : showSnackbar('重命名失败'));
}

// ── Download Selected ──
function downloadSelected() {
  if (!selectedFiles.size) return;
  const names = [...selectedFiles];
  if (names.length === 1) {
    const path = currentPath ? currentPath + '/' + names[0] : names[0];
    startDownload(path, getFileSizeByName(names[0]));
  } else {
    names.forEach(name => {
      const path = currentPath ? currentPath + '/' + name : name;
      startDownload(path, getFileSizeByName(name));
    });
  }
}

// ── Storage Calculation ──
async function updateStorageInfo() {
  try {
    const res = await fetch('/api/storage');
    const data = await res.json();
    storageUsed = data.used || 0;
    const storageTotal = data.total || STORAGE_TOTAL;
    const fillEl = document.getElementById('storageFill');
    const textEl = document.getElementById('storageText');
    if (fillEl) {
      const pct = Math.min(100, (storageUsed / storageTotal) * 100);
      fillEl.style.width = pct + '%';
      if (pct > 85) fillEl.style.background = 'var(--error)';
      else if (pct > 60) fillEl.style.background = 'var(--warning)';
    }
    if (textEl) {
      textEl.textContent = '已用 ' + formatSize(storageUsed) + ' / 共 ' + formatSize(storageTotal);
    }
    window.storageInfoData = data;
    renderStorageDetails(data.nodes || []);
  } catch(e) {
    const textEl = document.getElementById('storageText');
    if (textEl) textEl.textContent = '无法获取存储信息';
  }
}

function toggleStorageDetails() {
  storageExpanded = !storageExpanded;
  const info = document.getElementById('storageInfo');
  if (info) info.classList.toggle('expanded', storageExpanded);
  if (storageExpanded && !window.storageInfoData) updateStorageInfo();
}

function renderStorageDetails(nodes) {
  const list = document.getElementById('storageDetails');
  if (!list) return;
  if (!nodes.length) {
    list.innerHTML = '<div class="storage-node-meta">暂无节点容量信息</div>';
    return;
  }
  list.innerHTML = nodes.map(node => {
    const used = node.used || 0;
    const total = node.total || STORAGE_TOTAL;
    const pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0;
    const statusText = node.online === false ? ' · 离线' : (node.storageAvailable === false ? ' · 用量不可用' : '');
    return '<div>' +
      '<div class="storage-node-name"><span>' + escapeHtml(node.name || node.id) + '</span><span>' + pct + '%</span></div>' +
      '<div class="storage-bar"><div class="storage-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="storage-node-meta">' + formatSize(used) + ' / ' + formatSize(total) + statusText + '</div>' +
    '</div>';
  }).join('');
}
function deleteSelected() {
  if (!selectedFiles.size) {
    openOrphanCleanup();
    return;
  }
  if (!confirm('确定删除选中的 ' + selectedFiles.size + ' 个文件？')) return;
  const paths = [...selectedFiles].map(name => currentPath ? currentPath + '/' + name : name);
  fetch('/api/delete-batch', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ paths })
  }).then(r => r.ok ? (showSnackbar('已删除 ' + selectedFiles.size + ' 个文件'), location.reload()) : showSnackbar('删除失败'));
}

// ── Orphan File Cleanup ──
let orphanScanResults = [];

function openOrphanCleanup() {
  document.getElementById('orphanModal')?.classList.add('open');
  const list = document.getElementById('orphanList');
  const btn = document.getElementById('orphanScanBtn');
  if (list) list.innerHTML = '<div style="padding:16px;color:var(--on-surface-variant);text-align:center">点击"扫描"按钮查找未被引用的 R2 对象</div>';
  if (btn) { btn.disabled = false; btn.textContent = '开始扫描'; }
  orphanScanResults = [];
  updateOrphanSelectAll();
}
function closeOrphanCleanup() {
  document.getElementById('orphanModal')?.classList.remove('open');
}
async function scanOrphans() {
  const list = document.getElementById('orphanList');
  const btn = document.getElementById('orphanScanBtn');
  const stats = document.getElementById('orphanStats');
  if (list) list.innerHTML = '<div style="padding:16px;color:var(--on-surface-variant);text-align:center"><span class="material-icons-round" style="animation:spin 1s linear infinite;display:block;margin:0 auto 8px">sync</span>正在扫描 R2 对象...</div>';
  if (btn) { btn.disabled = true; btn.textContent = '扫描中...'; }
  if (stats) stats.textContent = '';

  try {
    const res = await fetch('/api/orphan-cleanup', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ action: 'scan' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'scan failed');

    orphanScanResults = data.orphans || [];
    if (stats) {
      const totalSize = formatSize(data.totalSize || 0);
      stats.textContent = '共扫描 ' + (data.totalObjects || 0) + ' 个对象，发现 ' + orphanScanResults.length + ' 个孤儿文件 (' + totalSize + ')';
    }

    if (!orphanScanResults.length) {
      if (list) list.innerHTML = '<div style="padding:24px;color:var(--success);text-align:center"><span class="material-icons-round" style="font-size:48px;display:block;margin:0 auto 8px">check_circle</span>未发现孤儿文件，所有 R2 对象均被引用</div>';
    } else {
      if (list) {
        list.innerHTML = orphanScanResults.map((o, i) =>
          '<label class="orphan-row" data-index="' + i + '">' +
          '<input type="checkbox" class="orphan-check" onchange="updateOrphanSelectAll()" data-index="' + i + '">' +
          '<span class="orphan-key" title="' + escapeHtml(o.key) + '">' + escapeHtml(o.key) + '</span>' +
          '<span class="orphan-size">' + formatSize(o.size) + '</span>' +
          '</label>'
        ).join('');
      }
    }
    updateOrphanSelectAll();
  } catch (err) {
    if (list) list.innerHTML = '<div style="padding:16px;color:var(--error);text-align:center">扫描失败：' + escapeHtml(err.message || '未知错误') + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '重新扫描'; }
  }
}

function updateOrphanSelectAll() {
  const checkAll = document.getElementById('orphanCheckAll');
  const checks = document.querySelectorAll('.orphan-check');
  const delBtn = document.getElementById('orphanDeleteBtn');
  const label = document.getElementById('orphanSelectAllLabel');
  if (checkAll) checkAll.checked = checks.length > 0 && [...checks].every(c => c.checked);
  if (delBtn) delBtn.disabled = ![...checks].some(c => c.checked);
  if (label) label.style.display = checks.length > 0 ? '' : 'none';
}

function toggleOrphanSelectAll() {
  const checkAll = document.getElementById('orphanCheckAll');
  const checks = document.querySelectorAll('.orphan-check');
  const checked = checkAll?.checked || false;
  checks.forEach(c => { c.checked = checked; });
  updateOrphanSelectAll();
}

async function deleteSelectedOrphans() {
  const checks = document.querySelectorAll('.orphan-check:checked');
  if (!checks.length) return;
  const keys = [...checks].map(c => orphanScanResults[parseInt(c.dataset.index)]?.key).filter(Boolean);
  if (!keys.length) return;
  if (!confirm('确定删除选中的 ' + keys.length + ' 个孤儿文件？此操作不可撤销。')) return;

  const delBtn = document.getElementById('orphanDeleteBtn');
  const list = document.getElementById('orphanList');
  if (delBtn) { delBtn.disabled = true; delBtn.textContent = '删除中...'; }

  try {
    const res = await fetch('/api/orphan-cleanup', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ action: 'clean', keys })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'delete failed');

    showSnackbar('已删除 ' + (data.deleted || 0) + ' 个孤儿文件，释放 ' + formatSize(data.freedBytes || 0) +
      (data.failed ? '，失败 ' + data.failed + ' 个' : ''));

    // Remove deleted items from the list
    const deletedKeys = new Set(keys);
    orphanScanResults = orphanScanResults.filter(o => !deletedKeys.has(o.key));
    if (list) {
      const rows = list.querySelectorAll('.orphan-row');
      rows.forEach(row => {
        const idx = parseInt(row.dataset.index);
        if (idx >= 0 && idx < orphanScanResults.length && deletedKeys.has(orphanScanResults[idx]?.key)) {
          // Actually, after filtering, indices change. Let's just re-render.
        }
      });
      // Re-render remaining
      if (!orphanScanResults.length) {
        list.innerHTML = '<div style="padding:24px;color:var(--success);text-align:center"><span class="material-icons-round" style="font-size:48px;display:block;margin:0 auto 8px">check_circle</span>所有孤儿文件已清除</div>';
      } else {
        list.innerHTML = orphanScanResults.map((o, i) =>
          '<label class="orphan-row" data-index="' + i + '">' +
          '<input type="checkbox" class="orphan-check" onchange="updateOrphanSelectAll()" data-index="' + i + '">' +
          '<span class="orphan-key" title="' + escapeHtml(o.key) + '">' + escapeHtml(o.key) + '</span>' +
          '<span class="orphan-size">' + formatSize(o.size) + '</span>' +
          '</label>'
        ).join('');
      }
      const stats = document.getElementById('orphanStats');
      if (stats) {
        const remainingSize = orphanScanResults.reduce((s, o) => s + o.size, 0);
        stats.textContent = '剩余 ' + orphanScanResults.length + ' 个孤儿文件 (' + formatSize(remainingSize) + ')';
      }
    }
    updateOrphanSelectAll();
  } catch (err) {
    showSnackbar('删除失败：' + (err.message || '未知错误'));
  } finally {
    if (delBtn) { delBtn.disabled = false; delBtn.textContent = '删除选中'; }
  }
}

// ── Context Menu ──
function showCtxMenu(e, name) {
  e.preventDefault(); e.stopPropagation();
  ctxTarget = name;
  const menu = document.getElementById('contextMenu');
  if (!menu) return;

  // 先让菜单可见并移到屏幕外，以便测量真实尺寸
  menu.classList.add('open');
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';

  // 强制重排以获取准确尺寸
  const menuW = menu.offsetWidth;
  const menuH = menu.offsetHeight;

  // 计算菜单位置，确保不超出屏幕边界（留 8px 安全边距）
  const MARGIN = 8;
  let x = e.clientX;
  let y = e.clientY;

  // 右侧溢出：向左偏移
  if (x + menuW > window.innerWidth - MARGIN) {
    x = Math.max(MARGIN, window.innerWidth - menuW - MARGIN);
  }
  // 底部溢出：向上偏移
  if (y + menuH > window.innerHeight - MARGIN) {
    y = Math.max(MARGIN, window.innerHeight - menuH - MARGIN);
  }
  // 确保不超出左/上边界
  x = Math.max(MARGIN, x);
  y = Math.max(MARGIN, y);

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}
document.addEventListener('click', () => document.getElementById('contextMenu')?.classList.remove('open'));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    var po = document.getElementById('previewOverlay');
    if (po && po.classList.contains('open')) { closePreview(); return; }
    clearSelection();
    document.getElementById('contextMenu')?.classList.remove('open');
  }
});

function ctxItems() {
  if (!ctxTarget) return [];
  if (selectedFiles.has(ctxTarget) && selectedFiles.size > 1) return [...selectedFiles];
  return [ctxTarget];
}
async function ctxCopy() {
  const items = ctxItems();
  if (!items.length) return;
  clipboard.items = items;
  clipboard.action = 'copy';
  clipboard.sourcePath = currentPath;
  await saveClipboard();
  showSnackbar('已复制 ' + clipboard.items.length + ' 项，请进入目标文件夹后粘贴', '清除', () => clearClipboard());
  updateActionBar();
}
async function ctxCut() {
  const items = ctxItems();
  if (!items.length) return;
  clipboard.items = items;
  clipboard.action = 'cut';
  clipboard.sourcePath = currentPath;
  await saveClipboard();
  showSnackbar('已剪切 ' + clipboard.items.length + ' 项，请进入目标文件夹后粘贴', '清除', () => clearClipboard());
  updateActionBar();
}
function ctxPaste() {
  pasteFiles();
}
function ctxPreview() {
  if (!ctxTarget) return;
  const path = currentPath ? currentPath + '/' + ctxTarget : ctxTarget;
  openPreview(path, ctxTarget);
}
function previewSelected() {
  if (selectedFiles.size !== 1) { showSnackbar('请只选择一个文件进行预览'); return; }
  const name = [...selectedFiles][0];
  const path = currentPath ? currentPath + '/' + name : name;
  openPreview(path, name);
}
function ctxDownload() {
  if (!ctxTarget) return;
  const path = currentPath ? currentPath + '/' + ctxTarget : ctxTarget;
  startDownload(path, getFileSizeByName(ctxTarget));
}
function ctxRename() {
  if (!ctxTarget) return;
  const newName = prompt('重命名为:', ctxTarget);
  if (!newName || newName === ctxTarget) return;
  const oldPath = currentPath ? currentPath + '/' + ctxTarget : ctxTarget;
  const newPath = currentPath ? currentPath + '/' + newName : newName;
  fetch('/api/rename', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({from: oldPath, to: newPath}) })
    .then(r => r.ok ? (showSnackbar('已重命名'), location.reload()) : showSnackbar('重命名失败'));
}
function ctxCopyLink() {
  if (!ctxTarget) return;
  const path = currentPath ? currentPath + '/' + ctxTarget : ctxTarget;
  const url = location.origin + '/api/download?path=' + encodeURIComponent(path);
  navigator.clipboard.writeText(url).then(() => showSnackbar('链接已复制'));
}
let shareTargetPathValue = '';
let createdShareLink = '';
let shareEditId = '';
let shareRecordsCache = [];
function openShareModal(path) {
  shareTargetPathValue = path || '';
  createdShareLink = '';
  shareEditId = '';
  shareRecordsCache = [];
  const modal = document.getElementById('shareModal');
  const target = document.getElementById('shareTargetPath');
  const password = document.getElementById('sharePasswordInput');
  const days = document.getElementById('shareDaysInput');
  const maxAccess = document.getElementById('shareMaxAccessInput');
  const result = document.getElementById('shareResult');
  const linkInput = document.getElementById('shareLinkInput');
  if (target) target.textContent = path || '';
  if (result) result.classList.remove('open');
  if (linkInput) linkInput.value = '';
  modal?.classList.add('open');
  resetShareForm();
  loadSharesForTarget(path);
  setTimeout(() => password?.focus(), 100);
}
function closeShareModal() {
  document.getElementById('shareModal')?.classList.remove('open');
}
function resetShareForm() {
  shareEditId = '';
  createdShareLink = '';
  const password = document.getElementById('sharePasswordInput');
  const days = document.getElementById('shareDaysInput');
  const maxAccess = document.getElementById('shareMaxAccessInput');
  const clearPassword = document.getElementById('shareClearPasswordInput');
  const clearLabel = document.getElementById('shareClearPasswordLabel');
  const hint = document.getElementById('sharePasswordHint');
  const result = document.getElementById('shareResult');
  const linkInput = document.getElementById('shareLinkInput');
  const btn = document.getElementById('shareCreateBtn');
  const newBtn = document.getElementById('shareNewBtn');
  if (password) {
    password.value = '';
    password.placeholder = '留空表示无需密码';
  }
  if (days) days.value = '';
  if (maxAccess) maxAccess.value = '';
  if (clearPassword) clearPassword.checked = false;
  if (clearLabel) clearLabel.style.display = 'none';
  if (hint) hint.textContent = '创建新分享时留空表示无需密码';
  if (result) result.classList.remove('open');
  if (linkInput) linkInput.value = '';
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">ios_share</span> 创建分享';
  }
  if (newBtn) newBtn.style.display = 'none';
  renderShareRecords(shareRecordsCache);
}
function daysFromExpiresAt(expiresAt) {
  if (!expiresAt) return '';
  const diff = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return '0';
  return String(Math.max(1, Math.ceil(diff / 86400000)));
}
async function submitShareForm() {
  if (!shareTargetPathValue) return;
  const password = document.getElementById('sharePasswordInput')?.value || '';
  const daysRaw = document.getElementById('shareDaysInput')?.value || '';
  const maxRaw = document.getElementById('shareMaxAccessInput')?.value || '';
  const clearPassword = !!document.getElementById('shareClearPasswordInput')?.checked;
  const days = Number(String(daysRaw).trim() || 0);
  const maxAccesses = Number(String(maxRaw).trim() || 0);
  if (!Number.isFinite(days) || days < 0) { showSnackbar('有效天数格式不正确'); return; }
  if (!Number.isInteger(maxAccesses) || maxAccesses < 0) { showSnackbar('访问次数格式不正确'); return; }

  const btn = document.getElementById('shareCreateBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round">sync</span> ' + (shareEditId ? '保存中...' : '创建中...');
  }
  try {
    const body = {
      path: shareTargetPathValue,
      ttlSeconds: days > 0 ? Math.round(days * 86400) : 0,
      maxAccesses
    };
    if (shareEditId) {
      body.id = shareEditId;
      body.passwordMode = clearPassword ? 'clear' : (password ? 'set' : 'keep');
      if (password) body.password = password;
    } else {
      body.password = password;
    }
    const res = await fetch(shareEditId ? '/api/shares?id=' + encodeURIComponent(shareEditId) : '/api/shares', {
      method: shareEditId ? 'PUT' : 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.share?.url) throw new Error(data.error || 'share failed');
    createdShareLink = location.origin + data.share.url;
    const linkInput = document.getElementById('shareLinkInput');
    const result = document.getElementById('shareResult');
    if (linkInput) {
      linkInput.value = createdShareLink;
      linkInput.select();
    }
    result?.classList.add('open');
    await navigator.clipboard.writeText(createdShareLink).catch(() => {});
    showSnackbar(shareEditId ? '分享设置已更新' : '分享链接已创建并复制');
    await loadSharesForTarget(shareTargetPathValue, data.share.id);
  } catch (err) {
    showSnackbar((shareEditId ? '更新分享失败：' : '创建分享失败：') + (err.message || '未知错误'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = shareEditId
        ? '<span class="material-icons-round">save</span> 保存修改'
        : '<span class="material-icons-round">ios_share</span> 创建分享';
    }
  }
}
function copyCreatedShareLink() {
  const link = createdShareLink || document.getElementById('shareLinkInput')?.value || '';
  if (!link) return;
  navigator.clipboard.writeText(link).then(() => showSnackbar('分享链接已复制'));
}
function shareAbsoluteUrl(share) {
  return location.origin + (share?.url || ('/s/' + share?.id));
}
function shareMetaText(share) {
  const expires = share.expiresAt ? ('有效期至 ' + formatDate(share.expiresAt)) : '长期有效';
  const limit = share.maxAccesses ? ('访问 ' + (share.accessCount || 0) + ' / ' + share.maxAccesses + ' 次') : ('已访问 ' + (share.accessCount || 0) + ' 次');
  const pwd = share.hasPassword ? '需要密码' : '无需密码';
  const inactive = share.inactiveReason ? (' · 已失效：' + share.inactiveReason) : '';
  return pwd + ' · ' + expires + ' · ' + limit + inactive;
}
function renderShareRecords(shares = []) {
  const list = document.getElementById('shareRecords');
  if (!list) return;
  if (!shares.length) {
    list.innerHTML = '<div class="share-record-empty">暂无分享记录</div>';
    return;
  }
  list.innerHTML = '';
  shares.forEach(share => {
    const row = document.createElement('div');
    row.className = 'share-record-row' + (share.id === shareEditId ? ' editing' : '');

    const top = document.createElement('div');
    top.className = 'share-record-top';
    const icon = document.createElement('span');
    icon.className = 'material-icons-round';
    icon.textContent = share.hasPassword ? 'lock' : 'link';
    const url = document.createElement('div');
    url.className = 'share-record-url';
    url.title = shareAbsoluteUrl(share);
    url.textContent = shareAbsoluteUrl(share);
    top.append(icon, url);

    const meta = document.createElement('div');
    meta.className = 'share-record-meta';
    meta.textContent = shareMetaText(share);

    const actions = document.createElement('div');
    actions.className = 'share-record-actions';
    const actionDefs = [
      ['content_copy', '复制', () => copyShareRecordLink(share.id)],
      ['edit', '编辑', () => editShareRecord(share.id)],
      ['refresh', '刷新链接', () => refreshShareRecord(share.id)],
      ['link_off', '取消分享', () => deleteShareRecord(share.id)]
    ];
    actionDefs.forEach(([iconName, label, handler]) => {
      const btn = document.createElement('button');
      btn.className = 'btn-outlined';
      btn.type = 'button';
      btn.innerHTML = '<span class="material-icons-round">' + iconName + '</span> ' + label;
      btn.addEventListener('click', handler);
      actions.appendChild(btn);
    });

    row.append(top, meta, actions);
    list.appendChild(row);
  });
}
async function loadSharesForTarget(path, highlightId = '') {
  const list = document.getElementById('shareRecords');
  if (list) list.innerHTML = '<div class="share-record-empty">正在加载分享记录...</div>';
  try {
    const res = await fetch('/api/shares?path=' + encodeURIComponent(path || ''));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'load shares failed');
    shareRecordsCache = Array.isArray(data.shares) ? data.shares : [];
    if (highlightId) shareEditId = highlightId;
    renderShareRecords(shareRecordsCache);
  } catch (err) {
    if (list) list.innerHTML = '<div class="share-record-empty">分享记录加载失败</div>';
  }
}
function copyShareRecordLink(id) {
  const share = shareRecordsCache.find(item => item.id === id);
  if (!share) return;
  navigator.clipboard.writeText(shareAbsoluteUrl(share)).then(() => showSnackbar('分享链接已复制'));
}
function editShareRecord(id) {
  const share = shareRecordsCache.find(item => item.id === id);
  if (!share) return;
  shareEditId = id;
  createdShareLink = shareAbsoluteUrl(share);
  const password = document.getElementById('sharePasswordInput');
  const days = document.getElementById('shareDaysInput');
  const maxAccess = document.getElementById('shareMaxAccessInput');
  const clearPassword = document.getElementById('shareClearPasswordInput');
  const clearLabel = document.getElementById('shareClearPasswordLabel');
  const hint = document.getElementById('sharePasswordHint');
  const linkInput = document.getElementById('shareLinkInput');
  const result = document.getElementById('shareResult');
  const btn = document.getElementById('shareCreateBtn');
  const newBtn = document.getElementById('shareNewBtn');
  if (password) {
    password.value = '';
    password.placeholder = share.hasPassword ? '留空则保留原密码' : '输入新密码';
  }
  if (days) days.value = daysFromExpiresAt(share.expiresAt);
  if (maxAccess) maxAccess.value = share.maxAccesses || '';
  if (clearPassword) clearPassword.checked = false;
  if (clearLabel) clearLabel.style.display = share.hasPassword ? 'flex' : 'none';
  if (hint) hint.textContent = '编辑分享时，密码留空表示保持不变';
  if (linkInput) linkInput.value = createdShareLink;
  result?.classList.add('open');
  if (btn) btn.innerHTML = '<span class="material-icons-round">save</span> 保存修改';
  if (newBtn) newBtn.style.display = '';
  renderShareRecords(shareRecordsCache);
}
async function deleteShareRecord(id) {
  const btnShare = shareRecordsCache.find(item => item.id === id);
  if (!btnShare) return;
  try {
    const res = await fetch('/api/shares?id=' + encodeURIComponent(id), { method: 'DELETE', headers: CSRF_HEADER });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'delete failed');
    if (shareEditId === id) resetShareForm();
    showSnackbar('分享已取消');
    await loadSharesForTarget(shareTargetPathValue);
  } catch (err) {
    showSnackbar('取消分享失败：' + (err.message || '未知错误'));
  }
}
async function refreshShareRecord(id) {
  try {
    const res = await fetch('/api/shares/refresh', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.share?.url) throw new Error(data.error || 'refresh failed');
    createdShareLink = shareAbsoluteUrl(data.share);
    const linkInput = document.getElementById('shareLinkInput');
    const result = document.getElementById('shareResult');
    if (linkInput) linkInput.value = createdShareLink;
    result?.classList.add('open');
    await navigator.clipboard.writeText(createdShareLink).catch(() => {});
    shareEditId = data.share.id;
    showSnackbar('分享链接已刷新并复制');
    await loadSharesForTarget(shareTargetPathValue, data.share.id);
  } catch (err) {
    showSnackbar('刷新链接失败：' + (err.message || '未知错误'));
  }
}
function selectedPathFromName(name) {
  return currentPath ? currentPath + '/' + name : name;
}
async function createShareForPath(path) {
  openShareModal(path);
}
function shareSelected() {
  if (selectedFiles.size !== 1) { showSnackbar('请选择一个文件或目录再分享'); return; }
  createShareForPath(selectedPathFromName([...selectedFiles][0]));
}
function ctxShare() {
  if (!ctxTarget) return;
  createShareForPath(selectedPathFromName(ctxTarget));
}
function ctxDelete() {
  if (!ctxTarget) return;
  if (!confirm('确定删除 "' + ctxTarget + '"？')) return;
  const path = currentPath ? currentPath + '/' + ctxTarget : ctxTarget;
  fetch('/api/delete?path=' + encodeURIComponent(path), { method: 'DELETE', headers: CSRF_HEADER })
    .then(r => r.ok ? (showSnackbar('已删除'), location.reload()) : showSnackbar('删除失败'));
}

// ── Upload ──
function openUpload() { document.getElementById('uploadModal')?.classList.add('open'); }
function closeUpload() { document.getElementById('uploadModal')?.classList.remove('open'); }
function openNewFolder() { document.getElementById('newFolderModal')?.classList.add('open'); setTimeout(() => document.getElementById('folderNameInput')?.focus(), 100); }
function closeNewFolder() { document.getElementById('newFolderModal')?.classList.remove('open'); }

function handleDrop(e) {
  e.preventDefault();
  document.querySelector('.upload-zone')?.classList.remove('drag-over');
  uploadFiles(e.dataTransfer.files);
}
function handleDragOver(e) { e.preventDefault(); document.querySelector('.upload-zone')?.classList.add('drag-over'); }
function handleDragLeave() { document.querySelector('.upload-zone')?.classList.remove('drag-over'); }
function handleFileInput(e) { uploadFiles(e.target.files); }

const DIRECT_UPLOAD_LIMIT = 512 * 1024; // 512 KB - 小于此大小的文件直传主 R2，大于则走分布式存储
const MULTIPART_DEFAULT_CHUNK = 32 * 1024 * 1024;
const MULTIPART_MAX_CHUNK = 90 * 1024 * 1024;
const MULTIPART_MAX_PARTS = 10000;

function uploadFiles(files) {
  if (!files.length) return;
  const list = document.getElementById('progressList');
  if (list) list.innerHTML = '';
  const tasks = [...files].map(file => {
    const item = document.createElement('div'); item.className = 'progress-item';
    const nameRow = document.createElement('div'); nameRow.className = 'progress-item-name';
    const nameSpan = document.createElement('span'); nameSpan.textContent = file.name;
    const pctSpan = document.createElement('span'); pctSpan.textContent = '0%';
    nameRow.append(nameSpan, pctSpan);
    const bar = document.createElement('div'); bar.className = 'progress-bar';
    const fill = document.createElement('div'); fill.className = 'progress-fill'; fill.style.width = '0%';
    bar.append(fill); item.append(nameRow, bar);
    if (list) list.append(item);

    const path = currentPath ? currentPath + '/' + file.name : file.name;
    return uploadSingleFile(file, path, fill, pctSpan);
  });

  Promise.allSettled(tasks).then(results => {
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length) {
      const message = failed[0].reason?.message || '上传失败';
      showSnackbar(failed.length + ' 个文件上传失败：' + message);
      return;
    }
    showSnackbar('上传完成', '刷新', () => location.reload());
  });
}

function uploadSingleFile(file, path, fill, pctSpan) {
  if (file.size <= DIRECT_UPLOAD_LIMIT) {
    return uploadDirect(file, path, fill, pctSpan);
  }
  // 优先走分布式存储，失败时给出明确提示再回退到 R2 分片上传
  return uploadDistributed(file, path, fill, pctSpan)
    .catch(err => {
      console.warn('[分布式上传失败，回退到主 R2 分片上传]', err?.message || err);
      showSnackbar('分布式存储不可用，使用主 R2 上传', '', null);
      return uploadMultipart(file, path, fill, pctSpan);
    });
}

function uploadErrorMessage(xhr, fallback = 'upload failed') {
  const text = xhr.responseText || '';
  if (!text) return fallback;
  try {
    const data = JSON.parse(text);
    return data.error || data.message || fallback;
  } catch {
    return text.slice(0, 200) || fallback;
  }
}

async function fetchErrorMessage(res, fallback) {
  const text = await res.text().catch(() => '');
  if (!text) return fallback;
  try {
    const data = JSON.parse(text);
    return data.error || data.message || fallback;
  } catch {
    return text.slice(0, 200) || fallback;
  }
}

function uploadDirect(file, path, fill, pctSpan) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload?path=' + encodeURIComponent(path));
    xhr.setRequestHeader('X-R2Drive-CSRF', 'same-origin');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const pct = Math.round(e.loaded / e.total * 100);
        fill.style.width = pct + '%'; pctSpan.textContent = pct + '%';
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        fill.classList.add('done'); pctSpan.textContent = '✓'; resolve();
      } else {
        fill.classList.add('error'); pctSpan.textContent = '✗'; reject(new Error(uploadErrorMessage(xhr)));
      }
    };
    xhr.onerror = () => {
      fill.classList.add('error'); pctSpan.textContent = '✗'; reject(new Error('upload failed'));
    };
    xhr.send(file);
  });
}

async function uploadMultipart(file, path, fill, pctSpan) {
  const chunkSize = Math.min(MULTIPART_MAX_CHUNK, Math.max(MULTIPART_DEFAULT_CHUNK, Math.ceil(file.size / MULTIPART_MAX_PARTS)));
  const totalParts = Math.ceil(file.size / chunkSize);
  if (totalParts > MULTIPART_MAX_PARTS) {
    fill.classList.add('error'); pctSpan.textContent = '文件过大';
    throw new Error('too many multipart chunks');
  }

  let uploadId = '';
  const parts = [];
  let uploadedBytes = 0;

  try {
    const initRes = await fetch('/api/multipart/init', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ path, contentType: file.type || '' })
    });
    if (!initRes.ok) throw new Error(await fetchErrorMessage(initRes, 'multipart init failed'));
    const initData = await initRes.json();
    uploadId = initData.uploadId;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const part = await uploadMultipartPart(path, uploadId, partNumber, chunk, loaded => {
        const pct = Math.min(99, Math.round((uploadedBytes + loaded) / file.size * 100));
        fill.style.width = pct + '%';
        pctSpan.textContent = pct + '%';
      });
      uploadedBytes += chunk.size;
      parts.push(part);
    }

    const completeRes = await fetch('/api/multipart/complete', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ path, uploadId, parts })
    });
    if (!completeRes.ok) throw new Error(await fetchErrorMessage(completeRes, 'multipart complete failed'));
    fill.style.width = '100%';
    fill.classList.add('done');
    pctSpan.textContent = '✓';
  } catch (err) {
    if (uploadId) {
      fetch('/api/multipart/abort', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ path, uploadId })
      }).catch(() => {});
    }
    fill.classList.add('error');
    pctSpan.textContent = '✗';
    throw err;
  }
}

function uploadMultipartPart(path, uploadId, partNumber, chunk, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = '/api/multipart/part?path=' + encodeURIComponent(path)
      + '&uploadId=' + encodeURIComponent(uploadId)
      + '&partNumber=' + partNumber;
    xhr.open('POST', url);
    xhr.setRequestHeader('X-R2Drive-CSRF', 'same-origin');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error(uploadErrorMessage(xhr, 'multipart part failed')));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('multipart part failed'));
    xhr.send(chunk);
  });
}

async function uploadDistributed(file, path, fill, pctSpan) {
  const chunkSize = Math.min(MULTIPART_MAX_CHUNK, Math.max(MULTIPART_DEFAULT_CHUNK, Math.ceil(file.size / MULTIPART_MAX_PARTS)));
  const totalParts = Math.ceil(file.size / chunkSize);
  if (totalParts > MULTIPART_MAX_PARTS) throw new Error('too many distributed chunks');

  const initRes = await fetch('/api/distributed/init', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      path,
      size: file.size,
      contentType: file.type || '',
      chunkSize,
      parts: totalParts
    })
  });
  if (!initRes.ok) {
    const errMsg = await fetchErrorMessage(initRes, '分布式存储不可用');
    throw new Error(errMsg + (initRes.status === 409 ? '（文件过小）' : ''));
  }
  const session = await initRes.json();
  const sessionId = session.sessionId;

  // 打印分片分布情况到控制台，便于确认是否真正分布
  if (session.distribution && session.distribution.length > 0) {
    const totalBytes = session.distribution.reduce((s, d) => s + d.bytes, 0);
    console.log('[分布式存储] 分片分布 (' + formatSize(totalBytes) + ')：',
      session.distribution.map(d => d.nodeName + ': ' + d.parts + ' 个分片, ' + formatSize(d.bytes)).join(' | '));
  }

  let uploadedBytes = 0;
  try {
    for (let index = 0; index < totalParts; index++) {
      const partInfo = session.parts[index];
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      await uploadDistributedPart(partInfo, chunk, loaded => {
        const pct = Math.min(99, Math.round((uploadedBytes + loaded) / file.size * 100));
        fill.style.width = pct + '%';
        pctSpan.textContent = pct + '%';
      });
      uploadedBytes += chunk.size;
    }

    const completeRes = await fetch('/api/distributed/complete', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ sessionId })
    });
    if (!completeRes.ok) throw new Error(await fetchErrorMessage(completeRes, 'distributed complete failed'));
    fill.style.width = '100%';
    fill.classList.add('done');
    pctSpan.textContent = '✓';
  } catch (err) {
    if (sessionId) {
      await fetch('/api/distributed/abort', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ sessionId })
      }).catch(() => {});
    }
    throw err;
  }
}

function uploadDistributedPart(partInfo, chunk, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', partInfo.uploadUrl);
    if (String(partInfo.uploadUrl || '').startsWith('/')) xhr.setRequestHeader('X-R2Drive-CSRF', 'same-origin');
    if (partInfo.token) xhr.setRequestHeader('Authorization', 'Bearer ' + partInfo.token);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('分片 ' + (partInfo.partNumber || '?') + ' 上传失败 (HTTP ' + xhr.status + ')：' + (xhr.responseText || '').slice(0, 120)));
    };
    xhr.onerror = () => reject(new Error('分片 ' + (partInfo.partNumber || '?') + ' 网络错误：' + partInfo.uploadUrl));
    xhr.send(chunk);
  });
}

function openStorageNodes() {
  document.getElementById('storageNodesModal')?.classList.add('open');
  backToNodeList();
  loadStorageNodes();
}
function closeStorageNodes() {
  document.getElementById('storageNodesModal')?.classList.remove('open');
  // Reset R2 file viewer state
  backToNodeList();
}
async function loadStorageNodes() {
  const list = document.getElementById('storageNodeList');
  if (!list) return;
  list.innerHTML = '<div class="node-row"><div class="node-row-main"><div class="node-row-sub">加载中...</div></div></div>';
  try {
    const res = await fetch('/api/storage-nodes');
    // 尝试解析 JSON，如果响应不是 JSON（如 Worker 崩溃返回的 HTML），则优雅降级
    let data;
    try {
      data = await res.json();
    } catch {
      // 响应不是有效 JSON，可能服务器出错
      if (list) list.innerHTML = '<div class="node-row"><div class="node-row-main"><div class="node-row-sub">服务器响应异常，请刷新页面重试</div></div></div>';
      return;
    }
    if (!res.ok) {
      throw new Error(data?.error || 'HTTP ' + res.status);
    }
    const externalNodes = Array.isArray(data?.nodes) ? data.nodes : [];
    // Always include main account as the first node
    const allNodes = [
      { id: 'main', name: '主控账号', url: '本地 R2 存储桶', enabled: true },
      ...externalNodes
    ];
    renderStorageNodes(allNodes);
  } catch (err) {
    console.warn('loadStorageNodes failed:', err?.message || err);
    if (list) list.innerHTML = '<div class="node-row"><div class="node-row-main"><div class="node-row-sub">加载失败：' + escapeHtml((err?.message || '网络错误').slice(0, 40)) + '</div></div></div>';
  }
}
function renderStorageNodes(nodes) {
  const list = document.getElementById('storageNodeList');
  if (!list) return;
  if (!nodes.length) {
    list.innerHTML = '<div class="node-row"><div class="node-row-main"><div class="node-row-sub">暂无存储节点，大于 512KB 的文件将分布到外部节点</div></div></div>';
    return;
  }
  list.innerHTML = '';
  nodes.forEach(node => {
    const isMain = node.id === 'main';
    const row = document.createElement('div');
    row.className = 'node-row';
    const main = document.createElement('div');
    main.className = 'node-row-main';
    const title = document.createElement('div');
    title.className = 'node-row-title';
    title.textContent = node.name || node.id || '';
    const sub = document.createElement('div');
    sub.className = 'node-row-sub';
    sub.textContent = isMain ? '本地 R2 存储桶' : ((node.url || '') + ' \u00B7 ' + (node.enabled !== false ? '启用' : '停用'));
    main.append(title, sub);

    const viewBtn = document.createElement('button');
    viewBtn.className = 'icon-btn';
    viewBtn.title = '查看R2文件';
    viewBtn.innerHTML = '<span class="material-icons-round">folder_open</span>';
    viewBtn.addEventListener('click', function() {
      viewNodeR2Files(node.id, node.name || node.id);
    });

    row.append(main, viewBtn);

    // Only add test/delete for external nodes
    if (!isMain) {
      const testBtn = document.createElement('button');
      testBtn.className = 'icon-btn';
      testBtn.title = '测试';
      testBtn.innerHTML = '<span class="material-icons-round">network_check</span>';
      testBtn.addEventListener('click', function() {
        testStorageNode(node.id);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = '删除';
      delBtn.innerHTML = '<span class="material-icons-round">delete_outline</span>';
      delBtn.addEventListener('click', function() {
        deleteStorageNode(node.id);
      });

      row.append(testBtn, delBtn);
    }

    list.appendChild(row);
  });
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
async function saveStorageNode() {
  const name = document.getElementById('nodeNameInput')?.value?.trim();
  const url = document.getElementById('nodeUrlInput')?.value?.trim();
  const token = document.getElementById('nodeTokenInput')?.value?.trim();
  if (!name || !url || !token) { showSnackbar('请填写节点名称、地址和密钥'); return; }
  const res = await fetch('/api/storage-nodes', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, url, token })
  });
  if (!res.ok) { showSnackbar('保存节点失败'); return; }
  document.getElementById('nodeNameInput').value = '';
  document.getElementById('nodeUrlInput').value = '';
  document.getElementById('nodeTokenInput').value = '';
  showSnackbar('节点已保存');
  loadStorageNodes();
}
async function deleteStorageNode(id) {
  if (!confirm('确定删除这个存储节点？')) return;
  const res = await fetch('/api/storage-nodes?id=' + encodeURIComponent(id), { method: 'DELETE', headers: CSRF_HEADER });
  showSnackbar(res.ok ? '节点已删除' : '删除节点失败');
  loadStorageNodes();
}
async function testStorageNode(id) {
  const res = await fetch('/api/storage-nodes/test?id=' + encodeURIComponent(id), { method: 'POST', headers: CSRF_HEADER });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    showSnackbar('节点正常，容量 ' + formatSize(data.used || 0) + ' / ' + formatSize(data.total || STORAGE_TOTAL));
  } else if (data.ping && data.storage === false) {
    showSnackbar('节点可连接，但容量接口不可用，请更新节点 Worker');
  } else {
    showSnackbar('节点连接失败');
  }
}

// ── R2 File Viewer ──
let r2fileViewNodeId = '';
let r2fileViewNodeName = '';
let r2fileCursor = null;
let r2fileTruncated = false;
let r2fileAllObjects = [];

function viewNodeR2Files(nodeId, nodeName) {
  r2fileViewNodeId = nodeId;
  r2fileViewNodeName = nodeName;
  r2fileCursor = null;
  r2fileTruncated = false;
  r2fileAllObjects = [];

  // Show R2 file view, hide node list and form
  const nodeList = document.getElementById('storageNodeList');
  const nodeForm = document.querySelector('.node-form-grid');
  const r2fileView = document.getElementById('r2fileView');
  const r2fileTitle = document.getElementById('r2fileTitle');

  if (nodeList) nodeList.style.display = 'none';
  if (nodeForm) nodeForm.style.display = 'none';
  if (r2fileView) r2fileView.classList.add('open');
  if (r2fileTitle) r2fileTitle.textContent = 'R2 文件 — ' + escapeHtml(nodeName);

  document.getElementById('r2fileList').innerHTML = '<div style="padding:16px;color:var(--on-surface-variant);text-align:center">加载中...</div>';
  document.getElementById('r2fileStats').textContent = '';
  document.getElementById('r2fileLoadMore').style.display = 'none';

  loadNodeR2Files();
}

function backToNodeList() {
  const nodeList = document.getElementById('storageNodeList');
  const nodeForm = document.querySelector('.node-form-grid');
  const r2fileView = document.getElementById('r2fileView');

  if (nodeList) nodeList.style.display = '';
  if (nodeForm) nodeForm.style.display = '';
  if (r2fileView) r2fileView.classList.remove('open');

  r2fileViewNodeId = '';
  r2fileViewNodeName = '';
  r2fileCursor = null;
  r2fileAllObjects = [];
}

async function loadNodeR2Files() {
  const list = document.getElementById('r2fileList');
  const stats = document.getElementById('r2fileStats');
  const loadMore = document.getElementById('r2fileLoadMore');
  const loadBtn = document.getElementById('r2fileLoadBtn');
  if (!list) return;

  if (!r2fileCursor) {
    list.innerHTML = '<div style="padding:16px;color:var(--on-surface-variant);text-align:center"><span class="material-icons-round" style="animation:spin 1s linear infinite;display:block;margin:0 auto 8px">sync</span>正在获取文件列表...</div>';
  } else {
    if (loadBtn) { loadBtn.disabled = true; loadBtn.textContent = '加载中...'; }
  }

  try {
    const params = new URLSearchParams();
    params.set('id', r2fileViewNodeId);
    params.set('limit', '100');
    if (r2fileCursor) params.set('cursor', r2fileCursor);
    const res = await fetch('/api/storage-nodes/r2-files?' + params.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);

    const objects = Array.isArray(data.objects) ? data.objects : [];
    r2fileTruncated = !!data.truncated;
    r2fileCursor = data.cursor || null;

    if (!r2fileAllObjects.length) {
      r2fileAllObjects = objects;
    } else {
      r2fileAllObjects = r2fileAllObjects.concat(objects);
    }

    const totalSize = r2fileAllObjects.reduce((sum, o) => sum + (o.size || 0), 0);
    if (stats) {
      stats.textContent = '共 ' + r2fileAllObjects.length + ' 个对象，总大小 ' + formatSize(totalSize) +
        (r2fileTruncated ? '（还有更多...）' : '');
    }

    renderNodeR2Files(r2fileAllObjects);

    if (loadMore) {
      loadMore.style.display = r2fileTruncated ? '' : 'none';
    }
  } catch (err) {
    if (list) list.innerHTML = '<div style="padding:16px;color:var(--error);text-align:center">加载失败：' + escapeHtml(err.message || '未知错误') + '</div>';
  } finally {
    if (loadBtn) { loadBtn.disabled = false; loadBtn.textContent = '加载更多...'; }
  }
}

function renderNodeR2Files(objects) {
  const list = document.getElementById('r2fileList');
  if (!list) return;

  if (!objects.length) {
    list.innerHTML = '<div style="padding:24px;color:var(--on-surface-variant);text-align:center">此节点暂无 R2 对象</div>';
    return;
  }

  list.innerHTML = objects.map(function(o) {
    return '<div class="r2file-row">' +
      '<span class="r2file-key" title="' + escapeHtml(o.key) + '">' + escapeHtml(o.key) + '</span>' +
      '<span class="r2file-size">' + formatSize(o.size) + '</span>' +
      '</div>';
  }).join('');
}

function createFolder() {
  const name = document.getElementById('folderNameInput')?.value?.trim();
  if (!name) return;
  const path = currentPath ? currentPath + '/' + name : name;
  fetch('/api/mkdir', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({path}) })
    .then(r => r.ok ? (showSnackbar('文件夹已创建'), location.reload()) : showSnackbar('创建失败'));
}

// ── Sort ──
function sortTable(by) {
  if (sortBy === by) sortDir *= -1; else { sortBy = by; sortDir = 1; }
  const tbody = document.querySelector('.file-list tbody');
  if (!tbody) return;
  const rows = [...tbody.querySelectorAll('tr')];
  rows.sort((a, b) => {
    const aVal = a.dataset[by] || ''; const bVal = b.dataset[by] || '';
    if (by === 'size') return (parseInt(aVal) - parseInt(bVal)) * sortDir;
    return aVal.localeCompare(bVal, 'zh-CN') * sortDir;
  });
  rows.forEach(r => tbody.append(r));
}

// ── Logout ──
function logout() { fetch('/api/logout', { method: 'POST', headers: CSRF_HEADER }).then(() => location.href = '/login'); }

// ── Version Check ──
const CURRENT_VERSION = '1.1.9';
const CURRENT_VERSION_CODE = 119;
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/HandsomeMJZ/R2-Cloud-Drive/refs/heads/main/version.json';
const VERSION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes between auto checks

async function checkVersionUpdate(force = false) {
  const badge = document.getElementById('versionBadge');
  const tooltipBody = document.getElementById('versionTooltipBody');
  if (!badge || !tooltipBody) return;

  // Skip check if we already checked recently (unless forced)
  const lastCheck = sessionStorage.getItem('r2versionLastCheck');
  if (!force && lastCheck && Date.now() - parseInt(lastCheck) < VERSION_CHECK_INTERVAL) {
    const cached = sessionStorage.getItem('r2versionCached');
    if (cached) {
      try { applyVersionResult(JSON.parse(cached), parseInt(lastCheck)); } catch {/* ignore */}
      return;
    }
  }

  if (tooltipBody) tooltipBody.textContent = '正在检查更新...';

  try {
    const res = await fetch(VERSION_CHECK_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const now = Date.now();
    sessionStorage.setItem('r2versionLastCheck', String(now));
    sessionStorage.setItem('r2versionCached', JSON.stringify(data));
    applyVersionResult(data, now);
  } catch (err) {
    console.warn('[versionCheck] fetch failed:', err.message || err);
    if (tooltipBody) tooltipBody.textContent = '无法获取最新版本信息，请检查网络连接。点击此处重试。';
  }
}

function applyVersionResult(data, checkedAt) {
  const badge = document.getElementById('versionBadge');
  const tooltipBody = document.getElementById('versionTooltipBody');
  const tooltipLink = document.getElementById('versionTooltipLink');

  const latestVersion = data.version || '?';
  const latestCode = Number(data.versionCode || 0);
  const releaseDate = data.releaseDate || '';
  const releaseNotes = data.releaseNotes || '暂无更新说明';
  const downloadUrl = data.downloadUrl || 'https://github.com/HandsomeMJZ/R2-Cloud-Drive';

  const agoMin = checkedAt ? Math.max(0, Math.floor((Date.now() - checkedAt) / 60000)) : 0;
  const agoStr = agoMin < 1 ? '刚刚' : (agoMin + ' 分钟前');

  if (latestCode > CURRENT_VERSION_CODE) {
    if (badge) badge.classList.add('show');
    if (tooltipBody) {
      tooltipBody.innerHTML =
        '<span style="color:var(--error);font-weight:600">发现新版本 v' + escapeHtml(latestVersion) + '</span><br>' +
        '当前版本：v' + escapeHtml(CURRENT_VERSION) + '<br>' +
        '发布日期：' + escapeHtml(releaseDate || '未知') + '<br>' +
        '<span style="display:block;margin-top:6px;padding-top:6px;border-top:1px solid var(--outline)">' + escapeHtml(releaseNotes) + '</span>' +
        '<span style="display:block;margin-top:8px;font-size:11px;color:var(--on-surface-variant)">上次检查：' + agoStr + ' · 点击版本号重新检查</span>';
    }
    if (tooltipLink) {
      tooltipLink.href = downloadUrl;
      tooltipLink.textContent = '前往下载最新版本 →';
    }
  } else {
    if (badge) badge.classList.remove('show');
    if (tooltipBody) {
      tooltipBody.innerHTML =
        '<span style="color:var(--success);font-weight:600">已是最新版本</span><br>' +
        '当前版本：v' + escapeHtml(CURRENT_VERSION) + '<br>' +
        '远程版本：v' + escapeHtml(latestVersion) +
        '<span style="display:block;margin-top:6px;font-size:11px;color:var(--on-surface-variant)">上次检查：' + agoStr + ' · 点击版本号重新检查</span>';
    }
    if (tooltipLink) {
      tooltipLink.textContent = '前往 GitHub 查看 →';
    }
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setView(viewMode);
  currentPath = decodeURIComponent(new URLSearchParams(location.search).get('path') || '');
  initDarkMode();
  checkClipboardFromStore();
  updateStorageInfo();
  updateActionBar();
  checkVersionUpdate();
  // Click version info to force re-check
  document.getElementById('versionInfo')?.addEventListener('click', (e) => {
    e.stopPropagation();
    checkVersionUpdate(true);
  });
});
</script>
</body>
</html>`;
}

function renderLoginPage(error = '', siteTitle = 'R2 云盘', cloudIconUrl = '', loginBackgroundUrl = '') {
  const bgUrl = String(loginBackgroundUrl || '').trim();
  const loginBg = bgUrl
    ? `<img class="login-bg-image" src="${escapeAttr(bgUrl)}" alt="" aria-hidden="true">`
    : '';
  return renderHTML(`
<div class="login-wrap">
  ${loginBg}
  <button class="icon-btn login-theme-toggle" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
    <span class="material-icons-round">dark_mode</span>
  </button>
  <div class="login-card">
    <div class="login-logo">
      ${renderLogoIcon(cloudIconUrl)}
      <h1 class="login-title">${siteTitle}</h1>
      <p class="login-sub">安全访问您的云端文件</p>
    </div>
    <label class="field-label" for="pwd">访问密码</label>
    <input class="text-field" id="pwd" type="password" placeholder="请输入密码" autofocus
      onkeydown="if(event.key==='Enter')login()">
        <p class="login-error" id="loginError">${error}</p>
    <button class="login-btn" onclick="login()">登录</button>
    <div style="margin-top:24px;font-size:13px;color:var(--on-surface-variant)">
      <a href="/shared" style="color:var(--primary);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:4px">
        <span class="material-icons-round" style="font-size:16px">folder_shared</span> 访问共享文件夹
      </a>
    </div>
  </div>
</div>
<script>
function login() {
  const pwd = document.getElementById('pwd').value;
  fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password: pwd}) })
    .then(r => r.json()).then(d => {
      if (d.ok) location.href = '/'; else document.getElementById('loginError').textContent = '密码错误，请重试';
    });
}
</script>
`, siteTitle + ' - 登录');
}

// ── Shared Folder Page (public, download only) ──
function renderSharedPage(folders, files, currentPath, siteTitle, cloudIconUrl = '') {
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
  const sharedBase = '/shared';
  const sharedPrefix = SHARED_PREFIX;

  const breadcrumb = `<nav class="breadcrumb">
    <div class="breadcrumb-item">
      <a class="breadcrumb-link" href="${sharedBase}">
        <span class="material-icons-round" style="font-size:18px;vertical-align:middle">folder_shared</span> 共享文件夹
      </a>
    </div>
    ${pathParts.map((part, i) => {
      const href = sharedBase + '/?path=' + encodeURIComponent(pathParts.slice(0, i + 1).join('/'));
      const isLast = i === pathParts.length - 1;
      return `<div class="breadcrumb-item">
        <span class="material-icons-round breadcrumb-sep">chevron_right</span>
        ${isLast ? `<span class="breadcrumb-current">${escapeHtml(part)}</span>` : `<a class="breadcrumb-link" href="${escapeAttr(href)}">${escapeHtml(part)}</a>`}
      </div>`;
    }).join('')}
  </nav>`;

  const isEmpty = folders.length === 0 && files.length === 0;

  return renderHTML(`
<header class="app-bar">
  <a class="app-bar-logo" href="${sharedBase}">
    ${renderLogoIcon(cloudIconUrl)}
    <span class="app-bar-title">${siteTitle} - 共享</span>
  </a>
  <div class="app-bar-spacer"></div>
  <div class="app-bar-actions">
    <button class="icon-btn" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
      <span class="material-icons-round">dark_mode</span>
    </button>
    <button class="icon-btn" title="登录管理" onclick="location.href='/'">
      <span class="material-icons-round">login</span>
    </button>
  </div>
</header>

<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-section">
      <a class="sidebar-item active" href="${sharedBase}">
        <span class="material-icons-round">folder_shared</span> 共享文件夹
      </a>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      <div class="sidebar-label">提示</div>
      <div class="sidebar-item" style="cursor:default;color:var(--on-surface-variant);font-weight:400;font-size:13px;line-height:1.5;padding:8px 16px;height:auto;border-radius:8px;">
        此文件夹内容公开共享，仅支持下载查看。如需管理文件，请登录账号。
      </div>
    </div>
  </nav>

  <main class="main">
    ${breadcrumb}

        <div class="toolbar">
      <div class="toolbar-right">
        <div class="view-toggle">
          <button class="view-toggle-btn" data-view="grid" onclick="setView('grid')" title="网格视图">
            <span class="material-icons-round">grid_view</span>
          </button>
          <button class="view-toggle-btn" data-view="list" onclick="setView('list')" title="列表视图">
            <span class="material-icons-round">view_list</span>
          </button>
        </div>
      </div>
    </div>

    <div class="action-bar download-only" id="actionBar">
      <div class="download-progress" id="downloadProgress" aria-live="polite">
        <span class="material-icons-round">downloading</span>
        <div class="download-progress-main">
          <div class="download-progress-top">
            <span class="download-progress-name" id="downloadProgressName"></span>
            <span class="download-progress-stats" id="downloadProgressStats"></span>
          </div>
          <div class="download-progress-bar">
            <div class="download-progress-fill" id="downloadProgressFill"></div>
          </div>
        </div>
      </div>
    </div>

    ${isEmpty ? `
    <div class="empty-state">
      <span class="material-icons-round">folder_shared</span>
      <h3>共享文件夹为空</h3>
      <p>管理员尚未分享任何文件到共享文件夹</p>
    </div>
    ` : `
    <!-- Grid View -->
    <div id="fileGrid" class="file-grid">
      ${folders.map(name => {
        const href = sharedBase + '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
        return `<div class="file-card" onclick="${jsAttr(`location.href=${jsString(href)}`)}">
          <div class="file-card-icon" style="background:#FFF8E1">
            <span class="material-icons-round" style="color:#F9AB00;font-size:32px">folder</span>
          </div>
          <div class="file-card-name">${escapeHtml(name)}</div>
          <div class="file-card-meta"><span>文件夹</span></div>
        </div>`;
      }).join('')}
            ${files.map(file => {
        const { icon, color } = getFileIcon(file.name);
                const dlPath = sharedPrefix + '/' + (currentPath ? currentPath + '/' + file.name : file.name);
        const size = Number(file.size) || 0;
        return `<div class="file-card" onclick="${jsAttr(`startDownload(${jsString(dlPath)}, ${size})`)}">
          <div class="file-card-icon" style="background:${color}18">
            <span class="material-icons-round" style="color:${color};font-size:32px">${icon}</span>
          </div>
          <div class="file-card-name" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-card-meta">
            <span>${formatSize(size)}</span>
            <span>${formatDate(file.uploaded)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- List View -->
    <div id="fileList" style="display:none">
      <table class="file-list">
        <thead>
          <tr>
            <th><div class="th-inner">名称</div></th>
            <th><div class="th-inner">大小</div></th>
            <th><div class="th-inner">修改时间</div></th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          ${folders.map(name => {
            const href = sharedBase + '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
            return `<tr>
              <td><div class="file-row-icon">
                <span class="material-icons-round" style="color:#F9AB00;font-size:22px">folder</span>
                <span class="file-row-name" onclick="${jsAttr(`location.href=${jsString(href)}`)}">${escapeHtml(name)}</span>
              </div></td>
              <td class="file-row-meta">—</td>
              <td class="file-row-meta">—</td>
              <td></td>
            </tr>`;
          }).join('')}
          ${files.map(file => {
            const { icon, color } = getFileIcon(file.name);
                        const dlPath = sharedPrefix + '/' + (currentPath ? currentPath + '/' + file.name : file.name);
            const size = Number(file.size) || 0;
            return `<tr>
              <td><div class="file-row-icon">
                <span class="material-icons-round" style="color:${color};font-size:22px">${icon}</span>
                <span class="file-row-name" onclick="${jsAttr(`startDownload(${jsString(dlPath)}, ${size})`)}">${escapeHtml(file.name)}</span>
              </div></td>
              <td class="file-row-meta">${formatSize(size)}</td>
              <td class="file-row-meta">${formatDate(file.uploaded)}</td>
              <td>
                <button class="icon-btn" title="下载" onclick="${jsAttr(`startDownload(${jsString(dlPath)}, ${size})`)}">
                  <span class="material-icons-round">download</span>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    `}
  </main>
</div>

`, siteTitle + ' - 共享');
}

function renderShareMessagePage(title, message, siteTitle, cloudIconUrl = '') {
  return renderHTML(`
<header class="app-bar">
  <a class="app-bar-logo" href="/shared">
    ${renderLogoIcon(cloudIconUrl)}
    <span class="app-bar-title">${escapeHtml(siteTitle)} - 分享</span>
  </a>
  <div class="app-bar-spacer"></div>
  <div class="app-bar-actions">
    <button class="icon-btn" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
      <span class="material-icons-round">dark_mode</span>
    </button>
  </div>
</header>
<main class="main" style="max-width:720px;margin:0 auto;padding-top:48px">
  <div class="empty-state">
    <span class="material-icons-round">link_off</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  </div>
</main>
`, siteTitle + ' - 分享');
}

function renderSharePasswordPage(share, siteTitle, cloudIconUrl = '', error = '') {
  return renderHTML(`
<div class="login-wrap">
  <button class="icon-btn login-theme-toggle" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
    <span class="material-icons-round">dark_mode</span>
  </button>
  <div class="login-card">
    <div class="login-logo">
      ${renderLogoIcon(cloudIconUrl, 'lock')}
      <h1 class="login-title">受保护的分享</h1>
      <p class="login-sub">${escapeHtml(virtualPathName(share.path) || share.path)}</p>
    </div>
    <label class="field-label" for="sharePwd">分享密码</label>
    <input class="text-field" id="sharePwd" type="password" placeholder="请输入分享密码" autofocus
      onkeydown="if(event.key==='Enter')unlockShare()">
    <p class="login-error" id="shareError">${escapeHtml(error)}</p>
    <button class="login-btn" onclick="unlockShare()">访问分享</button>
  </div>
</div>
<script>
function unlockShare() {
  const password = document.getElementById('sharePwd').value;
  fetch('/api/share-access', {
    method: 'POST',
    headers: {'Content-Type':'application/json','X-R2Drive-CSRF':'same-origin'},
    body: JSON.stringify({id:${jsString(share.id)}, password})
  }).then(r => r.json().then(d => ({ok:r.ok, data:d}))).then(({ok, data}) => {
    if (ok && data.ok) location.reload();
    else document.getElementById('shareError').textContent = data.error || '密码错误或分享不可用';
  }).catch(() => {
    document.getElementById('shareError').textContent = '访问失败，请稍后重试';
  });
}
</script>
`, siteTitle + ' - 分享访问');
}

function shareDownloadHref(share, relativePath = '') {
  const params = new URLSearchParams();
  params.set('id', share.id);
  if (relativePath) params.set('path', relativePath);
  return '/api/share-download?' + params.toString();
}

function renderConditionalSharePage(share, options = {}, siteTitle, cloudIconUrl = '') {
  const currentPath = options.currentPath || '';
  const displayName = virtualPathName(share.path) || share.path;
  const expiresText = share.expiresAt ? '有效期至 ' + formatDate(share.expiresAt) : '长期有效';
  const limitText = share.maxAccesses ? ('已访问 ' + share.accessCount + ' / ' + share.maxAccesses + ' 次') : ('已访问 ' + share.accessCount + ' 次');

  if (share.targetType === 'file') {
    const file = options.file;
    const size = Number(file?.size || 0);
    const { icon, color } = getFileIcon(file?.name || displayName);
    const href = shareDownloadHref(share);
    return renderHTML(`
<header class="app-bar">
  <a class="app-bar-logo" href="/s/${escapeAttr(share.id)}">
    ${renderLogoIcon(cloudIconUrl, 'ios_share')}
    <span class="app-bar-title">${escapeHtml(siteTitle)} - 分享</span>
  </a>
  <div class="app-bar-spacer"></div>
  <div class="app-bar-actions">
    <button class="icon-btn" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
      <span class="material-icons-round">dark_mode</span>
    </button>
  </div>
</header>
<main class="main" style="max-width:760px;margin:0 auto;padding-top:40px">
  <nav class="breadcrumb">
    <div class="breadcrumb-item">
      <a class="breadcrumb-link" href="/s/${escapeAttr(share.id)}">
        <span class="material-icons-round" style="font-size:18px;vertical-align:middle">ios_share</span> 分享文件
      </a>
    </div>
  </nav>
  <div class="file-card" style="max-width:420px;cursor:pointer" onclick="${jsAttr(`window.open(${jsString(href)})`)}">
    <div class="file-card-icon" style="background:${color}18">
      <span class="material-icons-round" style="color:${color};font-size:40px">${icon}</span>
    </div>
    <div class="file-card-name" title="${escapeAttr(file?.name || displayName)}">${escapeHtml(file?.name || displayName)}</div>
    <div class="file-card-meta">
      <span>${formatSize(size)}</span>
      <span>${formatDate(file?.uploaded)}</span>
    </div>
    <div class="file-card-actions">
      <button class="icon-btn" title="下载" onclick="${jsAttr(`event.stopPropagation();window.open(${jsString(href)})`)}">
        <span class="material-icons-round">download</span>
      </button>
    </div>
  </div>
  <p style="margin-top:16px;color:var(--on-surface-variant);font-size:13px">${escapeHtml(expiresText)} · ${escapeHtml(limitText)}</p>
</main>
`, siteTitle + ' - 分享文件');
  }

  const folders = options.folders || [];
  const files = options.files || [];
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
  const base = '/s/' + share.id;
  const breadcrumb = `<nav class="breadcrumb">
    <div class="breadcrumb-item">
      <a class="breadcrumb-link" href="${escapeAttr(base)}">
        <span class="material-icons-round" style="font-size:18px;vertical-align:middle">ios_share</span> ${escapeHtml(displayName)}
      </a>
    </div>
    ${pathParts.map((part, i) => {
      const href = base + '/?path=' + encodeURIComponent(pathParts.slice(0, i + 1).join('/'));
      const isLast = i === pathParts.length - 1;
      return `<div class="breadcrumb-item">
        <span class="material-icons-round breadcrumb-sep">chevron_right</span>
        ${isLast ? `<span class="breadcrumb-current">${escapeHtml(part)}</span>` : `<a class="breadcrumb-link" href="${escapeAttr(href)}">${escapeHtml(part)}</a>`}
      </div>`;
    }).join('')}
  </nav>`;
  const isEmpty = folders.length === 0 && files.length === 0;

  return renderHTML(`
<header class="app-bar">
  <a class="app-bar-logo" href="${escapeAttr(base)}">
    ${renderLogoIcon(cloudIconUrl, 'ios_share')}
    <span class="app-bar-title">${escapeHtml(siteTitle)} - 分享</span>
  </a>
  <div class="app-bar-spacer"></div>
  <div class="app-bar-actions">
    <button class="icon-btn" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
      <span class="material-icons-round">dark_mode</span>
    </button>
  </div>
</header>
<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-section">
      <a class="sidebar-item active" href="${escapeAttr(base)}">
        <span class="material-icons-round">ios_share</span> 分享目录
      </a>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      <div class="sidebar-label">分享规则</div>
      <div class="sidebar-item" style="cursor:default;color:var(--on-surface-variant);font-weight:400;font-size:13px;line-height:1.5;padding:8px 16px;height:auto;border-radius:8px;">
        ${escapeHtml(expiresText)}<br>${escapeHtml(limitText)}
      </div>
    </div>
  </nav>
  <main class="main">
    ${breadcrumb}
    <div class="toolbar">
      <div class="toolbar-right">
        <div class="view-toggle">
          <button class="view-toggle-btn" data-view="grid" onclick="setView('grid')" title="网格视图">
            <span class="material-icons-round">grid_view</span>
          </button>
          <button class="view-toggle-btn" data-view="list" onclick="setView('list')" title="列表视图">
            <span class="material-icons-round">view_list</span>
          </button>
        </div>
      </div>
    </div>
    ${isEmpty ? `
    <div class="empty-state">
      <span class="material-icons-round">folder_open</span>
      <h3>目录为空</h3>
      <p>这个分享目录下暂无可访问文件</p>
    </div>
    ` : `
    <div id="fileGrid" class="file-grid">
      ${folders.map(name => {
        const href = base + '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
        return `<div class="file-card" onclick="${jsAttr(`location.href=${jsString(href)}`)}">
          <div class="file-card-icon" style="background:#FFF8E1">
            <span class="material-icons-round" style="color:#F9AB00;font-size:32px">folder</span>
          </div>
          <div class="file-card-name">${escapeHtml(name)}</div>
          <div class="file-card-meta"><span>文件夹</span></div>
        </div>`;
      }).join('')}
      ${files.map(file => {
        const { icon, color } = getFileIcon(file.name);
        const relative = currentPath ? currentPath + '/' + file.name : file.name;
        const href = shareDownloadHref(share, relative);
        const size = Number(file.size) || 0;
        return `<div class="file-card" onclick="${jsAttr(`window.open(${jsString(href)})`)}">
          <div class="file-card-icon" style="background:${color}18">
            <span class="material-icons-round" style="color:${color};font-size:32px">${icon}</span>
          </div>
          <div class="file-card-name" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-card-meta">
            <span>${formatSize(size)}</span>
            <span>${formatDate(file.uploaded)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div id="fileList" style="display:none">
      <table class="file-list">
        <thead>
          <tr>
            <th><div class="th-inner">名称</div></th>
            <th><div class="th-inner">大小</div></th>
            <th><div class="th-inner">修改时间</div></th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          ${folders.map(name => {
            const href = base + '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
            return `<tr onclick="${jsAttr(`location.href=${jsString(href)}`)}">
              <td><div class="file-row-icon">
                <span class="material-icons-round" style="color:#F9AB00;font-size:22px">folder</span>
                <span class="file-row-name">${escapeHtml(name)}</span>
              </div></td>
              <td class="file-row-meta">-</td>
              <td class="file-row-meta">-</td>
              <td></td>
            </tr>`;
          }).join('')}
          ${files.map(file => {
            const { icon, color } = getFileIcon(file.name);
            const relative = currentPath ? currentPath + '/' + file.name : file.name;
            const href = shareDownloadHref(share, relative);
            const size = Number(file.size) || 0;
            return `<tr onclick="${jsAttr(`window.open(${jsString(href)})`)}">
              <td><div class="file-row-icon">
                <span class="material-icons-round" style="color:${color};font-size:22px">${icon}</span>
                <span class="file-row-name">${escapeHtml(file.name)}</span>
              </div></td>
              <td class="file-row-meta">${formatSize(size)}</td>
              <td class="file-row-meta">${formatDate(file.uploaded)}</td>
              <td>
                <button class="icon-btn" title="下载" onclick="${jsAttr(`event.stopPropagation();window.open(${jsString(href)})`)}">
                  <span class="material-icons-round">download</span>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    `}
  </main>
</div>
`, siteTitle + ' - 分享目录');
}

function renderDrivePage(folders, files, currentPath, siteTitle, cloudIconUrl = '') {
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const breadcrumb = `<nav class="breadcrumb">
    <div class="breadcrumb-item">
      <a class="breadcrumb-link" href="/">
        <span class="material-icons-round" style="font-size:18px;vertical-align:middle">cloud</span> 我的云盘
      </a>
    </div>
    ${pathParts.map((part, i) => {
      const href = '/?path=' + encodeURIComponent(pathParts.slice(0, i + 1).join('/'));
      const isLast = i === pathParts.length - 1;
      return `<div class="breadcrumb-item">
        <span class="material-icons-round breadcrumb-sep">chevron_right</span>
        ${isLast ? `<span class="breadcrumb-current">${escapeHtml(part)}</span>` : `<a class="breadcrumb-link" href="${escapeAttr(href)}">${escapeHtml(part)}</a>`}
      </div>`;
    }).join('')}
  </nav>`;

    const renderFolderCard = (name) => {
    const href = '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
    return `<div class="file-card" onclick="${jsAttr(`handleFolderClick(event, ${jsString(name)}, ${jsString(href)})`)}"
        oncontextmenu="${jsAttr(`showCtxMenu(event, ${jsString(name)})`)}">
      <div class="file-card-icon" style="background:#FFF8E1">
        <span class="material-icons-round" style="color:#F9AB00;font-size:32px">folder</span>
      </div>
      <div class="file-card-name">${escapeHtml(name)}</div>
      <div class="file-card-meta"><span>文件夹</span></div>
      <div class="file-card-actions">
        <button class="icon-btn" title="更多" onclick="${jsAttr(`event.stopPropagation();showCtxMenu(event, ${jsString(name)})`)}">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div>
    </div>`;
  };

    const renderFileCard = (file) => {
    const { icon, color } = getFileIcon(file.name);
    const path = currentPath ? currentPath + '/' + file.name : file.name;
    const size = Number(file.size) || 0;
    return `<div class="file-card" data-name="${escapeAttr(file.name)}" data-size="${size}" onclick="${jsAttr(`handleFileClick(event, ${jsString(file.name)})`)}"
        oncontextmenu="${jsAttr(`showCtxMenu(event, ${jsString(file.name)})`)}">
      <div class="file-card-icon" style="background:${color}18">
        <span class="material-icons-round" style="color:${color};font-size:32px">${icon}</span>
      </div>
      <div class="file-card-name" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</div>
      <div class="file-card-meta">
        <span>${formatSize(size)}</span>
        <span>${formatDate(file.uploaded)}</span>
      </div>
      <div class="file-card-actions">
        <button class="icon-btn" title="下载" onclick="${jsAttr(`event.stopPropagation();startDownload(${jsString(path)}, ${size})`)}">
          <span class="material-icons-round">download</span>
        </button>
        <button class="icon-btn" title="更多" onclick="${jsAttr(`event.stopPropagation();showCtxMenu(event, ${jsString(file.name)})`)}">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div>
    </div>`;
  };

    const renderFolderRow = (name) => {
    const href = '/?path=' + encodeURIComponent(currentPath ? currentPath + '/' + name : name);
    return `<tr data-name="${escapeAttr(name)}" data-size="0" data-date="" onclick="${jsAttr(`handleFolderClick(event, ${jsString(name)}, ${jsString(href)})`)}">
      <td><div class="file-row-icon">
        <span class="material-icons-round" style="color:#F9AB00;font-size:22px">folder</span>
        <span class="file-row-name">${escapeHtml(name)}</span>
      </div></td>
      <td class="file-row-meta">—</td>
      <td class="file-row-meta">—</td>
      <td><div class="file-row-actions">
        <button class="icon-btn" title="更多" onclick="${jsAttr(`event.stopPropagation();showCtxMenu(event, ${jsString(name)})`)}">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div></td>
    </tr>`;
  };

    const renderFileRow = (file) => {
    const { icon, color } = getFileIcon(file.name);
    const path = currentPath ? currentPath + '/' + file.name : file.name;
    const size = Number(file.size) || 0;
    return `<tr data-name="${escapeAttr(file.name)}" data-size="${size}" data-date="${escapeAttr(file.uploaded || '')}" onclick="${jsAttr(`handleFileClick(event, ${jsString(file.name)})`)}">
      <td><div class="file-row-icon">
        <span class="material-icons-round" style="color:${color};font-size:22px">${icon}</span>
        <span class="file-row-name">${escapeHtml(file.name)}</span>
      </div></td>
      <td class="file-row-meta">${formatSize(size)}</td>
      <td class="file-row-meta">${formatDate(file.uploaded)}</td>
      <td><div class="file-row-actions">
        <button class="icon-btn" title="下载" onclick="${jsAttr(`event.stopPropagation();startDownload(${jsString(path)}, ${size})`)}">
          <span class="material-icons-round">download</span>
        </button>
        <button class="icon-btn" title="更多" onclick="${jsAttr(`event.stopPropagation();showCtxMenu(event, ${jsString(file.name)})`)}">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div></td>
    </tr>`;
  };

  const isEmpty = folders.length === 0 && files.length === 0;

  return renderHTML(`
<header class="app-bar">
  <a class="app-bar-logo" href="/">
    ${renderLogoIcon(cloudIconUrl)}
    <span class="app-bar-title">${siteTitle}</span>
  </a>
  <div class="app-bar-spacer"></div>
    <div class="app-bar-actions">
    <button class="icon-btn" id="darkModeToggle" title="夜间模式" onclick="toggleDarkMode(event)">
      <span class="material-icons-round">dark_mode</span>
    </button>
    <button class="icon-btn" title="存储节点" onclick="openStorageNodes()">
      <span class="material-icons-round">hub</span>
    </button>
    <button class="icon-btn" title="刷新" onclick="location.reload()">
      <span class="material-icons-round">refresh</span>
    </button>
    <button class="icon-btn" title="退出登录" onclick="logout()">
      <span class="material-icons-round">logout</span>
    </button>
  </div>
</header>

<div class="layout">
  <nav class="sidebar">
        <div class="sidebar-section">
      <a class="sidebar-item active" href="/">
        <span class="material-icons-round">cloud</span> 我的云盘
      </a>
      <button class="sidebar-item" onclick="openUpload()">
        <span class="material-icons-round">cloud_upload</span> 上传文件
      </button>
      <button class="sidebar-item" onclick="openStorageNodes()">
        <span class="material-icons-round">hub</span> 存储节点
      </button>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      <div class="sidebar-label">快速访问</div>
      <a class="sidebar-item" href="/?path=">
        <span class="material-icons-round">home</span> 根目录
      </a>
            <a class="sidebar-item" href="/?path=shared">
        <span class="material-icons-round">folder_shared</span> 共享文件夹
      </a>
    </div>
    <button class="storage-info" id="storageInfo" onclick="toggleStorageDetails()" title="查看容量明细">
      <div class="storage-text">
        <span>${files.length} 个文件，${folders.length} 个文件夹</span>
      </div>
      <div class="storage-bar">
        <div class="storage-fill" id="storageFill" style="width:0%"></div>
      </div>
      <div class="storage-text" id="storageText">计算中...</div>
      <div class="storage-details" id="storageDetails"></div>
    </button>
  </nav>

  <main class="main">
    ${breadcrumb}

    <div class="toolbar">
      <button class="fab" onclick="openUpload()">
        <span class="material-icons-round">upload</span> 上传
      </button>
      <button class="btn-outlined" onclick="openNewFolder()">
        <span class="material-icons-round">create_new_folder</span> 新建文件夹
      </button>
      <div class="toolbar-right">
        <div class="view-toggle">
          <button class="view-toggle-btn" data-view="grid" onclick="setView('grid')" title="网格视图">
            <span class="material-icons-round">grid_view</span>
          </button>
          <button class="view-toggle-btn" data-view="list" onclick="setView('list')" title="列表视图">
            <span class="material-icons-round">view_list</span>
          </button>
        </div>
      </div>
        </div>

    <!-- ── Horizontal Action Bar ── -->
    <div class="action-bar" id="actionBar">
      <span class="action-bar-count" id="actionBarCount">未选中</span>
      <div class="action-bar-divider"></div>
      <button class="action-btn" onclick="copySelected()" title="复制">
        <span class="material-icons-round">content_copy</span><span>复制</span>
      </button>
      <button class="action-btn" onclick="cutSelected()" title="剪切">
        <span class="material-icons-round">content_cut</span><span>剪切</span>
      </button>
      <button class="action-btn" onclick="pasteFiles()" title="粘贴" id="pasteBtn" disabled>
        <span class="material-icons-round">content_paste</span><span>粘贴</span>
      </button>
      <div class="action-bar-divider"></div>
      <button class="action-btn" onclick="previewSelected()" title="预览">
        <span class="material-icons-round">visibility</span><span>预览</span>
      </button>
      <button class="action-btn" onclick="renameSelected()" title="重命名">
        <span class="material-icons-round">drive_file_rename_outline</span><span>重命名</span>
      </button>
      <button class="action-btn" onclick="downloadSelected()" title="下载">
        <span class="material-icons-round">download</span><span>下载</span>
      </button>
      <button class="action-btn danger" onclick="deleteSelected()" title="删除">
        <span class="material-icons-round">delete_outline</span><span>删除</span>
      </button>
      <div class="download-progress" id="downloadProgress" aria-live="polite">
        <span class="material-icons-round">downloading</span>
        <div class="download-progress-main">
          <div class="download-progress-top">
            <span class="download-progress-name" id="downloadProgressName"></span>
            <span class="download-progress-stats" id="downloadProgressStats"></span>
          </div>
          <div class="download-progress-bar">
            <div class="download-progress-fill" id="downloadProgressFill"></div>
          </div>
        </div>
      </div>
    </div>

    ${isEmpty ? `
    <div class="empty-state">
      <span class="material-icons-round">cloud_upload</span>
      <h3>此文件夹为空</h3>
      <p>点击"上传"按钮开始上传文件，或创建新文件夹</p>
      <button class="fab" onclick="openUpload()" style="margin-top:8px">
        <span class="material-icons-round">upload</span> 立即上传
      </button>
    </div>
    ` : `
    <!-- Grid View -->
    <div id="fileGrid" class="file-grid">
      ${folders.map(renderFolderCard).join('')}
      ${files.map(renderFileCard).join('')}
    </div>

    <!-- List View -->
    <div id="fileList" style="display:none">
      <table class="file-list">
        <thead>
          <tr>
            <th onclick="sortTable('name')"><div class="th-inner">名称 <span class="material-icons-round" style="font-size:14px">unfold_more</span></div></th>
            <th onclick="sortTable('size')"><div class="th-inner">大小 <span class="material-icons-round" style="font-size:14px">unfold_more</span></div></th>
            <th onclick="sortTable('date')"><div class="th-inner">修改时间 <span class="material-icons-round" style="font-size:14px">unfold_more</span></div></th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          ${folders.map(renderFolderRow).join('')}
          ${files.map(renderFileRow).join('')}
        </tbody>
      </table>
    </div>
    `}
  </main>
</div>

<!-- Selection Bar -->
<div class="selection-bar" id="selectionBar">
  <button class="icon-btn" onclick="clearSelection()" title="取消选择">
    <span class="material-icons-round">close</span>
  </button>
  <span class="selection-bar-count" id="selectionCount">0 个已选中</span>
  <button class="icon-btn" onclick="deleteSelected()" title="删除">
    <span class="material-icons-round">delete_outline</span>
  </button>
</div>

<!-- Upload Modal -->
<div class="modal-overlay" id="uploadModal" onclick="if(event.target===this)closeUpload()">
  <div class="modal">
    <div class="modal-header">
      <span class="material-icons-round" style="color:var(--primary)">cloud_upload</span>
      <span class="modal-title">上传文件</span>
    </div>
    <div class="modal-body">
      <div class="upload-zone" onclick="document.getElementById('fileInput').click()"
        ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave()">
        <span class="material-icons-round">upload_file</span>
        <h4>拖放文件到此处</h4>
        <p>或点击选择文件，支持多文件同时上传</p>
      </div>
      <input type="file" id="fileInput" multiple style="display:none" onchange="handleFileInput(event)">
      <div class="progress-list" id="progressList"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-outlined" onclick="closeUpload()">关闭</button>
      <button class="fab" style="box-shadow:none" onclick="document.getElementById('fileInput').click()">
        <span class="material-icons-round">folder_open</span> 选择文件
      </button>
    </div>
  </div>
</div>

<!-- New Folder Modal -->
<div class="modal-overlay" id="newFolderModal" onclick="if(event.target===this)closeNewFolder()">
  <div class="modal">
    <div class="modal-header">
      <span class="material-icons-round" style="color:#F9AB00">create_new_folder</span>
      <span class="modal-title">新建文件夹</span>
    </div>
    <div class="modal-body">
      <label class="field-label" for="folderNameInput">文件夹名称</label>
      <input class="text-field" id="folderNameInput" type="text" placeholder="请输入文件夹名称"
        onkeydown="if(event.key==='Enter')createFolder()">
    </div>
    <div class="modal-footer">
      <button class="btn-outlined" onclick="closeNewFolder()">取消</button>
      <button class="fab" style="box-shadow:none" onclick="createFolder()">
        <span class="material-icons-round">check</span> 创建
      </button>
    </div>
  </div>
</div>

<!-- Share Modal -->
<div class="modal-overlay" id="shareModal" onclick="if(event.target===this)closeShareModal()">
  <div class="modal">
    <div class="modal-header">
      <span class="material-icons-round" style="color:var(--primary)">ios_share</span>
      <span class="modal-title">分享设置</span>
    </div>
    <div class="modal-body">
      <div class="share-summary">
        <span class="material-icons-round">insert_drive_file</span>
        <div class="share-summary-main">
          <div class="share-summary-label">分享对象</div>
          <div class="share-summary-path" id="shareTargetPath"></div>
        </div>
      </div>
      <div class="share-form-grid">
        <div class="full">
          <label class="field-label" for="sharePasswordInput">访问密码</label>
          <input class="text-field" id="sharePasswordInput" type="password" placeholder="留空表示无需密码">
          <div class="share-hint" id="sharePasswordHint">创建新分享时留空表示无需密码</div>
          <label class="share-hint" id="shareClearPasswordLabel" style="display:none;align-items:center;gap:6px">
            <input type="checkbox" id="shareClearPasswordInput"> 移除当前密码
          </label>
        </div>
        <div>
          <label class="field-label" for="shareDaysInput">有效天数</label>
          <input class="text-field" id="shareDaysInput" type="number" min="0" step="1" placeholder="0">
          <div class="share-hint">0 或留空表示长期有效</div>
        </div>
        <div>
          <label class="field-label" for="shareMaxAccessInput">访问次数</label>
          <input class="text-field" id="shareMaxAccessInput" type="number" min="0" step="1" placeholder="0">
          <div class="share-hint">0 或留空表示不限次数</div>
        </div>
      </div>
      <div class="share-result" id="shareResult">
        <div class="share-hint">分享链接已创建</div>
        <div class="share-link-row">
          <input class="text-field" id="shareLinkInput" type="text" readonly>
          <button class="btn-outlined" onclick="copyCreatedShareLink()">
            <span class="material-icons-round">content_copy</span> 复制
          </button>
        </div>
      </div>
      <div class="share-records" id="shareRecords">
        <div class="share-record-empty">正在加载分享记录...</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outlined" id="shareNewBtn" onclick="resetShareForm()" style="display:none">新建分享</button>
      <button class="btn-outlined" onclick="closeShareModal()">关闭</button>
      <button class="fab" style="box-shadow:none" id="shareCreateBtn" onclick="submitShareForm()">
        <span class="material-icons-round">ios_share</span> 创建分享
      </button>
    </div>
  </div>
</div>

<!-- Storage Nodes Modal -->
<div class="modal-overlay" id="storageNodesModal" onclick="if(event.target===this)closeStorageNodes()">
  <div class="modal">
    <div class="modal-header">
      <span class="material-icons-round" style="color:var(--primary)">hub</span>
      <span class="modal-title">存储节点</span>
    </div>
    <div class="modal-body">
      <div class="node-list" id="storageNodeList"></div>
      <!-- R2 File Viewer (hidden by default) -->
      <div class="r2file-view" id="r2fileView">
        <div class="r2file-toolbar">
          <button class="icon-btn" title="返回节点列表" onclick="backToNodeList()">
            <span class="material-icons-round">arrow_back</span>
          </button>
          <span class="node-row-title" id="r2fileTitle">R2 文件</span>
        </div>
        <div class="r2file-stats" id="r2fileStats"></div>
        <div class="r2file-list" id="r2fileList"></div>
        <div class="r2file-load-more" id="r2fileLoadMore" style="display:none">
          <button id="r2fileLoadBtn" onclick="loadNodeR2Files()">加载更多...</button>
        </div>
      </div>
      <!-- End R2 File Viewer -->
      <div class="node-form-grid">
        <div>
          <label class="field-label" for="nodeNameInput">节点名称</label>
          <input class="text-field" id="nodeNameInput" type="text" placeholder="账号 A">
        </div>
        <div class="full">
          <label class="field-label" for="nodeUrlInput">节点 Worker 地址</label>
          <input class="text-field" id="nodeUrlInput" type="url" placeholder="https://node.example.workers.dev">
        </div>
        <div class="full">
          <label class="field-label" for="nodeTokenInput">节点密钥</label>
          <input class="text-field" id="nodeTokenInput" type="password" placeholder="STORAGE_NODE_TOKEN">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outlined" onclick="closeStorageNodes()">关闭</button>
      <button class="fab" style="box-shadow:none" onclick="saveStorageNode()">
        <span class="material-icons-round">add</span> 添加节点
      </button>
    </div>
  </div>
</div>

<!-- Orphan File Cleanup Modal -->
<div class="modal-overlay" id="orphanModal" onclick="if(event.target===this)closeOrphanCleanup()">
  <div class="modal">
    <div class="modal-header">
      <span class="material-icons-round" style="color:var(--warning)">cleaning_services</span>
      <span class="modal-title">清扫孤儿文件</span>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--on-surface-variant);margin-bottom:12px">
        扫描 R2 存储桶中未被任何文件映射引用的"孤儿"对象。这些对象通常由删除操作异常中断产生，占用存储空间但不可访问。
      </p>
      <div class="orphan-stats" id="orphanStats"></div>
      <label class="orphan-select-all" id="orphanSelectAllLabel" style="display:none">
        <input type="checkbox" id="orphanCheckAll" onchange="toggleOrphanSelectAll()">
        <span>全选 / 取消全选</span>
      </label>
      <div class="orphan-list" id="orphanList">
        <div style="padding:16px;color:var(--on-surface-variant);text-align:center">点击"扫描"按钮查找未被引用的 R2 对象</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outlined" onclick="closeOrphanCleanup()">关闭</button>
      <button class="btn-outlined" id="orphanScanBtn" onclick="scanOrphans()" style="color:var(--warning);border-color:var(--warning)">
        <span class="material-icons-round">search</span> 开始扫描
      </button>
      <button class="fab" style="box-shadow:none;background:var(--error)" id="orphanDeleteBtn" onclick="deleteSelectedOrphans()" disabled>
        <span class="material-icons-round">delete_forever</span> 删除选中
      </button>
    </div>
  </div>
</div>`, siteTitle);
}

// ── Session (Cookie-based) ──
// ── Shared Folder Config ──
const SHARED_PREFIX = 'shared'; // Shared folder name - accessible without login
const STORAGE_TOTAL_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB per account/node

const SESSION_COOKIE = 'r2drive_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const STORAGE_NODES_KV_KEY = 'storage_nodes';
const MULTIPART_SESSION_PREFIX = 'multipart_session_';
const R2_MULTIPART_SESSION_PREFIX = 'r2multipart_session_';
const D1_KV_TABLE = 'r2drive_kv';
const MAIN_STORAGE_NODE_ID = 'main';
const FS_FILE_PREFIX = 'r2drive:fs:file:';
const FS_FOLDER_PREFIX = 'r2drive:fs:folder:';
const FS_DIR_PREFIX = 'r2drive:fs:dir:';
const NODE_PART_PREFIX = 'r2drive_node_part_';
const STORAGE_NODE_USAGE_PREFIX = 'storage_node_usage:';
const SHARE_LINK_PREFIX = 'share_link:';
const SHARE_AUTH_COOKIE_PREFIX = 'r2drive_share_';
const MANIFEST_CONTENT_TYPE = 'application/vnd.r2drive.manifest+json';
const MANIFEST_VERSION = 1;
const DOWNLOAD_RANGE_SIZE_BYTES = 32 * 1024 * 1024;
const DOWNLOAD_OUTPUT_CHUNK_BYTES = 256 * 1024;
const DOWNLOAD_NODE_FETCH_RETRIES = 3;
const DISTRIBUTED_UPLOAD_THRESHOLD_BYTES = 512 * 1024; // 512 KB - 超过此大小的文件使用分布式存储
const BACKUP_DIRS_PREFIX = 'backup_dirs:'; // 备份目录同步 - 跨设备保留同步目录

const SESSION_FUTURE_SKEW_MS = 5 * 60 * 1000;

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a = '', b = '') {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, data) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(String(data || '')));
  return bytesToHex(sig);
}

async function sha256Hex(data) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(data || '')));
  return bytesToHex(digest);
}

async function generateToken(password, secret) {
  const t = Date.now();
  const n = crypto.randomUUID().replace(/-/g, '');
  const s = await hmacHex(secret, `session:v2:${t}:${n}`);
  return btoa(JSON.stringify({ v: 2, t, n, s }));
}

async function verifyToken(token, secret) {
  try {
    if (!token || !secret) return false;
    const { v, t, n, s } = JSON.parse(atob(token));
    const issuedAt = Number(t);
    const now = Date.now();
    if (v !== 2) return false;
    if (!Number.isFinite(issuedAt)) return false;
    if (issuedAt > now + SESSION_FUTURE_SKEW_MS) return false;
    if (now - issuedAt > SESSION_DURATION) return false;
    if (!/^[a-f0-9]{64}$/i.test(String(s || ''))) return false;
    if (!/^[a-f0-9]{32,64}$/i.test(String(n || ''))) return false;
    const expected = await hmacHex(secret, `session:v2:${issuedAt}:${n}`);
    return constantTimeEqual(String(s).toLowerCase(), expected);
  } catch { return false; }
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isUnsafeMethod(method = '') {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || '').toUpperCase());
}

function isSameOriginRequest(request) {
  const explicit = request.headers.get('X-R2Drive-CSRF') || '';
  if (explicit === 'same-origin') return true;

  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';
  if (origin) {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('Referer') || '';
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }

  return false;
}

function csrfErrorResponse() {
  return jsonResponse({ ok: false, error: 'CSRF check failed' }, 403);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mapWithConcurrency(items, limit, mapper) {
  const list = Array.from(items || []);
  const concurrency = Math.max(1, Math.min(Number(limit) || 1, list.length || 1));
  let next = 0;
  const results = new Array(list.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < list.length) {
      const index = next++;
      results[index] = await mapper(list[index], index);
    }
  }));
  return results;
}

function getDownloadRangeSize(env) {
  const configuredMb = Number(env.DOWNLOAD_RANGE_SIZE_MB || 0);
  const configured = configuredMb > 0 ? configuredMb * 1024 * 1024 : DOWNLOAD_RANGE_SIZE_BYTES;
  return Math.min(32 * 1024 * 1024, Math.max(1024 * 1024, Math.floor(configured)));
}

function normalizeNodeUrl(url = '') {
  return String(url || '').trim().replace(/\/+$/, '');
}

function sanitizeNode(node = {}) {
  return {
    id: String(node.id || '').trim(),
    name: String(node.name || '').trim(),
    url: normalizeNodeUrl(node.url),
    token: String(node.token || '').trim(),
    enabled: node.enabled !== false,
    weight: Math.max(1, parseInt(node.weight || '1', 10) || 1),
    createdAt: String(node.createdAt || '').trim()
  };
}

function publicNode(node) {
  return {
    id: node.id,
    name: node.name,
    url: node.url,
    enabled: node.enabled !== false,
    weight: node.weight || 1,
    createdAt: node.createdAt || ''
  };
}

function mainStorageNode() {
  return {
    id: MAIN_STORAGE_NODE_ID,
    name: '主控账号',
    url: '',
    token: '',
    enabled: true,
    createdAt: '1970-01-01T00:00:00.000Z',
    storageType: 'r2'
  };
}

async function getStorageNodes(env, includeDisabled = false) {
  if (!hasMetadataStore(env)) return [];
  const raw = await requireFsKv(env).get(STORAGE_NODES_KV_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const nodes = parsed.map(sanitizeNode).filter(node => node.id && node.url && node.token);
    return includeDisabled ? nodes : nodes.filter(node => node.enabled !== false);
  } catch {
    return [];
  }
}

async function saveStorageNodes(env, nodes) {
  await requireFsKv(env).put(STORAGE_NODES_KV_KEY, JSON.stringify(nodes.map(sanitizeNode)));
}

async function calculateR2Usage(R2) {
  let totalUsed = 0;
  let cursor;
  let safety = 0;
  do {
    const listed = await R2.list({ cursor, limit: 1000, include: ['customMetadata'] });
    for (const obj of listed.objects) {
      totalUsed += obj.size;
    }
    cursor = listed.cursor;
    safety++;
    if (safety > 100) break;
  } while (cursor);
  return totalUsed;
}

function publicFileEntry(entry) {
  return {
    name: entry.name || virtualPathName(entry.path),
    size: Number(entry.size || 0),
    uploaded: entry.uploaded || entry.updatedAt || '',
    etag: entry.etag || ''
  };
}

const d1SchemaReady = new WeakMap();

function hasMetadataStore(env) {
  return !!(env.DB || env.CLIPBOARD_KV);
}

async function ensureD1KvSchema(DB) {
  if (d1SchemaReady.get(DB)) return;
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS ${D1_KV_TABLE} (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      expires_at INTEGER
    )
  `).run();
  await DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_${D1_KV_TABLE}_expires_at
      ON ${D1_KV_TABLE} (expires_at)
  `).run();
  d1SchemaReady.set(DB, true);
}

function prefixUpperBound(prefix) {
  return prefix ? prefix + '\uffff' : '\uffff';
}

function d1KvStore(DB) {
  return {
    async get(key) {
      await ensureD1KvSchema(DB);
      const row = await DB.prepare(`SELECT "value", expires_at FROM ${D1_KV_TABLE} WHERE "key" = ?`)
        .bind(key)
        .first();
      if (!row) return null;
      const expiresAt = Number(row.expires_at || 0);
      if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) {
        await this.delete(key);
        return null;
      }
      return row.value;
    },
    async put(key, value, options = {}) {
      await ensureD1KvSchema(DB);
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = options.expiration
        ? Number(options.expiration)
        : (options.expirationTtl ? now + Number(options.expirationTtl) : null);
      await DB.prepare(`
        INSERT INTO ${D1_KV_TABLE} ("key", "value", expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", expires_at = excluded.expires_at
      `).bind(key, String(value), Number.isFinite(expiresAt) ? expiresAt : null).run();
    },
    async delete(key) {
      await ensureD1KvSchema(DB);
      await DB.prepare(`DELETE FROM ${D1_KV_TABLE} WHERE "key" = ?`).bind(key).run();
    },
    async batchDelete(keys) {
      const unique = [...new Set(keys.filter(Boolean))];
      if (!unique.length) return;
      await ensureD1KvSchema(DB);
      const BATCH_SIZE = 100;
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const chunk = unique.slice(i, i + BATCH_SIZE);
        const stmts = chunk.map(k =>
          DB.prepare(`DELETE FROM ${D1_KV_TABLE} WHERE "key" = ?`).bind(k)
        );
        await DB.batch(stmts);
      }
    },
    async batchGetJson(keys) {
      const unique = [...new Set(keys.filter(Boolean))];
      if (!unique.length) return new Map();
      await ensureD1KvSchema(DB);
      const now = Math.floor(Date.now() / 1000);
      const BATCH_SIZE = 100;
      const result = new Map();
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const chunk = unique.slice(i, i + BATCH_SIZE);
        const stmts = chunk.map(k =>
          DB.prepare(`SELECT "value", expires_at FROM ${D1_KV_TABLE} WHERE "key" = ? AND (expires_at IS NULL OR expires_at > ?)`).bind(k, now)
        );
        const results = await DB.batch(stmts);
        results.forEach((res, idx) => {
          if (res.results && res.results.length > 0) {
            try { result.set(chunk[idx], JSON.parse(res.results[0].value)); } catch {}
          }
        });
      }
      return result;
    },
    async list({ prefix = '', cursor = '', limit = 1000 } = {}) {
      await ensureD1KvSchema(DB);
      const pageSize = Math.max(1, Math.min(1000, Number(limit || 1000)));
      const offset = Math.max(0, parseInt(cursor || '0', 10) || 0);
      const now = Math.floor(Date.now() / 1000);
      const result = await DB.prepare(`
        SELECT "key" AS name
        FROM ${D1_KV_TABLE}
        WHERE "key" >= ? AND "key" < ? AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY "key"
        LIMIT ? OFFSET ?
      `).bind(prefix, prefixUpperBound(prefix), now, pageSize + 1, offset).all();
      const rows = result.results || [];
      return {
        keys: rows.slice(0, pageSize).map(row => ({ name: row.name })),
        cursor: rows.length > pageSize ? String(offset + pageSize) : undefined
      };
    }
  };
}

function requireFsKv(env) {
  if (env.DB) return d1KvStore(env.DB);
  if (!env.CLIPBOARD_KV) throw new Error('DB binding is required for file path mapping');
  return env.CLIPBOARD_KV;
}

// ── Backup Directory Sync ──
// 备份目录同步：用户独立客户端的备份目录保存，用于跨设备保留同步目录

/**
 * 获取指定客户端的备份目录列表
 * @param {object} env - Worker 环境变量
 * @param {string} clientId - 客户端唯一标识
 * @returns {Promise<string[]>} 备份目录路径数组
 */
async function getBackupDirs(env, clientId) {
  if (!clientId || !hasMetadataStore(env)) return [];
  const raw = await requireFsKv(env).get(BACKUP_DIRS_PREFIX + clientId);
  if (!raw) return [];
  try {
    const dirs = JSON.parse(raw);
    return Array.isArray(dirs) ? dirs.filter(d => typeof d === 'string' && d.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * 保存客户端备份目录列表（全量替换）
 * @param {object} env - Worker 环境变量
 * @param {string} clientId - 客户端唯一标识
 * @param {string[]} dirs - 备份目录路径数组
 */
async function saveBackupDirs(env, clientId, dirs) {
  if (!clientId || !hasMetadataStore(env)) return;
  const cleanDirs = Array.isArray(dirs)
    ? [...new Set(dirs.map(d => String(d || '').trim()).filter(Boolean))]
    : [];
  await requireFsKv(env).put(BACKUP_DIRS_PREFIX + clientId, JSON.stringify(cleanDirs));
}

/**
 * 添加单个备份目录到客户端列表
 * @param {object} env
 * @param {string} clientId
 * @param {string} dirPath
 * @returns {Promise<string[]>} 更新后的目录列表
 */
async function addBackupDir(env, clientId, dirPath) {
  const cleanPath = String(dirPath || '').trim();
  if (!cleanPath) throw new Error('invalid path');
  const dirs = await getBackupDirs(env, clientId);
  if (!dirs.includes(cleanPath)) {
    dirs.push(cleanPath);
    await saveBackupDirs(env, clientId, dirs);
  }
  return dirs;
}

/**
 * 移除客户端备份目录中的一个路径
 * @param {object} env
 * @param {string} clientId
 * @param {string} dirPath
 * @returns {Promise<string[]>} 更新后的目录列表
 */
async function removeBackupDir(env, clientId, dirPath) {
  const cleanPath = String(dirPath || '').trim();
  const dirs = await getBackupDirs(env, clientId);
  const newDirs = dirs.filter(d => d !== cleanPath);
  if (newDirs.length !== dirs.length) {
    await saveBackupDirs(env, clientId, newDirs);
  }
  return newDirs;
}

/**
 * 清空客户端所有备份目录
 * @param {object} env
 * @param {string} clientId
 */
async function clearBackupDirs(env, clientId) {
  if (!clientId || !hasMetadataStore(env)) return;
  await requireFsKv(env).delete(BACKUP_DIRS_PREFIX + clientId);
}

function normalizeVirtualPath(path = '') {
  return String(path || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .join('/');
}

function assertVirtualPath(path = '', options = {}) {
  const clean = normalizeVirtualPath(path);
  if (!clean && !options.allowRoot) throw new Error('invalid path');
  if (/[\u0000-\u001F]/.test(clean)) throw new Error('invalid path');
  const parts = clean.split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..')) throw new Error('invalid path');
  return clean;
}

function virtualPathName(path = '') {
  return normalizeVirtualPath(path).split('/').filter(Boolean).pop() || '';
}

function virtualParentPath(path = '') {
  const parts = normalizeVirtualPath(path).split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function joinVirtualPath(base, name) {
  const cleanBase = normalizeVirtualPath(base);
  const cleanName = normalizeVirtualPath(name);
  if (!cleanBase) return cleanName;
  if (!cleanName) return cleanBase;
  return cleanBase + '/' + cleanName;
}

function isVirtualChildPath(path, parent) {
  const cleanPath = normalizeVirtualPath(path);
  const cleanParent = normalizeVirtualPath(parent);
  return !!cleanParent && cleanPath.startsWith(cleanParent + '/');
}

function fileEntryKey(path = '') {
  return FS_FILE_PREFIX + normalizeVirtualPath(path);
}

function folderEntryKey(path = '') {
  return FS_FOLDER_PREFIX + normalizeVirtualPath(path);
}

function directoryIndexKey(path = '') {
  return FS_DIR_PREFIX + normalizeVirtualPath(path);
}

async function kvGetJson(env, key) {
  const raw = await requireFsKv(env).get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function kvPutJson(env, key, data, options) {
  await requireFsKv(env).put(key, JSON.stringify(data), options);
}

async function kvGetRaw(env, key) {
  return requireFsKv(env).get(key);
}

async function kvPutRaw(env, key, value, options) {
  await requireFsKv(env).put(key, value, options);
}

async function kvDelete(env, key) {
  await requireFsKv(env).delete(key);
}

async function kvListKeys(env, prefix) {
  const keys = [];
  let cursor;
  let safety = 0;
  do {
    const listed = await requireFsKv(env).list({ prefix, cursor, limit: 1000 });
    keys.push(...(listed.keys || []).map(item => item.name));
    cursor = listed.cursor;
    safety++;
    if (safety > 1000) throw new Error('too many metadata list pages');
  } while (cursor);
  return keys;
}

function shareEntryKey(id = '') {
  return SHARE_LINK_PREFIX + String(id || '').trim();
}

function normalizeShareId(id = '') {
  const clean = String(id || '').trim().toLowerCase();
  return /^[a-f0-9]{16,64}$/.test(clean) ? clean : '';
}

function shareAuthCookieName(id = '') {
  return SHARE_AUTH_COOKIE_PREFIX + normalizeShareId(id);
}

function shareNeedsPassword(share) {
  return !!share?.passwordHash;
}

function parseShareExpiresAt(value, ttlSeconds) {
  if (value) {
    const ts = Date.parse(value);
    if (!Number.isFinite(ts)) throw new Error('invalid expiresAt');
    return new Date(ts).toISOString();
  }
  const ttl = Number(ttlSeconds || 0);
  if (ttl > 0) return new Date(Date.now() + ttl * 1000).toISOString();
  return '';
}

function parseShareMaxAccesses(value) {
  const max = Number(value || 0);
  if (!max) return 0;
  if (!Number.isInteger(max) || max < 1) throw new Error('invalid maxAccesses');
  return max;
}

function normalizeShareRecord(data) {
  if (!data || data.type !== 'share') return null;
  const id = normalizeShareId(data.id);
  const path = normalizeVirtualPath(data.path || '');
  const targetType = data.targetType === 'folder' ? 'folder' : 'file';
  if (!id || !path) return null;
  return {
    type: 'share',
    id,
    path,
    targetType,
    passwordHash: String(data.passwordHash || ''),
    expiresAt: String(data.expiresAt || ''),
    maxAccesses: Math.max(0, Number(data.maxAccesses || 0) || 0),
    accessCount: Math.max(0, Number(data.accessCount || 0) || 0),
    passwordSalt: String(data.passwordSalt || id),
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || '')
  };
}

function publicShare(share) {
  const normalized = normalizeShareRecord(share);
  if (!normalized) return null;
  return {
    id: normalized.id,
    path: normalized.path,
    targetType: normalized.targetType,
    hasPassword: shareNeedsPassword(normalized),
    expiresAt: normalized.expiresAt,
    maxAccesses: normalized.maxAccesses,
    accessCount: normalized.accessCount,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    url: '/s/' + normalized.id,
    inactiveReason: shareInactiveReason(normalized)
  };
}

async function getShare(env, id) {
  const cleanId = normalizeShareId(id);
  if (!cleanId) return null;
  return normalizeShareRecord(await kvGetJson(env, shareEntryKey(cleanId)));
}

async function saveShare(env, share) {
  const normalized = normalizeShareRecord(share);
  if (!normalized) throw new Error('invalid share');
  await kvPutJson(env, shareEntryKey(normalized.id), {
    ...normalized,
    updatedAt: new Date().toISOString()
  });
}

async function deleteShare(env, id) {
  const cleanId = normalizeShareId(id);
  if (!cleanId) return false;
  await kvDelete(env, shareEntryKey(cleanId));
  return true;
}

async function listShares(env, filterPath = '') {
  const keys = await kvListKeys(env, SHARE_LINK_PREFIX);
  const shares = (await Promise.all(keys.map(key => kvGetJson(env, key))))
    .map(normalizeShareRecord)
    .filter(Boolean);
  const cleanFilter = normalizeVirtualPath(filterPath || '');
  return shares
    .filter(share => !cleanFilter || share.path === cleanFilter)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function getShareTargetType(env, path) {
  const clean = assertVirtualPath(path);
  if (await getFileEntry(env, clean)) return 'file';
  if (await getFolderEntry(env, clean)) return 'folder';
  throw new Error('not found');
}

async function hashSharePassword(password, id, env) {
  const secret = env.ACCESS_PASSWORD || env.STORAGE_NODE_TOKEN || '';
  const payload = `share-password:v1:${id}:${String(password || '')}`;
  return secret ? hmacHex(secret, payload) : sha256Hex(payload);
}

async function verifySharePassword(share, password, env) {
  if (!shareNeedsPassword(share)) return true;
  const expected = await hashSharePassword(password, share.passwordSalt || share.id, env);
  return constantTimeEqual(expected, share.passwordHash);
}

async function createShare(env, body = {}) {
  const cleanPath = assertVirtualPath(body.path || '');
  const targetType = await getShareTargetType(env, cleanPath);
  const id = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  const password = String(body.password || '');
  const expiresAt = parseShareExpiresAt(body.expiresAt, body.ttlSeconds);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw new Error('expiresAt must be in the future');
  const share = {
    type: 'share',
    id,
    path: cleanPath,
    targetType,
    passwordHash: password ? await hashSharePassword(password, id, env) : '',
    passwordSalt: id,
    expiresAt,
    maxAccesses: parseShareMaxAccesses(body.maxAccesses),
    accessCount: 0,
    createdAt: now,
    updatedAt: now
  };
  await saveShare(env, share);
  return normalizeShareRecord(share);
}

async function updateShare(env, id, body = {}) {
  const share = await getShare(env, id);
  if (!share) throw new Error('not found');
  const updated = { ...share };

  if (Object.prototype.hasOwnProperty.call(body, 'expiresAt') || Object.prototype.hasOwnProperty.call(body, 'ttlSeconds')) {
    const expiresAt = parseShareExpiresAt(body.expiresAt, body.ttlSeconds);
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw new Error('expiresAt must be in the future');
    updated.expiresAt = expiresAt;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'maxAccesses')) {
    updated.maxAccesses = parseShareMaxAccesses(body.maxAccesses);
  }

  if (body.passwordMode === 'clear') {
    updated.passwordHash = '';
  } else if (body.passwordMode === 'set' || String(body.password || '')) {
    const password = String(body.password || '');
    if (!password) throw new Error('missing password');
    updated.passwordSalt = updated.passwordSalt || updated.id;
    updated.passwordHash = await hashSharePassword(password, updated.passwordSalt, env);
  }

  if (body.resetAccessCount === true) updated.accessCount = 0;
  await saveShare(env, updated);
  return getShare(env, updated.id);
}

async function refreshShareLink(env, id) {
  const share = await getShare(env, id);
  if (!share) throw new Error('not found');
  const now = new Date().toISOString();
  const refreshed = {
    ...share,
    id: crypto.randomUUID().replace(/-/g, ''),
    passwordSalt: share.passwordSalt || share.id,
    accessCount: 0,
    createdAt: now,
    updatedAt: now
  };
  await saveShare(env, refreshed);
  await deleteShare(env, share.id);
  return getShare(env, refreshed.id);
}

function shareInactiveReason(share) {
  if (!share) return 'not_found';
  if (share.expiresAt) {
    const expiresAt = Date.parse(share.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return 'expired';
  }
  if (share.maxAccesses && share.accessCount >= share.maxAccesses) return 'access_limit';
  return '';
}

async function consumeShareAccess(env, share) {
  const reason = shareInactiveReason(share);
  if (reason) throw new Error(reason);
  const updated = {
    ...share,
    accessCount: Math.max(0, Number(share.accessCount || 0)) + 1,
    updatedAt: new Date().toISOString()
  };
  await saveShare(env, updated);
  return normalizeShareRecord(updated);
}

function shareTokenSecret(env, share) {
  return env.ACCESS_PASSWORD || env.STORAGE_NODE_TOKEN || share.passwordHash || share.id;
}

async function generateShareAccessToken(share, env) {
  const t = Date.now();
  const n = crypto.randomUUID().replace(/-/g, '');
  const version = share.updatedAt || share.createdAt || '';
  const payload = `share-auth:v1:${share.id}:${version}:${t}:${n}`;
  const s = await hmacHex(shareTokenSecret(env, share), payload);
  return btoa(JSON.stringify({ v: 1, id: share.id, t, n, s }));
}

async function verifyShareAccessToken(token, share, env) {
  try {
    if (!token || !shareNeedsPassword(share)) return false;
    const { v, id, t, n, s } = JSON.parse(atob(token));
    const issuedAt = Number(t);
    const now = Date.now();
    if (v !== 1 || id !== share.id) return false;
    if (!Number.isFinite(issuedAt) || issuedAt > now + SESSION_FUTURE_SKEW_MS) return false;
    if (now - issuedAt > SESSION_DURATION) return false;
    if (!/^[a-f0-9]{64}$/i.test(String(s || ''))) return false;
    if (!/^[a-f0-9]{32,64}$/i.test(String(n || ''))) return false;
    const version = share.updatedAt || share.createdAt || '';
    const payload = `share-auth:v1:${share.id}:${version}:${issuedAt}:${n}`;
    const expected = await hmacHex(shareTokenSecret(env, share), payload);
    return constantTimeEqual(String(s).toLowerCase(), expected);
  } catch {
    return false;
  }
}

async function hasShareAccess(request, env, share) {
  if (!shareNeedsPassword(share)) return true;
  return verifyShareAccessToken(getCookie(request, shareAuthCookieName(share.id)), share, env);
}

function shareCookieMaxAge(share) {
  let seconds = Math.floor(SESSION_DURATION / 1000);
  if (share?.expiresAt) {
    const expiresAt = Date.parse(share.expiresAt);
    if (Number.isFinite(expiresAt)) seconds = Math.min(seconds, Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
  }
  return Math.max(0, seconds);
}

function shareTargetPath(share, subPath = '') {
  const relative = assertVirtualPath(subPath || '', { allowRoot: true });
  if (share.targetType === 'file') {
    if (relative) throw new Error('invalid share path');
    return share.path;
  }
  return joinVirtualPath(share.path, relative);
}

function normalizeDirectoryIndex(index, path = '') {
  const clean = assertVirtualPath(path, { allowRoot: true });
  const folderNames = new Set(Array.isArray(index?.folders) ? index.folders.map(normalizeVirtualPath).filter(name => name && !name.includes('/')) : []);
  const fileMap = new Map();
  if (Array.isArray(index?.files)) {
    for (const file of index.files) {
      const name = normalizeVirtualPath(file?.name || '');
      if (!name || name.includes('/')) continue;
      fileMap.set(name, {
        name,
        size: Number(file.size || 0),
        uploaded: file.uploaded || '',
        etag: file.etag || ''
      });
    }
  }
  return {
    version: 1,
    path: clean,
    folders: [...folderNames].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    files: [...fileMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    updatedAt: index?.updatedAt || new Date().toISOString()
  };
}

async function putDirectoryIndex(env, path, index) {
  const clean = assertVirtualPath(path, { allowRoot: true });
  await kvPutJson(env, directoryIndexKey(clean), normalizeDirectoryIndex({
    ...index,
    updatedAt: new Date().toISOString()
  }, clean));
}

async function rebuildDirectoryIndexFromKv(env, path = '') {
  const clean = assertVirtualPath(path, { allowRoot: true });
  const folderPrefix = FS_FOLDER_PREFIX + (clean ? clean + '/' : '');
  const filePrefix = FS_FILE_PREFIX + (clean ? clean + '/' : '');

  const folderNames = new Set();
  for (const key of await kvListKeys(env, folderPrefix)) {
    const relative = key.slice(folderPrefix.length);
    if (relative && !relative.includes('/')) folderNames.add(relative);
  }

  const fileKeys = [];
  for (const key of await kvListKeys(env, filePrefix)) {
    const relative = key.slice(filePrefix.length);
    if (relative && !relative.includes('/')) fileKeys.push(key);
  }

  const files = (await Promise.all(fileKeys.map(key => kvGetJson(env, key))))
    .filter(entry => entry?.type === 'file')
    .map(publicFileEntry);

  const index = normalizeDirectoryIndex({ folders: [...folderNames], files }, clean);
  await putDirectoryIndex(env, clean, index);
  return index;
}

async function getDirectoryIndex(env, path = '') {
  const clean = assertVirtualPath(path, { allowRoot: true });
  const index = await kvGetJson(env, directoryIndexKey(clean));
  if (index?.version === 1) return normalizeDirectoryIndex(index, clean);
  return rebuildDirectoryIndexFromKv(env, clean);
}

async function mutateDirectoryIndex(env, path, mutator) {
  const clean = assertVirtualPath(path, { allowRoot: true });
  const index = await getDirectoryIndex(env, clean);
  mutator(index);
  await putDirectoryIndex(env, clean, index);
}

async function addFolderToDirectoryIndex(env, folderPath) {
  const clean = assertVirtualPath(folderPath);
  const parent = virtualParentPath(clean);
  const name = virtualPathName(clean);
  await mutateDirectoryIndex(env, parent, index => {
    if (!index.folders.includes(name)) index.folders.push(name);
  });
  if (!await kvGetJson(env, directoryIndexKey(clean))) {
    await putDirectoryIndex(env, clean, { folders: [], files: [] });
  }
}

async function removeFolderFromDirectoryIndex(env, folderPath) {
  const clean = assertVirtualPath(folderPath);
  const parent = virtualParentPath(clean);
  const name = virtualPathName(clean);
  await mutateDirectoryIndex(env, parent, index => {
    index.folders = index.folders.filter(item => item !== name);
  });
}

async function addFileToDirectoryIndex(env, entry) {
  const clean = assertVirtualPath(entry.path);
  const parent = virtualParentPath(clean);
  const file = publicFileEntry({ ...entry, path: clean });
  await mutateDirectoryIndex(env, parent, index => {
    index.files = index.files.filter(item => item.name !== file.name);
    index.files.push(file);
  });
}

async function removeFileFromDirectoryIndex(env, filePath) {
  const clean = assertVirtualPath(filePath);
  const parent = virtualParentPath(clean);
  const name = virtualPathName(clean);
  await mutateDirectoryIndex(env, parent, index => {
    index.files = index.files.filter(item => item.name !== name);
  });
}

async function deleteDirectoryIndex(env, path) {
  const clean = assertVirtualPath(path);
  await requireFsKv(env).delete(directoryIndexKey(clean));
}

async function removeDeletedItemsFromParentIndexes(env, filePaths = [], folderPaths = []) {
  const updates = new Map();
  const getUpdate = path => {
    const clean = assertVirtualPath(path, { allowRoot: true });
    if (!updates.has(clean)) updates.set(clean, { files: new Set(), folders: new Set() });
    return updates.get(clean);
  };

  for (const filePath of filePaths) {
    const clean = assertVirtualPath(filePath);
    getUpdate(virtualParentPath(clean)).files.add(virtualPathName(clean));
  }

  const folderSet = new Set(folderPaths.map(path => assertVirtualPath(path)));
  for (const folderPath of folderSet) {
    const parent = virtualParentPath(folderPath);
    if (folderSet.has(parent)) continue;
    getUpdate(parent).folders.add(virtualPathName(folderPath));
  }

  await mapWithConcurrency([...updates.entries()], 8, async ([parent, change]) => {
    await mutateDirectoryIndex(env, parent, index => {
      if (change.files.size) index.files = index.files.filter(item => !change.files.has(item.name));
      if (change.folders.size) index.folders = index.folders.filter(item => !change.folders.has(item));
    });
  });
}

async function getFileEntry(env, path) {
  const clean = assertVirtualPath(path);
  const entry = await kvGetJson(env, fileEntryKey(clean));
  return entry?.type === 'file' && entry.storageKey ? { ...entry, path: clean, name: entry.name || virtualPathName(clean) } : null;
}

async function getFolderEntry(env, path) {
  const clean = assertVirtualPath(path, { allowRoot: true });
  if (!clean) return { type: 'folder', path: '', name: '', createdAt: '' };
  const entry = await kvGetJson(env, folderEntryKey(clean));
  return entry?.type === 'folder' ? { ...entry, path: clean, name: entry.name || virtualPathName(clean) } : null;
}

async function ensureFolderHierarchy(env, folderPath = '') {
  const clean = assertVirtualPath(folderPath, { allowRoot: true });
  if (!clean) return;
  const parts = clean.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current = current ? current + '/' + part : part;
    if (await getFileEntry(env, current)) throw new Error('parent path is a file');
    const existing = await getFolderEntry(env, current);
    if (!existing) {
      const now = new Date().toISOString();
      await kvPutJson(env, folderEntryKey(current), {
        type: 'folder',
        path: current,
        name: virtualPathName(current),
        createdAt: now,
        updatedAt: now
      });
      await addFolderToDirectoryIndex(env, current);
    }
  }
}

async function putFolderEntry(env, path) {
  const clean = assertVirtualPath(path);
  if (await getFileEntry(env, clean)) throw new Error('path exists as file');
  await ensureFolderHierarchy(env, virtualParentPath(clean));
  const now = new Date().toISOString();
  const existing = await getFolderEntry(env, clean);
  await kvPutJson(env, folderEntryKey(clean), {
    type: 'folder',
    path: clean,
    name: virtualPathName(clean),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  await addFolderToDirectoryIndex(env, clean);
}

function manifestSizeFromMetadata(meta) {
  const manifestSize = meta?.customMetadata?.r2driveSize ? parseInt(meta.customMetadata.r2driveSize, 10) : null;
  return Number.isFinite(manifestSize) ? manifestSize : null;
}

function fileEntryFromR2Meta(path, storageKey, meta, overrides = {}) {
  const clean = assertVirtualPath(path);
  const size = Number.isFinite(Number(overrides.size))
    ? Number(overrides.size)
    : (manifestSizeFromMetadata(meta) ?? Number(meta?.size || 0));
  const uploaded = overrides.uploaded || (meta?.uploaded ? new Date(meta.uploaded).toISOString() : new Date().toISOString());
  return {
    type: 'file',
    path: clean,
    name: virtualPathName(clean),
    storageKey,
    size,
    uploaded,
    contentType: overrides.contentType || meta?.httpMetadata?.contentType || getMimeType(clean),
    etag: overrides.etag || meta?.etag || '',
    storageType: overrides.storageType || (hasManifestMetadata(meta) ? 'distributed' : 'r2'),
    createdAt: overrides.createdAt || uploaded,
    updatedAt: new Date().toISOString()
  };
}

async function putFileEntry(env, entry) {
  const clean = assertVirtualPath(entry.path);
  if (await getFolderEntry(env, clean)) throw new Error('path exists as folder');
  await ensureFolderHierarchy(env, virtualParentPath(clean));
  const stored = {
    ...entry,
    type: 'file',
    path: clean,
    name: virtualPathName(clean),
    updatedAt: new Date().toISOString()
  };
  await kvPutJson(env, fileEntryKey(clean), stored);
  await addFileToDirectoryIndex(env, stored);
}

function safeStorageName(name = 'file') {
  const clean = String(name || 'file')
    .replace(/[\/\\\u0000-\u001F]/g, '_')
    .replace(/^\.{1,2}$/, '_')
    .trim();
  return (clean || 'file').slice(0, 160);
}

async function hasStorageReference(env, storageKey, excludingPaths = new Set()) {
  if (!storageKey) return false;
  const DB = env.DB;
  if (DB) {
    await ensureD1KvSchema(DB);
    const now = Math.floor(Date.now() / 1000);
    const bound = prefixUpperBound(FS_FILE_PREFIX);
    if (excludingPaths.size === 0) {
      const row = await DB.prepare(
        `SELECT 1 FROM ${D1_KV_TABLE} WHERE "key" >= ? AND "key" < ? AND json_extract("value", '$.storageKey') = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`
      ).bind(FS_FILE_PREFIX, bound, storageKey, now).first();
      return !!row;
    }
    const result = await DB.prepare(
      `SELECT "key" FROM ${D1_KV_TABLE} WHERE "key" >= ? AND "key" < ? AND json_extract("value", '$.storageKey') = ? AND (expires_at IS NULL OR expires_at > ?)`
    ).bind(FS_FILE_PREFIX, bound, storageKey, now).all();
    for (const row of (result.results || [])) {
      const path = row.key.startsWith(FS_FILE_PREFIX) ? row.key.slice(FS_FILE_PREFIX.length) : '';
      if (path && !excludingPaths.has(normalizeVirtualPath(path))) return true;
    }
    return false;
  }
  const entries = await listAllFileEntries(env, '');
  for (const entry of entries) {
    if (entry?.storageKey === storageKey && !excludingPaths.has(normalizeVirtualPath(entry.path))) {
      return true;
    }
  }
  return false;
}

async function findReferencedStorageKeysD1(env, storageKeys) {
  if (!storageKeys.length) return new Set();
  const DB = env.DB;
  if (!DB) {
    const allEntries = await listAllFileEntries(env, '');
    const referenced = new Set();
    const keySet = new Set(storageKeys);
    for (const entry of allEntries) {
      if (entry?.storageKey && keySet.has(entry.storageKey)) referenced.add(entry.storageKey);
    }
    return referenced;
  }
  await ensureD1KvSchema(DB);
  const now = Math.floor(Date.now() / 1000);
  const bound = prefixUpperBound(FS_FILE_PREFIX);
  const referenced = new Set();
  const BATCH_SIZE = 50;
  for (let i = 0; i < storageKeys.length; i += BATCH_SIZE) {
    const chunk = storageKeys.slice(i, i + BATCH_SIZE);
    const statements = chunk.map(sk =>
      DB.prepare(
        `SELECT 1 FROM ${D1_KV_TABLE} WHERE "key" >= ? AND "key" < ? AND json_extract("value", '$.storageKey') = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`
      ).bind(FS_FILE_PREFIX, bound, sk, now)
    );
    const results = await DB.batch(statements);
    results.forEach((result, idx) => {
      if (result.results && result.results.length > 0) referenced.add(chunk[idx]);
    });
  }
  return referenced;
}

async function createStorageKeyForPath(env, R2, logicalPath, prefix = 'file') {
  const baseName = safeStorageName(virtualPathName(logicalPath) || prefix);
  if (!await R2.head(baseName) && !await hasStorageReference(env, baseName)) return baseName;

  for (let i = 0; i < 10; i++) {
    const id = crypto.randomUUID().replace(/-/g, '');
    const key = safeStorageName(prefix + '_' + id + '_' + baseName);
    if (!await R2.head(key) && !await hasStorageReference(env, key)) return key;
  }
  return safeStorageName(prefix + '_' + Date.now() + '_' + baseName);
}

async function cleanupUnreferencedStorage(env, R2, entry) {
  if (!entry?.storageKey) return;
  if (await hasStorageReference(env, entry.storageKey)) return;
  await cleanupStorageEntry(env, R2, entry);
}

async function cleanupStorageEntry(env, R2, entry) {
  if (!entry?.storageKey) return;
  const obj = await R2.get(entry.storageKey);
  const manifest = await readManifestObject(obj);
  if (isManifestFile(manifest)) await deleteManifestParts(manifest, env);
  await R2.delete(entry.storageKey);
}

async function replaceFileEntry(env, R2, entry) {
  const clean = assertVirtualPath(entry.path);
  const existing = await getFileEntry(env, clean);
  await putFileEntry(env, entry);
  if (existing && existing.storageKey !== entry.storageKey) {
    await cleanupUnreferencedStorage(env, R2, existing);
  }
}

async function listDirectory(env, path = '') {
  const clean = assertVirtualPath(path, { allowRoot: true });
  const index = await getDirectoryIndex(env, clean);
  return {
    folders: index.folders,
    files: index.files
  };
}

async function listAllFileEntries(env, folderPath = '') {
  const clean = assertVirtualPath(folderPath, { allowRoot: true });
  const index = await getDirectoryIndex(env, clean);
  const directFiles = await Promise.all(index.files.map(file => getFileEntry(env, joinVirtualPath(clean, file.name))));
  const nestedGroups = await mapWithConcurrency(index.folders, 8, folder => listAllFileEntries(env, joinVirtualPath(clean, folder)));
  const nestedFiles = nestedGroups.flat();
  return [
    ...directFiles.filter(Boolean),
    ...nestedFiles
  ].map(entry => ({ ...entry, path: normalizeVirtualPath(entry.path), name: entry.name || virtualPathName(entry.path) }));
}

async function listFolderPaths(env, folderPath = '') {
  const clean = assertVirtualPath(folderPath, { allowRoot: true });
  const index = await getDirectoryIndex(env, clean);
  const folderGroups = await mapWithConcurrency(index.folders, 8, async folder => {
    const childPath = joinVirtualPath(clean, folder);
    return [childPath, ...await listFolderPaths(env, childPath)];
  });
  return folderGroups.flat();
}

async function getVirtualPathSource(env, path, allowMissing = false) {
  const clean = assertVirtualPath(path, { allowRoot: true });
  if (!clean) {
    if (allowMissing) return { type: 'missing', path: '', files: [], folders: [] };
    throw new Error('invalid path');
  }

  const file = await getFileEntry(env, clean);
  if (file) return { type: 'file', path: clean, file, files: [file], folders: [] };

  const folder = await getFolderEntry(env, clean);
  const files = await listAllFileEntries(env, clean);
  const childFolders = await listFolderPaths(env, clean);
  if (folder || files.length || childFolders.length) {
    return { type: 'folder', path: clean, folders: [clean, ...childFolders], files };
  }

  if (allowMissing) return { type: 'missing', path: clean, files: [], folders: [] };
  throw new Error('not found');
}

function assertVirtualOperationAllowed(source, to) {
  const cleanTo = assertVirtualPath(to);
  if (cleanTo === source.path) throw new Error('source and destination are the same');
  if (source.type === 'folder' && isVirtualChildPath(cleanTo, source.path)) {
    throw new Error('cannot copy or move a folder into itself');
  }
  return cleanTo;
}

function rebaseVirtualPath(path, fromRoot, toRoot) {
  const cleanPath = normalizeVirtualPath(path);
  const cleanFrom = normalizeVirtualPath(fromRoot);
  const cleanTo = normalizeVirtualPath(toRoot);
  const relative = cleanPath === cleanFrom ? '' : cleanPath.slice(cleanFrom.length + 1);
  return joinVirtualPath(cleanTo, relative);
}

async function copyVirtualPath(env, R2, from, to) {
  const source = await getVirtualPathSource(env, from);
  const target = assertVirtualOperationAllowed(source, to);

  if (source.type === 'file') {
    if (await getFolderEntry(env, target)) throw new Error('destination is a folder');
    await replaceFileEntry(env, R2, {
      ...source.file,
      path: target,
      name: virtualPathName(target),
      copiedAt: new Date().toISOString()
    });
    return { type: 'file', copied: 1 };
  }

  if (await getFileEntry(env, target)) throw new Error('destination is a file');
  await putFolderEntry(env, target);

  const folders = source.folders
    .map(folder => rebaseVirtualPath(folder, source.path, target))
    .filter(folder => folder !== target)
    .sort((a, b) => a.length - b.length);
  for (const folder of folders) await putFolderEntry(env, folder);

  for (const file of source.files) {
    const targetPath = rebaseVirtualPath(file.path, source.path, target);
    if (await getFolderEntry(env, targetPath)) throw new Error('destination is a folder');
    await replaceFileEntry(env, R2, {
      ...file,
      path: targetPath,
      name: virtualPathName(targetPath),
      copiedAt: new Date().toISOString()
    });
  }

  return { type: 'folder', copied: source.files.length };
}

async function moveVirtualPath(env, R2, from, to) {
  const source = await getVirtualPathSource(env, from);
  const target = assertVirtualOperationAllowed(source, to);

  if (source.type === 'file') {
    if (await getFolderEntry(env, target)) throw new Error('destination is a folder');
    const overwritten = await getFileEntry(env, target);
    await putFileEntry(env, {
      ...source.file,
      path: target,
      name: virtualPathName(target),
      movedAt: new Date().toISOString()
    });
    await requireFsKv(env).delete(fileEntryKey(source.path));
    await removeFileFromDirectoryIndex(env, source.path);
    if (overwritten && overwritten.storageKey !== source.file.storageKey) {
      await cleanupUnreferencedStorage(env, R2, overwritten);
    }
    return { type: 'file', moved: 1 };
  }

  if (await getFileEntry(env, target)) throw new Error('destination is a file');

  const overwritten = [];
  await putFolderEntry(env, target);
  const folders = source.folders
    .map(folder => rebaseVirtualPath(folder, source.path, target))
    .filter(folder => folder !== target)
    .sort((a, b) => a.length - b.length);
  for (const folder of folders) await putFolderEntry(env, folder);

  for (const file of source.files) {
    const targetPath = rebaseVirtualPath(file.path, source.path, target);
    if (await getFolderEntry(env, targetPath)) throw new Error('destination is a folder');
    const existing = await getFileEntry(env, targetPath);
    if (existing) overwritten.push(existing);
    await putFileEntry(env, {
      ...file,
      path: targetPath,
      name: virtualPathName(targetPath),
      movedAt: new Date().toISOString()
    });
  }

  for (const file of source.files) {
    await requireFsKv(env).delete(fileEntryKey(file.path));
    await removeFileFromDirectoryIndex(env, file.path);
  }
  for (const folder of source.folders.sort((a, b) => b.length - a.length)) {
    await requireFsKv(env).delete(folderEntryKey(folder));
    await removeFolderFromDirectoryIndex(env, folder);
    await deleteDirectoryIndex(env, folder);
  }
  for (const entry of overwritten) await cleanupUnreferencedStorage(env, R2, entry);

  return { type: 'folder', moved: source.files.length };
}

/**
 * Lightweight path collection: traverses directory indexes without reading
 * individual file entries from KV. Much faster than getVirtualPathSource for
 * large folders when only paths (not storage keys) are needed.
 */
async function collectVirtualPathPaths(env, folderPath) {
  const clean = assertVirtualPath(folderPath, { allowRoot: true });
  const index = await getDirectoryIndex(env, clean);

  const filePaths = [];
  const folderPaths = [clean];

  // Collect files from this directory
  for (const file of index.files) {
    filePaths.push(joinVirtualPath(clean, file.name));
  }

  // Recurse into subdirectories
  const subGroups = await mapWithConcurrency(index.folders, 8, async folder => {
    const child = joinVirtualPath(clean, folder);
    const result = await collectVirtualPathPaths(env, child);
    return result;
  });

  for (const sub of subGroups) {
    filePaths.push(...sub.filePaths);
    folderPaths.push(...sub.folderPaths);
  }

  return { filePaths, folderPaths };
}

// Deferred storage cleanup: uses ctx.waitUntil() to keep the worker alive
// until all R2 object deletions complete. Falls back to fire-and-forget
// if ctx is not available (but cleanup may be unreliable in that case).
function scheduleStorageCleanup(env, R2, entries, ctx) {
  if (!entries || !entries.length) return;
  // Clone the data we need so the caller can move on
  const tasks = entries.filter(e => e?.storageKey).map(e => ({ storageKey: e.storageKey, path: e.path }));
  if (!tasks.length) return;
  if (!ctx) {
    console.warn('[scheduleStorageCleanup] called without ctx — cleanup may be killed before completion');
  }
  const cleanupPromise = (async () => {
    try {
      const storageKeys = [...new Set(tasks.map(t => t.storageKey))];
      const referenced = await findReferencedStorageKeysD1(env, storageKeys);
      const toClean = tasks.filter(t => !referenced.has(t.storageKey));
      for (const entry of toClean) {
        try {
          await cleanupStorageEntry(env, R2, entry);
        } catch (e) {
          console.error('[scheduleStorageCleanup] cleanupStorageEntry failed for', entry?.storageKey, ':', e?.message || e);
        }
      }
    } catch (e) {
      console.error('[scheduleStorageCleanup] batch cleanup failed:', e?.message || e);
    }
  })();
  if (ctx) {
    ctx.waitUntil(cleanupPromise);
  }
}

async function batchDeleteKvKeys(env, keys) {
  const kv = requireFsKv(env);
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;
  if (typeof kv.batchDelete === 'function') {
    await kv.batchDelete(unique);
  } else {
    // Fallback for plain KV namespace
    await mapWithConcurrency(unique, 16, key => kv.delete(key));
  }
}

async function batchGetKvJson(env, keys) {
  const kv = requireFsKv(env);
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return new Map();
  if (typeof kv.batchGetJson === 'function') {
    return kv.batchGetJson(unique);
  }
  // Fallback for plain KV namespace: read individually
  const result = new Map();
  await mapWithConcurrency(unique, 16, async key => {
    const val = await kvGetJson(env, key);
    if (val !== null) result.set(key, val);
  });
  return result;
}

async function deleteVirtualPath(env, R2, path, ctx) {
  const clean = assertVirtualPath(path);
  if (!clean) return { deleted: 0 };

  // Fast path: check if it's a single file
  const fileEntry = await getFileEntry(env, clean);
  if (fileEntry) {
    await requireFsKv(env).delete(fileEntryKey(clean));
    await removeFileFromDirectoryIndex(env, clean);
    scheduleStorageCleanup(env, R2, [fileEntry], ctx);
    return { deleted: 1 };
  }

  // Check if it's a folder
  const folderEntry = await getFolderEntry(env, clean);
  if (!folderEntry && clean) {
    // Doesn't exist
    return { deleted: 0 };
  }

  // Folder: use lightweight path collection to avoid N+1 KV reads
  const { filePaths, folderPaths } = await collectVirtualPathPaths(env, clean);

  if (!filePaths.length && folderPaths.length <= 1) {
    // Empty folder: just delete the folder entry and directory index
    await batchDeleteKvKeys(env, [folderEntryKey(clean), directoryIndexKey(clean)]);
    await removeFolderFromDirectoryIndex(env, clean);
    return { deleted: 1 };
  }

  // 1. Batch-read all file entries to collect storage keys (before deletion)
  const fileEntryKeys = filePaths.map(p => fileEntryKey(p));
  const fileEntryMap = await batchGetKvJson(env, fileEntryKeys);

  const storageEntries = [];
  for (const [key, entry] of fileEntryMap) {
    if (entry?.storageKey) {
      const filePath = key.startsWith(FS_FILE_PREFIX) ? key.slice(FS_FILE_PREFIX.length) : '';
      storageEntries.push({ storageKey: entry.storageKey, path: filePath, ...entry });
    }
  }

  // 2. Update parent directory indexes
  const sortedFolders = folderPaths.sort((a, b) => b.length - a.length);
  await removeDeletedItemsFromParentIndexes(env, filePaths, sortedFolders);

  // 3. Batch-delete all metadata (file entries + folder entries + directory indexes)
  const allKeys = [
    ...fileEntryKeys,
    ...sortedFolders.flatMap(f => [folderEntryKey(f), directoryIndexKey(f)])
  ];
  await batchDeleteKvKeys(env, allKeys);

  // 4. Storage cleanup: deferred via ctx.waitUntil()
  scheduleStorageCleanup(env, R2, storageEntries, ctx);

  return { deleted: filePaths.length + sortedFolders.length };
}

async function deleteMultipleVirtualPaths(env, R2, paths, ctx) {
  const cleanPaths = [...new Set(paths.map(p => normalizeVirtualPath(p)).filter(Boolean))];
  if (!cleanPaths.length) return { deleted: 0, cleanupFailed: 0 };

  // Separate files and folders, collecting paths using lightweight index traversal
  const allFilePaths = [];
  const allFolderPaths = [];
  const allStorageEntries = [];

  for (const p of cleanPaths) {
    // Fast check: is it a file?
    const fileEntry = await getFileEntry(env, p);
    if (fileEntry) {
      allFilePaths.push(p);
      if (fileEntry.storageKey) allStorageEntries.push({ storageKey: fileEntry.storageKey, path: p, ...fileEntry });
      continue;
    }

    // Is it a folder?
    const folderEntry = await getFolderEntry(env, p);
    if (!folderEntry) continue; // Doesn't exist, skip

    // Collect paths from folder (lightweight, index-only)
    const { filePaths, folderPaths } = await collectVirtualPathPaths(env, p);
    allFilePaths.push(...filePaths);
    allFolderPaths.push(...folderPaths);
  }

  if (!allFilePaths.length && !allFolderPaths.length) return { deleted: 0, cleanupFailed: 0 };

  const uniqueFiles = [...new Set(allFilePaths)];
  const uniqueFolders = [...new Set(allFolderPaths)].sort((a, b) => b.length - a.length);

  // 1. Batch-read all file entries to collect storage keys (before deletion)
  if (uniqueFiles.length) {
    const fileEntryKeys = uniqueFiles.map(p => fileEntryKey(p));
    const fileEntryMap = await batchGetKvJson(env, fileEntryKeys);
    for (const [key, entry] of fileEntryMap) {
      if (entry?.storageKey) {
        const filePath = key.startsWith(FS_FILE_PREFIX) ? key.slice(FS_FILE_PREFIX.length) : '';
        // Avoid duplicates
        if (!allStorageEntries.some(e => e.storageKey === entry.storageKey)) {
          allStorageEntries.push({ storageKey: entry.storageKey, path: filePath, ...entry });
        }
      }
    }
  }

  // 2. Update parent directory indexes
  if (uniqueFiles.length || uniqueFolders.length) {
    await removeDeletedItemsFromParentIndexes(env, uniqueFiles, uniqueFolders);
  }

  // 3. Batch-delete all metadata
  const allKeys = [
    ...uniqueFiles.map(p => fileEntryKey(p)),
    ...uniqueFolders.flatMap(f => [folderEntryKey(f), directoryIndexKey(f)])
  ];
  await batchDeleteKvKeys(env, allKeys);

  // 4. Storage cleanup: deferred via ctx.waitUntil()
  scheduleStorageCleanup(env, R2, allStorageEntries, ctx);

  return {
    deleted: uniqueFiles.length + uniqueFolders.length,
    cleanupFailed: 0
  };
}

// ── Orphan File Cleanup ──
// Scans R2 for objects that have no corresponding D1 file entry or manifest part reference.

async function findAllReferencedStorageKeys(env) {
  const DB = env.DB;
  const referenced = new Set();

  if (DB) {
    // D1 path: query all file entries efficiently
    await ensureD1KvSchema(DB);
    const now = Math.floor(Date.now() / 1000);
    const prefix = FS_FILE_PREFIX;
    const bound = prefixUpperBound(prefix);

    let offset = 0;
    const PAGE = 200;
    let safety = 0;
    while (safety < 500) {
      const result = await DB.prepare(
        `SELECT "value" FROM ${D1_KV_TABLE} WHERE "key" >= ? AND "key" < ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY "key" LIMIT ? OFFSET ?`
      ).bind(prefix, bound, now, PAGE, offset).all();
      const rows = result.results || [];
      if (!rows.length) break;

      for (const row of rows) {
        try {
          const entry = JSON.parse(row.value);
          if (entry?.storageKey) {
            referenced.add(entry.storageKey);
            // For distributed files, also collect manifest part keys
            if (entry.storageType === 'distributed') {
              // We'll collect part keys in a separate pass via R2
            }
          }
        } catch { /* skip malformed JSON */ }
      }

      if (rows.length < PAGE) break;
      offset += PAGE;
      safety++;
    }
  } else {
    // Fallback: use listAllFileEntries
    const allEntries = await listAllFileEntries(env, '');
    for (const entry of allEntries) {
      if (entry?.storageKey) referenced.add(entry.storageKey);
    }
  }

  return referenced;
}

async function collectManifestPartKeys(env, R2, storageKeys, ctx) {
  const partKeys = new Set();
  if (!storageKeys.size) return partKeys;

  // For each storageKey, try to read it as a manifest
  // Only process keys that might be manifests — we check R2 metadata
  const keys = [...storageKeys];
  const BATCH = 10;

  for (let i = 0; i < keys.length; i += BATCH) {
    const chunk = keys.slice(i, i + BATCH);
    const results = await Promise.all(chunk.map(async (key) => {
      try {
        const meta = await R2.head(key);
        if (!meta || !hasManifestMetadata(meta)) return [];
        const obj = await R2.get(key);
        const manifest = await readManifestObject(obj);
        if (!isManifestFile(manifest)) return [];
        return (manifest.parts || []).map(p => p.key).filter(Boolean);
      } catch {
        return [];
      }
    }));
    for (const keys of results) {
      for (const k of keys) partKeys.add(k);
    }
  }

  return partKeys;
}

async function findOrphanStorageKeys(env, R2, ctx) {
  // 1. Collect all R2 object keys with sizes
  const r2Objects = [];
  let cursor;
  let safety = 0;
  do {
    const listed = await R2.list({ cursor, limit: 500, include: ['customMetadata'] });
    for (const obj of listed.objects) {
      r2Objects.push({ key: obj.key, size: obj.size });
    }
    cursor = listed.cursor;
    safety++;
    if (safety > 200) break; // safety limit: max ~100k objects
  } while (cursor);

  if (!r2Objects.length) return { orphans: [], totalSize: 0, totalObjects: 0 };

  // 2. Collect all referenced storage keys from D1 file entries
  const referenced = await findAllReferencedStorageKeys(env);

  // 3. Collect manifest part keys (keys referenced inside distributed file manifests)
  const partKeys = await collectManifestPartKeys(env, R2, referenced, ctx);
  for (const key of partKeys) referenced.add(key);

  // 4. Also reference multipart/r2multipart session keys?
  // Skip temporary session data for now; session keys have TTL and auto-expire

  // 5. Find orphans: R2 objects not in the referenced set
  const orphans = r2Objects.filter(obj => !referenced.has(obj.key));
  const totalSize = orphans.reduce((sum, o) => sum + o.size, 0);

  return {
    orphans: orphans.map(o => ({ key: o.key, size: o.size })),
    totalSize,
    totalObjects: r2Objects.length
  };
}

async function deleteOrphanStorageKeys(env, R2, keys, ctx) {
  if (!keys || !keys.length) return { deleted: 0, failed: 0, freedBytes: 0 };

  const keysToDelete = [...new Set(keys.filter(Boolean))];
  let deleted = 0;
  let failed = 0;
  let freedBytes = 0;

  // Get sizes before deletion (for reporting)
  const sizes = new Map();
  const BATCH_SIZE = 5;
  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const chunk = keysToDelete.slice(i, i + BATCH_SIZE);
    const metas = await Promise.all(chunk.map(k => R2.head(k).catch(() => null)));
    metas.forEach((meta, idx) => {
      if (meta) sizes.set(chunk[idx], meta.size || 0);
    });
  }

  // Delete in manageable batches — always await for accurate API response
  const DELETE_BATCH = 10;
  for (let i = 0; i < keysToDelete.length; i += DELETE_BATCH) {
    const chunk = keysToDelete.slice(i, i + DELETE_BATCH);
    const results = await Promise.allSettled(chunk.map(k => R2.delete(k)));
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        deleted++;
        freedBytes += sizes.get(chunk[idx]) || 0;
      } else {
        failed++;
        console.error('[deleteOrphanStorageKeys] failed to delete', chunk[idx], ':', result.reason?.message || result.reason);
      }
    });
  }

  return { deleted, failed, freedBytes };
}

function storageNodeUsageKey(nodeId) {
  return STORAGE_NODE_USAGE_PREFIX + String(nodeId || '').trim();
}

async function getStoredNodeUsage(env, nodeId) {
  const data = await kvGetJson(env, storageNodeUsageKey(nodeId));
  const used = Number(data?.used || 0);
  return Number.isFinite(used) && used > 0 ? used : 0;
}

async function adjustStoredNodeUsages(env, deltas) {
  await Promise.all([...deltas.entries()].map(async ([nodeId, delta]) => {
    if (!nodeId || !Number.isFinite(delta) || delta === 0) return;
    const current = await getStoredNodeUsage(env, nodeId);
    await kvPutJson(env, storageNodeUsageKey(nodeId), {
      used: Math.max(0, current + delta),
      updatedAt: new Date().toISOString()
    });
  }));
}

function manifestNodeUsageDeltas(parts, sign = 1, preservedPartIds = new Set()) {
  const deltas = new Map();
  for (const part of parts || []) {
    if (preservedPartIds.has(manifestPartId(part))) continue;
    const nodeId = part.nodeId || '';
    const size = Math.max(0, Number(part.size || 0));
    if (!nodeId || !size) continue;
    deltas.set(nodeId, (deltas.get(nodeId) || 0) + sign * size);
  }
  return deltas;
}

async function getStorageNodeUsages(env, nodes) {
  const usages = await Promise.all(nodes.map(async (node, index) => {
    try {
      if (node.id === MAIN_STORAGE_NODE_ID || node.storageType === 'r2') {
        // 主节点始终可达
        const estimatedUsed = await getStoredNodeUsage(env, MAIN_STORAGE_NODE_ID).catch(() => 0);
        let r2Used = 0;
        try {
          r2Used = await calculateR2Usage(env.R2_BUCKET);
        } catch {
          // R2 遍历失败时使用估算值
        }
        const used = Math.max(r2Used, estimatedUsed);
        return {
          node: { ...node, id: MAIN_STORAGE_NODE_ID, name: node.name || '主控账号', storageType: 'r2' },
          index,
          used,
          total: STORAGE_TOTAL_BYTES,
          assigned: 0,
          reachable: true
        };
      }

      let nodeUsed = 0;
      let nodeTotal = STORAGE_TOTAL_BYTES;
      let reachable = false;
      try {
        // 先 ping 测试连通性和认证
        const pingRes = await fetch(node.url + '/api/node/ping?key=ping', {
          headers: getNodeAuthHeaders(node)
        });
        if (pingRes.ok) {
          // ping 通过后再获取存储用量
          try {
            const storageRes = await fetch(node.url + '/api/node/storage?key=storage', {
              headers: getNodeAuthHeaders(node)
            });
            if (storageRes.ok) {
              const data = await storageRes.json();
              nodeUsed = Math.max(0, Number(data.used || 0));
              nodeTotal = Math.max(1, Number(data.total || STORAGE_TOTAL_BYTES));
            }
          } catch {
            // storage 接口失败但 ping 通过了，节点仍标记为可达
          }
          reachable = true;
        }
      } catch {
        // 节点完全不可达
      }

      // 用 KV 中记录的估算用量与实时查询取最大值
      const estimatedUsed = await getStoredNodeUsage(env, node.id).catch(() => 0);
      const used = reachable ? Math.max(nodeUsed, estimatedUsed) : estimatedUsed;
      return {
        node,
        index,
        used,
        total: nodeTotal,
        assigned: 0,
        reachable
      };
    } catch {
      const estimatedUsed = await getStoredNodeUsage(env, node.id).catch(() => 0);
      return {
        node,
        index,
        used: estimatedUsed,
        total: STORAGE_TOTAL_BYTES,
        assigned: 0,
        reachable: false
      };
    }
  }));
  return usages;
}

function nearlyEqualNumber(a, b) {
  return Math.abs(a - b) < 0.000001;
}

function chooseBalancedNode(usages) {
  return [...usages].sort((a, b) => {
    const aRatio = (a.used + a.assigned) / a.total;
    const bRatio = (b.used + b.assigned) / b.total;
    if (!nearlyEqualNumber(aRatio, bRatio)) return aRatio - bRatio;
    const aBytes = a.used + a.assigned;
    const bBytes = b.used + b.assigned;
    if (aBytes !== bBytes) return aBytes - bBytes;
    const aCreated = Date.parse(a.node.createdAt || '') || 0;
    const bCreated = Date.parse(b.node.createdAt || '') || 0;
    if (aCreated !== bCreated) return bCreated - aCreated;
    return a.index - b.index;
  })[0];
}

async function allocateDistributedParts(env, nodes, partSizes) {
  const usages = await getStorageNodeUsages(env, nodes);
  if (!usages.length) throw new Error('no available storage nodes');

  // 过滤：只使用可达的节点（主节点始终可达，外部节点需通过 ping 验证）
  const reachable = usages.filter(u => u.reachable !== false);
  // 如果所有外部节点都不可达，至少保留主节点
  const candidates = reachable.length > 0 ? reachable : usages.filter(u => u.node.id === MAIN_STORAGE_NODE_ID || u.node.storageType === 'r2');
  if (!candidates.length) throw new Error('no available storage nodes');

  // 按使用率从低到高排序
  const sorted = [...candidates].sort((a, b) => {
    const aRatio = (a.used + a.assigned) / a.total;
    const bRatio = (b.used + b.assigned) / b.total;
    if (!nearlyEqualNumber(aRatio, bRatio)) return aRatio - bRatio;
    const aBytes = a.used + a.assigned;
    const bBytes = b.used + b.assigned;
    if (aBytes !== bBytes) return aBytes - bBytes;
    return a.index - b.index;
  });

  // 计算每个节点的剩余容量，用于加权轮询分配
  // 使用平方加权：剩余容量的平方作为权重，使空余容量大的节点（如新增节点）获得指数级优先分配
  const capacities = sorted.map(u => Math.max(1, u.total - u.used - u.assigned));
  const totalCapacity = capacities.reduce((s, c) => s + c, 0);

  const result = [];
  for (let i = 0; i < partSizes.length; i++) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let j = 0; j < sorted.length; j++) {
      const remaining = Math.max(1, sorted[j].total - sorted[j].used - sorted[j].assigned);
      const assignedCount = result.filter(r => r === sorted[j].node).length;
      // 平方加权：remaining² / totalCapacity，使剩余空间2倍的节点获得4倍权重
      const score = (remaining * remaining / totalCapacity) / (assignedCount + 1);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }
    sorted[bestIdx].assigned += partSizes[i];
    result.push(sorted[bestIdx].node);
  }

  return result;
}

function getNodeAuthHeaders(node, extra = {}) {
  return {
    ...extra,
    'Authorization': 'Bearer ' + node.token
  };
}

function isNodeRequestAuthorized(request, env) {
  const expected = env.STORAGE_NODE_TOKEN || env.ACCESS_PASSWORD;
  if (!expected) return false;
  const header = request.headers.get('Authorization') || '';
  return header === 'Bearer ' + expected;
}

function nodeCorsHeaders(extra = {}) {
  return {
    ...extra,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Access-Control-Max-Age': '86400'
  };
}

function hasManifestMetadata(obj) {
  if (!obj) return false;
  const contentType = obj.httpMetadata?.contentType || '';
  return contentType === MANIFEST_CONTENT_TYPE || obj.customMetadata?.r2driveManifest === '1';
}

async function readManifestObject(obj) {
  if (!obj) return null;
  if (!hasManifestMetadata(obj) || !obj.body) return null;
  try {
    return await new Response(obj.body).json();
  } catch {
    return null;
  }
}

function isManifestFile(manifest) {
  return manifest && manifest.type === 'distributed-file' && Array.isArray(manifest.parts);
}

function manifestPartsSize(manifest) {
  return (manifest?.parts || []).reduce((sum, part) => sum + Math.max(0, Number(part.size) || 0), 0);
}

function manifestSize(manifest) {
  if (Array.isArray(manifest?.parts)) return manifestPartsSize(manifest);
  const size = Number(manifest?.size);
  if (Number.isFinite(size) && size >= 0) return size;
  return 0;
}

function manifestPartId(part) {
  return [part?.storageType || '', part?.nodeId || '', part?.nodeUrl || '', part?.key || ''].join('\x1f');
}

function manifestPartIds(manifest) {
  if (!isManifestFile(manifest)) return [];
  return manifest.parts.map(manifestPartId).filter(Boolean);
}

function parseByteRange(rangeHeader, size) {
  if (!rangeHeader) return null;
  const match = String(rangeHeader).trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || match[1] === '' && match[2] === '') return { invalid: true };

  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0 || size <= 0) return { invalid: true };
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      return { invalid: true };
    }
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1 };
}

function rangeNotSatisfiableResponse(size, baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes */${size}`);
  headers.set('Content-Type', 'text/plain;charset=UTF-8');
  headers.set('Content-Length', '21');
  return new Response('Range Not Satisfiable', { status: 416, headers });
}

function fileResponseHeaders({ baseHeaders = {}, contentType, filename, size, etag, range }) {
  const headers = new Headers(baseHeaders);
  headers.set('Content-Type', contentType || 'application/octet-stream');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(range ? range.length : size));
  headers.set('Cache-Control', 'no-transform');
  headers.set('Content-Encoding', 'identity');
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  if (filename) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  if (etag) headers.set('ETag', etag);
  return headers;
}

function r2RangeOptions(range) {
  return range ? { range: { offset: range.start, length: range.length } } : undefined;
}

async function r2ObjectResponse(request, R2, key, meta, options = {}) {
  const size = Math.max(0, Number(meta?.size) || 0);
  const range = parseByteRange(request.headers.get('Range'), size);
  if (range?.invalid) return rangeNotSatisfiableResponse(size, options.baseHeaders);
  const obj = request.method === 'HEAD' ? null : await R2.get(key, r2RangeOptions(range));
  if (request.method !== 'HEAD' && !obj) return new Response('File not found', { status: 404 });
  const headers = fileResponseHeaders({
    baseHeaders: options.baseHeaders,
    contentType: options.contentType || meta?.httpMetadata?.contentType || getMimeType(key),
    filename: options.filename,
    size,
    etag: meta?.etag,
    range
  });
  return new Response(request.method === 'HEAD' ? null : obj.body, {
    status: range ? 206 : 200,
    headers
  });
}

async function manifestResponse(request, manifest, env, options = {}) {
  const size = manifestSize(manifest);
  const declaredSize = Number(manifest?.size);
  if (Number.isFinite(declaredSize) && declaredSize >= 0 && declaredSize !== size) {
    const headers = new Headers(options.baseHeaders);
    headers.set('Content-Type', 'text/plain;charset=UTF-8');
    headers.set('Content-Length', '22');
    return new Response('Manifest size mismatch', { status: 500, headers });
  }
  const range = parseByteRange(request.headers.get('Range'), size);
  if (range?.invalid) return rangeNotSatisfiableResponse(size, options.baseHeaders);
  const headers = fileResponseHeaders({
    baseHeaders: options.baseHeaders,
    contentType: manifest.contentType || options.contentType,
    filename: options.filename,
    size,
    range
  });
  const body = request.method === 'HEAD' ? null : await streamManifestFile(manifest, env, options.R2, range);
  return new Response(body, {
    status: range ? 206 : 200,
    headers
  });
}

async function storedFileResponse(request, R2, key, env, options = {}) {
  const meta = await R2.head(key);
  if (!meta) return new Response(options.notFoundText || 'File not found', { status: 404 });

  if (hasManifestMetadata(meta)) {
    const obj = await R2.get(key);
    const manifest = await readManifestObject(obj);
    if (isManifestFile(manifest)) {
      return manifestResponse(request, manifest, env, {
        ...options,
        R2,
        contentType: manifest.contentType || options.contentType || getMimeType(key)
      });
    }
  }

  return r2ObjectResponse(request, R2, key, meta, {
    ...options,
    contentType: options.contentType || getMimeType(key)
  });
}

async function storedVirtualFileResponse(request, R2, path, env, options = {}) {
  const clean = assertVirtualPath(path);
  const entry = await getFileEntry(env, clean);
  if (!entry) return new Response(options.notFoundText || 'File not found', { status: 404 });
  return storedFileResponse(request, R2, entry.storageKey, env, {
    ...options,
    filename: options.filename || entry.name || virtualPathName(clean),
    contentType: options.contentType || entry.contentType || getMimeType(clean)
  });
}

async function resolveManifestParts(manifest, env) {
  const nodes = await getStorageNodes(env, true);
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  return [...manifest.parts].sort((a, b) => a.partNumber - b.partNumber).map(part => {
    if (part.storageType === 'r2' || part.nodeId === MAIN_STORAGE_NODE_ID) {
      return {
        ...part,
        storageType: 'r2',
        nodeId: MAIN_STORAGE_NODE_ID,
        nodeName: part.nodeName || '主控账号'
      };
    }
    const node = nodeMap.get(part.nodeId);
    return {
      ...part,
      storageType: 'node',
      nodeUrl: part.nodeUrl || node?.url,
      token: part.token || node?.token
    };
  });
}

async function fetchR2PartBytes(R2, part, range) {
  if (!R2) throw new Error('missing R2 binding');
  const obj = await R2.get(part.key, r2RangeOptions(range));
  if (!obj) throw new Error('main part not found');
  const bytes = new Uint8Array(await obj.arrayBuffer());
  if (bytes.byteLength !== range.length) {
    throw new Error(`main part range ended at ${bytes.byteLength}/${range.length} bytes`);
  }
  return bytes;
}

async function fetchNodePartBytes(part, range) {
  if (!part.nodeUrl || !part.token) throw new Error('missing node credentials');
  let lastError;
  for (let attempt = 0; attempt < DOWNLOAD_NODE_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(part.nodeUrl.replace(/\/+$/, '') + '/api/node/part?key=' + encodeURIComponent(part.key), {
        headers: {
          'Authorization': 'Bearer ' + part.token,
          'Range': `bytes=${range.start}-${range.end}`
        }
      });
      if (!res.ok || !res.body) throw new Error(`failed to fetch node part: ${res.status}`);
      if (res.status !== 206) throw new Error('storage node does not support ranged downloads');

      const declaredLength = Number(res.headers.get('Content-Length') || 0);
      if (declaredLength > 0 && declaredLength !== range.length) {
        throw new Error(`node part range length mismatch: ${declaredLength}/${range.length}`);
      }

      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength !== range.length) {
        throw new Error(`node part range ended at ${bytes.byteLength}/${range.length} bytes`);
      }
      return bytes;
    } catch (err) {
      lastError = err;
      if (attempt < DOWNLOAD_NODE_FETCH_RETRIES - 1) await delay(250 * (attempt + 1));
    }
  }
  throw lastError;
}

function buildManifestSegments(parts, byteRange, segmentSize) {
  const segments = [];
  let offset = 0;
  for (const part of parts) {
    const partSize = Math.max(0, Number(part.size) || 0);
    const partStart = offset;
    const partEnd = partStart + partSize - 1;
    offset += partSize;
    if (partSize <= 0) continue;

    const targetStart = byteRange ? byteRange.start : partStart;
    const targetEnd = byteRange ? byteRange.end : partEnd;
    if (partEnd < targetStart || partStart > targetEnd) continue;

    let relativeStart = Math.max(0, targetStart - partStart);
    const relativeEnd = Math.min(partSize - 1, targetEnd - partStart);
    while (relativeStart <= relativeEnd) {
      const end = Math.min(relativeEnd, relativeStart + segmentSize - 1);
      segments.push({
        part,
        range: {
          start: relativeStart,
          end,
          length: end - relativeStart + 1
        }
      });
      relativeStart = end + 1;
    }
  }
  return segments;
}

async function fetchManifestSegmentBytes(R2, part, range) {
  if (part.storageType === 'r2' || part.nodeId === MAIN_STORAGE_NODE_ID) {
    return fetchR2PartBytes(R2, part, range);
  }
  return fetchNodePartBytes(part, range);
}

function concatManifestPartStreams(parts, R2, byteRange = null, segmentSize = DOWNLOAD_RANGE_SIZE_BYTES) {
  const segments = buildManifestSegments(parts, byteRange, segmentSize);
  let cancelled = false;
  let index = 0;
  let buffer = null;
  let bufferOffset = 0;

  return new ReadableStream({
    async pull(controller) {
      try {
        while (!cancelled) {
          if (buffer && bufferOffset < buffer.byteLength) {
            const end = Math.min(buffer.byteLength, bufferOffset + DOWNLOAD_OUTPUT_CHUNK_BYTES);
            controller.enqueue(buffer.subarray(bufferOffset, end));
            bufferOffset = end;
            if (bufferOffset >= buffer.byteLength) {
              buffer = null;
              bufferOffset = 0;
            }
            return;
          }

          if (index >= segments.length) {
            controller.close();
            return;
          }

          const segment = segments[index++];
          buffer = await fetchManifestSegmentBytes(R2, segment.part, segment.range);
          bufferOffset = 0;
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      cancelled = true;
      buffer = null;
    }
  });
}

async function streamManifestFile(manifest, env, R2, byteRange = null) {
  const parts = await resolveManifestParts(manifest, env);
  return concatManifestPartStreams(parts, R2, byteRange, getDownloadRangeSize(env));
}

async function deleteManifestParts(manifest, env, preservedPartIds = new Set(), options = {}) {
  if (!isManifestFile(manifest)) return;
  const parts = await resolveManifestParts(manifest, env);
  await mapWithConcurrency(parts.filter(part => (
    (part.storageType === 'r2' || part.nodeId === MAIN_STORAGE_NODE_ID) && !preservedPartIds.has(manifestPartId(part))
  )), 16, part => env.R2_BUCKET.delete(part.key).catch(err => {
    console.error('delete R2 manifest part failed:', part.key, err?.message || err);
  }));
  await mapWithConcurrency(parts.filter(part => (
    part.storageType !== 'r2' && part.nodeId !== MAIN_STORAGE_NODE_ID && part.nodeUrl && part.token && !preservedPartIds.has(manifestPartId(part))
  )), 8, async part => {
    const res = await fetch(
      part.nodeUrl.replace(/\/+$/, '') + '/api/node/part?key=' + encodeURIComponent(part.key),
      { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + part.token } }
    ).catch(err => ({ ok: false, status: 502, text: async () => err?.message || 'node delete failed' }));
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('delete node manifest part failed:', part.nodeId, part.key, res.status, detail.slice(0, 120));
    }
  });
  if (options.adjustUsage !== false) {
    await adjustStoredNodeUsages(env, manifestNodeUsageDeltas(parts, -1, preservedPartIds));
  }
}

async function handleStorageNodeApi(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: nodeCorsHeaders({ 'Content-Length': '0' }) });
  }
  if (!isNodeRequestAuthorized(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: nodeCorsHeaders() });
  }
  const R2 = env.R2_BUCKET;
  const url = new URL(request.url);

  if (url.pathname === '/api/node/ping') {
    return new Response(JSON.stringify({ ok: true, name: env.SITE_TITLE || 'R2 Storage Node' }), {
      headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  }

  if (url.pathname === '/api/node/storage') {
    const used = await calculateR2Usage(R2);
    return new Response(JSON.stringify({ ok: true, used, total: STORAGE_TOTAL_BYTES }), {
      headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  }

  if (url.pathname === '/api/node/r2-list' && request.method === 'GET') {
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
    const listed = await R2.list({ cursor, limit, include: ['customMetadata'] });
    const objects = (listed.objects || []).map(obj => ({
      key: obj.key,
      size: obj.size || 0,
      uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : ''
    }));
    return new Response(JSON.stringify({
      objects,
      cursor: listed.cursor || null,
      truncated: listed.truncated || false
    }), {
      headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  }

  const key = url.searchParams.get('key');
  if (!key || key.includes('..')) return new Response('Missing key', { status: 400, headers: nodeCorsHeaders() });

  if (url.pathname === '/api/node/part' && request.method === 'PUT') {
    const expectedSize = Number(url.searchParams.get('size') || 0);
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (expectedSize > 0 && contentLength > 0 && contentLength !== expectedSize) {
      return new Response(JSON.stringify({ ok: false, error: 'part size mismatch' }), {
        status: 400,
        headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
      });
    }
    await R2.put(key, request.body, { httpMetadata: { contentType: 'application/octet-stream' } });
    if (expectedSize > 0) {
      const meta = await R2.head(key);
      if (!meta || meta.size !== expectedSize) {
        await R2.delete(key);
        return new Response(JSON.stringify({ ok: false, error: 'stored part size mismatch' }), {
          status: 500,
          headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
        });
      }
    }
    return new Response(JSON.stringify({ ok: true, key }), {
      headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  }

  if (url.pathname === '/api/node/part' && (request.method === 'GET' || request.method === 'HEAD')) {
    const meta = await R2.head(key);
    if (!meta) return new Response('Not Found', { status: 404, headers: nodeCorsHeaders() });
    const range = parseByteRange(request.headers.get('Range'), meta.size || 0);
    if (range?.invalid) return rangeNotSatisfiableResponse(meta.size || 0, nodeCorsHeaders());
    const obj = request.method === 'HEAD' ? null : await R2.get(key, r2RangeOptions(range));
    if (request.method !== 'HEAD' && !obj) return new Response('Not Found', { status: 404, headers: nodeCorsHeaders() });
    return new Response(request.method === 'HEAD' ? null : obj.body, {
      status: range ? 206 : 200,
      headers: fileResponseHeaders({
        baseHeaders: nodeCorsHeaders(),
        contentType: 'application/octet-stream',
        size: meta.size || 0,
        range
      })
    });
  }

  if (url.pathname === '/api/node/part' && request.method === 'DELETE') {
    await R2.delete(key);
    return new Response(JSON.stringify({ ok: true }), {
      headers: nodeCorsHeaders({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  }

  return new Response('Not Found', { status: 404, headers: nodeCorsHeaders() });
}

async function isAuthenticated(request, env) {
  if (!env.ACCESS_PASSWORD) return true; // no password set = public
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return false;
  return verifyToken(token, env.ACCESS_PASSWORD);
}

function workerErrorResponse(request, err) {
  const url = new URL(request.url);
  const message = err?.message || 'Internal Server Error';
  const status = message === 'invalid path' || message.includes('mismatch') || message.includes('Missing') ? 400 : 500;
  console.error('Worker request failed', {
    method: request.method,
    path: url.pathname,
    error: message,
    stack: err?.stack || ''
  });
  if (url.pathname.startsWith('/api/')) {
    return jsonResponse({ ok: false, error: message }, status);
  }
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
  });
}

// ── Main Handler ──
export default {
  async fetch(request, env, ctx) {
    try {
    const url = new URL(request.url);
    const path = url.pathname;
    const R2 = env.R2_BUCKET;
    const siteTitle = env.SITE_TITLE || 'R2 云盘';
    const cloudIconUrl = env.CLOUD_ICON_URL || '';
    const loginBackgroundUrl = env.LOGIN_BACKGROUND_URL || '';

    if (!R2) {
      return new Response('未配置 R2 存储桶。请在 wrangler.toml 中绑定 R2_BUCKET。', { status: 500 });
    }

    if (path.startsWith('/api/node/')) {
      return handleStorageNodeApi(request, env);
    }

    if (!hasMetadataStore(env)) {
      return new Response('未配置 D1 数据库。文件路径映射需要绑定 DB。', { status: 500 });
    }

        // ── Auth endpoints ──
    if (path === '/login') {
      if (request.method === 'GET') return new Response(renderLoginPage('', siteTitle, cloudIconUrl, loginBackgroundUrl), { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    if (path === '/api/login' && request.method === 'POST') {
      if (!env.ACCESS_PASSWORD) return Response.json({ ok: true });
      const { password } = await request.json().catch(() => ({}));
      if (password !== env.ACCESS_PASSWORD) return Response.json({ ok: false });
      const token = await generateToken(password, env.ACCESS_PASSWORD);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`
        }
      });
    }

    if (path === '/api/logout' && request.method === 'POST') {
      if (!isSameOriginRequest(request)) return csrfErrorResponse();
      return new Response('{}', {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
        }
      });
    }

    // ── Shared Folder Route (public, no auth required) ──
    if (path === '/shared' || path === '/shared/') {
      const subPath = url.searchParams.get('path') || '';
      const sharedPath = joinVirtualPath(SHARED_PREFIX, subPath);
      const { folders, files } = await listDirectory(env, sharedPath);
      const html = renderSharedPage(folders, files, subPath, siteTitle, cloudIconUrl);
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    // ── Shared API: List (public) ──
    if (path === '/api/shared-list') {
      const subPath = url.searchParams.get('path') || '';
      const sharedPath = joinVirtualPath(SHARED_PREFIX, subPath);
      const { folders, files } = await listDirectory(env, sharedPath);
      return Response.json({ folders, files });
    }

        // ── Clipboard API (metadata-backed, no auth required for clipboard operations) ──
    if (path.startsWith('/s/') && request.method === 'GET') {
      const shareId = normalizeShareId(path.slice(3).split('/')[0] || '');
      const share = await getShare(env, shareId);
      if (!share) {
        return new Response(renderShareMessagePage('分享不存在', '这个分享链接不存在或已被删除。', siteTitle, cloudIconUrl), {
          status: 404,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
      }

      const hasAccess = await hasShareAccess(request, env, share);
      const reason = shareInactiveReason(share);
      if (reason === 'expired' || (reason && !(shareNeedsPassword(share) && hasAccess))) {
        const message = reason === 'access_limit' ? '这个分享链接的访问次数已用完。' : '这个分享链接已过期。';
        return new Response(renderShareMessagePage('分享不可用', message, siteTitle, cloudIconUrl), {
          status: 410,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
      }

      if (shareNeedsPassword(share) && !hasAccess) {
        return new Response(renderSharePasswordPage(share, siteTitle, cloudIconUrl), {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
      }

      const activeShare = shareNeedsPassword(share) ? share : await consumeShareAccess(env, share);
      if (activeShare.targetType === 'file') {
        const file = await getFileEntry(env, activeShare.path);
        if (!file) {
          return new Response(renderShareMessagePage('文件不存在', '分享的文件已被移动或删除。', siteTitle, cloudIconUrl), {
            status: 404,
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
          });
        }
        const html = renderConditionalSharePage(activeShare, { file }, siteTitle, cloudIconUrl);
        return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
      }

      const subPath = assertVirtualPath(url.searchParams.get('path') || '', { allowRoot: true });
      const folderPath = shareTargetPath(activeShare, subPath);
      const { folders, files } = await listDirectory(env, folderPath);
      const html = renderConditionalSharePage(activeShare, { folders, files, currentPath: subPath }, siteTitle, cloudIconUrl);
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    if (path === '/api/share-access' && request.method === 'POST') {
      if (!isSameOriginRequest(request)) return csrfErrorResponse();
      const body = await request.json().catch(() => ({}));
      const share = await getShare(env, body.id);
      if (!share) return jsonResponse({ ok: false, error: 'share not found' }, 404);
      const reason = shareInactiveReason(share);
      if (reason) return jsonResponse({ ok: false, error: reason === 'access_limit' ? 'access limit reached' : 'share expired' }, 410);
      if (!shareNeedsPassword(share)) return jsonResponse({ ok: true, url: '/s/' + share.id });
      if (!await verifySharePassword(share, body.password || '', env)) {
        return jsonResponse({ ok: false, error: 'password incorrect' }, 403);
      }
      const updatedShare = await consumeShareAccess(env, share);
      const token = await generateShareAccessToken(updatedShare, env);
      return new Response(JSON.stringify({ ok: true, url: '/s/' + updatedShare.id }), {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${shareAuthCookieName(updatedShare.id)}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${shareCookieMaxAge(updatedShare)}`
        }
      });
    }

    if (path === '/api/share-download' && (request.method === 'GET' || request.method === 'HEAD')) {
      const share = await getShare(env, url.searchParams.get('id') || '');
      if (!share) return new Response('Share not found', { status: 404 });
      const hasAccess = await hasShareAccess(request, env, share);
      const reason = shareInactiveReason(share);
      if (reason === 'expired' || (reason && !(shareNeedsPassword(share) && hasAccess))) {
        return new Response(reason === 'access_limit' ? 'Share access limit reached' : 'Share expired', { status: 410 });
      }
      if (shareNeedsPassword(share) && !hasAccess) return new Response('Share password required', { status: 403 });
      const filePath = shareTargetPath(share, url.searchParams.get('path') || '');
      return storedVirtualFileResponse(request, R2, filePath, env, {
        filename: virtualPathName(filePath),
        contentType: getMimeType(filePath)
      });
    }

    if (path === '/api/clipboard' && request.method === 'POST') {
      if (!await isAuthenticated(request, env)) return new Response('Unauthorized', { status: 401 });
      if (!isSameOriginRequest(request)) return csrfErrorResponse();
      // Save clipboard to metadata store
      const clipboardId = url.searchParams.get('id') || 'default';
      const body = await request.json().catch(() => ({}));
      if (body.items && Array.isArray(body.items)) {
        await kvPutRaw(env, 'clipboard_' + clipboardId, JSON.stringify({
          items: body.items,
          action: body.action || 'copy',
          sourcePath: body.sourcePath || ''
        }), { expirationTtl: 86400 }); // 24 hours expiry
        return Response.json({ ok: true });
      }
      return Response.json({ ok: false, error: 'invalid data' }, { status: 400 });
    }
    if (path === '/api/clipboard' && request.method === 'GET') {
      if (!await isAuthenticated(request, env)) return new Response('Unauthorized', { status: 401 });
      // Get clipboard from metadata store
      const clipboardId = url.searchParams.get('id') || 'default';
      const data = await kvGetRaw(env, 'clipboard_' + clipboardId);
      if (data) {
        return new Response(data, { headers: { 'Content-Type': 'application/json' } });
      }
      return Response.json({ items: [], action: null, sourcePath: '' });
    }
    if (path === '/api/clipboard' && request.method === 'DELETE') {
      if (!await isAuthenticated(request, env)) return new Response('Unauthorized', { status: 401 });
      if (!isSameOriginRequest(request)) return csrfErrorResponse();
      // Clear clipboard from metadata store
      const clipboardId = url.searchParams.get('id') || 'default';
      await kvDelete(env, 'clipboard_' + clipboardId);
      return Response.json({ ok: true });
    }

    // ── Auth check ──
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      if (path.startsWith('/api/')) {
        // Allow public download from shared folder
        if (path === '/api/download') {
          const filePath = url.searchParams.get('path') || '';
          if (filePath.startsWith(SHARED_PREFIX + '/')) {
            return storedVirtualFileResponse(request, R2, filePath, env, {
              filename: virtualPathName(filePath),
              contentType: getMimeType(filePath)
            });
          }
        }
        return new Response('Unauthorized', { status: 401 });
      }
      return Response.redirect(new URL('/login', request.url), 302);
    }

    // ── API Routes ──

    if (path.startsWith('/api/') && isUnsafeMethod(request.method) && !isSameOriginRequest(request)) {
      return csrfErrorResponse();
    }

    if (path === '/api/shares' && request.method === 'GET') {
      const shares = await listShares(env, url.searchParams.get('path') || '');
      return jsonResponse({ shares: shares.map(publicShare).filter(Boolean) });
    }

    if (path === '/api/shares/refresh' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const id = body.id || url.searchParams.get('id') || '';
        const share = await refreshShareLink(env, id);
        return jsonResponse({ ok: true, share: publicShare(share) });
      } catch (err) {
        const message = err?.message || 'refresh failed';
        return jsonResponse({ ok: false, error: message }, message === 'not found' ? 404 : 400);
      }
    }

    if (path === '/api/shares' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const share = await createShare(env, body);
        return jsonResponse({ ok: true, share: publicShare(share) });
      } catch (err) {
        const message = err?.message || 'share create failed';
        return jsonResponse({ ok: false, error: message }, message === 'not found' ? 404 : 400);
      }
    }

    if (path === '/api/shares' && request.method === 'PUT') {
      try {
        const body = await request.json().catch(() => ({}));
        const id = body.id || url.searchParams.get('id') || '';
        const share = await updateShare(env, id, body);
        return jsonResponse({ ok: true, share: publicShare(share) });
      } catch (err) {
        const message = err?.message || 'share update failed';
        return jsonResponse({ ok: false, error: message }, message === 'not found' ? 404 : 400);
      }
    }

    if (path === '/api/shares' && request.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      if (!normalizeShareId(id)) return jsonResponse({ ok: false, error: 'missing id' }, 400);
      await deleteShare(env, id);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/storage-nodes' && request.method === 'GET') {
      try {
        const nodes = await getStorageNodes(env, true);
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        return jsonResponse({ nodes: safeNodes.map(n => publicNode(n || {})) });
      } catch (err) {
        console.error('getStorageNodes failed:', err?.message || err);
        return jsonResponse({ nodes: [], error: 'storage nodes unavailable' });
      }
    }

    if (path === '/api/storage-nodes' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const nodes = await getStorageNodes(env, true);
        const existing = body.id ? nodes.find(item => item.id === body.id) : null;
        const node = sanitizeNode({
          id: body.id || crypto.randomUUID(),
          name: body.name,
          url: body.url,
          token: body.token,
          enabled: body.enabled !== false,
          weight: body.weight,
          createdAt: existing?.createdAt || new Date().toISOString()
        });
        if (!node.name || !node.url || !node.token) return jsonResponse({ ok: false, error: 'missing fields' }, 400);
        const index = nodes.findIndex(item => item.id === node.id);
        if (index >= 0) nodes[index] = node;
        else nodes.push(node);
        await saveStorageNodes(env, nodes);
        return jsonResponse({ ok: true, node: publicNode(node) });
      } catch (err) {
        console.error('saveStorageNode failed:', err?.message || err);
        return jsonResponse({ ok: false, error: 'save failed: ' + (err?.message || 'unknown error') }, 500);
      }
    }

    if (path === '/api/storage-nodes' && request.method === 'DELETE') {
      try {
        const id = url.searchParams.get('id');
        if (!id) return jsonResponse({ ok: false, error: 'missing id' }, 400);
        const nodes = await getStorageNodes(env, true);
        await saveStorageNodes(env, nodes.filter(node => node.id !== id));
        return jsonResponse({ ok: true });
      } catch (err) {
        console.error('deleteStorageNode failed:', err?.message || err);
        return jsonResponse({ ok: false, error: 'delete failed: ' + (err?.message || 'unknown error') }, 500);
      }
    }

    if (path === '/api/storage-nodes/test' && request.method === 'POST') {
      const id = url.searchParams.get('id');
      const nodes = await getStorageNodes(env, true);
      const node = nodes.find(item => item.id === id);
      if (!node) return jsonResponse({ ok: false, error: 'not found' }, 404);
      const ping = await fetch(node.url + '/api/node/ping?key=ping', {
        headers: getNodeAuthHeaders(node)
      }).catch(() => null);
      if (!ping?.ok) return jsonResponse({ ok: false, error: 'ping failed' }, 502);
      const storage = await fetch(node.url + '/api/node/storage?key=storage', {
        headers: getNodeAuthHeaders(node)
      }).catch(() => null);
      if (!storage?.ok) {
        return jsonResponse({ ok: false, ping: true, storage: false, error: 'storage unavailable' }, 502);
      }
      const storageData = await storage.json().catch(() => ({}));
      return jsonResponse({
        ok: true,
        ping: true,
        storage: true,
        used: storageData.used || 0,
        total: storageData.total || STORAGE_TOTAL_BYTES
      });
    }

    // R2 file viewer — list objects for main or external storage node
    if (path === '/api/storage-nodes/r2-files' && request.method === 'GET') {
      try {
        const id = url.searchParams.get('id') || 'main';
        const cursor = url.searchParams.get('cursor') || undefined;
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));

        if (id === 'main') {
          // List R2 objects directly for the main account
          const listed = await R2.list({ cursor, limit, include: ['customMetadata'] });
          const objects = (listed.objects || []).map(obj => ({
            key: obj.key,
            size: obj.size || 0,
            uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : ''
          }));
          return jsonResponse({
            objects,
            cursor: listed.cursor || null,
            truncated: listed.truncated || false
          });
        }

        // Proxy to external node
        const nodes = await getStorageNodes(env, true);
        const node = nodes.find(item => item.id === id);
        if (!node) return jsonResponse({ ok: false, error: 'node not found' }, 404);

        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (cursor) params.set('cursor', cursor);
        const nodeRes = await fetch(node.url + '/api/node/r2-list?' + params.toString(), {
          headers: getNodeAuthHeaders(node)
        });
        if (!nodeRes.ok) {
          return jsonResponse({ ok: false, error: 'node r2-list failed: ' + nodeRes.status }, 502);
        }
        const data = await nodeRes.json();
        return jsonResponse(data);
      } catch (err) {
        console.error('r2-files failed:', err?.message || err);
        return jsonResponse({ ok: false, error: 'r2-files failed: ' + (err?.message || 'unknown error') }, 500);
      }
    }

    // List files
    if (path === '/api/list') {
      const prefix = url.searchParams.get('path') || '';
      const { folders, files } = await listDirectory(env, prefix);
      return Response.json({ folders, files });
    }

        // Storage usage (for capacity display)
        if (path === '/api/storage') {
          const nodes = await getStorageNodes(env);
          const mainUsed = await calculateR2Usage(R2);
          const usageNodes = [{
            id: 'main',
            name: '主控账号',
            used: mainUsed,
            total: STORAGE_TOTAL_BYTES,
            online: true
          }];

          const nodeUsages = await Promise.all(nodes.map(async node => {
            try {
              const res = await fetch(node.url + '/api/node/storage?key=storage', {
                headers: getNodeAuthHeaders(node)
              });
              if (!res.ok) throw new Error('storage unavailable');
              const data = await res.json();
              return {
                id: node.id,
                name: node.name,
                used: data.used || 0,
                total: data.total || STORAGE_TOTAL_BYTES,
                online: true,
                storageAvailable: true
              };
            } catch {
              const ping = await fetch(node.url + '/api/node/ping?key=ping', {
                headers: getNodeAuthHeaders(node)
              }).catch(() => null);
              return {
                id: node.id,
                name: node.name,
                used: 0,
                total: STORAGE_TOTAL_BYTES,
                online: !!ping?.ok,
                storageAvailable: false
              };
            }
          }));

          usageNodes.push(...nodeUsages);
          const used = usageNodes.reduce((sum, node) => sum + (node.used || 0), 0);
          const total = usageNodes.reduce((sum, node) => sum + (node.total || STORAGE_TOTAL_BYTES), 0);
          return Response.json({ used, total, nodes: usageNodes });
        }

    // Download / serve file
    if (path === '/api/download') {
      const filePath = url.searchParams.get('path');
      if (!filePath) return new Response('Missing path', { status: 400 });
      return storedVirtualFileResponse(request, R2, filePath, env);
    }

    // Upload file
    if (path === '/api/upload' && request.method === 'POST') {
      const filePath = url.searchParams.get('path');
      if (!filePath) return new Response('Missing path', { status: 400 });
      const cleanPath = assertVirtualPath(filePath);
      const mime = getMimeType(filePath);
      const storageKey = await createStorageKeyForPath(env, R2, cleanPath, 'file');
      const object = await R2.put(storageKey, request.body, { httpMetadata: { contentType: mime } });
      await replaceFileEntry(env, R2, fileEntryFromR2Meta(cleanPath, storageKey, object, {
        contentType: mime,
        storageType: 'r2'
      }));
      return Response.json({ ok: true });
    }

    // Multipart upload for files larger than the Worker request body limit.
    if (path === '/api/multipart/init' && request.method === 'POST') {
      const { path: filePath, contentType } = await request.json().catch(() => ({}));
      if (!filePath) return new Response('Missing path', { status: 400 });
      const cleanPath = assertVirtualPath(filePath);
      const mime = contentType || getMimeType(filePath);
      const storageKey = await createStorageKeyForPath(env, R2, cleanPath, 'multipart');
      const upload = await R2.createMultipartUpload(storageKey, { httpMetadata: { contentType: mime } });
      await kvPutRaw(env, R2_MULTIPART_SESSION_PREFIX + upload.uploadId, JSON.stringify({
        path: cleanPath,
        storageKey,
        contentType: mime,
        createdAt: new Date().toISOString()
      }), { expirationTtl: 86400 });
      return Response.json({ key: upload.key, uploadId: upload.uploadId });
    }

    if (path === '/api/multipart/part' && request.method === 'POST') {
      const filePath = url.searchParams.get('path');
      const uploadId = url.searchParams.get('uploadId');
      const partNumber = parseInt(url.searchParams.get('partNumber') || '', 10);
      if (!filePath || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
        return new Response('Missing multipart fields', { status: 400 });
      }
      const raw = await kvGetRaw(env, R2_MULTIPART_SESSION_PREFIX + uploadId);
      if (!raw) return new Response('Multipart session expired', { status: 404 });
      const session = JSON.parse(raw);
      if (assertVirtualPath(filePath) !== session.path) return new Response('Multipart path mismatch', { status: 400 });
      const upload = R2.resumeMultipartUpload(session.storageKey, uploadId);
      const part = await upload.uploadPart(partNumber, request.body);
      return Response.json(part);
    }

    if (path === '/api/multipart/complete' && request.method === 'POST') {
      const { path: filePath, uploadId, parts } = await request.json().catch(() => ({}));
      if (!filePath || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return new Response('Missing multipart fields', { status: 400 });
      }
      const raw = await kvGetRaw(env, R2_MULTIPART_SESSION_PREFIX + uploadId);
      if (!raw) return new Response('Multipart session expired', { status: 404 });
      const session = JSON.parse(raw);
      if (assertVirtualPath(filePath) !== session.path) return new Response('Multipart path mismatch', { status: 400 });
      const upload = R2.resumeMultipartUpload(session.storageKey, uploadId);
      const object = await upload.complete(parts);
      await replaceFileEntry(env, R2, fileEntryFromR2Meta(session.path, session.storageKey, object, {
        contentType: session.contentType,
        storageType: 'r2',
        createdAt: session.createdAt
      }));
      await kvDelete(env, R2_MULTIPART_SESSION_PREFIX + uploadId);
      return Response.json({ ok: true, key: object.key, etag: object.etag });
    }

    if (path === '/api/multipart/abort' && request.method === 'POST') {
      const { path: filePath, uploadId } = await request.json().catch(() => ({}));
      if (!filePath || !uploadId) return new Response('Missing multipart fields', { status: 400 });
      const raw = await kvGetRaw(env, R2_MULTIPART_SESSION_PREFIX + uploadId);
      if (raw) {
        const session = JSON.parse(raw);
        const upload = R2.resumeMultipartUpload(session.storageKey, uploadId);
        await upload.abort();
        await kvDelete(env, R2_MULTIPART_SESSION_PREFIX + uploadId);
      }
      return Response.json({ ok: true });
    }

    if (path === '/api/distributed/main-part' && request.method === 'PUT') {
      const sessionId = url.searchParams.get('sessionId') || '';
      const token = url.searchParams.get('token') || '';
      const partNumber = parseInt(url.searchParams.get('partNumber') || '', 10);
      if (!sessionId || !token || !Number.isInteger(partNumber) || partNumber < 1) {
        return jsonResponse({ ok: false, error: 'missing fields' }, 400);
      }
      const raw = await kvGetRaw(env, MULTIPART_SESSION_PREFIX + sessionId);
      if (!raw) return jsonResponse({ ok: false, error: 'session expired' }, 404);
      const session = JSON.parse(raw);
      const part = (session.parts || []).find(item => item.partNumber === partNumber);
      if (!part || part.storageType !== 'r2' || part.uploadToken !== token) {
        return jsonResponse({ ok: false, error: 'invalid part token' }, 401);
      }
      const expectedSize = Math.max(0, Number(part.size || 0));
      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (expectedSize > 0 && contentLength > 0 && contentLength !== expectedSize) {
        return jsonResponse({ ok: false, error: 'part size mismatch' }, 400);
      }
      await R2.put(part.key, request.body, { httpMetadata: { contentType: 'application/octet-stream' } });
      if (expectedSize > 0) {
        const meta = await R2.head(part.key);
        if (!meta || meta.size !== expectedSize) {
          await R2.delete(part.key);
          return jsonResponse({ ok: false, error: 'stored part size mismatch' }, 500);
        }
      }
      return jsonResponse({ ok: true, key: part.key });
    }

    if (path === '/api/distributed/node-part' && request.method === 'PUT') {
      const sessionId = url.searchParams.get('sessionId') || '';
      const token = url.searchParams.get('token') || '';
      const partNumber = parseInt(url.searchParams.get('partNumber') || '', 10);
      if (!sessionId || !token || !Number.isInteger(partNumber) || partNumber < 1) {
        return jsonResponse({ ok: false, error: 'missing fields' }, 400);
      }
      const raw = await kvGetRaw(env, MULTIPART_SESSION_PREFIX + sessionId);
      if (!raw) return jsonResponse({ ok: false, error: 'session expired' }, 404);
      const session = JSON.parse(raw);
      const part = (session.parts || []).find(item => item.partNumber === partNumber);
      if (!part || part.storageType !== 'node' || part.uploadToken !== token) {
        return jsonResponse({ ok: false, error: 'invalid part token' }, 401);
      }
      if (!part.nodeUrl || !part.token || !part.key) {
        return jsonResponse({ ok: false, error: 'invalid node part config' }, 500);
      }

      const expectedSize = Math.max(0, Number(part.size || 0));
      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (expectedSize > 0 && contentLength > 0 && contentLength !== expectedSize) {
        return jsonResponse({ ok: false, error: 'part size mismatch' }, 400);
      }

      const nodeUrl = part.nodeUrl.replace(/\/+$/, '') + '/api/node/part?key='
        + encodeURIComponent(part.key) + '&size=' + expectedSize;
      const nodeRes = await fetch(nodeUrl, {
        method: 'PUT',
        headers: getNodeAuthHeaders({ token: part.token }),
        body: request.body
      }).catch(err => ({ ok: false, status: 502, text: async () => err?.message || 'node fetch failed' }));

      if (!nodeRes.ok) {
        const text = await nodeRes.text().catch(() => '');
        return jsonResponse({
          ok: false,
          error: 'node upload failed',
          nodeId: part.nodeId,
          status: nodeRes.status || 502,
          detail: text.slice(0, 200)
        }, 502);
      }
      return jsonResponse({ ok: true, key: part.key, nodeId: part.nodeId });
    }

    if (path === '/api/distributed/init' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const filePath = String(body.path || '').trim();
      const fileSize = Number(body.size || 0);
      const chunkSize = Number(body.chunkSize || 0);
      const totalParts = Number(body.parts || 0);
      if (!filePath || fileSize <= 0 || chunkSize <= 0 || totalParts <= 0) {
        return jsonResponse({ ok: false, error: 'missing fields' }, 400);
      }
      if (fileSize <= DISTRIBUTED_UPLOAD_THRESHOLD_BYTES) {
        return jsonResponse({ ok: false, error: 'file below distributed threshold' }, 409);
      }
      const cleanPath = assertVirtualPath(filePath);
      const nodes = [mainStorageNode(), ...await getStorageNodes(env)];

      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();
      const storageKey = await createStorageKeyForPath(env, R2, cleanPath, 'manifest');
      const partSizes = [];
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        partSizes.push(Math.min(chunkSize, fileSize - (partNumber - 1) * chunkSize));
      }
      const allocatedNodes = await allocateDistributedParts(env, nodes, partSizes);
      const parts = [];

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const node = allocatedNodes[partNumber - 1];
        const partKey = NODE_PART_PREFIX + sessionId + '_' + String(partNumber).padStart(6, '0');
        const partSize = partSizes[partNumber - 1];
        const isMain = node.id === MAIN_STORAGE_NODE_ID || node.storageType === 'r2';
        const uploadToken = crypto.randomUUID().replace(/-/g, '');
        parts.push({
          partNumber,
          size: partSize,
          key: partKey,
          storageType: isMain ? 'r2' : 'node',
          nodeId: isMain ? MAIN_STORAGE_NODE_ID : node.id,
          nodeName: isMain ? '主控账号' : node.name,
          nodeUrl: isMain ? '' : node.url,
          token: isMain ? '' : node.token,
          uploadToken,
          uploadUrl: isMain
            ? '/api/distributed/main-part?sessionId=' + encodeURIComponent(sessionId) + '&partNumber=' + partNumber + '&token=' + encodeURIComponent(uploadToken)
            : '/api/distributed/node-part?sessionId=' + encodeURIComponent(sessionId) + '&partNumber=' + partNumber + '&token=' + encodeURIComponent(uploadToken),
          directUploadUrl: isMain
            ? ''
            : node.url + '/api/node/part?key=' + encodeURIComponent(partKey) + '&size=' + partSize
        });
      }

      const session = {
        version: MANIFEST_VERSION,
        sessionId,
        path: cleanPath,
        storageKey,
        size: fileSize,
        contentType: body.contentType || getMimeType(cleanPath),
        chunkSize,
        createdAt: now,
        parts
      };
      await kvPutRaw(env, MULTIPART_SESSION_PREFIX + sessionId, JSON.stringify(session), { expirationTtl: 86400 });

      // 统计分片分布情况
      const nodeSummary = new Map();
      for (const part of parts) {
        const label = part.nodeName || part.nodeId;
        const entry = nodeSummary.get(label) || { nodeName: label, nodeId: part.nodeId, parts: 0, bytes: 0 };
        entry.parts++;
        entry.bytes += part.size;
        nodeSummary.set(label, entry);
      }

      return jsonResponse({
        ok: true,
        sessionId,
        distribution: [...nodeSummary.values()],
        parts: parts.map(part => ({
          partNumber: part.partNumber,
          size: part.size,
          uploadUrl: part.uploadUrl,
          directUploadUrl: part.directUploadUrl || '',
          token: ''
        }))
      });
    }

    if (path === '/api/distributed/complete' && request.method === 'POST') {
      const { sessionId } = await request.json().catch(() => ({}));
      if (!sessionId) return jsonResponse({ ok: false, error: 'missing sessionId' }, 400);
      const raw = await kvGetRaw(env, MULTIPART_SESSION_PREFIX + sessionId);
      if (!raw) return jsonResponse({ ok: false, error: 'session expired' }, 404);
      const session = JSON.parse(raw);
      const manifest = {
        type: 'distributed-file',
        version: MANIFEST_VERSION,
        path: session.path,
        size: session.size,
        contentType: session.contentType,
        createdAt: session.createdAt,
        completedAt: new Date().toISOString(),
        parts: session.parts.map(part => ({
          partNumber: part.partNumber,
          size: part.size,
          key: part.key,
          storageType: part.storageType || 'node',
          nodeId: part.nodeId,
          nodeName: part.nodeName,
          nodeUrl: part.nodeUrl
        }))
      };
      const object = await R2.put(session.storageKey, JSON.stringify(manifest), {
        httpMetadata: { contentType: MANIFEST_CONTENT_TYPE },
        customMetadata: {
          r2driveManifest: '1',
          r2driveSize: String(session.size)
        }
      });
      await replaceFileEntry(env, R2, fileEntryFromR2Meta(session.path, session.storageKey, object, {
        size: session.size,
        contentType: session.contentType,
        storageType: 'distributed',
        uploaded: manifest.completedAt,
        createdAt: session.createdAt
      }));
      await adjustStoredNodeUsages(env, manifestNodeUsageDeltas(session.parts, 1));
      await kvDelete(env, MULTIPART_SESSION_PREFIX + sessionId);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/distributed/abort' && request.method === 'POST') {
      const { sessionId } = await request.json().catch(() => ({}));
      if (!sessionId) return jsonResponse({ ok: false, error: 'missing sessionId' }, 400);
      const raw = await kvGetRaw(env, MULTIPART_SESSION_PREFIX + sessionId);
      if (raw) {
        const session = JSON.parse(raw);
        await deleteManifestParts({ type: 'distributed-file', parts: session.parts }, env, new Set(), { adjustUsage: false });
        await kvDelete(env, MULTIPART_SESSION_PREFIX + sessionId);
      }
      return jsonResponse({ ok: true });
    }

    // Server-side paste for clipboard copy/cut. Data stays inside R2/Workers.
    if (path === '/api/clipboard/paste' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const action = body.action;
      if (action !== 'copy' && action !== 'cut') {
        return jsonResponse({ ok: false, error: 'invalid action' }, 400);
      }

      const items = Array.isArray(body.items) ? body.items.map(item => String(item ?? '')) : [];
      if (!items.length) return jsonResponse({ ok: false, error: 'missing items' }, 400);

      const sourcePath = assertVirtualPath(body.sourcePath || '', { allowRoot: true });
      const targetPath = assertVirtualPath(body.targetPath || '', { allowRoot: true });
      const results = [];

      for (const rawName of items) {
        const name = normalizeVirtualPath(rawName);
        if (!name || name.includes('/')) {
          results.push({ name: rawName, ok: false, error: 'invalid item' });
          continue;
        }

        const from = joinVirtualPath(sourcePath, name);
        const to = joinVirtualPath(targetPath, name);
        if (from === to) {
          results.push({ name, from, to, ok: true, skipped: true, reason: 'same path' });
          continue;
        }

        try {
          const result = action === 'cut'
            ? await moveVirtualPath(env, R2, from, to)
            : await copyVirtualPath(env, R2, from, to);
          results.push({ name, from, to, ok: true, ...result });
        } catch (err) {
          results.push({ name, from, to, ok: false, error: err?.message || 'operation failed' });
        }
      }

      const failed = results.filter(item => !item.ok);
      return jsonResponse({
        ok: failed.length === 0,
        action,
        sourcePath,
        targetPath,
        results
      }, failed.length ? 207 : 200);
    }

    // Delete file/folder
    if (path === '/api/delete' && request.method === 'DELETE') {
      const filePath = url.searchParams.get('path');
      if (!filePath) return new Response('Missing path', { status: 400 });
      await deleteVirtualPath(env, R2, filePath, ctx);
      return Response.json({ ok: true });
    }

    // Batch delete
    if (path === '/api/delete-batch' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const paths = Array.isArray(body.paths) ? body.paths.filter(Boolean) : [];
      if (!paths.length) return new Response('Missing paths', { status: 400 });
      const result = await deleteMultipleVirtualPaths(env, R2, paths, ctx);
      return Response.json({ ok: true, ...result });
    }

    // Orphan file cleanup — scan & clean R2 objects not referenced by D1
    if (path === '/api/orphan-cleanup' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const action = body.action;

      if (action === 'scan') {
        const result = await findOrphanStorageKeys(env, R2, ctx);
        return jsonResponse({
          ok: true,
          action: 'scan',
          orphans: result.orphans,
          totalSize: result.totalSize,
          totalObjects: result.totalObjects
        });
      }

      if (action === 'clean') {
        const keys = Array.isArray(body.keys) ? body.keys.filter(Boolean) : [];
        if (!keys.length) return jsonResponse({ ok: false, error: 'no keys provided' }, 400);
        const result = await deleteOrphanStorageKeys(env, R2, keys, ctx);
        return jsonResponse({
          ok: true,
          action: 'clean',
          deleted: result.deleted,
          failed: result.failed,
          freedBytes: result.freedBytes
        });
      }

      return jsonResponse({ ok: false, error: 'unknown action: ' + (action || 'none') }, 400);
    }

    // Rename (copy + delete)
    if (path === '/api/rename' && request.method === 'POST') {
      const { from, to } = await request.json().catch(() => ({}));
      if (!from || !to) return new Response('Missing fields', { status: 400 });
      try {
        await moveVirtualPath(env, R2, from, to);
        return Response.json({ ok: true });
      } catch (err) {
        const message = err?.message || 'rename failed';
        return jsonResponse({ ok: false, error: message }, message === 'not found' ? 404 : 400);
      }
    }

    // Create folder in the metadata-backed virtual path table.
    if (path === '/api/mkdir' && request.method === 'POST') {
      const { path: folderPath } = await request.json().catch(() => ({}));
      if (!folderPath) return new Response('Missing path', { status: 400 });
      await putFolderEntry(env, folderPath);
      return Response.json({ ok: true });
    }

    // ── Backup Directory Sync API ──
    // 备份目录同步：用户独立客户端的备份目录保存，用于跨设备保留同步目录

    // 获取客户端备份目录列表
    if (path === '/api/backup-dirs' && request.method === 'GET') {
      const clientId = (url.searchParams.get('clientId') || '').trim();
      if (!clientId) return jsonResponse({ ok: false, error: 'missing clientId' }, 400);
      const dirs = await getBackupDirs(env, clientId);
      return jsonResponse({ ok: true, clientId, dirs, count: dirs.length });
    }

    // 批量替换客户端备份目录（用于全量同步）
    if (path === '/api/backup-dirs' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const clientId = String(body.clientId || '').trim();
      if (!clientId) return jsonResponse({ ok: false, error: 'missing clientId' }, 400);
      const dirs = Array.isArray(body.dirs) ? body.dirs : [];
      await saveBackupDirs(env, clientId, dirs);
      const saved = await getBackupDirs(env, clientId);
      return jsonResponse({ ok: true, clientId, dirs: saved, count: saved.length });
    }

    // 添加单个备份目录
    if (path === '/api/backup-dirs/add' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const clientId = String(body.clientId || '').trim();
      const dirPath = String(body.path || '').trim();
      if (!clientId) return jsonResponse({ ok: false, error: 'missing clientId' }, 400);
      if (!dirPath) return jsonResponse({ ok: false, error: 'missing path' }, 400);
      try {
        const dirs = await addBackupDir(env, clientId, dirPath);
        return jsonResponse({ ok: true, clientId, dirs, count: dirs.length });
      } catch (err) {
        return jsonResponse({ ok: false, error: err?.message || 'add failed' }, 400);
      }
    }

    // 删除备份目录（可指定 path 删除单个，不指定则清空全部）
    if (path === '/api/backup-dirs' && request.method === 'DELETE') {
      const clientId = (url.searchParams.get('clientId') || '').trim();
      const dirPath = (url.searchParams.get('path') || '').trim();
      if (!clientId) return jsonResponse({ ok: false, error: 'missing clientId' }, 400);
      if (dirPath) {
        const dirs = await removeBackupDir(env, clientId, dirPath);
        return jsonResponse({ ok: true, clientId, dirs, count: dirs.length, removed: dirPath });
      } else {
        await clearBackupDirs(env, clientId);
        return jsonResponse({ ok: true, clientId, dirs: [], count: 0, cleared: true });
      }
    }

    // ── UI Route ──
    if (path === '/' || path === '') {
      const prefix = url.searchParams.get('path') || '';
      const cleanPrefix = assertVirtualPath(prefix, { allowRoot: true });
      const { folders, files } = await listDirectory(env, cleanPrefix);
      const html = renderDrivePage(folders, files, cleanPrefix, siteTitle, cloudIconUrl);
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    return new Response('Not Found', { status: 404 });
    } catch (err) {
      return workerErrorResponse(request, err);
    }
  }
};
