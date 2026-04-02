# Dungeon — Grid-Based Dungeon Crawler Editor & Engine

A web-based level editor and game engine for grid-based first-person dungeon crawlers, inspired by Legend of Grimrock, Moonshades, and Doom RPG.

Built with Three.js for 3D rendering, designed to run on both desktop and mobile (landscape).

## Features

### Level Editor
- **Single 3D viewport** — edit directly in a bird's-eye 3D view
- **Wall tool** — place walls on grid edges with smart corner detection
- **Column tool** — place square columns on grid crossings
- **Floor tool** — set floor and ceiling types per tile (stone, dirt, water, wood, pit, pressure plate)
- **Door tool** — place doors on edges with properties (style, locked, key ID)
- **Entity tool** — place monsters, items, spawn points with facing direction
- **Eraser tool** — remove any placed element
- **Undo/redo** — full command-pattern history (Ctrl+Z / Ctrl+Shift+Z)
- **Save/Load** — export/import levels as JSON, autosave to localStorage
- **Touch-friendly** — designed for mobile landscape with thumb-reachable controls

### Preview Mode
- First-person walkthrough of your level
- Grid-based movement with smooth animation
- Wall collision detection
- Touch D-pad and keyboard controls (WASD + Q/E for turning)

### Rendering
- PBR materials (ready for textures)
- Point lighting + directional lighting (no spotlights)
- Dynamic shadows
- Full floor and ceiling geometry
- Smart wall corners — walls extend to meet at junctions

## Tech Stack

- **Three.js** — 3D rendering with PBR and shadows
- **Webpack** — module bundling and dev server
- **Howler.js** — audio (integrated, not yet used)
- **CapacitorJS** — mobile deployment target (planned)

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. For mobile testing on the same network, use your machine's local IP.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## Controls

### Editor (Build Mode)
- **Left-drag** — pan camera
- **Scroll wheel** — zoom
- **Middle-drag** — orbit camera
- **Touch**: one-finger drag = pan, pinch = zoom, two-finger rotate = orbit
- **Tap** — place/remove element (depends on active tool)
- **1-6** — tool shortcuts (Wall, Column, Floor, Door, Entity, Eraser)
- **Ctrl+Z** — undo
- **Ctrl+Shift+Z** — redo

### Preview (Play Mode)
- **W/S** or **Up/Down** — forward/backward
- **A/D** or **Left/Right** — strafe
- **Q/E** — turn left/right
- **Escape** — back to editor

## Level Data Format

Levels are stored as JSON with the following structure:

- `tiles[y][x]` — floor type, ceiling type, entities per tile
- `wallsH[y][x]` — horizontal walls on grid edges (H+1 rows, W columns)
- `wallsV[y][x]` — vertical walls on grid edges (H rows, W+1 columns)
- `columns[y][x]` — columns on grid crossings (H+1 rows, W+1 columns)

## Project Docs

- `features.md` — full game feature list
- `design-principles.md` — design philosophy and lessons from Doom RPG
- `editor.md` — editor design plan and build phases

## License

ISC
