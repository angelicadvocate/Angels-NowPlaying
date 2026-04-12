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

buildGrid()
