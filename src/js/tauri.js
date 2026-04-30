/**
 * Tauri API bridge.
 * Imported as a <script type="module"> in editor pages and settings.
 * Vite bundles this so @tauri-apps/api/core is resolved at build time.
 *
 * Exposes invoke under two window properties to match existing call-site patterns:
 *   window.tauri.invoke(...)    — used in F1-Editor.html
 *   window.__TAURI__.invoke(...)  — used in settings.html
 *
 * Also surfaces the updater + process plugin APIs as
 *   window.__TAURI__.updater.check()
 *   window.__TAURI__.process.relaunch()
 */
import { invoke } from '@tauri-apps/api/core'
import { check as updaterCheck } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

window.tauri = { invoke }
window.__TAURI__ = {
  invoke,
  updater: { check: updaterCheck },
  process: { relaunch },
}

/**
 * Opens a URL in the user's default system browser.
 * Falls back to window.open when running outside Tauri (dev browser preview).
 */
window.openExternalUrl = async (url) => {
  try {
    await invoke('open_url', { url })
  } catch {
    window.open(url, '_blank')
  }
}

// ─── Shared header behaviors ─────────────────────────────────────────────
// Every page that loads tauri.js gets these for free, so the GitHub / Tip /
// social share buttons in the header behave consistently across index,
// editor, settings, store, and instructions. Previously each page had its
// own (often broken) `window.open(..., '_blank')` calls and plain
// `<a target="_blank">` anchors — neither of which actually navigates
// inside the Tauri webview, so the buttons appeared dead on every page
// except index.

const SHARE_URL = encodeURIComponent('https://github.com/angelicadvocate/Angels-NowPlaying')
const SHARE_TEXT = encodeURIComponent(
  "Check out this awesome customizable Angel's-NowPlaying overlay collection!"
)

window.shareToTwitter = () =>
  window.openExternalUrl(`https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${SHARE_URL}`)

window.shareOnFacebook = () =>
  window.openExternalUrl(`https://www.facebook.com/sharer/sharer.php?u=${SHARE_URL}`)

window.shareToReddit = () =>
  window.openExternalUrl(`https://www.reddit.com/submit?url=${SHARE_URL}&title=${SHARE_TEXT}`)

window.shareToDiscord = () => {
  try {
    navigator.clipboard.writeText(
      `${decodeURIComponent(SHARE_TEXT)}\n${decodeURIComponent(SHARE_URL)}`
    )
    alert('Link copied! Paste it into your favorite Discord server.')
  } catch {
    alert('Could not copy to clipboard.')
  }
}

// Route every `target="_blank"` link through the system browser. Tauri's
// webview ignores `_blank` navigations by default, which is why the GitHub
// and Tip Jar buttons used to appear dead on every page except index.
function wireExternalLinks() {
  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    if (a.dataset.externalWired === '1') return
    a.dataset.externalWired = '1'
    a.addEventListener('click', e => {
      e.preventDefault()
      const href = a.getAttribute('href')
      if (href && href !== '#') window.openExternalUrl(href)
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireExternalLinks)
} else {
  wireExternalLinks()
}
