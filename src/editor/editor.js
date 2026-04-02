import { TOOLS, ENTITY_TYPES } from './tools.js';
import { hitDetect } from './hit-detect.js';

/**
 * Editor controller.
 * Listens for pointer events on the canvas, coordinates with
 * hit detection, grid data, mesh builder, history, and bottom sheet.
 */
export class Editor {
  constructor(canvas, camera, grid, editorState, dungeonMeshes, history, bottomSheet) {
    this.canvas = canvas;
    this.camera = camera;
    this.grid = grid;
    this.state = editorState;
    this.meshes = dungeonMeshes;
    this.history = history;
    this.sheet = bottomSheet;

    this._currentHit = null;
    this._pointerDownPos = null;
    this._pointerDownTime = 0;
    this._selectedTile = null; // { x, y } of tile currently shown in sheet

    this._bindEvents();

    // Rebuild meshes on undo/redo
    history.onChange(() => {
      this.meshes.rebuildAll();
      this.sheet.hide();
    });
  }

  _bindEvents() {
    const el = this.canvas;

    el.addEventListener('pointermove', (e) => this._onMove(e));
    el.addEventListener('pointerdown', (e) => this._onDown(e));
    el.addEventListener('pointerup', (e) => this._onUp(e));
    el.addEventListener('pointerleave', () => this.meshes.hideGhost());

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => this._onKey(e));
  }

  _onMove(e) {
    if (this.sheet.isVisible) return; // don't show ghost while sheet is open
    const hit = hitDetect(
      e.clientX, e.clientY,
      this.camera, this.canvas,
      this.grid, this.state.activeTool
    );
    this._currentHit = hit;
    this.meshes.showGhost(hit);
  }

  _onDown(e) {
    this._pointerDownPos = { x: e.clientX, y: e.clientY };
    this._pointerDownTime = Date.now();
  }

  _onUp(e) {
    if (!this._pointerDownPos) return;

    const dx = e.clientX - this._pointerDownPos.x;
    const dy = e.clientY - this._pointerDownPos.y;
    const dt = Date.now() - this._pointerDownTime;
    const dist = Math.hypot(dx, dy);

    this._pointerDownPos = null;

    // Only count as tap if short duration and minimal movement
    if (dt > 300 || dist > 8) return;

    // Re-detect at the up position
    const hit = hitDetect(
      e.clientX, e.clientY,
      this.camera, this.canvas,
      this.grid, this.state.activeTool
    );

    if (hit) {
      this._handleTap(hit);
    }
  }

  _handleTap(hit) {
    const tool = this.state.activeTool;

    if (tool === TOOLS.WALL) {
      this._placeWall(hit);
    } else if (tool === TOOLS.COLUMN) {
      this._placeColumn(hit);
    } else if (tool === TOOLS.FLOOR) {
      this._editTile(hit);
    } else if (tool === TOOLS.DOOR) {
      this._placeDoor(hit);
    } else if (tool === TOOLS.ENTITY) {
      this._editEntity(hit);
    } else if (tool === TOOLS.ERASER) {
      this._erase(hit);
    }
  }

  // --- Wall ---

  _placeWall(hit) {
    if (hit.type !== 'wallH' && hit.type !== 'wallV') return;

    const existing = hit.type === 'wallH'
      ? this.grid.getWallH(hit.x, hit.y)
      : this.grid.getWallV(hit.x, hit.y);

    if (existing) {
      this._removeWallCmd(hit);
    } else {
      this._addWallCmd(hit);
    }
  }

  _addWallCmd(hit) {
    const { grid, meshes } = this;
    const wallData = { type: 'stone_wall', texture: 'stone_wall_01' };
    const isH = hit.type === 'wallH';
    const { x, y } = hit;

    this.history.execute({
      apply() {
        if (isH) grid.setWallH(x, y, wallData);
        else grid.setWallV(x, y, wallData);
        meshes.addWall(hit.type, x, y);
      },
      revert() {
        if (isH) grid.setWallH(x, y, null);
        else grid.setWallV(x, y, null);
        meshes.removeWall(hit.type, x, y);
      },
    });
  }

  _removeWallCmd(hit) {
    const { grid, meshes } = this;
    const isH = hit.type === 'wallH';
    const { x, y } = hit;
    const prevData = isH ? grid.getWallH(x, y) : grid.getWallV(x, y);
    if (!prevData) return;

    const saved = { ...prevData };
    const wasDoor = saved.type === 'door';

    this.history.execute({
      apply() {
        if (isH) grid.setWallH(x, y, null);
        else grid.setWallV(x, y, null);
        if (wasDoor) meshes.removeDoor(hit.type, x, y);
        else meshes.removeWall(hit.type, x, y);
      },
      revert() {
        if (isH) grid.setWallH(x, y, saved);
        else grid.setWallV(x, y, saved);
        if (wasDoor) meshes.addDoor(hit.type, x, y);
        else meshes.addWall(hit.type, x, y);
      },
    });
  }

  // --- Column ---

  _placeColumn(hit) {
    if (hit.type !== 'column') return;

    const existing = this.grid.getColumn(hit.x, hit.y);

    if (existing) {
      this._removeColumnCmd(hit);
    } else {
      this._addColumnCmd(hit);
    }
  }

  _addColumnCmd(hit) {
    const { grid, meshes } = this;
    const colData = { type: 'stone_column', texture: 'stone_column_01' };
    const { x, y } = hit;

    this.history.execute({
      apply() {
        grid.setColumn(x, y, colData);
        meshes.addColumn(x, y);
      },
      revert() {
        grid.setColumn(x, y, null);
        meshes.removeColumn(x, y);
      },
    });
  }

  _removeColumnCmd(hit) {
    const { grid, meshes } = this;
    const { x, y } = hit;
    const prevData = grid.getColumn(x, y);
    if (!prevData) return;

    const saved = { ...prevData };

    this.history.execute({
      apply() {
        grid.setColumn(x, y, null);
        meshes.removeColumn(x, y);
      },
      revert() {
        grid.setColumn(x, y, saved);
        meshes.addColumn(x, y);
      },
    });
  }

  // --- Floor/Ceiling (tile) ---

  _editTile(hit) {
    if (hit.type !== 'tile') return;

    const tile = this.grid.getTile(hit.x, hit.y);
    if (!tile) return;

    this._selectedTile = { x: hit.x, y: hit.y };

    this.sheet.showTile(tile, (changes) => {
      const { x, y } = this._selectedTile;
      const prevTile = JSON.parse(JSON.stringify(this.grid.getTile(x, y)));
      const newFloor = { ...prevTile.floor, type: changes.floorType };
      const newCeiling = { ...prevTile.ceiling, type: changes.ceilingType };

      const { grid, meshes } = this;

      this.history.execute({
        apply() {
          grid.setTile(x, y, { floor: newFloor, ceiling: newCeiling });
          meshes.updateTile(x, y);
        },
        revert() {
          grid.setTile(x, y, { floor: prevTile.floor, ceiling: prevTile.ceiling });
          meshes.updateTile(x, y);
        },
      });
    });
  }

  // --- Door ---

  _placeDoor(hit) {
    if (hit.type !== 'wallH' && hit.type !== 'wallV') return;

    const isH = hit.type === 'wallH';
    const existing = isH ? this.grid.getWallH(hit.x, hit.y) : this.grid.getWallV(hit.x, hit.y);

    if (existing && existing.type === 'door') {
      // Show door properties sheet
      this.sheet.showDoor(existing, (changes) => {
        const { x, y } = hit;
        const prevData = JSON.parse(JSON.stringify(isH ? this.grid.getWallH(x, y) : this.grid.getWallV(x, y)));
        const newData = { ...prevData, ...changes, type: 'door' };
        const { grid, meshes } = this;

        this.history.execute({
          apply() {
            if (isH) grid.setWallH(x, y, newData);
            else grid.setWallV(x, y, newData);
          },
          revert() {
            if (isH) grid.setWallH(x, y, prevData);
            else grid.setWallV(x, y, prevData);
          },
        });
      });
    } else if (existing) {
      // Replace wall with door
      this._replaceWithDoor(hit, existing);
    } else {
      // Place new door
      this._addDoorCmd(hit);
    }
  }

  _addDoorCmd(hit) {
    const { grid, meshes } = this;
    const doorData = { type: 'door', style: 'wood', locked: false, keyId: '' };
    const isH = hit.type === 'wallH';
    const { x, y } = hit;

    this.history.execute({
      apply() {
        if (isH) grid.setWallH(x, y, doorData);
        else grid.setWallV(x, y, doorData);
        meshes.addDoor(hit.type, x, y);
      },
      revert() {
        if (isH) grid.setWallH(x, y, null);
        else grid.setWallV(x, y, null);
        meshes.removeDoor(hit.type, x, y);
      },
    });
  }

  _replaceWithDoor(hit, prevWall) {
    const { grid, meshes } = this;
    const doorData = { type: 'door', style: 'wood', locked: false, keyId: '' };
    const isH = hit.type === 'wallH';
    const { x, y } = hit;
    const saved = { ...prevWall };

    this.history.execute({
      apply() {
        if (isH) grid.setWallH(x, y, doorData);
        else grid.setWallV(x, y, doorData);
        meshes.removeWall(hit.type, x, y);
        meshes.addDoor(hit.type, x, y);
      },
      revert() {
        if (isH) grid.setWallH(x, y, saved);
        else grid.setWallV(x, y, saved);
        meshes.removeDoor(hit.type, x, y);
        meshes.addWall(hit.type, x, y);
      },
    });
  }

  // --- Entity ---

  _editEntity(hit) {
    if (hit.type !== 'tile') return;

    const tile = this.grid.getTile(hit.x, hit.y);
    if (!tile) return;

    this._selectedTile = { x: hit.x, y: hit.y };

    this.sheet.showEntity(tile.entities, (changes) => {
      const { x, y } = this._selectedTile;

      if (changes.action === 'addEntity') {
        const entDef = ENTITY_TYPES.find(e => e.id === changes.entityType);
        const entity = {
          type: entDef?.category || 'item',
          subtype: changes.entityType,
          category: entDef?.category || 'item',
          facing: changes.facing,
        };

        const prevEntities = JSON.parse(JSON.stringify(this.grid.getTile(x, y).entities));
        const { grid, meshes, sheet } = this;

        this.history.execute({
          apply() {
            grid.getTile(x, y).entities.push(entity);
            meshes.updateTile(x, y);
          },
          revert() {
            grid.getTile(x, y).entities = prevEntities;
            meshes.updateTile(x, y);
          },
        });

        // Refresh the sheet to show updated entity list
        const updated = grid.getTile(x, y);
        sheet.showEntity(updated.entities, (c) => this.sheet._onApply?.(c));
      }

      if (changes.action === 'removeEntity') {
        const prevEntities = JSON.parse(JSON.stringify(this.grid.getTile(x, y).entities));
        const { grid, meshes } = this;
        const idx = changes.index;

        this.history.execute({
          apply() {
            grid.getTile(x, y).entities.splice(idx, 1);
            meshes.updateTile(x, y);
          },
          revert() {
            grid.getTile(x, y).entities = prevEntities;
            meshes.updateTile(x, y);
          },
        });
      }
    });
  }

  // --- Eraser ---

  _erase(hit) {
    if (hit.type === 'wallH' || hit.type === 'wallV') {
      const existing = hit.type === 'wallH'
        ? this.grid.getWallH(hit.x, hit.y)
        : this.grid.getWallV(hit.x, hit.y);
      if (existing) this._removeWallCmd(hit);
    } else if (hit.type === 'column') {
      const existing = this.grid.getColumn(hit.x, hit.y);
      if (existing) this._removeColumnCmd(hit);
    } else if (hit.type === 'tile') {
      // Erase tile entities and reset floor
      const tile = this.grid.getTile(hit.x, hit.y);
      if (tile && (tile.entities.length > 0 || tile.floor.type !== 'stone' || tile.ceiling.type !== 'stone')) {
        const { x, y } = hit;
        const prevTile = JSON.parse(JSON.stringify(tile));
        const { grid, meshes } = this;

        this.history.execute({
          apply() {
            grid.setTile(x, y, {
              floor: { type: 'stone', texture: 'stone_floor_01' },
              ceiling: { type: 'stone', texture: 'stone_ceiling_01' },
              entities: [],
            });
            // Force full replace including entities
            grid.getTile(x, y).entities = [];
            meshes.updateTile(x, y);
          },
          revert() {
            grid.setTile(x, y, prevTile);
            grid.getTile(x, y).entities = prevTile.entities;
            meshes.updateTile(x, y);
          },
        });
      }
    }
  }

  // --- Keyboard ---

  _onKey(e) {
    // Ctrl+Z / Cmd+Z = undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.history.undo();
    }
    // Ctrl+Shift+Z / Cmd+Shift+Z = redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this.history.redo();
    }
    // Ctrl+Y = redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.history.redo();
    }

    // Tool shortcuts
    if (e.key === '1') this.state.setTool(TOOLS.WALL);
    if (e.key === '2') this.state.setTool(TOOLS.COLUMN);
    if (e.key === '3') this.state.setTool(TOOLS.FLOOR);
    if (e.key === '4') this.state.setTool(TOOLS.DOOR);
    if (e.key === '5') this.state.setTool(TOOLS.ENTITY);
    if (e.key === '6') this.state.setTool(TOOLS.ERASER);

    // Escape closes sheet
    if (e.key === 'Escape') this.sheet.hide();
  }
}
