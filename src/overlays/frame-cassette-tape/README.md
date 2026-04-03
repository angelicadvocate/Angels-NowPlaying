# Cassette Tape — Default Overlay

This overlay ships as part of the default bundle included with [Angels-NowPlaying](https://github.com/angelicadvocate/Angels-NowPlaying). It is maintained by the core team and is available to all users without any additional installation.

---

## File Layout

| File | Purpose |
|---|---|
| `main.html` | The overlay rendered inside OBS as a Browser Source. |
| `editor.html` | The customisation UI rendered inside the Angels-NowPlaying app. |
| `main.css` | Base styles for the OBS overlay. |
| `editor.css` | Styles for the editor preview and controls. |
| `common.js` | Polls `Song.json` and `Artwork.png` via Tuna and updates the DOM. |
| `manifest.json` | Overlay metadata consumed by the app. |
| `preview.png` | Thumbnail shown on the home page and store. |
| `description.md` | Long-form description used by the store page. |

---

## main.html vs editor.html

**`main.html`** is what you point OBS's Browser Source at. It uses plain `<script>` tags (not ES modules) so it loads correctly from the local filesystem (`file://`). On startup it loads `common.js`, which:

1. Reads `../tuna-config.json` to find where Tuna writes its output files.
2. Polls `Song.json` on an interval and updates `#title`, `#artist`, `#album`, `#album-art`, and `#progress-bar` in the DOM.
3. Decides whether to scroll overflow text using a CSS keyframe marquee or a JS animation (pass `?scroller=js` to force JS mode).

**`editor.html`** is loaded inside the Angels-NowPlaying app when a user opens this overlay's editor. It is a Vite entry point and may use ES module imports (e.g. `@tauri-apps/api/core`). The editor calls `window.tauri.invoke("save_css_file", { path, content })` to write CSS changes directly to the overlay folder.

> **Note for overlay authors:** An editor is not *required* for an overlay to work — `main.html` runs independently in OBS regardless. However, both `editor.html` and `editor.css` **must be present** in the overlay folder for the app to load correctly. If your overlay has no customisable settings, create a minimal `editor.html` that displays a message such as *"This overlay has no customisable settings."*

---

## manifest.json Reference

```json
{
  "id": "unique-folder-name",
  "name": "Human-Readable Name",
  "version": "1.0.0",
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "author": "your-handle",
  "entry": "main.html",
  "editor": "editor.html",
  "preview": "preview.png",
  "description": "Short description shown in the Angels-NowPlaying app UI.",
  "obsSize": { "width": 728, "height": 180 },
  "tags": ["tag1", "tag2"]
}
```

The `id` must match the overlay's folder name exactly. The `name` field is used as the title on the home page card and in the overlay picker. The `description` field is the short text shown alongside it in the app — keep it to one or two sentences. For the longer store-facing copy, use `description.md`.

`obsSize` should be set when the overlay is designed for a specific canvas size. Set it to `null` if the overlay scales to any size or the user should define their own dimensions.
