import { FLOOR_TYPES, CEILING_TYPES, DOOR_STYLES, ENTITY_TYPES, FACING_DIRS } from './tools.js';

/**
 * Bottom sheet UI — slides up to show properties of the selected element.
 */
export class BottomSheet {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'bottom-sheet';
    this.el.classList.add('hidden');
    document.getElementById('app').appendChild(this.el);

    this._onApply = null;

    // Dismiss on tap outside (handled via overlay)
    this.overlay = document.createElement('div');
    this.overlay.id = 'sheet-overlay';
    this.overlay.classList.add('hidden');
    this.overlay.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    document.getElementById('app').appendChild(this.overlay);
  }

  /** Show tile properties sheet */
  showTile(tile, onApply) {
    this._onApply = onApply;
    this.el.innerHTML = '';

    const title = this._title('Tile Properties');
    const floorRow = this._selectRow('Floor', 'floor-type', FLOOR_TYPES, tile.floor.type);
    const ceilingRow = this._selectRow('Ceiling', 'ceiling-type', CEILING_TYPES, tile.ceiling.type);

    this.el.append(title, floorRow, ceilingRow);
    this._show();

    // Listen for changes
    this.el.querySelector('#floor-type').addEventListener('change', () => this._applyTile());
    this.el.querySelector('#ceiling-type').addEventListener('change', () => this._applyTile());
  }

  /** Show door properties sheet */
  showDoor(doorData, onApply) {
    this._onApply = onApply;
    this.el.innerHTML = '';

    const title = this._title('Door Properties');
    const styleRow = this._selectRow('Style', 'door-style', DOOR_STYLES, doorData?.style || 'wood');
    const lockedRow = this._checkboxRow('Locked', 'door-locked', doorData?.locked || false);
    const keyRow = this._inputRow('Key ID', 'door-key', doorData?.keyId || '');

    this.el.append(title, styleRow, lockedRow, keyRow);
    this._show();

    this.el.querySelector('#door-style').addEventListener('change', () => this._applyDoor());
    this.el.querySelector('#door-locked').addEventListener('change', () => this._applyDoor());
    this.el.querySelector('#door-key').addEventListener('input', () => this._applyDoor());
  }

  /** Show entity picker sheet */
  showEntity(existingEntities, onApply) {
    this._onApply = onApply;
    this.el.innerHTML = '';

    const title = this._title('Place Entity');
    const typeRow = this._selectRow('Type', 'entity-type', ENTITY_TYPES, ENTITY_TYPES[0].id);
    const facingRow = this._selectRow('Facing', 'entity-facing',
      FACING_DIRS.map(d => ({ id: d, label: d.charAt(0).toUpperCase() + d.slice(1) })), 'north');

    const addBtn = document.createElement('button');
    addBtn.className = 'sheet-btn';
    addBtn.textContent = 'Add Entity';
    addBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this._applyEntity();
    });

    // Show existing entities on this tile
    const listEl = document.createElement('div');
    listEl.className = 'sheet-entity-list';
    if (existingEntities && existingEntities.length > 0) {
      const listTitle = document.createElement('div');
      listTitle.className = 'sheet-label';
      listTitle.textContent = 'On this tile:';
      listEl.appendChild(listTitle);
      existingEntities.forEach((ent, i) => {
        const row = document.createElement('div');
        row.className = 'sheet-entity-row';
        row.innerHTML = `<span>${ent.subtype || ent.type} (${ent.facing || '—'})</span>`;
        const delBtn = document.createElement('button');
        delBtn.className = 'sheet-btn-small';
        delBtn.textContent = '✕';
        delBtn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (this._onApply) this._onApply({ action: 'removeEntity', index: i });
        });
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }

    this.el.append(title, typeRow, facingRow, addBtn, listEl);
    this._show();
  }

  hide() {
    this.el.classList.add('hidden');
    this.overlay.classList.add('hidden');
    this._onApply = null;
  }

  get isVisible() {
    return !this.el.classList.contains('hidden');
  }

  // --- Internal builders ---

  _show() {
    this.el.classList.remove('hidden');
    this.overlay.classList.remove('hidden');
  }

  _title(text) {
    const el = document.createElement('div');
    el.className = 'sheet-title';
    el.textContent = text;
    return el;
  }

  _selectRow(label, id, options, currentValue) {
    const row = document.createElement('div');
    row.className = 'sheet-row';
    row.innerHTML = `<label class="sheet-label" for="${id}">${label}</label>`;
    const select = document.createElement('select');
    select.id = id;
    select.className = 'sheet-select';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.label;
      if (opt.id === currentValue) o.selected = true;
      select.appendChild(o);
    }
    row.appendChild(select);
    return row;
  }

  _checkboxRow(label, id, checked) {
    const row = document.createElement('div');
    row.className = 'sheet-row';
    row.innerHTML = `<label class="sheet-label" for="${id}">${label}</label>
      <input type="checkbox" id="${id}" class="sheet-checkbox" ${checked ? 'checked' : ''}>`;
    return row;
  }

  _inputRow(label, id, value) {
    const row = document.createElement('div');
    row.className = 'sheet-row';
    row.innerHTML = `<label class="sheet-label" for="${id}">${label}</label>
      <input type="text" id="${id}" class="sheet-input" value="${value}" placeholder="none">`;
    return row;
  }

  _applyTile() {
    if (!this._onApply) return;
    const floorType = this.el.querySelector('#floor-type').value;
    const ceilingType = this.el.querySelector('#ceiling-type').value;
    this._onApply({ floorType, ceilingType });
  }

  _applyDoor() {
    if (!this._onApply) return;
    const style = this.el.querySelector('#door-style').value;
    const locked = this.el.querySelector('#door-locked').checked;
    const keyId = this.el.querySelector('#door-key').value;
    this._onApply({ style, locked, keyId });
  }

  _applyEntity() {
    if (!this._onApply) return;
    const type = this.el.querySelector('#entity-type').value;
    const facing = this.el.querySelector('#entity-facing').value;
    this._onApply({ action: 'addEntity', entityType: type, facing });
  }
}
