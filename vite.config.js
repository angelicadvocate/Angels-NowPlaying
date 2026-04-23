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

      // Copy bundled fonts. These are not a Vite build artifact — they are
      // extracted to AppData by the Tauri backend and served by the overlay
      // HTTP server, so future user-uploaded fonts can drop in without a rebuild.
      const fontsSrc = resolve(root, 'fonts')
      const fontsDest = resolve(dist, 'fonts')
      if (fs.existsSync(fontsSrc)) fs.cpSync(fontsSrc, fontsDest, { recursive: true })

      // Copy mascot and header-text images with original (unhashed) names so
      // editor-shell.html can reference them as /assets/mascot.png reliably.
      const assetsDist = resolve(dist, 'assets')
      fs.mkdirSync(assetsDist, { recursive: true })
      for (const img of ['mascot.png', 'header-text.png']) {
        const src = resolve(root, 'assets', img)
        if (fs.existsSync(src)) fs.copyFileSync(src, resolve(assetsDist, img))
      }

      // Copy all overlay static files (main.html, main.css, common.js, editor.html,
      // editor.css, assets, etc.) — editor pages are no longer Vite entry points,
      // they are served raw by the overlay HTTP server from AppData.
      const overlaysDir = resolve(root, 'overlays')
      for (const folder of fs.readdirSync(overlaysDir)) {
        const overlayPath = resolve(overlaysDir, folder)
        if (!fs.statSync(overlayPath).isDirectory()) continue
        const overlayDist = resolve(dist, 'overlays', folder)
        fs.mkdirSync(overlayDist, { recursive: true })
        for (const file of fs.readdirSync(overlayPath)) {
          const src = resolve(overlayPath, file)
          if (fs.statSync(src).isFile()) fs.copyFileSync(src, resolve(overlayDist, file))
        }
      }
    }
  }
}

export default defineConfig({
  root,
  appType: 'mpa',
  plugins: [copyOverlayStaticAssets()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Main app pages
        index: resolve(root, 'index.html'),
        settings: resolve(root, 'html/settings.html'),
        instructions: resolve(root, 'html/instructions.html'),
        store: resolve(root, 'html/store.html'),
        // Editor shell — single shared entry point for all overlay editors
        'editor-shell': resolve(root, 'html/editor-shell.html'),
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
