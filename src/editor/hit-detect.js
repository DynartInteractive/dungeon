import * as THREE from 'three';
import { TOOLS } from './tools.js';

/**
 * Raycasts from screen position to the ground plane,
 * then snaps to the nearest grid edge or crossing depending on the active tool.
 */

const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersection = new THREE.Vector3();

export function hitDetect(screenX, screenY, camera, canvas, grid, tool) {
  const rect = canvas.getBoundingClientRect();
  _mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
  _mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

  _raycaster.setFromCamera(_mouse, camera);
  const hit = _raycaster.ray.intersectPlane(_groundPlane, _intersection);
  if (!hit) return null;

  const wx = _intersection.x;
  const wz = _intersection.z;
  const ts = grid.tileSize;

  if (tool === TOOLS.WALL || tool === TOOLS.DOOR) {
    return snapToEdge(wx, wz, ts, grid);
  }

  if (tool === TOOLS.COLUMN) {
    return snapToCrossing(wx, wz, ts, grid);
  }

  if (tool === TOOLS.FLOOR || tool === TOOLS.ENTITY) {
    return snapToTile(wx, wz, ts, grid);
  }

  if (tool === TOOLS.ERASER) {
    return snapToNearest(wx, wz, ts, grid);
  }

  return null;
}

/**
 * Snap world position to nearest grid edge.
 * Returns { type: 'wallH'|'wallV', x, y, worldPos: {x, z}, rotation }
 */
function snapToEdge(wx, wz, ts, grid) {
  // Grid coordinates (fractional)
  const gx = wx / ts;
  const gz = wz / ts;

  // Nearest horizontal edge: y is integer, x is tile center
  const hEdgeY = Math.round(gz);
  const hEdgeX = Math.floor(gx);
  const hDistToEdge = Math.abs(gz - hEdgeY);

  // Nearest vertical edge: x is integer, y is tile center
  const vEdgeX = Math.round(gx);
  const vEdgeY = Math.floor(gz);
  const vDistToEdge = Math.abs(gx - vEdgeX);

  // Pick whichever edge type is closer
  let result;
  if (hDistToEdge < vDistToEdge) {
    // Horizontal wall
    if (hEdgeX < 0 || hEdgeX >= grid.width || hEdgeY < 0 || hEdgeY > grid.height) return null;
    const pos = grid.wallHToWorld(hEdgeX, hEdgeY);
    result = { type: 'wallH', x: hEdgeX, y: hEdgeY, worldPos: { x: pos.x, z: pos.z }, rotation: 0 };
  } else {
    // Vertical wall
    if (vEdgeX < 0 || vEdgeX > grid.width || vEdgeY < 0 || vEdgeY >= grid.height) return null;
    const pos = grid.wallVToWorld(vEdgeX, vEdgeY);
    result = { type: 'wallV', x: vEdgeX, y: vEdgeY, worldPos: { x: pos.x, z: pos.z }, rotation: Math.PI / 2 };
  }

  return result;
}

/**
 * Snap world position to nearest grid crossing.
 * Returns { type: 'column', x, y, worldPos: {x, z} }
 */
function snapToCrossing(wx, wz, ts, grid) {
  const cx = Math.round(wx / ts);
  const cz = Math.round(wz / ts);

  if (cx < 0 || cx > grid.width || cz < 0 || cz > grid.height) return null;

  const pos = grid.crossingToWorld(cx, cz);
  return { type: 'column', x: cx, y: cz, worldPos: { x: pos.x, z: pos.z } };
}

/**
 * Snap world position to nearest tile center.
 * Returns { type: 'tile', x, y, worldPos: {x, z} }
 */
function snapToTile(wx, wz, ts, grid) {
  const tx = Math.floor(wx / ts);
  const tz = Math.floor(wz / ts);

  if (tx < 0 || tx >= grid.width || tz < 0 || tz >= grid.height) return null;

  const pos = grid.tileToWorld(tx, tz);
  return { type: 'tile', x: tx, y: tz, worldPos: { x: pos.x, z: pos.z } };
}

/**
 * Snap to nearest element of any type (for eraser).
 * Checks edges, crossings, and tiles — returns whatever is closest.
 */
function snapToNearest(wx, wz, ts, grid) {
  const gx = wx / ts;
  const gz = wz / ts;

  // Distance to nearest edge
  const hEdgeY = Math.round(gz);
  const hDist = Math.abs(gz - hEdgeY);
  const vEdgeX = Math.round(gx);
  const vDist = Math.abs(gx - vEdgeX);
  const edgeDist = Math.min(hDist, vDist);

  // Distance to nearest crossing
  const cx = Math.round(gx);
  const cz = Math.round(gz);
  const crossDist = Math.hypot(gx - cx, gz - cz);

  // Distance to nearest tile center
  const tx = Math.floor(gx) + 0.5;
  const tz = Math.floor(gz) + 0.5;
  const tileDist = Math.hypot(gx - tx, gz - tz);

  // Threshold: prefer edges/crossings when close, otherwise tile
  if (crossDist < 0.2) {
    return snapToCrossing(wx, wz, ts, grid);
  }
  if (edgeDist < 0.25) {
    return snapToEdge(wx, wz, ts, grid);
  }
  return snapToTile(wx, wz, ts, grid);
}
