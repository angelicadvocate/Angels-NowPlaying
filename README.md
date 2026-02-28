# 🎵 Angels-NowPlaying (Work in Progress)

## ⚠️ Development Status

This project is **under active development** and is **not production-ready**.

The current iteration does **not work** due to a major ongoing overhaul. As a result:
- The instructions in this README are **out of date**
- Some features may be broken or missing

You’re welcome to use the HTML templates directly in OBS for frames, but this will require **manual CSS editing**.

Check back soon for the next release.

**Current version:** 0.5.3
---

**Angels-NowPlaying** is a browser-based widget for OBS that displays now playing information from local audio sources using Tuna for OBS. It includes multiple visual templates (overlay frames), all of which update in real time from the same data source.

You can use each template as a separate browser source in OBS, allowing for flexible and customizable scene layouts.

---

## ✨ Features

- Displays artist and track name in real time
- Supports album artwork
- Includes multiple overlay frame templates
- All frames update in sync
- Built-in visual editor for customizing styles (with instructions)

---

## 🚀 Getting Started

### Dependencies for Offline Use

Before packaging or running the editor in an offline environment, download the following assets and place them under `src/vendor/`:

- **jQuery 3.5.1** → `src/js/vendor/jquery-3.5.1.min.js` (overwrite the placeholder)
- **Font Awesome 6.4.0** web files → extract into `src/vendor/fontawesome/` (CSS + fonts)

These libraries are currently referenced from a CDN in the source files; local copies ensure the app works without network access.


### 1. Download the Widget

1. Download the entire repo as a ZIP or clone it via Git.
2. Place the `Angels-NowPlaying` directory wherever you want to use it from (e.g., a permanent location on your drive).

---

### 2. Install & Configure Tuna

1. Install the [Tuna](https://github.com/univrsal/tuna/releases) OBS plugin.
2. Inside OBS, configure Tuna to output the following files:
   - `Song.json` (Add this in the "Song Info Outputs" section in Tuna Settings. Song format is {json_compact})
   - `Artwork.png` (Add this from the "Song Cover Path" section in Tuna Settings)
3. These files **must be saved to the root of the `Angels-NowPlaying` directory**.

> ⚠️ Tested and developed using Tuna's VLC integration in Tuna v1.9.9. Other sources and versions may work but are not yet tested.

---

### 3. Add Music via VLC Source in OBS

To feed music into Tuna:

- Use the **VLC Video Source** in OBS (not the Media Source).
- Add the folder containing your music files to the VLC source.
- Only VLC sources will work with Tuna for local playback — Media Sources are not supported.

---

### 4. Add the Widget to OBS

1. In OBS, add a **Browser Source**.
2. Enable **"Local File"** and browse to one of the overlay frame `.html` files inside the widget folder.
3. Set the resolution to match the specific frame's recommended size (shown in the editor).
4. You can add **one or multiple** frames to different browser sources — all will update simultaneously.

---

### 5. Customize with the Built-in Editor

The widget includes a built-in configuration editor:

- Open the `index.html` file in a browser by double clicking on the file.
- Follow the on-screen instructions to edit visual styles for each frame.
- When you are finished with the changes, click the "save" button and replace the downloaded css file in the "css_files" folder for the widget.
- If OBS was open when you changed the css file you will have to click the refresh button on the source in OBS.

   How the editor save/download workflow works
   -----------------------------------------
   The editor runs purely client-side (no backend). When you click "Save" the editor generates a CSS file and triggers a browser download.

   To apply the downloaded CSS to your running widget:
   1. Download the generated CSS file (the editor names it like `01-NowPlaying-F1-Styles.css`).
   2. Replace the existing CSS file in the project's `css/` directory with the downloaded file (for example, overwrite `css/01-NowPlaying-F1-Styles.css`).
   3. In OBS, open the Browser Source properties for that frame and click the Reload/Refresh button (or disable/enable the source) so OBS picks up the new CSS.

   Notes:
   - This approach avoids requiring a local webserver; it's manual but reliable for local OBS workflows.
   - If you'd rather test in a browser outside OBS, run a simple static server (for example `python -m http.server 8000`) and open the editor page from `http://localhost:8000/editor_assets/`.

> 📌 *The editor includes built-in instructions, and future versions will offer improved visuals and installation steps.

---

## ⚠️ Known Issues

- Some frame styles may not render correctly or are still under development.
- Currently optimized only for local playback with VLC and Tuna.

---

## 🛣 Roadmap / Planned Features

- [ ] Fix broken or incomplete frame templates
- [ ] Add more overlay styles
- [ ] Support additional media sources (Spotify, YouTube Music, Apple Music, etc.)
- [ ] Improved documentation inside the built-in editor (with images and step-by-step instructions)

---

## 🖥 Desktop Configuration Manager (future)

Version 0.5.0 is planned to introduce a cross‑platform desktop application built using [Tauri](https://tauri.app). The app will provide a GUI for managing widget styles, exporting HTML, and optionally serving the widget files via HTTP so OBS can point at a URL instead of a local file.

A migration plan and instructions live in `notes/tauri-migration-plan.md`.

To start working on the app you’ll need the following installed:

1. Rust (via [rustup](https://rustup.rs))
2. `cargo install tauri-cli`
3. (Optional) Node.js/npm if you plan to add build tooling.

Once ready, run `cargo tauri init` in the repo root and follow the guidance in the notes file.

---

## 🧪 Status

This project is a personal experiment and is not yet intended for production use. Expect rough edges and ongoing changes.

