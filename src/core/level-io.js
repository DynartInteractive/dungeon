import { Grid } from './grid.js';

const AUTOSAVE_KEY = 'dungeon_editor_autosave';

/**
 * Save grid to JSON file download.
 */
export function saveToFile(grid) {
  const data = JSON.stringify(grid.toJSON(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'level.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Load grid from a JSON file (shows file picker).
 * Returns a Promise that resolves with the loaded Grid.
 */
export function loadFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const grid = Grid.fromJSON(data);
          resolve(grid);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

/**
 * Autosave grid to localStorage.
 */
export function autosave(grid) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(grid.toJSON()));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Load autosaved grid from localStorage.
 * Returns Grid or null.
 */
export function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return Grid.fromJSON(JSON.parse(raw));
  } catch {
    return null;
  }
}
