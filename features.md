# Feature List — Grid-Based Dungeon Crawler

## 1. Core Grid & Movement System
- Tile-based grid movement (forward, backward, strafe left/right)
- 90-degree turn left/right
- Smooth animated transitions between tiles (camera lerp, not instant snap)
- Collision detection against walls, doors, and obstacles
- Fall into pits (grid cells with no floor — drop to level below)
- Pressure plates (triggered by player, monsters, or placed items)
- Teleporters
- Spinners (invisible tiles that silently rotate the party)
- Trapdoors (floor opens beneath you)
- Alcoves / wall niches (interactable wall slots for items/keys)

## 2. Level Architecture
- **Walls** placed on grid **edges** (north/south/east/west side of each tile)
- **Columns** placed on grid **crossings** (corners where 4 tiles meet)
- Floor and ceiling per tile (variable height possible later)
- Doors on grid edges (opening/closing, locked/unlocked, key-based)
- Secret walls (push-through, look for subtle visual cues)
- Grates / portcullises (see-through but blocking)
- Stairs / ladders connecting dungeon levels
- Multi-level dungeon (separate grid maps per floor)
- Decorative elements: torches on walls, debris on floor, chains, moss, cracks

## 3. Rendering (Three.js + PBR)
- First-person camera locked to grid orientation
- PBR materials (albedo, normal, roughness, metalness, AO maps)
- **Point lights** (torches, magic orbs, glowing items)
- **Directional light** (ambient dungeon light, moonlight from grates)
- No spotlight
- Dynamic shadows from point lights (limit shadow-casting lights for performance)
- Light attenuation and flickering effect for torches
- Fog / distance fade (helps performance + atmosphere)
- LOD or draw distance culling (only render visible tiles — frustum + occlusion)
- Texture atlasing to reduce draw calls
- Optional quality settings (shadow resolution, light count, texture quality)
- Particle effects: dust, dripping water, magic sparkles, torch embers

## 4. Two-Character Party System (Moonshades-style)
- Two player characters (left character + right character)
- Each character has:
  - Portrait / avatar (top-left and top-right of HUD)
  - Health bar + mana/stamina bar
  - Equipment slots (weapon, shield/off-hand, armor, helmet, boots, ring, amulet)
  - Inventory grid (per character)
  - Stats (Strength, Dexterity, Vitality, Intelligence, etc.)
  - Level + XP progression
  - Skill trees or skill points
- Characters share the same grid tile (they move as a party)

## 5. Combat System
- Real-time combat (Grimrock-style, not turn-based)
- Each character attacks independently (left thumb = left character attack, right thumb = right character attack)
- Attack cooldown per weapon (swing timer)
- Melee weapons: swords, axes, maces, daggers
- Ranged weapons: bows, crossbows, throwing knives/axes
- Magic spells (rune-based casting like Grimrock, or simpler spell slots)
- Damage types: physical, fire, ice, poison, lightning
- Armor / resistance system
- Critical hits
- Evasion / dodge chance
- Monster front/side/rear facing (flanking bonus if you circle around)
- "Dance" combat — step in, attack, step back to dodge (classic Grimrock tactic)

## 6. Monster / Enemy System
- Grid-based monster movement (monsters occupy tiles)
- Monster AI: patrol, chase, retreat, alert nearby monsters
- Monster types: melee, ranged, magic caster
- Monster stats: HP, attack, defense, speed, resistances
- Monster spawn points (fixed or triggered)
- Boss monsters (larger, multi-phase, special abilities)
- Monster death: loot drop on the tile
- Monster respawn (optional, configurable per area)
- Monster animations (idle, walk, attack, hurt, death) — could be sprite-based or 3D

## 7. Item & Loot System
- Items exist on the ground (placed on grid tiles, can be picked up)
- Drag-and-drop inventory management
- Item types:
  - Weapons (melee, ranged)
  - Armor (head, chest, legs, boots, gloves)
  - Shields
  - Potions (health, mana, antidote, buff potions)
  - Scrolls (single-use spells)
  - Keys (specific doors or universal)
  - Quest items / puzzle items
  - Food/consumables (if hunger system is included)
  - Torches (holdable light source)
  - Ammunition (arrows, bolts)
