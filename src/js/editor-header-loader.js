// ES module — Vite bundles this. Modules are implicitly deferred so the DOM
// is already parsed when this runs; no DOMContentLoaded guard is needed.

async function loadHeader() {
  const root = document.getElementById('header-root');
  if (!root) return;
  try {
    const resp = await fetch(root.dataset.src || '../html/editor-header.html');
    if (!resp.ok) throw new Error('Failed to fetch header');
    const html = await resp.text();
    root.innerHTML = html;

    // Set page title from data attribute if provided
    const pageTitle = root.dataset.pageTitle || 'Frame Editor';
    const titleEl = root.querySelector('#page-title');
    if (titleEl) titleEl.textContent = pageTitle;

    // Attach default button handlers which defer to page-provided callbacks
    const saveBtn = root.querySelector('#save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      if (typeof window.onSave === 'function') return window.onSave();
      // fallback: dispatch event
      document.dispatchEvent(new CustomEvent('headerSave'));
    });

    const copyBtn = root.querySelector('#copy-url-btn');
    if (copyBtn) copyBtn.addEventListener('click', async () => {
      if (typeof window.onCopy === 'function') return window.onCopy();
      try {
        // Extract overlay slug from URL path: /overlays/{slug}/editor.html
        const match = window.location.pathname.match(/\/overlays\/([^/]+)\/editor\.html/);
        let obsPath;
        if (match && window.tauri && window.tauri.invoke) {
          // Resolve to absolute filesystem path — OBS accepts file paths as browser source URLs
          obsPath = await window.tauri.invoke('get_overlay_main_path', {
            overlayId: match[1]
          });
        } else {
          // Fallback for browser preview: use URL with editor→main swap
          obsPath = window.location.href.replace(/\/editor\.html([?#].*)?$/, '/main.html$1');
        }
        await navigator.clipboard.writeText(obsPath);
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        setTimeout(() => copyBtn.innerHTML = original, 1600);
      } catch (e) { console.warn('copy failed', e); }
    });

    const backBtn = root.querySelector('#back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (typeof window.onBack === 'function') return window.onBack();
      history.back();
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

    // Notify page that header is inserted
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('headerLoaded', { detail: { pageTitle } }));
    }, 0);
  } catch (e) {
    console.error('Header load error', e);
  }
}

loadHeader();

