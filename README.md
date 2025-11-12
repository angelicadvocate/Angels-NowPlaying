# 🎵 Angels-NowPlaying (Work in Progress)
### ⚠️ This project is still in development and not production-ready.
**Current version:** 0.4.2
---

**Angels-NowPlaying-Widget** is a browser-based widget for OBS that displays now playing information from local audio sources using Tuna for OBS. It includes multiple visual templates (overlay frames), all of which update in real time from the same data source.

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

### 1. Download the Widget

1. Download the entire repo as a ZIP or clone it via Git.
2. Place the `Angels-NowPlaying-Widget` directory wherever you want to use it from (e.g., a permanent location on your drive).

---

### 2. Install & Configure Tuna

1. Install the [Tuna](https://github.com/univrsal/tuna/releases) OBS plugin.
2. Inside OBS, configure Tuna to output the following files:
   - `Song.json` (Add this in the "Song Info Outputs" section in Tuna Settings. Song format is {json_compact})
   - `Artwork.png` (Add this from the "Song Cover Path" section in Tuna Settings)
3. These files **must be saved to the root of the `Angels-NowPlaying-Widget` directory**.

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

- Open the `00-TemplateEditor.html` file in a browser by double clicking on the file.
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

## 🧪 Status

This project is a personal experiment and is not yet intended for production use. Expect rough edges and ongoing changes.

