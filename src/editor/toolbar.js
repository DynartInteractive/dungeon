import { TOOLS } from './tools.js';

/**
 * Left-side vertical toolbar UI.
 * Creates HTML elements, wires up to EditorState.
 */
export class Toolbar {
  constructor(editorState) {
    this.editorState = editorState;
    this.el = null;
    this.buttons = {};
    this._build();

    editorState.onChange(() => this._updateSelection());
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'toolbar';

    const tools = [
      { id: TOOLS.WALL, icon: '\u25AC', label: 'Wall' },
      { id: TOOLS.COLUMN, icon: '\u25AA', label: 'Column' },
      { id: TOOLS.FLOOR, icon: '\u2B1C', label: 'Floor' },
      { id: TOOLS.DOOR, icon: '\uD83D\uDEAA', label: 'Door' },
      { id: TOOLS.ENTITY, icon: '\uD83D\uDC7E', label: 'Entity' },
      { id: TOOLS.ERASER, icon: '\u2715', label: 'Eraser' },
    ];

    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.dataset.tool = tool.id;
      btn.innerHTML = `<span class="toolbar-icon">${tool.icon}</span><span class="toolbar-label">${tool.label}</span>`;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.editorState.setTool(tool.id);
      });
      this.el.appendChild(btn);
      this.buttons[tool.id] = btn;
    }

    document.getElementById('app').appendChild(this.el);
    this._updateSelection();
  }

  _updateSelection() {
    for (const [id, btn] of Object.entries(this.buttons)) {
      btn.classList.toggle('active', id === this.editorState.activeTool);
    }
  }
}
