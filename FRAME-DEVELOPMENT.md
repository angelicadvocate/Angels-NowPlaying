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
```
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
| `editor.html` | Add or remove sliders/pickers to match the CSS variables your layout exposes; link `editor-common.css` for standard control styling |
| `editor.css` | Tune the preview iframe scale and controls layout |
| `common.js` | Usually unchanged — only modify if your overlay needs non-standard polling behaviour |
| `preview.png` | Replace with a screenshot or mockup of your finished overlay |
| `background.png` | Replace with your own frame graphic, or remove the `background-image` reference if not needed |

> **Tip:** You can keep the starter files completely unchanged and use them only as a reference while building from scratch. There is no requirement to base your overlay on the starter layout.

> **Editor styling:** The app ships a shared stylesheet at `src/css/editor-common.css` that provides the standard control styles used by all bundled overlays (`.slider`, `.dropdown`, `.color-picker`, `.color-picker-container`, `.controls-grid`, `.controls-column`, `.info` labels, etc.). Your `editor.html` can link it with `<link rel="stylesheet" href="../../css/editor-common.css" />` to get the same look as the built-in editors if you wish. See the file in the repository for the full set of classes.

---

## 3a. Editor wiring — postMessage protocol

Each `editor.html` is loaded in a child `<iframe>` by the shared `editor-shell.html` host. All communication between the shell and your editor uses `postMessage`. There are three required steps.

**Step 1 — Signal ready immediately**

Post `frame-ready` at the very top of your editor script, before any expensive work. This lets the shell initialise controls without waiting for video resources (like `.webm` frame animations) to finish buffering:

```js
window.parent.postMessage({ type: 'frame-ready' }, '*');
```

**Step 2 — Handle `init` and `request-root-block` messages**

```js
window.addEventListener('message', e => {
  if (e.data.type === 'init') {
    // e.data.cssVars — object of saved CSS vars from main.css
    // e.g. { '--my-color': '#ff0000', '--my-size': '16px', ... }
    if (e.data.cssVars) populateSlidersFromVars(e.data.cssVars);
    previewFrame.addEventListener('load', sendAllVars, { once: true });
    setTimeout(sendAllVars, 800);
  }
  if (e.data.type === 'request-root-block') {
    // Shell is saving — reply with the updated :root { ... } CSS string
    const css = window.buildRootBlock(e.data.existingVars || {});
    e.source.postMessage({ type: 'root-block', css }, '*');
  }
});
```

**Step 3 — Expose `window.buildRootBlock`**

```js
window.buildRootBlock = function buildRootBlock(vars) {
  // vars — the full existing CSS var object; use for passthrough vars you don't own
  // Return the new :root { ... } string to be written back to main.css
  return `:root {
  --my-color: ${colorInput.value};
  --my-size: ${sizeSlider.value}px;
  /* preserve vars this editor doesn't manage */
  --scroll-extra: ${vars['--scroll-extra'] || '0px'};
}`;
};
```

The editor preview is an `<iframe src="./main.html?edit=1">`. CSS variable updates are sent to it via `postMessage({ type: 'setCSSVar', name, value })`.

See `frame-template-starter/editor.html` for a complete working example, and `src/js/editor-shell.js` for the full shell implementation.

---

## 4. Test in the App

1. Package your overlay folder as a zip. The zip **must** contain a single top-level folder named with your overlay's `id`:
   ```
   my-overlay-name/
     manifest.json
     main.html
     main.css
     editor.html
     editor.css
     common.js
     preview.png
   ```
   On Windows with PowerShell:
   ```powershell
   Compress-Archive -Path "my-overlay-name" -DestinationPath "my-overlay-name.zip"
   ```
2. Open Angels-NowPlaying and go to **Settings → Overlay Management**.
3. Click **Install Overlay from Zip** and select your zip file.
4. The app extracts the overlay to `%APPDATA%/AngelsNowPlaying/user-overlays/my-overlay-name/` and serves it via its built-in HTTP server. No post-processing is needed — the editor is loaded directly from disk.
5. Your overlay now appears on the home page. Open the editor from the overlay card to verify sliders and controls update the live preview correctly.
6. Add the overlay's `main.html` as a Browser Source in OBS at the size specified in your `manifest.json` and confirm it behaves as expected with Tuna running.

> If you have Tuna running on a non-default port, update the port in **Settings → Tuna Configuration** and restart OBS so the new port takes effect.

> To iterate on your overlay after install, delete it from **Settings → Overlay Management**, edit your source files, repackage the zip, and reinstall.

---

## 5. Publish to the Store *(coming soon)*

Once your overlay is working, you will be able to submit it to the Angels-NowPlaying community store so other users can discover and install it directly from the app. Store submission will be available from the **Store** page inside the app.

In the meantime, you can share your overlay by zipping the folder and distributing it directly — users can install it via the same **Upload Custom Template** option in Settings.

---

## Further Reading

- `frame-template-starter/README.md` — per-file conventions, DOM IDs, CSS variable reference, manifest schema, editor wiring
- `src/html/editor-shell.html` / `src/js/editor-shell.js` — the shared editor host; owns the header, Save, Copy URL, and Back buttons; loads each overlay's `editor.html` in a child iframe and communicates via `postMessage`
- `src/css/editor-common.css` — shared control styles (sliders, dropdowns, colour pickers, grid layout) available to all overlay editors
- `src-tauri/src/backend.rs` — Tauri commands available to editor pages (`get_overlay_css_path`, `read_file_abs`, `save_file_abs`, `get_overlay_settings`, etc.)
