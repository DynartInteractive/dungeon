/**
 * Grid data model for the dungeon level.
 *
 * Coordinate system:
 *   - x runs left to right (columns)
 *   - y runs top to bottom (rows)
 *
 * Storage:
 *   tiles[y][x]    — W columns, H rows
 *   wallsH[y][x]   — W columns, H+1 rows  (horizontal edges, north side of tile y)
 *   wallsV[y][x]   — W+1 columns, H rows  (vertical edges, west side of tile x)
 *   columns[y][x]  — W+1 columns, H+1 rows (grid crossings)
 */

const DEFAULT_TILE = () => ({
  floor: { type: 'stone', texture: 'stone_floor_01' },
  ceiling: { type: 'stone', texture: 'stone_ceiling_01' },
  entities: [],
});

export class Grid {
  constructor(width = 8, height = 8) {
    this.width = width;
    this.height = height;
    this.tileSize = 1; // world units per tile

    this.tiles = [];
    this.wallsH = [];
    this.wallsV = [];
    this.columns = [];

    this._init();
  }

  _init() {
    // Tiles: H rows x W columns
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(DEFAULT_TILE());
      }
      this.tiles.push(row);
    }

    // Horizontal walls: H+1 rows x W columns
    this.wallsH = [];
    for (let y = 0; y <= this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(null);
      }
      this.wallsH.push(row);
    }

    // Vertical walls: H rows x W+1 columns
    this.wallsV = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x <= this.width; x++) {
        row.push(null);
      }
      this.wallsV.push(row);
    }

    // Columns: H+1 rows x W+1 columns
    this.columns = [];
    for (let y = 0; y <= this.height; y++) {
      const row = [];
      for (let x = 0; x <= this.width; x++) {
        row.push(null);
      }
      this.columns.push(row);
    }
  }

  // --- Tile accessors ---

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y][x];
  }

  setTile(x, y, data) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.tiles[y][x] = { ...this.tiles[y][x], ...data };
  }

  // --- Horizontal wall accessors (north edge of tile x,y) ---

  getWallH(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y > this.height) return null;
    return this.wallsH[y][x];
  }

  setWallH(x, y, data) {
    if (x < 0 || x >= this.width || y < 0 || y > this.height) return;
    this.wallsH[y][x] = data;
  }

  // --- Vertical wall accessors (west edge of tile x,y) ---

  getWallV(x, y) {
    if (x < 0 || x > this.width || y < 0 || y >= this.height) return null;
    return this.wallsV[y][x];
  }

  setWallV(x, y, data) {
    if (x < 0 || x > this.width || y < 0 || y >= this.height) return;
    this.wallsV[y][x] = data;
  }

  // --- Column accessors (grid crossing at corner x,y) ---

  getColumn(x, y) {
    if (x < 0 || x > this.width || y < 0 || y > this.height) return null;
    return this.columns[y][x];
  }

  setColumn(x, y, data) {
    if (x < 0 || x > this.width || y < 0 || y > this.height) return;
    this.columns[y][x] = data;
  }

  // --- World coordinate helpers ---

  /** Convert grid tile coords to world center position */
  tileToWorld(x, y) {
    return {
      x: (x + 0.5) * this.tileSize,
      z: (y + 0.5) * this.tileSize,
    };
  }

  /** Convert grid crossing coords to world position */
  crossingToWorld(x, y) {
    return {
      x: x * this.tileSize,
      z: y * this.tileSize,
    };
  }

  /** Convert horizontal wall edge coords to world midpoint + orientation */
  wallHToWorld(x, y) {
    return {
      x: (x + 0.5) * this.tileSize,
      z: y * this.tileSize,
      rotation: 0, // aligned with X axis
    };
  }

  /** Convert vertical wall edge coords to world midpoint + orientation */
  wallVToWorld(x, y) {
    return {
      x: x * this.tileSize,
      z: (y + 0.5) * this.tileSize,
      rotation: Math.PI / 2, // aligned with Z axis
    };
  }

  // --- Serialization ---

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      tiles: this.tiles,
      wallsH: this.wallsH,
      wallsV: this.wallsV,
      columns: this.columns,
    };
  }

  static fromJSON(data) {
    const grid = new Grid(data.width, data.height);
    grid.tileSize = data.tileSize || 1;
    grid.tiles = data.tiles;
    grid.wallsH = data.wallsH;
    grid.wallsV = data.wallsV;
    grid.columns = data.columns;
    return grid;
  }
}
