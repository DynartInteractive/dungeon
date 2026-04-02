import * as THREE from 'three';

const WALL_HEIGHT = 1.0;
const WALL_THICKNESS = 0.12;
const COLUMN_SIZE = 0.25;
const COLUMN_HEIGHT = 1.02;
const DOOR_HEIGHT = 0.9;
const DOOR_THICKNESS = 0.06;
const ENTITY_MARKER_SIZE = 0.15;
const HALF_T = WALL_THICKNESS / 2;

// Shared simple geometries (things that don't need per-instance sizing)
let _columnGeo = null;
let _entityMarkerGeo = null;

function getColumnGeo() {
  if (!_columnGeo) {
    _columnGeo = new THREE.BoxGeometry(COLUMN_SIZE, COLUMN_HEIGHT, COLUMN_SIZE);
    _columnGeo.translate(0, COLUMN_HEIGHT / 2, 0);
  }
  return _columnGeo;
}

function getEntityMarkerGeo() {
  if (!_entityMarkerGeo) {
    _entityMarkerGeo = new THREE.BoxGeometry(ENTITY_MARKER_SIZE, ENTITY_MARKER_SIZE * 2, ENTITY_MARKER_SIZE);
    _entityMarkerGeo.translate(0, ENTITY_MARKER_SIZE, 0);
  }
  return _entityMarkerGeo;
}

// Materials
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x887766,
  roughness: 0.8,
  metalness: 0.1,
});

const columnMaterial = new THREE.MeshStandardMaterial({
  color: 0x998877,
  roughness: 0.7,
  metalness: 0.15,
});

const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x664422,
  roughness: 0.6,
  metalness: 0.05,
});

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a3a4e,
  roughness: 0.9,
  metalness: 0.0,
});

const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2a3a,
  roughness: 0.95,
  metalness: 0.0,
});

const ghostMaterial = new THREE.MeshStandardMaterial({
  color: 0x88aaff,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});

const ghostTileMaterial = new THREE.MeshBasicMaterial({
  color: 0x88aaff,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
});

// Floor type colors for tile overlays in editor
const FLOOR_COLORS = {
  stone: null,
  dirt: 0x8B7355,
  water: 0x3366aa,
  wood: 0x9B7653,
  pit: 0x220000,
  pressure_plate: 0xaaaa44,
};

// Entity marker colors
const ENTITY_COLORS = {
  system: 0x44ff44,
  monster: 0xff4444,
  item: 0xffaa22,
};

/**
 * Manages all placed wall/column/door/floor/ceiling/entity meshes in the scene.
 */
export class DungeonMeshes {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.group = new THREE.Group();
    this.group.name = 'dungeonMeshes';
    this.scene.add(this.group);

    this.meshMap = new Map();

    // Ghost preview mesh
    this.ghost = null;
    this.ghostType = null;

