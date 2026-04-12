# Template Starter — Developer Overlay

This is the **developer starter template** for Angels-NowPlaying overlays. It is a fully working overlay (based on a horizontal layout) annotated throughout to explain every file, every hook, and every convention the system uses.

Copy this entire folder when starting a new overlay. Rename the folder to your overlay's `id`, update `manifest.json`, and build from there.

> This overlay is included in the default bundle as a developer reference. It is not intended as a production viewer-facing overlay.

---

## File Layout

| File | Purpose |
|---|---|
| `main.html` | The overlay rendered inside OBS as a Browser Source. |
| `editor.html` | The customisation UI rendered inside the Angels-NowPlaying app. |
| `main.css` | Base styles for the OBS overlay. |
| `editor.css` | Styles for the editor preview and controls. |
| `common.js` | Polls Tuna's HTTP endpoint (`http://localhost:1608`) and updates the DOM. |
| `manifest.json` | Overlay metadata consumed by the app. |
| `preview.png` | Thumbnail shown on the home page and store. |
| `README.md` | This file — developer documentation. |
| `description.md` | Store-facing description with YAML frontmatter. |

---

## main.html vs editor.html

**`main.html`** is what OBS renders. It must use plain `<script>` tags (no ES modules) to work from `file://`. `common.js` drives all dynamic behavior.

**`editor.html`** is loaded inside the Angels-NowPlaying app. It is a Vite entry point and may use ES module imports. It loads `main.html?edit=1` in an iframe as its live preview — this means the preview and the OBS output are always the same HTML, eliminating drift between the two.

> **`?edit=1` mode:** When `main.html` is loaded with this query param, `common.js` skips Tuna polling and populates the DOM with static placeholder values (`SampleAlbum.png`, placeholder title/artist). This is what the editor iframe uses.

> **Editor is optional but files must exist:** If your overlay has no customisable settings, keep a minimal `editor.html` that says so. Both files must be present for the app to load the overlay.

---

## DOM IDs expected by common.js

`common.js` looks for these IDs in `main.html` to update content. Include the ones your layout uses:

| ID | Content set |
|---|---|
| `#song` | Track title (scrolls if text overflows container) |
| `#artist` | Artist name (scrolls if text overflows container) |
| `#image` | `<img>` — `src` set to Tuna's `cover_url` |
| `#progress-bar` | `<div>` — `width` animated 0–100% |
| `#background` | Outer container — slides in/out when track changes |

---

## CSS variable conventions

Declare these in `main.css` `:root {}` to enable scroller tuning:

```css
--scroll-extra: 40;        /* px added when deciding if text overflows and needs to scroll */
--scroll-start-offset: 0;  /* px off-screen the JS scroller starts from */
```

`common.js` reads these via `getComputedStyle` and uses them automatically. You can also set them as `data-scroll-extra` / `data-scroll-start-offset` attributes on the container element as a fallback.

---

## Editor controls — wiring up the header and Save behaviour

`editor-header-loader.js` owns the Save, Copy URL, and Back buttons. Your editor page does **not** implement these directly. Instead you expose one function:

```js
window.buildRootBlock = function buildRootBlock(vars) {
  // vars — object of current CSS custom property values parsed from main.css
  // Return the new :root { ... } string that should be written back to main.css
  return `:root {
  --my-color: ${colorInput.value};
  --my-size: ${sizeSlider.value}px;
  /* ... all other vars ... */
}`;
};
```

When the user clicks Save, `editor-header-loader.js` calls `window.buildRootBlock(currentVars)` and writes the result to `main.css` automatically.

To initialise your controls from the current saved values, listen for the `headerLoaded` event:

```js
document.addEventListener('headerLoaded', ({ detail: { cssVars } }) => {
  // cssVars is an object: { '--my-color': '#ff0000', '--my-size': '16px', ... }
  colorInput.value = cssVars['--my-color'] || '#ffffff';
  sizeSlider.value = parseInt(cssVars['--my-size']) || 16;
  // update the preview iframe with initial values
  sendAllVars();
});
```

The loader also fires `headerLoaded` with `{ cssPath }` — the absolute path to `main.css`. You do not need to use this directly; it is used internally by the Save handler.

See `src/js/editor-header-loader.js` for the full implementation.

---

## manifest.json Reference

```json
{
  "id": "unique-folder-name",       // must match folder name exactly
  "name": "Human-Readable Name",    // shown in app UI and home page card
  "version": "1.0.0",
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "author": "your-handle",
  "entry": "main.html",
  "editor": "editor.html",
  "preview": "preview.png",
  "description": "One or two sentences shown in the app alongside the card.",
  "obsSize": { "width": 728, "height": 180 },  // or null if flexible
  "tags": ["tag1", "tag2"]
}
```

The `description` here is the **short** app-UI copy. The longer store-facing description goes in `description.md`.
