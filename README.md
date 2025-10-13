# PlantUML Editor

Design, split, and export PlantUML diagrams faster. This app is a focused, full‑screen PlantUML workspace with a Monaco editor, intelligent sectioning for large sequence diagrams, and one‑click exports (including stacked PDF). It's built for engineers and architects who want an instant preview, smart navigation, and keyboard‑driven workflow.

### Demo
https://plantuml-editor.lovable.app/

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

First, clone the repository:

```bash
git clone https://github.com/eobert2493/plantuml-editor.git
cd plantuml-editor
```

#### Option 1: Docker (Recommended)

Prerequisites: Docker and Docker Compose

```bash
# Start both the editor and PlantUML server
docker-compose up -d
```

The editor will be available at `http://localhost:2730` with a local PlantUML server running at `http://localhost:9090`. The by default points to a custom port of 9090.

#### Option 2: Local development

Prerequisites: Node.js 18+ and npm

```bash
npm install
npm run dev
```

Open `http://localhost:8080`.

To run the PlantUML renderer locally, run the following commands:

```bash
docker pull plantuml/plantuml-server:jetty
docker run -d -p 9090:8080 plantuml/plantuml-server:jetty
```

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

Defaults (you can change these in Settings → Keyboard Shortcuts…):

- **Cmd+K / Ctrl+K**: File palette (search, create, delete)
- **Cmd+J / Ctrl+J**: Refresh diagram
- **Cmd+B / Ctrl+B**: Toggle editor panel
- **Cmd+I**: Toggle Left/Right vs Top/Bottom layout
- **Cmd+Shift+V**: Toggle Vim mode (Monaco Vim)

Notes:
- All keystrokes are configurable. Choose Cmd/Alt/Shift and a key from the dropdowns; changes persist.
- Clearing a binding disables that shortcut.

### How rendering works

Diagrams are encoded in the browser using `plantuml-encoder` and rendered by a PlantUML server (`/svg` or `/png`). The stacked PDF export embeds section PNGs using `pdf-lib`.

When using Docker Compose, a local PlantUML server is automatically included and runs on port 9090. You can also switch to the public PlantUML server (`https://www.plantuml.com/plantuml`) in the footer Settings → Renderer if preferred.

### Scripts

#### NPM Scripts
- `npm run dev`: Start Vite dev server
- `npm run build`: Production build
- `npm run build:dev`: Development‑mode build
- `npm run preview`: Preview production build
- `npm run lint`: Lint the project

#### Docker Commands
- `docker-compose up -d`: Start the editor and PlantUML server in background
- `docker-compose down`: Stop and remove containers
- `docker-compose logs -f`: View logs
- `docker-compose restart`: Restart services

### Tech stack

- Vite, React, TypeScript, Tailwind CSS, shadcn‑ui (Radix UI)
- Monaco Editor (`@monaco-editor/react`)
- `plantuml-encoder` for URL encoding
- `pdf-lib` for stacked PDF export

### Tips

- Files, layout, and themes persist in `localStorage`/IndexedDB.
- Footer has quick controls: theme, editor show/hide, layout switch, server status, Settings (keyboard shortcuts, renderer selection, toggle footer hints).
- In vertical (Top/Bottom) layout, the editor is pinned to the bottom; the “Show/Hide Editor” button hides or reveals it.

### Vim mode

- Vim keybindings are provided via `monaco-vim`. Enable/disable from Settings or the configured shortcut (default: Cmd+Shift+V). A “VIM” indicator appears in the editor header when enabled.

### License

This project is licensed under the MIT License