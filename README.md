# PDF Editor MVP (Windows-first)

This repository now contains a **real starter MVP** for a desktop PDF annotation/editor built with:

- **Tauri** desktop shell (Rust backend)
- **Haxe + Coconut** frontend source (`src-haxe/`)
- **Windows-first** packaging configuration (NSIS target)

## Implemented MVP workflow

1. **Open local PDF**
   - Uses native Tauri file dialog to choose local PDF files.
   - Rust backend validates and opens PDF sessions.

2. **View/render pages**
   - Uses `pdfjs-dist` in the frontend bridge to render PDF pages to canvases.

3. **Basic annotations**
   - Supported tools in workflow state:
     - highlight
     - text note
     - rectangle (placeholder)
     - underline (placeholder)
   - Annotation events are stored per session in backend state.

4. **Reorder pages**
   - UI supports selecting/moving pages up/down.
   - Reordered page sequence is persisted in backend session state.

5. **Export as new file**
   - Exports a new PDF file path (copy of source for MVP).
   - Writes sidecar metadata (`*.workflow.json`) containing:
     - page order
     - annotation entries

## Project structure

```text
.
├─ src/                     # Vite entry + bridge + styles + generated JS output
│  ├─ main.ts
│  ├─ tauriBridge.ts
│  ├─ styles/
│  └─ generated/
├─ src-haxe/                # Haxe + Coconut frontend source
│  ├─ Main.hx
│  └─ app/
│     ├─ model/
│     ├─ services/
│     ├─ state/
│     └─ ui/
├─ src-tauri/               # Tauri/Rust backend
│  ├─ src/main.rs
│  ├─ src/pdf_workflow.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ haxe/build.hxml
└─ haxelib.json
```

## Build/run instructions

### Prerequisites (Windows-first)

- Node.js 20+
- Rust toolchain (stable)
- Tauri prerequisites for Windows
- Haxe 4.3+ and haxelib

### Install

```bash
npm install
haxelib install coconut.ui
haxelib install coconut.vdom
```

### Compile Haxe/Coconut frontend

```bash
npm run haxe:build
```

If Haxe is not yet installed, the committed `src/generated/app.js` fallback still provides the full MVP workflow shell so a fresh checkout remains runnable.

### Run web frontend only

```bash
npm run dev
```

### Run desktop app (Tauri)

```bash
npm run tauri:dev
```

### Create Windows installer

```bash
npm run tauri:build
```

## Known MVP limitations

- **True in-PDF annotation embedding is not implemented yet**.
- **True in-PDF page reordering rewrite is not implemented yet**.
- Export currently creates:
  - copied PDF file at chosen output path
  - sidecar JSON with annotation + page-order workflow data
- This is intentional for MVP stability and to keep module boundaries clean for future implementation.

## Next implementation steps

- Translate sidecar workflow data into direct PDF object edits.
- Persist true highlight/text/shape annotations into PDF structures.
- Apply physical page tree reorder during export.
- Add undo/redo and annotation selection/drag handles.
