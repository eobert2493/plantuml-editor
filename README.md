## Full Screen PlantUML

A minimal, fast PlantUML editor and previewer with a full‑screen, split layout. Write PlantUML on the left, see an SVG preview on the right. Includes section navigation with `== Section ==` markers and handy export actions.

### Features

- **Full‑screen workspace**: Editor and preview in a clean, distraction‑free layout.
- **Clean editor**: Single editor view with no extra tab switching.
- **Section navigation**: Use PlantUML headers like `== My Section ==` to split large sequence diagrams.
- **Multiple preview modes**: Switch between **Full**, **Sections**, and **Stacked** views.
- **Templates**: Quickly start with common diagram types.
- **One‑key refresh**: Regenerate the diagram without leaving the keyboard.
- **Export & copy**: Copy code, export `.puml`, and download the rendered `.svg`.

### Quick start

Prerequisites: Node.js 18+ and npm

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Usage

- **Write PlantUML** in the editor between `@startuml` and `@enduml`.
- **Sections**: Add headers like `== Login ==`, `== Checkout ==` to split big sequences. The preview provides:
  - **Sections** mode: Navigate one section at a time.
  - **Stacked** mode: See all sections vertically.
- **Actions**:
  - Editor toolbar: Copy, Export `.puml`.
  - Preview toolbar: Refresh, Download `.svg`, toggle view modes.

### Keyboard shortcuts

- **Cmd+J / Ctrl+J**: Refresh diagram
- **Cmd+B / Ctrl+B**: Toggle editor panel visibility

### How rendering works

Diagrams are encoded in the browser using `plantuml-encoder` and rendered through the public PlantUML server as SVG:

`https://www.plantuml.com/plantuml/svg/{encoded}`

Note: Your diagram text is sent to the PlantUML server to render. If you require full privacy or offline rendering, point the code to a self‑hosted PlantUML server.

### Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Production build
- `npm run build:dev`: Development‑mode build
- `npm run preview`: Preview production build
- `npm run lint`: Lint the project

### Tech stack

- Vite, React, TypeScript
- Tailwind CSS, shadcn‑ui (Radix UI)
- CodeMirror 6 with PlantUML syntax highlighting
- `plantuml-encoder` for URL encoding

### Tips

- The app remembers whether the editor panel is visible via `localStorage`.

### License

See the repository license file if present.
