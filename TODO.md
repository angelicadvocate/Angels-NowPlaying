
# TODOs for Angels-NowPlaying

# PRIORITY: Switch to Vite as a bundler to fix the Tauri JS API issue
- [ ] Set up Vite in a new frontend directory (npm create vite@latest, choose Vanilla JS)
- [ ] Move HTML, CSS, JS, and assets into the Vite project (frontend/)
- [ ] Update tauri.conf.json to use Vite's dist output and build/dev commands
- [ ] Install @tauri-apps/api and update JS to use `import { invoke } from '@tauri-apps/api/tauri'`
- [ ] Test in the Tauri app: open DevTools and confirm `window.tauri` is defined and `window.location.href` shows an app URL (not file://)
- [ ] Only proceed with other TODOs once the Tauri API is available in the console

---

## Other To-Do Items

- [ ] Wire up the "Save" button in each editor to call a Tauri backend command that writes the CSS file directly (no manual copy/paste).
- [ ] Add a "Copy Path to OBS" button that copies the absolute path of the selected HTML file to the clipboard for easy OBS setup.
- [ ] Expand the settings page to let users pick and save the location of their Tuna output files (song.json, artwork.png), and persist this in a config file.
- [ ] (Optional) Add onboarding or tooltips for first-time users to make the app even more user-friendly.

NOTE: see /notes/todo_list.md for additional TODO items. Some are completed and some are now out of date due to the pending tauri migration. This file should be reworked soon with completed tasks and tasks that are no longer relevant removed and then consolidated into this single TODO.md file.

---

## Long-term / Stretch Goals

- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Host this as a separate site and embed it in the app (e.g., via iframe) so store updates are independent of app releases.
