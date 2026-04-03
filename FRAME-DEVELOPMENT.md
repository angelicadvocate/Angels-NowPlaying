# Overlay Development Guide

This guide covers the recommended workflow for building custom Now Playing overlays for Angels-NowPlaying.

---

## 1. Get the App

Download and install the latest release from the [GitHub Releases](https://github.com/angelicadvocate/Angels-NowPlaying/releases) page, or build from source:

```bash
git clone https://github.com/angelicadvocate/Angels-NowPlaying.git
cd Angels-NowPlaying
npm install
cargo tauri dev
```

> **Prerequisites for building from source:** Node.js, Rust, and the [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your platform.

---

## 2. Get the Starter Template

### Easy method (no git required)

1. Open Angels-NowPlaying and go to **Settings → Overlay Management**.
2. Enable **Show Developer Overlay** — this makes the `frame-template-starter` overlay appear on the home page so you can see a working reference overlay in action.
3. Back in Settings, click **Download Starter Template**. This packages the starter as a zip file and opens a save dialog.
4. Save the zip somewhere convenient, then extract it. This gives you a complete, working overlay folder to use as your starting point.

### Alternative: clone the repository

If you want the full source history or prefer working from git:

```bash
git clone https://github.com/angelicadvocate/Angels-NowPlaying.git
```

The starter lives at `src/overlays/frame-template-starter/` inside the cloned repo.

---

The `frame-template-starter` folder structure:
  main.html        ← OBS browser source entry point
  main.css         ← All tunable values declared as CSS custom properties in :root
  editor.html      ← Customisation UI rendered inside the app
  editor.css       ← Editor layout and preview styles
  common.js        ← Polls Tuna's HTTP endpoint; drives DOM updates and scroller
  manifest.json    ← Overlay metadata consumed by the app
  preview.png      ← Thumbnail shown on the home page
  README.md        ← Detailed per-file documentation and conventions
  description.md   ← Store-facing description template
  background.png   ← Example background image (shows how to use a frame image)
  SampleAlbum.png  ← Placeholder album art used in ?edit=1 preview mode
```

**Read `frame-template-starter/README.md` before modifying anything.** It documents the DOM IDs `common.js` expects, how the `?edit=1` editor preview mode works, the CSS variable conventions, and the `manifest.json` schema.

---

## 3. Build Your Overlay

Copy the `frame-template-starter` folder and rename it to your overlay's ID (this must match the folder name exactly and be unique):

```
my-overlay-name/
```

Then work through each file:

| File | What to do |
|---|---|
| `manifest.json` | Update `id`, `name`, `author`, `description`, `obsSize`, and `tags` |
| `main.html` | Adjust the DOM structure for your layout — keep the required IDs |
| `main.css` | Change colours, fonts, dimensions; add or remove CSS variables in `:root` |
| `editor.html` | Add or remove sliders/pickers to match the CSS variables your layout exposes |
| `editor.css` | Tune the preview iframe scale and controls layout |
| `common.js` | Usually unchanged — only modify if your overlay needs non-standard polling behaviour |
| `preview.png` | Replace with a screenshot or mockup of your finished overlay |
| `background.png` | Replace with your own frame graphic, or remove the `background-image` reference if not needed |

> **Tip:** You can keep the starter files completely unchanged and use them only as a reference while building from scratch. There is no requirement to base your overlay on the starter layout.

---

## 4. Test in the App

1. Open Angels-NowPlaying and go to **Settings**.
2. Use the **Upload Custom Template** option to load your overlay folder into the app.
3. Your overlay will appear alongside the built-in overlays on the home page.
4. Open the editor from the overlay card to verify sliders and controls update the live preview correctly.
5. Add the overlay's `main.html` as a Browser Source in OBS at the size specified in your `manifest.json` and confirm it behaves as expected with Tuna running.

> If you have Tuna running on a non-default port, update the port in **Settings → Tuna Configuration** and restart OBS so the new port takes effect.

---

## 5. Publish to the Store *(coming soon)*

Once your overlay is working, you will be able to submit it to the Angels-NowPlaying community store so other users can discover and install it directly from the app. Store submission will be available from the **Store** page inside the app.

In the meantime, you can share your overlay by zipping the folder and distributing it directly — users can install it via the same **Upload Custom Template** option in Settings.

---

## Further Reading

- `frame-template-starter/README.md` — per-file conventions, DOM IDs, CSS variable reference, manifest schema
- `src/js/editor-header-loader.js` — shared editor header wiring (`window.onSave`, `window.onBack`, `window.onCopy`)
- `src-tauri/src/backend.rs` — Tauri commands available to editor pages (`read_text_file`, `save_css_file`, `get_overlay_settings`, etc.)
