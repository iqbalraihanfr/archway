# Archway — Sprint 1.5 Improvement Instructions

## Context
Archway is a node-based pre-coding documentation workspace. Sprint 1 core is done (pipeline, basic node editor, Dexie storage). These are UX improvements based on dogfooding feedback.

Reference the existing codebase structure:
- `src/components/ArchiwayNode.tsx` — custom React Flow node
- `src/components/NodeEditorPanel.tsx` — right-side editor panel
- `src/lib/db.ts` — Dexie IndexedDB schema
- `src/lib/store.ts` — Zustand store

---

## Improvement 1: Multi-Mode Input per Node

### Problem
Currently each node only has a free-text textarea. Users already have existing documents (PDFs, DOCX, images, Mermaid code, SQL schemas) and don't want to rewrite everything from scratch.

### Requirements

Each node editor should support **multiple input modes** depending on node type. The editor panel should have tabs or a segmented control to switch between modes:

#### For ALL node types:
- **Guided Fields** (existing, keep as default) — structured form fields specific to node type
- **Free Text** (existing, keep) — additional notes textarea
- **File Upload** — drag-and-drop zone OR click-to-upload. Accepted formats:
  - PDF (.pdf)
  - Word (.docx)
  - Images (.png, .jpg, .svg)
  - Markdown (.md)
  - Plain text (.txt)
- Display uploaded files as a list with filename, size, and a preview/remove button
- Store files in IndexedDB as base64 or Blob (via Dexie)

#### For DIAGRAM nodes (Flowchart, ERD, DFD, Use Case, Sequence):
All of the above, PLUS:
- **Mermaid Editor** — code editor with syntax highlighting + live preview (this is the primary input for diagram nodes)
- **Image Upload** — for diagrams already created in external tools (Draw.io, Excalidraw, dbdiagram.io exports)
- User can have BOTH Mermaid code AND uploaded images in the same node

#### For ERD node specifically:
All of the above, PLUS:
- **SQL Schema Paste** — a textarea where user can paste SQL CREATE TABLE statements
- Parse the SQL and display it formatted (optional: auto-convert to Mermaid erDiagram syntax)
- Example input:
  ```sql
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

### UI Layout for Node Editor Panel

```
┌─────────────────────────────────┐
│ Node Title                   ✕  │
│ Node Type Badge                  │
├─────────────────────────────────┤
│ Status: [Empty ▼]               │
├─────────────────────────────────┤
│ [Guided] [Mermaid] [Upload] [Text] │  ← tab/segmented control
├─────────────────────────────────┤
│                                 │
│  (Content area changes based    │
│   on selected tab)              │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Attachments (if any):           │
│  📎 erd-export.png (245 KB) [✕] │
│  📎 requirements.pdf (1.2 MB)[✕]│
└─────────────────────────────────┘
```

### Dexie Schema Update

Update `NODE_CONTENTS` to support file attachments:

```typescript
// Update db.ts - add attachments store
db.version(2).stores({
  projects: 'id, name, created_at, updated_at',
  nodes: 'id, project_id, type, status, sort_order',
  nodeContents: 'id, node_id',
  edges: 'id, project_id, source_node_id, target_node_id',
  tasks: 'id, project_id, source_node_id, group_key, is_manual, sort_order',
  attachments: 'id, node_id, filename, mime_type, created_at',
});

