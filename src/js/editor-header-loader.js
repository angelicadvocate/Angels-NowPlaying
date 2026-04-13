// ES module — Vite bundles this. Modules are implicitly deferred so the DOM
// is already parsed when this runs; no DOMContentLoaded guard is needed.

// ---------------------------------------------------------------------------
// parseCSSVars — shared utility, defined here so overlay editors don't need
// their own copy. Parses every --custom-property from a CSS text string.
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
// extractOverlayId — derives the overlay slug from the current page URL.
// Works for:
//   /overlays/{slug}/editor.html  (bundled overlays at tauri://localhost)
//   /{slug}/editor.html           (user overlays at http://127.0.0.1:{port})
// ---------------------------------------------------------------------------
function extractOverlayId() {
  const match = window.location.pathname.match(/(?:\/overlays)?\/([^/]+)\/editor\.html/);
  return match ? match[1] : null;
}

async function loadHeader() {
  const root = document.getElementById('header-root');
  if (!root) return;
  try {
    let html;
    // Always use the Tauri command when available: it returns a fully self-contained
    // HTML fragment with CSS inlined and images as base64 data URIs. This avoids
    // relative-path resolution issues that arise when the fragment is injected as
    // innerHTML into a page at a different URL (e.g. bundled overlays at
    // tauri://localhost vs user overlays at http://127.0.0.1:{port}).
    // Fall back to fetch() only for browser-only preview (no Tauri runtime).
    if (window.tauri) {
      html = await window.tauri.invoke('get_editor_header_html');
    } else {
      const resp = await fetch(root.dataset.src || '../html/editor-header.html');
      if (!resp.ok) throw new Error('Failed to fetch header');
      html = await resp.text();
    }
    root.innerHTML = html;

    // Set page title from data attribute if provided
    const pageTitle = root.dataset.pageTitle || 'Frame Editor';
    const titleEl = root.querySelector('#page-title');
    if (titleEl) titleEl.textContent = pageTitle;

    // Apply saved theme so the editor header respects dark/light mode
    try {
      if (window.tauri) {
        const s = await window.tauri.invoke('get_overlay_settings');
        document.documentElement.dataset.theme = s?.dark_mode === false ? 'light' : 'dark';
      } else {
        document.documentElement.dataset.theme = 'dark';
      }
    } catch {
      document.documentElement.dataset.theme = 'dark';
    }

    // -------------------------------------------------------------------
    // Resolve the CSS path for this overlay.
    // The Rust command checks bundled overlays first, then the user AppData
    // dir — this is what makes user-installed overlays work correctly.
    // -------------------------------------------------------------------
    const overlayId = extractOverlayId();
    let cssPath = null;
    let cssContent = '';
    let cssVars = {};

    if (overlayId && window.tauri) {
      try {
        cssPath = await window.tauri.invoke('get_overlay_css_path', { overlayId });
        cssContent = await window.tauri.invoke('read_file_abs', { path: cssPath });
        cssVars = parseCSSVars(cssContent);
      } catch (e) {
        console.warn('[header-loader] Could not load CSS for overlay', overlayId, e);
      }
    } else if (overlayId) {
      // Browser-preview fallback (no Tauri): load via fetch
      try {
        cssContent = await fetch('./main.css?raw').then(r => r.text()).catch(() => '');
        cssVars = parseCSSVars(cssContent);
      } catch (e) {
        console.warn('[header-loader] Browser preview: could not load CSS', e);
      }
    }

    // Expose path globally so the Save handler (below) always has the
    // correct resolved path, even for user-installed overlays in AppData.
    window.__editorCssPath = cssPath;
    window.__editorOverlayId = overlayId;

    // -------------------------------------------------------------------
    // Save button — canonical implementation.
    // Each editor page exposes window.buildRootBlock(existingVars) which
    // returns the new :root { ... } string. This handler does the rest.
    // -------------------------------------------------------------------
    const saveBtn = root.querySelector('#save-btn');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      if (typeof window.buildRootBlock !== 'function') {
        console.warn('[header-loader] window.buildRootBlock is not defined on this page');
        return;
      }
      if (!window.tauri || !window.__editorCssPath) {
        alert('Tauri API not available. Run inside the app to save.');
        return;
      }
      let currentCSS = '';
      try {
        currentCSS = await window.tauri.invoke('read_file_abs', { path: window.__editorCssPath });
      } catch (e) {
        alert('Could not read main.css before saving: ' + e);
        return;
      }
      const currentVars = parseCSSVars(currentCSS);
      const newRoot = window.buildRootBlock(currentVars);
      const updated = currentCSS.replace(/:root\s*\{[^}]*\}/s, newRoot);
      try {
        await window.tauri.invoke('save_file_abs', { path: window.__editorCssPath, content: updated });
        const orig = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        setTimeout(() => { saveBtn.innerHTML = orig; }, 1600);
      } catch (e) {
        alert('Failed to save: ' + e);
      }
    });

    // -------------------------------------------------------------------
    // Copy URL button — resolves the main.html absolute path for OBS.
    // -------------------------------------------------------------------
    const copyBtn = root.querySelector('#copy-url-btn');
    if (copyBtn) copyBtn.addEventListener('click', async () => {
      try {
        let obsPath;
        if (overlayId && window.tauri) {
          obsPath = await window.tauri.invoke('get_overlay_main_path', { overlayId });
        } else {
          obsPath = window.location.href.replace(/\/editor\.html([?#].*)?$/, '/main.html$1');
        }
        await navigator.clipboard.writeText(obsPath);
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => { copyBtn.innerHTML = original; }, 1600);
      } catch (e) { console.warn('copy failed', e); }
    });

    // -------------------------------------------------------------------
    // Back button — always navigates to the home page.
    // For non-tauri: origins (user overlay HTTP server), call history.back()
    // directly in JS — going through a Tauri invoke first pollutes the
    // navigation history and causes the subsequent back() to land on the
    // IPC entry instead of tauri://localhost/index.html.
    // -------------------------------------------------------------------
    const backBtn = root.querySelector('#back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (window.location.protocol === 'tauri:') {
        window.location.href = '../../index.html';
      } else {
        history.back();
      }
    });

    // Wire up social share buttons
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
    root.querySelectorAll('button.social-button').forEach(btn => {
      const handler = shareHandlers[btn.title];
      if (handler) btn.addEventListener('click', handler);
    });

    // Open any target="_blank" links in the header via the system browser
    root.querySelectorAll('a[target="_blank"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        window.openExternalUrl(a.href);
      });
    });

    // -------------------------------------------------------------------
    // Notify the overlay page that the header is ready.
    // cssVars contains the parsed :root variables from main.css so the
    // page can populate its sliders without doing its own CSS read.
    // -------------------------------------------------------------------
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('headerLoaded', { detail: { pageTitle, cssVars, cssPath } }));
    }, 0);
  } catch (e) {
    console.error('Header load error', e);
  }
}


loadHeader();