    // Cache for floor/ceiling tile geo (shared, same size)
    this._tileGeo = null;
    this._ghostTileGeo = null;
  }

  _getTileGeo() {
    if (!this._tileGeo) {
      const ts = this.grid.tileSize;
      this._tileGeo = new THREE.PlaneGeometry(ts, ts);
      this._tileGeo.rotateX(-Math.PI / 2);
    }
    return this._tileGeo;
  }

  _getGhostTileGeo() {
    if (!this._ghostTileGeo) {
      const ts = this.grid.tileSize;
      this._ghostTileGeo = new THREE.PlaneGeometry(ts * 0.9, ts * 0.9);
      this._ghostTileGeo.rotateX(-Math.PI / 2);
    }
    return this._ghostTileGeo;
  }

  /** Rebuild all meshes from grid data. */
  rebuildAll() {
    this.clearAll();
    const { grid } = this;

    // Floor & ceiling for every tile
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        this._addFloorCeiling(x, y);
      }
    }

    // Horizontal walls/doors
    for (let y = 0; y <= grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const wall = grid.getWallH(x, y);
        if (wall) {
          if (wall.type === 'door') this._addDoorMesh('wallH', x, y);
          else this._addWallMesh('wallH', x, y);
        }
      }
    }

    // Vertical walls/doors
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x <= grid.width; x++) {
        const wall = grid.getWallV(x, y);
        if (wall) {
          if (wall.type === 'door') this._addDoorMesh('wallV', x, y);
          else this._addWallMesh('wallV', x, y);
        }
      }
    }

    // Columns
    for (let y = 0; y <= grid.height; y++) {
      for (let x = 0; x <= grid.width; x++) {
        if (grid.getColumn(x, y)) this._addColumnMesh(x, y);
      }
    }

    // Tile overlays + entities
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.getTile(x, y);
        if (tile) {
          this._updateTileOverlay(x, y, tile);
          this._updateEntityMarkers(x, y, tile);
        }
      }
    }
  }

  clearAll() {
    for (const [key, mesh] of this.meshMap) {
      this.group.remove(mesh);
      // Dispose per-instance geometries (not shared ones)
      if (mesh.geometry && mesh.geometry !== this._tileGeo &&
          mesh.geometry !== getColumnGeo() && mesh.geometry !== getEntityMarkerGeo()) {
        mesh.geometry.dispose();
      }
    }
    this.meshMap.clear();
  }

  addWall(type, x, y)    { this._addWallMesh(type, x, y); }
  removeWall(type, x, y)  { this._removeMesh(`${type}_${x}_${y}`); }
  addDoor(type, x, y)    { this._addDoorMesh(type, x, y); }
  removeDoor(type, x, y)  { this._removeMesh(`door_${type}_${x}_${y}`); }
  addColumn(x, y)        { this._addColumnMesh(x, y); }
  removeColumn(x, y)      { this._removeMesh(`column_${x}_${y}`); }

  updateTile(x, y) {
    const tile = this.grid.getTile(x, y);
    this._removeMesh(`tileOverlay_${x}_${y}`);
    for (const [key] of this.meshMap) {
      if (key.startsWith(`entity_${x}_${y}_`)) this._removeMesh(key);
    }
    if (tile) {
      this._updateTileOverlay(x, y, tile);
      this._updateEntityMarkers(x, y, tile);
    }
  }

  /** Show ghost preview at the given hit result position. */
  showGhost(hitResult) {
    if (!hitResult) { this.hideGhost(); return; }

    const needsNew = !this.ghost || this.ghostType !== hitResult.type;
    if (needsNew) {
      this.hideGhost();
      const ts = this.grid.tileSize;
      if (hitResult.type === 'wallH') {
        const geo = new THREE.BoxGeometry(ts, WALL_HEIGHT, WALL_THICKNESS);
        geo.translate(0, WALL_HEIGHT / 2, 0);
        this.ghost = new THREE.Mesh(geo, ghostMaterial);
      } else if (hitResult.type === 'wallV') {
        const geo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ts);
        geo.translate(0, WALL_HEIGHT / 2, 0);
        this.ghost = new THREE.Mesh(geo, ghostMaterial);
      } else if (hitResult.type === 'column') {
        this.ghost = new THREE.Mesh(getColumnGeo(), ghostMaterial);
      } else if (hitResult.type === 'tile') {
        this.ghost = new THREE.Mesh(this._getGhostTileGeo(), ghostTileMaterial);
      }
      this.ghostType = hitResult.type;
      if (this.ghost) {
        this.ghost.name = 'ghost';
        this.scene.add(this.ghost);
      }
    }

    if (this.ghost) {
      const yOff = hitResult.type === 'tile' ? 0.01 : 0;
      this.ghost.position.set(hitResult.worldPos.x, yOff, hitResult.worldPos.z);
      this.ghost.visible = true;
    }
  }

  hideGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      if (this.ghost.geometry && this.ghost.geometry !== this._getGhostTileGeo() &&
          this.ghost.geometry !== getColumnGeo()) {
        this.ghost.geometry.dispose();
      }
      this.ghost = null;
      this.ghostType = null;
    }
  }

  // --- Internal ---

  _removeMesh(key) {
    const mesh = this.meshMap.get(key);
    if (mesh) {
      this.group.remove(mesh);
      if (mesh.geometry && mesh.geometry !== this._tileGeo &&
          mesh.geometry !== getColumnGeo() && mesh.geometry !== getEntityMarkerGeo()) {
        mesh.geometry.dispose();
      }
      this.meshMap.delete(key);
    }
  }

  // --- Floor & Ceiling ---

  _addFloorCeiling(x, y) {
    const pos = this.grid.tileToWorld(x, y);
    const geo = this._getTileGeo();

    // Floor
    const floorKey = `floor_${x}_${y}`;
    const floor = new THREE.Mesh(geo, floorMaterial);
    floor.position.set(pos.x, 0, pos.z);
    floor.receiveShadow = true;
    this.group.add(floor);
    this.meshMap.set(floorKey, floor);

    // Ceiling
    const ceilKey = `ceiling_${x}_${y}`;
    const ceil = new THREE.Mesh(geo, ceilingMaterial);
    ceil.position.set(pos.x, WALL_HEIGHT, pos.z);
    ceil.rotation.x = Math.PI; // flip to face down
    this.group.add(ceil);
    this.meshMap.set(ceilKey, ceil);
  }

  // --- Walls with neighbor-aware corners ---

  _addWallMesh(type, x, y) {
    const key = `${type}_${x}_${y}`;
    if (this.meshMap.has(key)) return;

    const ts = this.grid.tileSize;
    const grid = this.grid;

    let sizeX, sizeZ, posX, posZ;

    if (type === 'wallH') {
      // Horizontal wall along X axis at edge row y, column x
      // Base: spans one tile width along X, thin along Z
      const baseLength = ts;
      let extLeft = 0, extRight = 0;

      // Left end at crossing (x, y): extend if perpendicular wall exists there
      if (this._hasPerpendicularAtCrossing(x, y, 'H')) extLeft = HALF_T;
      // Right end at crossing (x+1, y)
      if (this._hasPerpendicularAtCrossing(x + 1, y, 'H')) extRight = HALF_T;

      sizeX = baseLength + extLeft + extRight;
      sizeZ = WALL_THICKNESS;

      const center = grid.wallHToWorld(x, y);
      posX = center.x + (extRight - extLeft) / 2;
      posZ = center.z;
    } else {
      // Vertical wall along Z axis at edge column x, row y
      const baseLength = ts;
      let extTop = 0, extBottom = 0;

      // Top end at crossing (x, y)
      if (this._hasPerpendicularAtCrossing(x, y, 'V')) extTop = HALF_T;
      // Bottom end at crossing (x, y+1)
      if (this._hasPerpendicularAtCrossing(x, y + 1, 'V')) extBottom = HALF_T;

      sizeX = WALL_THICKNESS;
      sizeZ = baseLength + extTop + extBottom;

      const center = grid.wallVToWorld(x, y);
      posX = center.x;
      posZ = center.z + (extBottom - extTop) / 2;
    }

    const geo = new THREE.BoxGeometry(sizeX, WALL_HEIGHT, sizeZ);
    geo.translate(0, WALL_HEIGHT / 2, 0);

    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(posX, 0, posZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.meshMap.set(key, mesh);
  }

  /**
   * Check if a perpendicular wall (or door) exists at a crossing point,
   * which means this wall should extend to form a corner.
   *
   * crossingX, crossingY: the crossing coordinates
   * wallType: 'H' if the wall being built is horizontal, 'V' if vertical
   */
  _hasPerpendicularAtCrossing(cx, cy, wallType) {
    const grid = this.grid;

    if (wallType === 'H') {
      // Horizontal wall: perpendicular means vertical walls at this crossing
      // Vertical wall above: wallV(cx, cy-1) — goes from crossing (cx,cy-1) to (cx,cy)
      // Vertical wall below: wallV(cx, cy) — goes from crossing (cx,cy) to (cx,cy+1)
      const above = (cy > 0) ? grid.getWallV(cx, cy - 1) : null;
      const below = (cy < grid.height) ? grid.getWallV(cx, cy) : null;
      // Also check horizontal neighbors (wall continuing in same direction)
      const left = (cx > 0) ? grid.getWallH(cx - 1, cy) : null;
      const right = (cx < grid.width) ? grid.getWallH(cx, cy) : null;
      // Also check if there's a column
      const col = grid.getColumn(cx, cy);
      return !!(above || below || col);
    } else {
      // Vertical wall: perpendicular means horizontal walls at this crossing
      const left = (cy > 0) ? grid.getWallH(cx - 1, cy) : null;
      const right = (cx < grid.width) ? grid.getWallH(cx, cy) : null;
      // Check horizontal walls at this crossing
      const hLeft = (cx > 0) ? grid.getWallH(cx - 1, cy) : null;
      const hRight = (cx < grid.width) ? grid.getWallH(cx, cy) : null;
      const col = grid.getColumn(cx, cy);
      return !!(hLeft || hRight || col);
    }
  }

  // --- Doors ---

  _addDoorMesh(type, x, y) {
    const key = `door_${type}_${x}_${y}`;
    if (this.meshMap.has(key)) return;

    const ts = this.grid.tileSize;
    const pos = type === 'wallH'
      ? this.grid.wallHToWorld(x, y)
      : this.grid.wallVToWorld(x, y);

    let geo;
    if (type === 'wallH') {
      geo = new THREE.BoxGeometry(ts * 0.6, DOOR_HEIGHT, DOOR_THICKNESS);
    } else {
      geo = new THREE.BoxGeometry(DOOR_THICKNESS, DOOR_HEIGHT, ts * 0.6);
    }
    geo.translate(0, DOOR_HEIGHT / 2, 0);

    const mesh = new THREE.Mesh(geo, doorMaterial);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.meshMap.set(key, mesh);
  }

  // --- Columns ---

  _addColumnMesh(x, y) {
    const key = `column_${x}_${y}`;
    if (this.meshMap.has(key)) return;

    const pos = this.grid.crossingToWorld(x, y);
    const mesh = new THREE.Mesh(getColumnGeo(), columnMaterial);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.meshMap.set(key, mesh);
  }

  // --- Tile overlays (editor visual) ---

  _updateTileOverlay(x, y, tile) {
    const floorType = tile.floor?.type || 'stone';
    const color = FLOOR_COLORS[floorType];
    if (!color) return;

    const key = `tileOverlay_${x}_${y}`;
    const pos = this.grid.tileToWorld(x, y);
    const ts = this.grid.tileSize;
    const geo = new THREE.PlaneGeometry(ts * 0.9, ts * 0.9);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.008, pos.z);
    this.group.add(mesh);
    this.meshMap.set(key, mesh);
  }

  // --- Entity markers ---

  _updateEntityMarkers(x, y, tile) {
    if (!tile.entities || tile.entities.length === 0) return;

    const pos = this.grid.tileToWorld(x, y);

    tile.entities.forEach((ent, i) => {
      const key = `entity_${x}_${y}_${i}`;
      const color = ENTITY_COLORS[ent.category || 'item'] || 0xffffff;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      const mesh = new THREE.Mesh(getEntityMarkerGeo(), mat);

      const offsetX = (i % 3 - 1) * 0.2;
      const offsetZ = (Math.floor(i / 3) - 0.5) * 0.2;
      mesh.position.set(pos.x + offsetX, 0, pos.z + offsetZ);

      if (ent.facing === 'east') mesh.rotation.y = -Math.PI / 2;
      else if (ent.facing === 'south') mesh.rotation.y = Math.PI;
      else if (ent.facing === 'west') mesh.rotation.y = Math.PI / 2;

      mesh.castShadow = true;
      this.group.add(mesh);
      this.meshMap.set(key, mesh);
    });
  }
}
