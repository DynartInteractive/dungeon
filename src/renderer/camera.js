import * as THREE from 'three';

/**
 * Build-mode camera controller.
 *
 * Elevated view looking down at the grid, with:
 *   - One-finger drag / right-click drag → pan
 *   - Pinch / scroll wheel → zoom
 *   - Two-finger rotate / middle-click drag → orbit
 *
 * Uses spherical coordinates around a target point on the ground plane.
 */
export class BuildCamera {
  constructor(canvas, grid) {
    this.canvas = canvas;
    this.grid = grid;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    // Spherical coords around target
    this.target = new THREE.Vector3(
      (grid.width * grid.tileSize) / 2,
      0,
      (grid.height * grid.tileSize) / 2
    );
    this.spherical = new THREE.Spherical(
      Math.max(grid.width, grid.height) * 1.2, // radius (distance)
      Math.PI * 0.25, // phi (tilt from top — 0 = top-down, PI/2 = horizon)
      0               // theta (orbit angle)
    );

    // Limits
    this.minRadius = 2;
    this.maxRadius = 30;
    this.minPhi = 0.1;         // nearly top-down
    this.maxPhi = Math.PI * 0.45; // ~80 degrees, never fully horizontal

    // Interaction state
    this._pointers = new Map();
    this._lastPanPos = null;
    this._lastPinchDist = null;
    this._lastRotateAngle = null;
    this._isPanning = false;
    this._panTimeout = null;

    this._bindEvents();
    this.updateCamera();
  }

  updateCamera() {
    // Clamp spherical
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius, this.minRadius, this.maxRadius);
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi, this.minPhi, this.maxPhi);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // --- Input handling ---

  _bindEvents() {
    const el = this.canvas;

    // Pointer events (unified touch + mouse)
    el.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    el.addEventListener('pointermove', (e) => this._onPointerMove(e));
    el.addEventListener('pointerup', (e) => this._onPointerUp(e));
    el.addEventListener('pointercancel', (e) => this._onPointerUp(e));

    // Wheel for zoom
    el.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    // Prevent context menu on right-click
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _onPointerDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._pointers.size === 1) {
      // Single pointer — could be a tap or start of pan
      this._lastPanPos = { x: e.clientX, y: e.clientY };
      this._isPanning = false;

      // Right-click or middle-click: immediate pan/orbit
      if (e.button === 2) this._isPanning = true;
    }

    if (this._pointers.size === 2) {
      // Two pointers — init pinch + rotate
      const pts = [...this._pointers.values()];
      this._lastPinchDist = this._dist(pts[0], pts[1]);
      this._lastRotateAngle = this._angle(pts[0], pts[1]);
      this._isPanning = false;
    }
  }

  _onPointerMove(e) {
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._pointers.size === 1 && this._lastPanPos) {
      const dx = e.clientX - this._lastPanPos.x;
      const dy = e.clientY - this._lastPanPos.y;

      // Threshold to distinguish tap from drag
      if (!this._isPanning && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        this._isPanning = true;
      }

      if (this._isPanning) {
        if (e.button === 1 || (e.buttons & 4)) {
          // Middle mouse → orbit
          this._orbit(dx, dy);
        } else {
          // Left drag / touch drag → pan
          this._pan(dx, dy);
        }
        this._lastPanPos = { x: e.clientX, y: e.clientY };
      }
    }

    if (this._pointers.size === 2) {
      const pts = [...this._pointers.values()];
      const dist = this._dist(pts[0], pts[1]);
      const angle = this._angle(pts[0], pts[1]);

      // Pinch zoom
      if (this._lastPinchDist !== null) {
        const scale = this._lastPinchDist / dist;
        this.spherical.radius *= scale;
        this.updateCamera();
      }
      this._lastPinchDist = dist;

      // Two-finger rotate
      if (this._lastRotateAngle !== null) {
        const dAngle = angle - this._lastRotateAngle;
        this.spherical.theta -= dAngle;
        this.updateCamera();
      }
      this._lastRotateAngle = angle;
    }
  }

  _onPointerUp(e) {
    this._pointers.delete(e.pointerId);

    if (this._pointers.size < 2) {
      this._lastPinchDist = null;
      this._lastRotateAngle = null;
    }
    if (this._pointers.size === 0) {
      this._lastPanPos = null;
      this._isPanning = false;
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.spherical.radius *= 1 + e.deltaY * zoomSpeed;
    this.updateCamera();
  }

  _pan(dx, dy) {
    // Pan along the ground plane relative to camera orientation
    const panSpeed = 0.003 * this.spherical.radius;

    // Camera right direction projected onto XZ plane
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(right);
    const up = new THREE.Vector3(0, 1, 0);
    right.crossVectors(this.camera.up, right).normalize();

    // Camera forward projected onto XZ
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    this.target.addScaledVector(right, dx * panSpeed);
    this.target.addScaledVector(forward, dy * panSpeed);

    this.updateCamera();
  }

  _orbit(dx, dy) {
    const orbitSpeed = 0.005;
    this.spherical.theta -= dx * orbitSpeed;
    this.spherical.phi += dy * orbitSpeed;
    this.updateCamera();
  }

  /** Was the last pointer interaction a tap (not a drag)? */
  get wasTap() {
    return !this._isPanning;
  }

  // --- Helpers ---

  _dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  _angle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
}
