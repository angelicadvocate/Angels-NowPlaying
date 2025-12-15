(function(){
  async function loadHeader() {
    const root = document.getElementById('header-root');
    if (!root) return;
    try {
      const resp = await fetch(root.dataset.src || '../editor_pages/editor-header.html');
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
          await navigator.clipboard.writeText(window.location.href);
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

      // Notify page that header is inserted
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('headerLoaded', { detail: { pageTitle } }));
      }, 0);
    } catch (e) {
      console.error('Header load error', e);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();
