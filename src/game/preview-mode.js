import * as THREE from 'three';
import { Player } from './player.js';

/**
 * Preview mode — first-person walkthrough of the level.
 * Manages the player, input bindings, touch D-pad, and mode transitions.
 */
export class PreviewMode {
  constructor(grid, scene) {
    this.grid = grid;
    this.scene = scene;
    this.active = false;

    // First-person camera
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
    this.player = new Player(this.camera, grid);

    this._clock = new THREE.Clock(false);
    this._keys = new Set();

    // UI elements
    this.dpadEl = null;
    this.backBtn = null;
    this._onExitCallback = null;

    this._buildUI();
    this._bindKeys();
  }

  /** Enter preview mode. Calls onExit when user clicks back. */
  enter(onExit) {
    this.active = true;
    this._onExitCallback = onExit;
    this._clock.start();

    // Find spawn point
    let spawnX = 0, spawnY = 0, spawnFacing = 'north';
    outer:
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const tile = this.grid.getTile(x, y);
        if (tile?.entities) {
          const spawn = tile.entities.find(e => e.subtype === 'spawn');
          if (spawn) {
            spawnX = x;
            spawnY = y;
            spawnFacing = spawn.facing || 'north';
            break outer;
          }
        }
      }
    }

    this.player.grid = this.grid;
    this.player.spawn(spawnX, spawnY, spawnFacing);

    // Show preview UI
    this.dpadEl.classList.remove('hidden');
    this.backBtn.classList.remove('hidden');
  }

  exit() {
    this.active = false;
    this._clock.stop();
    this._keys.clear();

    // Hide preview UI
    this.dpadEl.classList.add('hidden');
    this.backBtn.classList.add('hidden');
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Call every frame. Returns true if preview is active. */
  update() {
    if (!this.active) return false;

    const dt = this._clock.getDelta();

    // Process held keys
    if (!this.player.isAnimating) {
      if (this._keys.has('w') || this._keys.has('arrowup'))    this.player.input('forward');
      if (this._keys.has('s') || this._keys.has('arrowdown'))  this.player.input('backward');
      if (this._keys.has('a') || this._keys.has('arrowleft'))  this.player.input('strafeLeft');
      if (this._keys.has('d') || this._keys.has('arrowright')) this.player.input('strafeRight');
      if (this._keys.has('q'))                                  this.player.input('turnLeft');
      if (this._keys.has('e'))                                  this.player.input('turnRight');
    }

    this.player.update(dt);
    return true;
  }

  // --- UI ---

  _buildUI() {
    // D-pad for touch
    this.dpadEl = document.createElement('div');
    this.dpadEl.id = 'dpad';
    this.dpadEl.classList.add('hidden');
    this.dpadEl.innerHTML = `
      <button class="dpad-btn dpad-forward" data-action="forward">\u25B2</button>
      <button class="dpad-btn dpad-turn-left" data-action="turnLeft">\u21B6</button>
      <button class="dpad-btn dpad-turn-right" data-action="turnRight">\u21B7</button>
      <button class="dpad-btn dpad-strafe-left" data-action="strafeLeft">\u25C0</button>
      <button class="dpad-btn dpad-strafe-right" data-action="strafeRight">\u25B6</button>
      <button class="dpad-btn dpad-backward" data-action="backward">\u25BC</button>
    `;
    document.getElementById('app').appendChild(this.dpadEl);

    // D-pad button events
    this.dpadEl.querySelectorAll('.dpad-btn').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.player.input(btn.dataset.action);
      });
    });

    // Back button
    this.backBtn = document.createElement('button');
    this.backBtn.id = 'back-to-edit-btn';
    this.backBtn.classList.add('hidden');
    this.backBtn.textContent = '\u2190 Edit';
    this.backBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this._onExitCallback) this._onExitCallback();
    });
    document.getElementById('app').appendChild(this.backBtn);
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this._keys.add(e.key.toLowerCase());

      // Escape exits preview
      if (e.key === 'Escape' && this._onExitCallback) {
        this._onExitCallback();
      }
    });

    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.key.toLowerCase());
    });
  }
}
