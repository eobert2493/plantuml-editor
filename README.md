## Full Screen PlantUML

Design, split, and export PlantUML diagrams faster. This app is a focused, full‑screen PlantUML workspace with a Monaco editor, intelligent sectioning for large sequence diagrams, and one‑click exports (including stacked PDF). It’s built for engineers and architects who want an instant preview, smart navigation, and keyboard‑driven workflow.

### Why use this

- **Move faster with big diagrams**: Split long sequence flows into labeled sections and jump between them or view them all stacked.
- **Stay in flow**: Monaco editor with PlantUML IntelliSense, no line wrapping, rich editor options, and keyboard shortcuts.
- **Share anywhere**: Export single or all sections as SVG/PNG, or export a stacked PDF for docs and reviews.
- **Flexible layout**: Toggle between left/right or top/bottom panes to match your screen or demo style.
- **Local, safe drafts**: Files are auto‑saved in your browser (IndexedDB). Rename inline, duplicate, export, and manage via Command+K.

### Features

- **Monaco editor** with PlantUML completions, bracket guides, and performance‑oriented settings.
- **Section navigation** using `== Section ==` markers; one‑by‑one view and stacked view.
- **Download menu**: current diagram (SVG/PNG), all sections (SVG/PNG), stacked (SVG/PDF).
- **Command+K palette**: search/switch files, create and delete files with confirmation.
- **Inline rename**: double‑click the file name in the preview header.
- **Theme controls**: independent page theme (Light/Dark) and editor theme (Dracula, Monokai, Solarized, GitHub, VS, etc.).
- **Layout toggle**: Left/Right or Top/Bottom split; editor pinned to bottom in vertical mode.

### Quick start

Prerequisites: Node.js 18+ and npm

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Usage

- **Write** PlantUML between `@startuml` and `@enduml`.
- **Split** complex flows with `== My Section ==` and switch views:
  - Sections (one at a time)
  - Stacked (all sections)
  - Full (entire diagram)
- **Export** via the download menu:
  - Current diagram as SVG/PNG
  - All sections as SVG/PNG (zero‑padded file names for sorting)
  - Stacked view as SVG or **PDF**
- **Manage files** with Cmd/Ctrl+K: search, create, delete (with confirm). Files auto‑save.
- **Rename** inline: double‑click the file name in the preview header.
- **Customize** themes in the footer: page theme and editor theme are independent.
- **Switch layout** in the footer: Left/Right or Top/Bottom.

### Keyboard shortcuts

- **Cmd+K / Ctrl+K**: File palette (search, create, delete)
- **Cmd+J / Ctrl+J**: Refresh diagram
- **Cmd+B / Ctrl+B**: Toggle editor panel visibility

### How rendering works

Diagrams are encoded in the browser using `plantuml-encoder` and rendered via the public PlantUML server (`/svg` or `/png`). The stacked PDF export embeds section PNGs using `pdf-lib`.

Note: Diagram text is sent to the PlantUML server to render. For privacy/offline needs, point requests to your own PlantUML server.

### Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Production build
- `npm run build:dev`: Development‑mode build
- `npm run preview`: Preview production build
- `npm run lint`: Lint the project

### Tech stack

- Vite, React, TypeScript, Tailwind CSS, shadcn‑ui (Radix UI)
- Monaco Editor (`@monaco-editor/react`)
- `plantuml-encoder` for URL encoding
- `pdf-lib` for stacked PDF export

### Tips

- Files, layout, and themes persist in `localStorage`/IndexedDB.
- In vertical layout, editor is pinned to the bottom.

### License

See the repository license file if present.
