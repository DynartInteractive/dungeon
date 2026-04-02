import * as THREE from 'three';

/**
 * Grid-based first-person player controller.
 *
 * The player occupies a single tile and faces one of 4 cardinal directions.
 * Movement is animated (smooth lerp between tiles).
 * Collision checks walls on grid edges before allowing movement.
 */

const MOVE_DURATION = 0.25;  // seconds per tile move
const TURN_DURATION = 0.15;  // seconds per 90-degree turn
const EYE_HEIGHT = 0.5;      // camera Y position

// Direction vectors in grid coords: [dx, dz]
const DIR_VECTORS = {
  north: [0, -1],
  east:  [1,  0],
  south: [0,  1],
  west:  [-1, 0],
};

const DIR_ANGLES = {
  north: 0,
  east:  -Math.PI / 2,
  south: Math.PI,
  west:  Math.PI / 2,
};

const TURN_ORDER = ['north', 'east', 'south', 'west'];

export class Player {
  constructor(camera, grid) {
    this.camera = camera;
    this.grid = grid;

    // Grid position
    this.tileX = 0;
    this.tileY = 0;
    this.facing = 'north'; // north, east, south, west

    // Animation state
    this._moving = false;
    this._turning = false;
    this._animStart = null;
    this._animDuration = 0;
    this._startPos = new THREE.Vector3();
    this._endPos = new THREE.Vector3();
    this._startAngle = 0;
    this._endAngle = 0;

    // Input queue (allows buffering one move during animation)
    this._inputQueue = [];
  }

  /** Place player at a tile facing a direction. */
  spawn(x, y, facing = 'north') {
    this.tileX = x;
    this.tileY = y;
    this.facing = facing;
    this._moving = false;
    this._turning = false;
    this._inputQueue = [];

    const pos = this._worldPos(x, y);
    this.camera.position.set(pos.x, EYE_HEIGHT, pos.z);
    this.camera.rotation.set(0, DIR_ANGLES[facing], 0);
  }

  /** Queue a movement action: 'forward', 'backward', 'strafeLeft', 'strafeRight', 'turnLeft', 'turnRight' */
  input(action) {
    if (this._moving || this._turning) {
      // Buffer one input
      if (this._inputQueue.length < 1) {
        this._inputQueue.push(action);
      }
      return;
    }
    this._executeAction(action);
  }

  /** Call every frame with delta time. Returns true if animating. */
  update(dt) {
    if (!this._moving && !this._turning) {
      // Process queued input
      if (this._inputQueue.length > 0) {
        this._executeAction(this._inputQueue.shift());
      }
      return false;
    }

    this._animStart += dt;
    let t = Math.min(this._animStart / this._animDuration, 1);
    // Smooth step
    t = t * t * (3 - 2 * t);

    if (this._moving) {
      this.camera.position.lerpVectors(this._startPos, this._endPos, t);
      this.camera.position.y = EYE_HEIGHT;
    }

    if (this._turning) {
      const angle = this._startAngle + (this._endAngle - this._startAngle) * t;
      this.camera.rotation.set(0, angle, 0);
    }

    if (t >= 1) {
      this._moving = false;
      this._turning = false;
    }

    return true;
  }

  get isAnimating() {
    return this._moving || this._turning;
  }

  // --- Internal ---

  _executeAction(action) {
    switch (action) {
      case 'forward':    this._tryMove(0); break;   // move in facing direction
      case 'backward':   this._tryMove(2); break;   // move opposite to facing
      case 'strafeLeft': this._tryMove(3); break;   // move 90 degrees left of facing
      case 'strafeRight':this._tryMove(1); break;   // move 90 degrees right of facing
      case 'turnLeft':   this._turn(-1); break;
      case 'turnRight':  this._turn(1); break;
    }
  }

  /**
   * Try to move in a direction relative to facing.
   * dirOffset: 0 = forward, 1 = right, 2 = backward, 3 = left
   */
  _tryMove(dirOffset) {
    const facingIdx = TURN_ORDER.indexOf(this.facing);
    const moveDir = TURN_ORDER[(facingIdx + dirOffset) % 4];
    const [dx, dz] = DIR_VECTORS[moveDir];
    const newX = this.tileX + dx;
    const newY = this.tileY + dz;

    // Bounds check
    if (newX < 0 || newX >= this.grid.width || newY < 0 || newY >= this.grid.height) return;

    // Wall collision check
    if (this._isBlocked(this.tileX, this.tileY, moveDir)) return;

    // Start move animation
    this._startPos.copy(this.camera.position);
    this._endPos.copy(this._worldPos(newX, newY));
    this._endPos.y = EYE_HEIGHT;
    this._animStart = 0;
    this._animDuration = MOVE_DURATION;
    this._moving = true;

    this.tileX = newX;
    this.tileY = newY;
  }

  _turn(direction) {
    const facingIdx = TURN_ORDER.indexOf(this.facing);
    const newIdx = (facingIdx + direction + 4) % 4;
    const newFacing = TURN_ORDER[newIdx];

    this._startAngle = this.camera.rotation.y;
    this._endAngle = DIR_ANGLES[newFacing];

    // Handle wrap-around (e.g., north→west should go +90, not -270)
    let diff = this._endAngle - this._startAngle;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    this._endAngle = this._startAngle + diff;

    this._animStart = 0;
    this._animDuration = TURN_DURATION;
    this._turning = true;

    this.facing = newFacing;
  }

  /**
   * Check if movement from (x, y) in the given direction is blocked by a wall.
   */
  _isBlocked(x, y, direction) {
    let wall;
    switch (direction) {
      case 'north': wall = this.grid.getWallH(x, y); break;       // north edge of current tile
      case 'south': wall = this.grid.getWallH(x, y + 1); break;   // south edge = north edge of tile below
      case 'west':  wall = this.grid.getWallV(x, y); break;       // west edge of current tile
      case 'east':  wall = this.grid.getWallV(x + 1, y); break;   // east edge = west edge of tile to right
    }
    // Doors are passable (for now — later we add locked door logic)
    if (wall && wall.type === 'door') return false;
    return wall !== null;
  }

  _worldPos(tx, ty) {
    const pos = this.grid.tileToWorld(tx, ty);
    return new THREE.Vector3(pos.x, EYE_HEIGHT, pos.z);
  }
}
