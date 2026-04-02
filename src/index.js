import * as THREE from 'three';
import './styles.css';
import './editor/toolbar.css';
import './editor/bottom-sheet.css';
import './game/preview.css';
import { Grid } from './core/grid.js';
import { saveToFile, loadFromFile, autosave, loadAutosave } from './core/level-io.js';
import { GridVisual } from './renderer/grid-visual.js';
import { BuildCamera } from './renderer/camera.js';
import { DungeonMeshes } from './renderer/dungeon-meshes.js';
import { EditorState } from './editor/tools.js';
import { Toolbar } from './editor/toolbar.js';
import { History } from './editor/history.js';
import { BottomSheet } from './editor/bottom-sheet.js';
import { Editor } from './editor/editor.js';
import { PreviewMode } from './game/preview-mode.js';

class App {
  constructor() {
    this.canvas = document.getElementById('viewport');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111122);

    // Mode: 'edit' or 'preview'
    this.mode = 'edit';

    // Try loading autosave, fall back to fresh grid
    this.grid = loadAutosave() || new Grid(10, 10);

    // Camera
    this.buildCamera = new BuildCamera(this.canvas, this.grid);

    // Visuals
    this.gridVisual = new GridVisual(this.scene, this.grid);
    this.dungeonMeshes = new DungeonMeshes(this.scene, this.grid);
    this.dungeonMeshes.rebuildAll();

    // Editor
    this.editorState = new EditorState();
    this.history = new History();
    this.bottomSheet = new BottomSheet();
    this.toolbar = new Toolbar(this.editorState);
    this.editor = new Editor(
      this.canvas,
      this.buildCamera.camera,
      this.grid,
      this.editorState,
      this.dungeonMeshes,
      this.history,
      this.bottomSheet
    );

    // Preview mode
    this.preview = new PreviewMode(this.grid, this.scene);

    // UI buttons
    this._buildUndoBtn();
    this._buildTopRightButtons();

    // Autosave on every change
    this.history.onChange(() => autosave(this.grid));

    // Lighting
    this._setupLights();

    // Resize handling
    this._onResize();
    window.addEventListener('resize', () => this._onResize());

    // Force landscape hint
    this._checkOrientation();
    window.addEventListener('orientationchange', () => this._checkOrientation());
    screen.orientation?.addEventListener('change', () => this._checkOrientation());

    // Start render loop
    this._animate();
  }

  enterPreview() {
    this.mode = 'preview';
    this.bottomSheet.hide();
    this.meshes_hideGhost();

    // Hide editor UI
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('undo-btn').classList.add('hidden');
    document.getElementById('top-right-btns').classList.add('hidden');

    // Hide grid overlay in preview
    this.gridVisual.group.visible = false;

    this.preview.grid = this.grid;
    this.preview.enter(() => this.enterEdit());
  }

  enterEdit() {
    this.mode = 'edit';
    this.preview.exit();

    // Show editor UI
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('undo-btn').classList.remove('hidden');
    document.getElementById('top-right-btns').classList.remove('hidden');

    // Show grid overlay
    this.gridVisual.group.visible = true;
  }

  meshes_hideGhost() {
    this.dungeonMeshes.hideGhost();
  }

  _buildUndoBtn() {
    const btn = document.createElement('button');
    btn.id = 'undo-btn';
    btn.textContent = '\u21A9';
    btn.disabled = true;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.history.undo();
    });
    document.getElementById('app').appendChild(btn);

    this.history.onChange(() => {
      btn.disabled = !this.history.canUndo;
    });
  }

  _buildTopRightButtons() {
    const container = document.createElement('div');
    container.id = 'top-right-btns';

    // Play/Preview button
    const playBtn = document.createElement('button');
    playBtn.className = 'action-btn';
    playBtn.textContent = '\u25B6';
    playBtn.title = 'Preview Level';
    playBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.enterPreview();
    });

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn';
    saveBtn.textContent = '\uD83D\uDCBE';
    saveBtn.title = 'Save Level';
    saveBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      saveToFile(this.grid);
    });

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'action-btn';
    loadBtn.textContent = '\uD83D\uDCC2';
    loadBtn.title = 'Load Level';
    loadBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      loadFromFile().then((grid) => {
        this._loadGrid(grid);
      }).catch(() => {});
    });

    container.append(playBtn, saveBtn, loadBtn);
    document.getElementById('app').appendChild(container);
  }

  _loadGrid(newGrid) {
    this.grid = newGrid;

    // Rebuild visuals
    this.gridVisual.dispose();
    this.gridVisual = new GridVisual(this.scene, this.grid);

    this.dungeonMeshes.grid = this.grid;
    this.dungeonMeshes.rebuildAll();

    // Update editor references
    this.editor.grid = this.grid;
    this.buildCamera.grid = this.grid;

    // Reset history
    this.history.undoStack.length = 0;
    this.history.redoStack.length = 0;

    autosave(this.grid);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffeedd, 1.0);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 30;
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    dir.shadow.bias = -0.002;
    dir.shadow.normalBias = 0.05;
    this.scene.add(dir);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.buildCamera.resize(w, h);
    this.preview.resize(w, h);
  }

  _checkOrientation() {
    if (window.innerHeight > window.innerWidth) {
      console.warn('Portrait detected \u2014 landscape recommended');
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    if (this.mode === 'preview') {
      this.preview.update();
      this.renderer.render(this.scene, this.preview.camera);
    } else {
      this.renderer.render(this.scene, this.buildCamera.camera);
    }
  }
}

// Boot
const app = new App();
window.__app = app;
