/**
 * Overlay discovery module.
 *
 * Built-in overlays are resolved at Vite build time via import.meta.glob —
 * all manifest.json files are inlined into the bundle, no runtime fetch needed.
 *
 * User-installed overlays are returned by the Tauri backend scanning
 * %APPDATA%/AngelsNowPlaying/overlays/ at runtime.
 */
import { invoke } from '@tauri-apps/api/core'

// Resolved at build time — Vite inlines all matched JSON files.
const _builtinModules = import.meta.glob('../overlays/*/manifest.json', {
  eager: true,
  import: 'default'
})

export const builtinOverlays = Object.entries(_builtinModules).map(([path, manifest]) => {
  const id = path.split('/').at(-2)
  return {
    ...manifest,
    id,
    _source: 'builtin',
    editorUrl: `/overlays/${id}/editor.html`,
    mainUrl: `/overlays/${id}/main.html`,
    previewUrl: `/overlays/${id}/preview.png`
  }
})

/**
 * Calls the Tauri backend to get user-installed overlays from AppData.
 * Returns an empty array if Tauri is unavailable (e.g., running in a browser).
 */
export async function listUserOverlays() {
  try {
    return await invoke('list_user_overlays')
  } catch {
    return []
  }
}

/**
 * Returns current overlay visibility settings from the backend.
 * Falls back to permissive defaults so the grid still works without Tauri.
 */
async function getOverlayVisibility() {
  try {
    const s = await invoke('get_overlay_settings')
    return {
      showUserOverlays: s.show_user_overlays !== false,
      showTemplateStarter: s.show_template_starter === true
    }
  } catch {
    return { showUserOverlays: true, showTemplateStarter: false }
  }
}

/** Returns all overlays — built-in first, then user-installed — filtered by visibility settings. */
export async function listAllOverlays() {
  const { showUserOverlays, showTemplateStarter } = await getOverlayVisibility()

  const filtered = builtinOverlays.filter(o => {
    if (o.id === 'frame-template-starter') return showTemplateStarter
    return true
  })

  const user = showUserOverlays ? await listUserOverlays() : []
  return [...filtered, ...user]
}
