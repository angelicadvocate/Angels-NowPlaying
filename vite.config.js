import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { defineConfig } from 'vite'
import fs from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, 'src')

/**
 * Vite plugin that copies non-module OBS overlay files to dist/ after build.
 * common.js and jquery are classic scripts that Vite doesn't bundle —
 * they must be present in dist/ so the tiny_http server can serve them.
 */
function copyOverlayStaticAssets() {
  return {
    name: 'copy-overlay-static-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')

      // Copy vendor directory (jQuery etc.)
      const vendorSrc = resolve(root, 'js/vendor')
      const vendorDest = resolve(dist, 'js/vendor')
      if (fs.existsSync(vendorSrc)) fs.cpSync(vendorSrc, vendorDest, { recursive: true })

      // Copy overlay main.html + main.css (not bundled — classic scripts)
      // and all overlay-specific assets (images, videos, etc.)
      const overlaysDir = resolve(root, 'overlays')
      for (const folder of fs.readdirSync(overlaysDir)) {
        const overlayDist = resolve(dist, 'overlays', folder)
        fs.mkdirSync(overlayDist, { recursive: true })
        for (const file of fs.readdirSync(resolve(overlaysDir, folder))) {
          // Copy everything except editor files — those are bundled by Vite separately
          if (file === 'editor.html' || file === 'editor.css') continue
          const src = resolve(overlaysDir, folder, file)
          if (fs.statSync(src).isFile()) fs.copyFileSync(src, resolve(overlayDist, file))
        }
      }
    }
  }
}

export default defineConfig({
  root,
  plugins: [copyOverlayStaticAssets()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // App shell / redirect entry
        index: resolve(root, 'index.html'),
        // Main app pages
        'main-index': resolve(root, 'main_pages/index.html'),
        'main-settings': resolve(root, 'main_pages/settings.html'),
        'main-instructions': resolve(root, 'main_pages/instructions.html'),
        'main-store': resolve(root, 'main_pages/store.html'),
        // Editor header fragment (shared fetch target)
        'editor-header': resolve(root, 'editor_pages/editor-header.html'),
        // Overlay editor pages — entry points so @tauri-apps/api + overlays.js get bundled
        'f1-editor':  resolve(root, 'overlays/frame-horizontal-classic/editor.html'),
        'f2-editor':  resolve(root, 'overlays/frame-horizontal-wide/editor.html'),
        'f3-editor':  resolve(root, 'overlays/frame-vertical-panel/editor.html'),
        'f4-editor':  resolve(root, 'overlays/frame-banner-visualizer/editor.html'),
        'f5-editor':  resolve(root, 'overlays/frame-glassmorphism-1/editor.html'),
        'f6-editor':  resolve(root, 'overlays/frame-glassmorphism-2/editor.html'),
        'f7-editor':  resolve(root, 'overlays/frame-cassette-tape/editor.html'),
        'f8-editor':  resolve(root, 'overlays/frame-retro-vinyl/editor.html'),
        'f9-editor':  resolve(root, 'overlays/frame-neon-lights/editor.html'),
        'f10-editor': resolve(root, 'overlays/frame-color-bar-visualizer/editor.html'),
        'f11-editor': resolve(root, 'overlays/frame-program-window/editor.html'),
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
