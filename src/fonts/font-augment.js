/*
 * font-augment.js — auto-inject user-installed fonts into an overlay editor's
 * font dropdown.
 *
 * Architecture:
 *   - The editor-shell host (parent window) fetches user fonts via Tauri's
 *     list_user_fonts command and includes them in the { type: 'init', ... }
 *     postMessage sent to each editor iframe.
 *   - This script runs inside the editor iframe, listens for that message,
 *     and appends a "── Custom Fonts ──" separator plus one <option> per user
 *     font to the first <select> it finds with id "fontFamily" or "selectFont".
 *
 * Overlay authors: drop <script src="../../fonts/font-augment.js"></script>
 * into editor.html (after the <select>, before your own <script> block — any
 * position works since this uses a message listener). Give your font <select>
 * one of the recognized ids and option values of the form "'Family Name'"
 * (single-quoted). User fonts will then show up automatically with no extra
 * work on your end.
 */
(function () {
  'use strict';

  function findFontSelect() {
    return document.getElementById('fontFamily')
        || document.getElementById('selectFont');
  }

  function injectUserFonts(userFonts) {
    if (!Array.isArray(userFonts) || userFonts.length === 0) return;
    const sel = findFontSelect();
    if (!sel || sel.dataset.userFontsInjected === '1') return;
    sel.dataset.userFontsInjected = '1';

    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '── Custom Fonts ──';
    sel.appendChild(sep);

    for (const f of userFonts) {
      if (!f || !f.family) continue;
      const opt = document.createElement('option');
      opt.value = "'" + f.family + "'";
      opt.textContent = f.family;
      sel.appendChild(opt);
    }
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'init' && e.data.userFonts) {
      injectUserFonts(e.data.userFonts);
    }
  });
})();
