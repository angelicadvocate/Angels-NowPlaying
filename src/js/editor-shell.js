// Editor shell — runs inside tauri://localhost/html/editor-shell.html
// Manages the header, loads the overlay controls in an iframe, and
// brokers save/copy/back actions between the header buttons and the iframe.

import { invoke } from '@tauri-apps/api/core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseCSSVars(cssText) {
  const vars = {};
  const m = cssText.match(/:root\s*\{([^}]*)\}/s);
  if (!m) return vars;
  m[1].split('\n').forEach(line => {
    const lm = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/);
    if (lm) vars[lm[1]] = lm[2].trim();
  });
  return vars;
}

// ---------------------------------------------------------------------------
// Read overlay id + set page title
// ---------------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const overlayId = params.get('overlay') || '';

const prettyTitle = overlayId
  .replace(/^frame-/, '')
  .replace(/-/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());
document.getElementById('page-title').textContent = prettyTitle;
document.title = prettyTitle + ' — Editor';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let iframeOrigin = '';
let cssPath = null;
let pendingSaveResolve = null;
let pendingSaveReject = null;
let frameInitialized = false;

// ---------------------------------------------------------------------------
// postMessage bridge
// ---------------------------------------------------------------------------
window.addEventListener('message', e => {
  if (iframeOrigin && e.origin !== iframeOrigin) return;
  // editor.html posts this as soon as its script runs — before nested video
  // resources finish loading. Use it instead of the slow iframe load event.
  if (e.data.type === 'frame-ready') {
    onFrameLoad();
    return;
  }
  if (e.data.type === 'root-block') {
    if (pendingSaveResolve) {
      pendingSaveResolve(e.data.css);
      pendingSaveResolve = null;
      pendingSaveReject = null;
    }
  }
});

function requestRootBlock(existingVars) {
  return new Promise((resolve, reject) => {
    const frame = document.getElementById('overlay-frame');
    if (!frame.contentWindow) { reject(new Error('iframe not ready')); return; }
    pendingSaveResolve = resolve;
    pendingSaveReject = reject;
    frame.contentWindow.postMessage({ type: 'request-root-block', existingVars }, iframeOrigin || '*');
    setTimeout(() => {
      if (pendingSaveResolve) {
        pendingSaveResolve = null;
        pendingSaveReject = null;
        reject(new Error('Timeout waiting for overlay controls'));
      }
    }, 5000);
  });
}

// ---------------------------------------------------------------------------
// Init: Resolve iframe URL, read CSS, apply theme, wire iframe load
// ---------------------------------------------------------------------------
async function init() {
  try {
    // Apply saved theme
    try {
      const s = await invoke('get_overlay_settings');
      document.documentElement.dataset.theme = s?.dark_mode === false ? 'light' : 'dark';
    } catch { document.documentElement.dataset.theme = 'dark'; }

    // Get CSS path for reading/writing
    try {
      cssPath = await invoke('get_overlay_css_path', { overlayId });
    } catch (e) {
      console.warn('[editor-shell] Could not get CSS path:', e);
    }

    // Get the iframe URL from Rust (handles dev vs release, bundled vs user)
    const editorUrl = await invoke('get_overlay_editor_url', { overlayId });
    iframeOrigin = new URL(editorUrl).origin;

    const frame = document.getElementById('overlay-frame');
    // frame-ready message (from editor.html script) triggers init immediately.
    // Keep load as a last-resort fallback for overlays that don't send frame-ready.
    frameInitialized = false;
    frame.addEventListener('load', onFrameLoad, { once: true });
    frame.src = editorUrl;
  } catch (e) {
    console.error('[editor-shell] init failed:', e);
  }
}

async function onFrameLoad() {
  if (frameInitialized) return;
  frameInitialized = true;
  const frame = document.getElementById('overlay-frame');
  let cssVars = {};
  if (cssPath) {
    try {
      const cssContent = await invoke('read_file_abs', { path: cssPath });
      cssVars = parseCSSVars(cssContent);
    } catch (e) {
      console.warn('[editor-shell] Could not read CSS vars:', e);
    }
  }
  frame.contentWindow.postMessage({ type: 'init', cssVars }, iframeOrigin || '*');
}

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------
document.getElementById('save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-btn');
  if (!cssPath) { alert('Cannot determine CSS path for this overlay.'); return; }
  try {
    let currentCSS = '';
    try { currentCSS = await invoke('read_file_abs', { path: cssPath }); } catch {}
    const existingVars = parseCSSVars(currentCSS);
    const newRoot = await requestRootBlock(existingVars);
    const updated = currentCSS
      ? currentCSS.replace(/:root\s*\{[^}]*\}/s, newRoot)
      : newRoot;
    await invoke('save_file_abs', { path: cssPath, content: updated });
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    setTimeout(() => { btn.innerHTML = orig; }, 1600);
  } catch (e) {
    alert('Failed to save: ' + e);
  }
});

// ---------------------------------------------------------------------------
// Copy URL button
// ---------------------------------------------------------------------------
document.getElementById('copy-url-btn').addEventListener('click', async () => {
  const btn = document.getElementById('copy-url-btn');
  try {
    const obsPath = await invoke('get_overlay_main_path', { overlayId });
    await navigator.clipboard.writeText(obsPath);
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1600);
  } catch (e) { console.warn('copy failed', e); }
});

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------
document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = '../index.html';
});

// ---------------------------------------------------------------------------
// Social share buttons
// ---------------------------------------------------------------------------
const shareURL = encodeURIComponent('https://github.com/angelicadvocate/Angels-NowPlaying');
const shareText = encodeURIComponent("Check out this awesome customizable Angel's-NowPlaying overlay!");
const shareHandlers = {
  'Share on Twitter':  () => window.openExternalUrl(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareURL}`),
  'Share on Facebook': () => window.openExternalUrl(`https://www.facebook.com/sharer/sharer.php?u=${shareURL}`),
  'Share on Reddit':   () => window.openExternalUrl(`https://www.reddit.com/submit?url=${shareURL}&title=${shareText}`),
  'Share on Discord':  async () => {
    await navigator.clipboard.writeText(`${decodeURIComponent(shareText)}\n${decodeURIComponent(shareURL)}`);
    alert('Link copied! Paste it into your favorite Discord server.');
  },
};
document.querySelectorAll('button.social-button').forEach(btn => {
  const handler = shareHandlers[btn.title];
  if (handler) btn.addEventListener('click', handler);
});
document.querySelectorAll('a[target="_blank"]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); window.openExternalUrl(a.href); });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
init();
