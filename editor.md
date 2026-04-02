# Level Editor — Design & Plan

## Constraints
- Single 3D viewport (no split panels)
- Mobile landscape + desktop
- Minimum aspect ratio: 4:3 (iPad landscape)
- Maximum aspect ratio: 21:9 (modern phones landscape)
- Portrait not supported
- Public-facing, user-friendly

## Camera

### Build Mode (default)
- Elevated top-down-ish view, ~60-70 degrees from horizontal
- Tabletop diorama perspective — see walls, columns, floor plan clearly
- Pinch to zoom, one-finger drag to pan, two-finger rotate to orbit
- Can tilt from top-down to more angled, never fully first-person

### Preview Mode
- Tap "play" button → camera drops to first-person at spawn point
- Walk around the level with grid-based movement
- "Back to edit" button flies camera back up
- No editing in this mode

## Touch Interaction

### Tool determines what's tappable
- **Wall tool active** → only grid edges respond, nearest edge highlights with ghost preview
- **Column tool active** → only grid crossings respond, nearest crossing highlights
- **Floor tool active** → only tile centers respond, nearest tile highlights
- System snaps to correct grid element — forgiving on mobile

### Touch Conflict Resolution
- **Short tap** (< 200ms, minimal movement) = place/select
- **Long press + drag** = camera pan
- **Pinch** = zoom (always)
- **Two-finger rotate** = orbit (always)

## UI Layout (Landscape)

```
┌──────────────────────────────────────────────────┐
│ [undo] [floor:B1]              [save] [▶ play]   │
│                                                   │
│                                                   │
│                3D Viewport                        │
│               (full screen)                       │
│                                                   │
│                                                   │
│    ┌──────────────────────────────────┐           │
│    │ bottom sheet (properties)        │           │
│    └──────────────────────────────────┘           │
│ [🧱 wall][🏛 col][⬜ floor][🚪 door][👾 ent][💡 light][🗑 erase] │
└──────────────────────────────────────────────────┘
```

- **Toolbar at bottom** — thumb-reachable, icon-based
- **Bottom sheet** — slides up on tap to show properties of selected element
- **Floating buttons** — undo (top-left), floor/level selector (top-left), save + preview (top-right)
- On desktop: same layout, toolbar stays at bottom

## Properties Bottom Sheet (Universal Inspector)

Tap any element → bottom sheet slides up with context-specific properties:

### Tile properties:
- Floor texture: thumbnail picker dropdown
- Ceiling texture: thumbnail picker dropdown
- Height: normal / tall / low
- Special: none / pit / pressure plate / teleporter / spinner

### Wall properties:
- Wall type: stone / brick / moss / etc. (thumbnail picker)
- Secret: yes/no

### Door properties:
- Door style: wood / iron / portcullis
- Locked: yes/no
- Key required: key ID selector

### Entity properties:
- Entity type: monster / item / NPC / spawn point
- Sub-type picker (skeleton, potion, etc.)
- Facing direction

## Visual Feedback
- Ghost preview: semi-transparent object follows finger, snaps to valid position
- Highlight: grid edges/crossings/tiles glow when targeted
- Haptic feedback on placement (mobile)
- Color coding: walls, doors, triggers visually distinct in build mode

## Data Model

```
Grid: W tiles wide, H tiles tall

tiles[y][x] = {
  floor: { type: "stone", texture: "stone_floor_01" },
  ceiling: { type: "stone", texture: "stone_ceiling_01" },
  entities: [{ type: "monster", subtype: "skeleton", facing: "north" }, ...]
}

wallsH[y][x] — horizontal walls (W columns, H+1 rows)
  → north edge of tile (x, y)
  → { type: "stone_wall", texture: "stone_wall_01", secret: false } | null

wallsV[y][x] — vertical walls (W+1 columns, H rows)
  → west edge of tile (x, y)
  → { type: "stone_wall", texture: "stone_wall_01", secret: false } | null

columns[y][x] — crossings (W+1 columns, H+1 rows)
  → { type: "stone_column", texture: "stone_column_01" } | null
```

## Build Phases

### Phase 1 — Viewport + Grid
- Webpack + Three.js project setup
- Grid data model (core/grid.js)
- 3D ground plane with grid lines
- Build-mode camera with pan/zoom/orbit (touch + mouse)
- Visual grid overlay showing edges and crossings

### Phase 2 — Wall & Column Placement
- Bottom toolbar (wall tool, column tool, eraser)
- Invisible hit meshes for edges and crossings
- Ghost preview + snap + tap to place
- Generate 3D wall/column geometry from grid data
- Undo/redo

### Phase 3 — Floors, Doors, Entities
- Floor/ceiling tool with bottom sheet properties
- Door tool (wall variant with properties)
- Entity placement (monster picker, item picker)
- Texture/type thumbnail pickers
- Save/load JSON

### Phase 4 — Preview Mode
- Play button → first-person camera at spawn
- Grid-based WASD/touch navigation
- Collision against walls
- Back-to-edit button
- This IS the game movement system

### Phase 5 — Polish
- PBR materials + textures
- Point lights (placeable in editor, visible in preview)
- Multi-level support
- Copy/paste tile regions
- Level browser (save/load multiple levels)
