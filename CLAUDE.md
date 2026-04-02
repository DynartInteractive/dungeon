# CLAUDE.md — Project Context for AI Assistants

## What is this?

A grid-based first-person dungeon crawler editor and game engine for web and mobile. Inspired by Legend of Grimrock (real-time grid combat), Moonshades (two-character mobile UI), and Doom RPG (turn-based tactical depth, resource scarcity, dense level design).

## Tech Stack

- **Three.js** for 3D rendering (PBR materials, point + directional lights, no spotlights)
- **Webpack** for bundling (`webpack.config.cjs` — project uses ES modules with `"type": "module"` in package.json)
- **Howler.js** for audio (installed, not yet wired into gameplay)
- **CapacitorJS** for mobile deployment (planned, not yet set up)
- Vanilla JavaScript — no framework, no TypeScript

## Architecture

```
src/
  core/
    grid.js          — Grid data model (tiles, wallsH, wallsV, columns)
    level-io.js      — Save/load JSON, autosave to localStorage
  renderer/
    scene-builder.js — (planned) higher-level scene management
    dungeon-meshes.js — 3D mesh generation for walls, columns, doors, floors, ceilings, entities
    grid-visual.js   — Editor grid overlay (lines, crossing dots)
    camera.js        — Build-mode camera (orbit, pan, zoom — touch + mouse)
  editor/
    editor.js        — Main editor controller, tool dispatch, history integration
    tools.js         — Tool/type definitions, EditorState
    toolbar.js       — Left-side vertical toolbar UI
    toolbar.css
    hit-detect.js    — Raycast to ground plane, snap to edges/crossings/tiles
    history.js       — Undo/redo command pattern
    bottom-sheet.js  — Slide-up property inspector
    bottom-sheet.css
  game/
    player.js        — Grid-based first-person player controller (movement, collision, animation)
    preview-mode.js  — Preview mode manager (enter/exit, D-pad, keyboard)
    preview.css
  index.js           — App entry, wires everything together
  index.html
  styles.css
```

## Grid Data Model

The grid uses a tile + edge + crossing topology:

- **Tiles** (`tiles[y][x]`): floor type, ceiling type, entity list. W columns, H rows.
- **Horizontal walls** (`wallsH[y][x]`): walls on north edges of tiles. W columns, H+1 rows.
- **Vertical walls** (`wallsV[y][x]`): walls on west edges of tiles. W+1 columns, H rows.
- **Columns** (`columns[y][x]`): placed at grid crossings. W+1 columns, H+1 rows.

Walls on edges, columns on crossings — not just boxes on tiles.

## Key Design Decisions

- **Single 3D viewport** for the editor — no split 2D/3D panels. Bird's-eye view for editing, first-person for preview.
- **Tool determines what's tappable** — active tool activates the right hit zones (edges for walls, crossings for columns, tiles for floor/entities). No accidental wrong placements.
- **Landscape only** — minimum 4:3 (iPad), maximum 21:9 (phones). Portrait not supported.
- **Walls extend at corners** — neighbor-aware geometry: walls grow by half-thickness at ends where perpendicular walls exist, forming clean corner joints.
- **Two-character party** (game, not yet implemented) — Moonshades-style with avatars top-left/right, weapon slots under thumbs.

## Performance Targets

- Low-end mobile hardware
- Limit shadow-casting point lights to 2-3
- Use sprite-based monsters (billboards) when possible
- Instanced geometry for repeated elements
- Frustum culling — only render visible tiles

## Build Commands

- `npm run dev` — dev server with hot reload at localhost:3000 (also accessible via LAN IP for mobile testing)
- `npm run build` — production build to dist/

## Project Documents

- `features.md` — comprehensive game feature list
- `design-principles.md` — design philosophy from Doom RPG analysis
- `editor.md` — editor design, UI layout, build phases
