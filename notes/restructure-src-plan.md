# Restructure Proposal — src/

Purpose
-------
This document proposes a reorganization of the `src/` tree to make overlays portable, simplify discovery and packaging, and enable user-installed extensions. The goal is a predictable, maintainable layout that supports internal development and third‑party distribution.

---------------------------------------------------------------------------------

Proposed top-level layout
-------------------------
src/
├─ core/              ← officially shipped overlays and core UI
├─ extensions/        ← user-installed or store-downloaded overlays
└─ assets/            ← truly global/shared assets (logos, docs)

Notes:
- Overlay-specific assets should live with the overlay (e.g., `core/overlays/<id>/assets/`).
- Keep `src/assets/` reserved for files shared across overlays.

---------------------------------------------------------------------------------

Core structure (example)
------------------------
core/
├─ pages/
│  ├─ editor/         ← editor shell or global editor utilities (not per-overlay)
│  └─ system/         ← index, settings, instructions, store
│
├─ overlays/
│  ├─ <overlay-id>/   ← one folder per overlay; contains runtime + editor
│  │  ├─ overlay/     ← runtime files (overlay HTML, CSS, assets)
│  │  ├─ editor/      ← editor UI for the overlay
│  │  └─ manifest.json
│  └─ ...
│
├─ js/
│  ├─ common.js
│  └─ editor-header-loader.js
│
└─ styles/
   └─ editor-common.css

Design principles:
- One overlay per folder — portable and self-contained.
- Editor and runtime components colocated so packaging is straightforward.
- Core scripts operate against a small, documented overlay API.

---------------------------------------------------------------------------------

Extensions (third‑party) layout
------------------------------
extensions/overlays/<overlay-id>/
├─ manifest.json
├─ overlay/
│  ├─ index.html
│  ├─ style.css
│  └─ assets/
├─ editor/
│  ├─ index.html
│  └─ style.css
└─ assets/

Rationale:
- Mirrors how store downloads or ZIP imports should be structured.
- Loader can treat `core/overlays` and `extensions/overlays` the same after discovery.

---------------------------------------------------------------------------------

Core pages and styles (example)
-------------------------------
core/pages/system/
├─ index.html
├─ settings.html
├─ instructions.html
└─ store.html

core/pages/system/styles/
├─ index.css
├─ settings.css
├─ instructions.css
└─ store.css

---------------------------------------------------------------------------------

Risks and mitigations
---------------------
- Asset duplication: define canonical ownership rules — global vs overlay-local. Add a lint/CI check to detect duplicates.
- Naming collisions: require stable overlay `id` values (kebab-case with a namespace when needed).
- Generated vs source files: decide which files are generated (move them to `dist/` or `generated/`) and keep source artifacts under `core/`.
- Shared JS contracts: document a minimal overlay API (required IDs and data attributes) that core scripts rely on.
- Security: document the trust model for `extensions/` (are they trusted or sandboxed?).

---------------------------------------------------------------------------------

Required decisions
------------------------------
1. Manifest schema — standard keys: `id`, `title`, `version`, `author`, `preview`, `entry`, `editor`, `assets`, `compatibility`.
2. Discovery rules — whether `extensions/` overrides `core/` and how duplicate `id`s are resolved.
3. Asset ownership policy — what stays in `src/assets/` vs overlay `assets/`.
4. Generated output policy — where built files (compiled CSS) live.
5. Overlay API — a concise list of required DOM hooks used by `common.js`.

---------------------------------------------------------------------------------

Operational recommendations
---------------------------
- Use descriptive, stable overlay IDs (e.g., `frame-program-window`) rather than ambiguous short names.
- Add `manifest-example.json` under `core/overlays/template/`.
- Add a short `src/README.md` documenting conventions and developer workflow (local server, packaging).
- Add CI checks for asset duplication and manifest validity.

---------------------------------------------------------------------------------

