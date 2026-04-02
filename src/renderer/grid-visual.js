import * as THREE from 'three';

/**
 * Creates the visual grid overlay in the 3D scene.
 * Shows tile edges as lines and crossing points as small markers.
 */
export class GridVisual {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.group = new THREE.Group();
    this.group.name = 'gridVisual';
    this.scene.add(this.group);

    this.rebuild();
  }

  rebuild() {
    // Clear previous
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }

    this._buildGroundPlane();
    this._buildGridLines();
    this._buildCrossings();
  }

  _buildGroundPlane() {
    const { width, height, tileSize } = this.grid;
    const geo = new THREE.PlaneGeometry(width * tileSize, height * tileSize);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
      metalness: 0.0,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(
      (width * tileSize) / 2,
      0,
      (height * tileSize) / 2
    );
    plane.receiveShadow = true;
    plane.name = 'groundPlane';
    this.group.add(plane);
  }

  _buildGridLines() {
    const { width, height, tileSize } = this.grid;
    const lineColor = 0x4a4a6a;
    const edgeColor = 0x6a6a9a;

    // Edge lines (tile borders) — thin subtle lines
    const edgeMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.4 });
    const edgePoints = [];

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      edgePoints.push(new THREE.Vector3(0, 0.005, y * tileSize));
      edgePoints.push(new THREE.Vector3(width * tileSize, 0.005, y * tileSize));
    }
    // Vertical lines
    for (let x = 0; x <= width; x++) {
      edgePoints.push(new THREE.Vector3(x * tileSize, 0.005, 0));
      edgePoints.push(new THREE.Vector3(x * tileSize, 0.005, height * tileSize));
    }

    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLines.name = 'gridLines';
    this.group.add(edgeLines);

    // Border outline — slightly brighter
    const borderMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 });
    const borderPoints = [
      new THREE.Vector3(0, 0.006, 0),
      new THREE.Vector3(width * tileSize, 0.006, 0),
      new THREE.Vector3(width * tileSize, 0.006, height * tileSize),
      new THREE.Vector3(0, 0.006, height * tileSize),
      new THREE.Vector3(0, 0.006, 0),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderLine = new THREE.Line(borderGeo, borderMat);
    borderLine.name = 'gridBorder';
    this.group.add(borderLine);
  }

  _buildCrossings() {
    const { width, height, tileSize } = this.grid;
    const dotSize = tileSize * 0.04;

    // Instanced small boxes at each crossing
    const geo = new THREE.BoxGeometry(dotSize, 0.01, dotSize);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8888bb, transparent: true, opacity: 0.5 });
    const mesh = new THREE.InstancedMesh(geo, mat, (width + 1) * (height + 1));
    mesh.name = 'crossings';

    const dummy = new THREE.Object3D();
    let i = 0;
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        dummy.position.set(x * tileSize, 0.007, y * tileSize);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }

    this.group.add(mesh);
  }

  dispose() {
    this.group.traverse((child) => {
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}
