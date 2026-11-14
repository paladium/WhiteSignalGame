import * as THREE from 'three';
import type { GroundPoint } from './movement';
import type { Area } from '../world/expedition-layout';

const exteriorCenter = { x: 4.8, z: 0.7 };
const roomCenter = { x: 0, z: 0 };
const cameraOffset = 35;
const cameraElevation = 35;

export class FollowCamera {
  readonly camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 180);
  private readonly focus = new THREE.Vector3();
  private aspect = 1;

  resize(width: number, height: number) {
    this.aspect = width / Math.max(1, height);
  }

  update(player: GroundPoint, dt: number, area: Area, snap = false) {
    const portrait = this.aspect < 0.85;
    const inside = area === 'inside';
    const expanded = area !== 'inside' && area !== 'outside';
    const halfHeight = inside ? (portrait ? 9.4 : 8.7) : (portrait ? 11 : expanded ? 11 : 12);
    const halfWidth = halfHeight * this.aspect;
    const center = inside ? roomCenter : exteriorCenter;

    // Keep the room framed on desktop. On narrow screens, keep the player in view.
    const outdoors = area === 'outside' || area === 'ridge' || area === 'crevasse' || area === 'coast';
    const distanceFromYard = Math.hypot(player.x - exteriorCenter.x, player.z - exteriorCenter.z);
    const follow = expanded ? 1 : outdoors
      ? Math.max(portrait ? .89 : .38, Math.min(1, (distanceFromYard - 7) / 13))
      : portrait ? .84 : .10;
    const blend = snap ? 1 : 1 - Math.exp(-3.8 * dt);
    this.focus.x = THREE.MathUtils.lerp(this.focus.x, THREE.MathUtils.lerp(center.x, player.x, follow), blend);
    this.focus.z = THREE.MathUtils.lerp(this.focus.z, THREE.MathUtils.lerp(center.z, player.z, follow), blend);
    this.focus.y = inside ? 0.8 : 1.4;

    const camera = this.camera;
    if (camera.top !== halfHeight || camera.right !== halfWidth) {
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    }
    camera.position.set(this.focus.x + cameraOffset, this.focus.y + cameraElevation, this.focus.z + cameraOffset);
    camera.lookAt(this.focus);
  }
}
