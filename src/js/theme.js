/**
 * theme.js — reads the saved dark_mode preference and applies
 * the correct [data-theme] attribute to <html> as early as possible.
 *
 * Imported as a <script type="module"> by app pages that don't
 * otherwise have a JS entry point (store, instructions). The
 * settings page handles theme application itself via applyDarkMode().
 * The index page imports this alongside index-page.js.
 */
import { invoke } from '@tauri-apps/api/core'

;(async () => {
  try {
    const s = await invoke('get_overlay_settings')
    document.documentElement.dataset.theme = s?.dark_mode === false ? 'light' : 'dark'
  } catch {
    // Tauri not available (browser preview) or no settings yet — default dark
    document.documentElement.dataset.theme = 'dark'
  }
})()