- Item rarity (common, uncommon, rare, legendary)
- Item stats and modifiers
- Quick-use slots under avatars (health potion, weapon — thumb-accessible)
- Throwing items at walls/switches (Grimrock puzzle mechanic)

## 8. Puzzle System
- Pressure plate combinations (step on in correct order)
- Hidden switches on walls
- Lever/button puzzles
- Item-on-pedestal puzzles (place correct item in alcove)
- Timed puzzles (door opens briefly, run through)
- Riddle stones (text clues)
- Teleporter mazes
- Pit navigation puzzles
- Lock-and-key progression

## 9. HUD & UI (Mobile-First, Moonshades Layout)
- **Top-left**: Left character portrait + HP/MP bars
- **Top-right**: Right character portrait + HP/MP bars
- **Below portraits (sides)**: Quick slots — weapon, potion, skill
- **Weapon slots positioned under left/right thumbs** for comfortable attack tapping
- **Bottom-left**: D-pad / navigation buttons (forward, back, strafe L/R, turn L/R)
- **Bottom-right**: Action button (interact / pick up / open)
- Minimap or automap (toggle)
- Full-screen inventory/character sheet (pause overlay)
- Equipment paper-doll view per character
- Damage numbers floating in 3D space
- Status effect icons on portraits (poisoned, burning, etc.)
- Touch-friendly button sizes (minimum 44px tap targets)
- Settings menu (audio, graphics quality, controls)

## 10. Progression & RPG Systems
- XP from killing monsters and solving puzzles
- Level up: stat points + skill points
- Character classes or classless freeform builds
- Skill trees (e.g., swordsmanship, archery, fire magic, earth magic, alchemy, armor)
- Unlockable abilities per skill branch
- Stat scaling (strength boosts melee damage, int boosts spell power, etc.)

## 11. Save / Load System
- Save to localStorage or IndexedDB
- Manual save at crystals/save points (Grimrock-style) or anytime
- Autosave on level transitions
- Multiple save slots
- Save includes: party state, inventory, map state, monster state, puzzle state, player position

## 12. Audio
- Background music (ambient dungeon tracks, combat music)
- Footstep sounds (stone, water, wood — per tile material)
- Combat sounds (swing, hit, block, spell cast, monster growl)
- UI sounds (inventory open, item pickup, button click)
- Environmental ambience (dripping water, wind, distant rumbles)
- 3D positional audio (sounds from monster/source direction)
- **Library: Howler.js** — lightweight, Web Audio API with HTML5 fallback, spatial audio, audio sprites, CapacitorJS compatible

## 13. Level Editor / Data Format
- Levels defined as JSON data (grid arrays)
- Each tile: floor type, ceiling type, content (monster, item, trigger)
- Each edge: wall type or door
- Each crossing: column type or empty
- Spawn points, trigger zones, event scripting
- Could build a simple web-based visual editor later

## 14. Performance Considerations (Low-End Target)
- Only render geometry for visible tiles (raycasting or portal-based visibility)
- Limit simultaneous shadow-casting point lights (2-3 max)
- Use baked AO where possible
- Texture atlas to minimize draw calls
- Instanced geometry for repeated walls/columns/floors
- Object pooling for particles and damage numbers
- Sprite-based monsters (billboards) instead of full 3D models — huge perf win
- Throttle render loop on mobile (30fps cap option)
- Lazy-load assets per dungeon level

## 15. Mobile / CapacitorJS Specifics
- Touch controls (virtual D-pad, tap-to-attack)
- Screen orientation lock (portrait for Moonshades-style layout)
- Responsive UI scaling
- Haptic feedback on attacks/hits (Capacitor Haptics plugin)
- Offline-capable (all assets bundled)
- App lifecycle handling (pause/resume, save on background)

## Tech Stack
- **Rendering**: Three.js (PBR, point + directional lighting)
- **Bundler**: Webpack
- **Audio**: Howler.js
- **Mobile**: CapacitorJS
- **Data**: JSON level format, localStorage/IndexedDB for saves
