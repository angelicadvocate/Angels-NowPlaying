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
