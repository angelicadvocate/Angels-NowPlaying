/**
 * index-page.js — dynamically builds the overlay grid on the home screen.
 * Imported as a module by main_pages/index.html.
 */
import './tauri.js'  // registers window.openExternalUrl and window.tauri
import { listAllOverlays } from './overlays.js'

async function buildGrid() {
  const grid = document.querySelector('.grid')
  if (!grid) return

  // Preserve the static welcome card at the bottom
  const welcomeCard = grid.querySelector('.welcome-card')

  // Clear hardcoded cards
  grid.innerHTML = ''

  const overlays = await listAllOverlays()

  overlays.forEach(overlay => {
    const sizeText = overlay.obsSize
      ? `OBS: Width ${overlay.obsSize.width}, Height ${overlay.obsSize.height}`
      : 'OBS size: see overlay notes'

    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `
      <img src="${overlay.previewUrl}" alt="${overlay.name} Preview" />
      <p>${overlay.description || ''}</p>
      <p>${sizeText}</p>
      ${overlay.editorUrl
        ? `<a href="${overlay.editorUrl}"><button>Edit ${overlay.name}</button></a>`
        : `<button disabled title="No editor available">Edit ${overlay.name}</button>`}
    `
    grid.appendChild(card)
  })

  if (welcomeCard) grid.appendChild(welcomeCard)
}

// ── Launch toasts ────────────────────────────────────────────────────────
// Two one-shot toasts on app launch:
//  1. Success: post-update snapshot was just restored (consumes a backend
//     marker so it only shows once per restore).
//  2. Info: a newer version is available on GitHub Releases (links the user
//     to Settings → Check for Updates rather than auto-installing here).

function ensureToastContainer() {
  let host = document.getElementById('launch-toasts')
  if (host) return host
  host = document.createElement('div')
  host.id = 'launch-toasts'
  document.body.appendChild(host)
  return host
}

function showLaunchToast({ kind = 'info', icon, message, actionLabel, onAction }) {
  const host = ensureToastContainer()
  const toast = document.createElement('div')
  toast.className = `launch-toast ${kind}`
  const iconEl = document.createElement('i')
  iconEl.className = `toast-icon ${icon || (kind === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle')}`
  const body = document.createElement('div')
  body.className = 'toast-body'
  body.innerHTML = message
  toast.append(iconEl, body)
  if (actionLabel && onAction) {
    const btn = document.createElement('button')
    btn.className = 'toast-action'
    btn.textContent = actionLabel
    btn.addEventListener('click', () => { onAction(); toast.remove() })
    toast.appendChild(btn)
  }
  const close = document.createElement('button')
  close.className = 'toast-close'
  close.setAttribute('aria-label', 'Dismiss')
  close.innerHTML = '<i class="fas fa-times"></i>'
  close.addEventListener('click', () => toast.remove())
  toast.appendChild(close)
  host.appendChild(toast)
  return toast
}

async function maybeShowRestoreSuccessToast() {
  try {
    const restored = await window.tauri.invoke('consume_restore_success_flag')
    if (restored) {
      showLaunchToast({
        kind: 'success',
        icon: 'fas fa-undo-alt',
        message: '<strong>Customizations restored.</strong><br>Your overlay tweaks and settings carried over from the previous version.',
      })
    }
  } catch {
    // Non-Tauri context (dev browser preview) — silently skip.
  }
}

async function maybeShowUpdateAvailableToast() {
  if (!window.__TAURI__?.updater?.check) return
  try {
    const update = await window.__TAURI__.updater.check()
    if (!update?.available) return
    const latest = update.version || ''
    const current = update.currentVersion || ''
    const versionLine = latest && current
      ? `<small style="opacity:0.85;">v${current} → v${latest}</small>`
      : ''
    showLaunchToast({
      kind: 'info',
      icon: 'fas fa-cloud-download-alt',
      message: `<strong>Update available.</strong><br>${versionLine}`,
      actionLabel: 'Open Settings',
      onAction: () => { window.location.href = 'html/settings.html' },
    })
  } catch {
    // Offline / no network / GitHub down — silently skip; settings page
    // surfaces the error properly when the user clicks Check for Updates.
  }
}

buildGrid()
maybeShowRestoreSuccessToast()
maybeShowUpdateAvailableToast()
