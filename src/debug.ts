// Development-only overlay. Press ` (backquote) to show collision boxes (red),
// hotspots (green when available, grey when locked), heaters (orange) and thin ice (blue).
import * as THREE from 'three';
import type { Save } from './systems/save';
import { walkAreas } from './world/layout';
import { heaters, iceSheets, isFieldArea } from './world/expedition-layout';
import { available, hotspots } from './world/story';

const colors = { solid: '#ff5a4f', open: '#5fe08a', locked: '#7d8b91', heat: '#ffaa4f', ice: '#58b8ff' };

function ring(radius: number, color: string) {
  const points = Array.from({ length: 33 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, .08, Math.sin(angle) * radius);
  });
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, depthTest: false }));
}

function rect(x: number, z: number, width: number, depth: number, color: string) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, .1, depth)),
    new THREE.LineBasicMaterial({ color, depthTest: false }),
  );
  line.position.set(x, .06, z);
  return line;
}

export function installDebugOverlay(scene: THREE.Scene, state: Save) {
  const group = new THREE.Group();
  group.renderOrder = 999;
  group.visible = false;
  scene.add(group);
  let drawn = '';

  const draw = () => {
    const key = `${state.level}:${state.progress.length}:${state.evidence.length}:${state.ending ?? ''}`;
    if (key === drawn) return;
    drawn = key;
    group.clear();
    const walk = walkAreas[state.level];
    group.add(rect((walk.minX + walk.maxX) / 2, (walk.minZ + walk.maxZ) / 2, walk.maxX - walk.minX, walk.maxZ - walk.minZ, colors.locked));
    for (const { x, z, width, depth } of walk.obstacles) group.add(rect(x, z, width, depth, colors.solid));
    for (const spot of hotspots) {
      if (spot.area !== state.level) continue;
      const marker = ring(spot.radius, available(state, spot) ? colors.open : colors.locked);
      marker.position.set(spot.x, 0, spot.z);
      group.add(marker);
    }
    if (isFieldArea(state.level)) {
      for (const point of heaters[state.level]) {
        const marker = ring(2.6, colors.heat);
        marker.position.set(point.x, 0, point.z);
        group.add(marker);
      }
      for (const sheet of iceSheets[state.level]) group.add(rect(sheet.x, sheet.z, sheet.width, sheet.depth, colors.ice));
    }
  };

  window.addEventListener('keydown', event => {
    if (event.code === 'Backquote') group.visible = !group.visible;
  });
  const loop = () => { if (group.visible) draw(); requestAnimationFrame(loop); };
  loop();
  return group;
}
