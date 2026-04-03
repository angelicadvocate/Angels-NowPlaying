/**
 * Tauri API bridge.
 * Imported as a <script type="module"> in editor pages and settings.
 * Vite bundles this so @tauri-apps/api/core is resolved at build time.
 *
 * Exposes invoke under two window properties to match existing call-site patterns:
 *   window.tauri.invoke(...)    — used in F1-Editor.html
 *   window.__TAURI__.invoke(...)  — used in settings.html
 */
import { invoke } from '@tauri-apps/api/core'

window.tauri = { invoke }
window.__TAURI__ = { invoke }

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
