/**
 * Tool definitions and editor state.
 */

export const TOOLS = {
  WALL: 'wall',
  COLUMN: 'column',
  FLOOR: 'floor',
  DOOR: 'door',
  ENTITY: 'entity',
  ERASER: 'eraser',
};

export const FLOOR_TYPES = [
  { id: 'stone', label: 'Stone' },
  { id: 'dirt', label: 'Dirt' },
  { id: 'water', label: 'Water' },
  { id: 'wood', label: 'Wood' },
  { id: 'pit', label: 'Pit' },
  { id: 'pressure_plate', label: 'Pressure Plate' },
];

export const CEILING_TYPES = [
  { id: 'stone', label: 'Stone' },
  { id: 'wood', label: 'Wood' },
  { id: 'none', label: 'Open Sky' },
];

export const DOOR_STYLES = [
  { id: 'wood', label: 'Wood' },
  { id: 'iron', label: 'Iron' },
  { id: 'portcullis', label: 'Portcullis' },
];

export const ENTITY_TYPES = [
  { id: 'spawn', label: 'Spawn Point', category: 'system' },
  { id: 'skeleton', label: 'Skeleton', category: 'monster' },
  { id: 'spider', label: 'Spider', category: 'monster' },
  { id: 'orc', label: 'Orc', category: 'monster' },
  { id: 'health_potion', label: 'Health Potion', category: 'item' },
  { id: 'mana_potion', label: 'Mana Potion', category: 'item' },
  { id: 'sword', label: 'Sword', category: 'item' },
  { id: 'shield', label: 'Shield', category: 'item' },
  { id: 'key', label: 'Key', category: 'item' },
  { id: 'torch', label: 'Torch', category: 'item' },
];

export const FACING_DIRS = ['north', 'east', 'south', 'west'];

export class EditorState {
  constructor() {
    this.activeTool = TOOLS.WALL;
    this._listeners = [];
  }

  setTool(tool) {
    this.activeTool = tool;
    this._notify();
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) fn(this);
  }
}
