/**
 * Undo/redo history using command pattern.
 * Each command is { apply(), revert(), description }.
 */
export class History {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this._listeners = [];
  }

  execute(command) {
    command.apply();
    this.undoStack.push(command);
    this.redoStack.length = 0; // clear redo on new action
    this._notify();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.revert();
    this.redoStack.push(cmd);
    this._notify();
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.apply();
    this.undoStack.push(cmd);
    this._notify();
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) fn(this);
  }
}