// Attachment type
interface Attachment {
  id: string;
  node_id: string;
  filename: string;
  mime_type: string;
  size: number;
  data: Blob; // Dexie supports Blob storage in IndexedDB
  created_at: string;
}
```

### Implementation Notes
- Use `react-dropzone` for the drag-and-drop upload zone
- Max file size: 10MB per file (IndexedDB can handle this)
- For PDF preview: show filename + page count (don't try to render inline)
- For image preview: show thumbnail in the attachments list
- Files are per-node, not per-project
- When exporting project as PDF, include uploaded images inline and note attached files

---

## Improvement 2: Mermaid Editor with Live Preview

### Problem
Diagram nodes need a proper code editor for Mermaid syntax, not just a textarea.

### Requirements
- Use **CodeMirror 6** for the Mermaid syntax editor
  - Install: `@codemirror/basic-setup`, `@codemirror/lang-javascript` (as base, Mermaid doesn't have official CM6 mode)
  - Dark theme to match app aesthetic
- **Split view**: editor on top, rendered preview on bottom (or side-by-side on wider screens)
- **Live preview**: render Mermaid diagram on keystroke (debounced 500ms)
- **Error handling**: if syntax is invalid, show error message in preview area (red text), don't crash
- **Starter templates**: when a diagram node is first opened and empty, pre-fill with a starter Mermaid template:

```typescript
const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision?}
    C -- Yes --> D[Action]
    C -- No --> E[Other Action]
    D --> F[End]
    E --> F`,

  erd: `erDiagram
    USERS ||--|{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : included_in

    USERS {
        string id PK
        string name
        string email
    }`,

  sequence: `sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Action
    Frontend->>Backend: API Request
    Backend->>Database: Query
    Database-->>Backend: Result
    Backend-->>Frontend: Response
    Frontend-->>User: Display`,

  use_case: `graph TD
    subgraph System
        UC1((Use Case 1))
        UC2((Use Case 2))
    end
    Actor1[Actor] --> UC1
    Actor1 --> UC2`,

  dfd: `graph LR
    EE1[External Entity] -->|data flow| P1((Process))
    P1 -->|output| DS1[(Data Store)]
    DS1 -->|read| P2((Process 2))
    P2 -->|result| EE2[External Entity 2]`,
};
```

### Mermaid Rendering
- Install: `mermaid` npm package
- Initialize with dark theme:
```typescript
import mermaid from 'mermaid';
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});
```
- Render using `mermaid.render()` in a useEffect with debounce
- Wrap in try-catch for error handling

---

## Improvement 3: Excalidraw-like Trackpad Navigation

### Problem
The React Flow canvas navigation doesn't feel as smooth as Excalidraw. Need better trackpad/mouse interaction.

### Requirements
Configure React Flow with these settings for Excalidraw-like navigation:

```tsx
<ReactFlow
  // Trackpad / mouse navigation
  panOnScroll={true}           // Two-finger pan (like Excalidraw)
  panOnDrag={true}             // Click-and-drag to pan
  zoomOnScroll={false}         // Disable scroll-to-zoom (conflicts with pan)
  zoomOnPinch={true}           // Pinch-to-zoom on trackpad
  zoomOnDoubleClick={false}    // Disable double-click zoom (accidental triggers)
  
  // Zoom limits
  minZoom={0.1}
  maxZoom={2}
  
  // Smooth animations
  fitViewOptions={{ padding: 0.2, duration: 300 }}
  
  // Selection
  selectionOnDrag={false}      // Don't start selection box on drag
  
  // Controls
  proOptions={{ hideAttribution: true }}
>
  <Background variant="dots" gap={20} size={1} color="#333" />
  <Controls position="bottom-left" />
  <MiniMap 
    position="bottom-right"
    nodeColor="#52B788"
    maskColor="rgba(0,0,0,0.7)"
  />
</ReactFlow>
```

### Additional UX:
- Add a **MiniMap** in the bottom-right corner for orientation (especially when there are 10 nodes)
- Add **Controls** (zoom in/out/fit buttons) in the bottom-left
- Add **Background dots** pattern (like Excalidraw) for spatial awareness while panning
- Keyboard shortcuts:
  - `Cmd/Ctrl + 0` = fit view (show all nodes)
  - `Cmd/Ctrl + +` = zoom in
  - `Cmd/Ctrl + -` = zoom out

---

## Improvement 4: Node Layout Improvement

### Problem
Currently all nodes are in a single horizontal line. With 10 nodes this gets very wide and hard to navigate.

### Requirements
- Arrange default nodes in a more compact layout, for example a zigzag or grid pattern:

```
[Brief] ─── [Requirements] ─── [User Stories]
                                      │
[Use Case] ─── [Flowchart] ───────────┘
      │
[DFD] ─── [ERD] ─── [Sequence]
                          │
[Task Board] ─── [Summary]─┘
```

- Default node positions (approximate):
```typescript
const DEFAULT_NODE_POSITIONS = [
  { type: 'project_brief',  x: 0,    y: 0   },
  { type: 'requirements',   x: 300,  y: 0   },
  { type: 'user_stories',   x: 600,  y: 0   },
  { type: 'use_case',       x: 0,    y: 150 },
  { type: 'flowchart',      x: 300,  y: 150 },
  { type: 'dfd',            x: 0,    y: 300 },
  { type: 'erd',            x: 300,  y: 300 },
  { type: 'sequence',       x: 600,  y: 300 },
  { type: 'task_board',     x: 0,    y: 450 },
  { type: 'summary',        x: 300,  y: 450 },
];
```

- After creating project, call `fitView()` to auto-center the pipeline

---

## Priority Order
1. **Improvement 3** (Trackpad navigation) — quickest win, biggest UX impact
2. **Improvement 4** (Node layout) — quick win, better visual
3. **Improvement 2** (Mermaid editor) — core functionality for diagram nodes
4. **Improvement 1** (Multi-mode input + file upload) — most complex, highest value

---

## Tech Dependencies to Install
```bash
npm install react-dropzone mermaid @codemirror/basic-setup @codemirror/lang-javascript
# or with bun:
bun add react-dropzone mermaid @codemirror/basic-setup @codemirror/lang-javascript
```
