import * as THREE from 'three';
import type { Body, GroundPoint } from '../systems/movement';
import type { Print } from '../systems/field';
import { seaIce } from './expedition-layout';

/** The flashlight beam, the objective marker, the figure and footprints in the snow. */
export class SceneEffects {
  private readonly flashlight = new THREE.SpotLight('#e7e5bc', 19, 12, .33, .75, 1.4);
  private readonly beam: THREE.Mesh;
  private readonly waypoint = new THREE.Group();
  private readonly diamond: THREE.Mesh;
  private readonly figure = new THREE.Group();
  private readonly figureMaterial = new THREE.MeshBasicMaterial({ color: '#152329', transparent: true, opacity: .72 });
  private readonly prints: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  // A pale double of Voss and a dark silhouette for scripted sightings.
  private readonly ghost = new THREE.Group();
  private readonly ghostMaterial = new THREE.MeshBasicMaterial({ color: '#cfe4ea', transparent: true, opacity: 0, depthWrite: false });
  private readonly apparition = new THREE.Group();
  private readonly apparitionMaterial = new THREE.MeshBasicMaterial({ color: '#0d1a1f', transparent: true, opacity: 0, depthWrite: false });
  private readonly breath: THREE.Sprite[] = [];
  private breathTimer = 0;
  private readonly trail: THREE.InstancedMesh;
  private readonly tideWater: THREE.Mesh[] = [];
  private tideLevel = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.flashlight, this.flashlight.target);

    const cone = new THREE.Shape();
    cone.moveTo(0, 0);
    cone.lineTo(5.5, 1.15);
    cone.quadraticCurveTo(6.1, 0, 5.5, -1.15);
    cone.closePath();
    const beamGeometry = new THREE.ShapeGeometry(cone);
    const positions = beamGeometry.getAttribute('position');
    const falloff = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) falloff[i] = 1 - positions.getX(i) / 6;
    beamGeometry.setAttribute('strength', new THREE.BufferAttribute(falloff, 1));
    beamGeometry.rotateX(-Math.PI / 2);
    this.beam = new THREE.Mesh(beamGeometry, new THREE.ShaderMaterial({
      vertexShader: `
        attribute float strength;
        varying float lightStrength;
        void main() {
          lightStrength = strength;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float lightStrength;
        void main() {
          gl_FragColor = vec4(0.77, 0.76, 0.55, max(lightStrength, 0.0) * 0.16);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(this.beam);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.63, 0.69, 28),
      new THREE.MeshBasicMaterial({ color: '#f2b275', transparent: true, opacity: 0.8 }),
    );
    halo.rotation.x = -Math.PI / 2;
    this.diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.19), new THREE.MeshBasicMaterial({ color: '#ffd1a1' }));
    this.waypoint.add(halo, this.diamond);
    scene.add(this.waypoint);

    const coat = new THREE.Mesh(new THREE.CylinderGeometry(.24, .43, 1.34, 6), this.figureMaterial);
    coat.position.y = .82;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), this.figureMaterial);
    head.position.y = 1.66;
    this.figure.add(coat, head);
    scene.add(this.figure);

    // Footprints left in the snow. The figure can follow fresh ones.
    const printGeometry = new THREE.PlaneGeometry(.2, .1);
    printGeometry.rotateX(-Math.PI / 2);
    this.prints = new THREE.InstancedMesh(printGeometry,
      new THREE.MeshBasicMaterial({ color: '#3d5867', transparent: true, opacity: .55, depthWrite: false }), 80);
    this.prints.frustumCulled = false;
    scene.add(this.prints);

    for (const [group, material] of [[this.ghost, this.ghostMaterial], [this.apparition, this.apparitionMaterial]] as const) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.24, .43, 1.34, 6), material);
      body.position.y = .82;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), material);
      skull.position.y = 1.66;
      group.add(body, skull);
      group.visible = false;
      scene.add(group);
    }

    // Breath fog: a few soft sprites recycled in turn.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d')!;
    const glow = context.createRadialGradient(16, 16, 1, 16, 16, 16);
    glow.addColorStop(0, 'rgba(225,238,242,.55)');
    glow.addColorStop(1, 'rgba(225,238,242,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }));
      puff.userData.age = 9;
      this.breath.push(puff);
      scene.add(puff);
    }

    // Footprints laid by a scene event: someone walked here just before you.
    this.trail = new THREE.InstancedMesh(printGeometry.clone(),
      new THREE.MeshBasicMaterial({ color: '#1b2f3a', transparent: true, opacity: .85, depthWrite: false }), 60);
    this.trail.count = 0;
    this.trail.frustumCulled = false;
    scene.add(this.trail);

    // High water floods the sea ice on the coast.
    for (const sheet of seaIce) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(sheet.width + .6, sheet.depth + .6),
        new THREE.MeshBasicMaterial({ color: '#1d4b60', transparent: true, opacity: 0, depthWrite: false }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(sheet.x, .05, sheet.z);
      water.visible = false;
      this.tideWater.push(water);
      scene.add(water);
    }
  }

  /** Lays a fresh line of bootprints between two points (empty clears it). */
  layTrail(points: GroundPoint[]) {
    let count = 0;
    for (let i = 1; i < points.length && count < 60; i++) {
      const from = points[i - 1], to = points[i];
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      const angle = Math.atan2(to.z - from.z, to.x - from.x);
      for (let d = 0; d < length && count < 60; d += .8, count++) {
        const side = count % 2 ? .1 : -.1;
        this.rotation.setFromAxisAngle(this.up, -angle);
        this.position.set(from.x + (to.x - from.x) * d / length + Math.sin(angle) * side, .025,
          from.z + (to.z - from.z) * d / length - Math.cos(angle) * side);
        this.scale.set(1.3, 1, 1.3);
        this.trail.setMatrixAt(count, this.matrix.compose(this.position, this.rotation, this.scale));
      }
    }
    this.trail.count = count;
    this.trail.instanceMatrix.needsUpdate = true;
  }

  /** Breath puffs drift up from Voss in the cold, faster when he runs. */
  breathe(body: Body, dt: number, outdoors: boolean, running: boolean) {
    this.breathTimer -= dt;
    if (outdoors && this.breathTimer <= 0) {
      this.breathTimer = running ? 1.1 : 2.2;
      const puff = this.breath.find(item => item.userData.age > 1.6) ?? this.breath[0];
      puff.userData.age = 0;
      puff.position.set(body.x + body.facing.x * .35, body.y + 1.55, body.z + body.facing.z * .35);
    }
    for (const puff of this.breath) {
      puff.userData.age += dt;
      const age = puff.userData.age;
      (puff.material as THREE.SpriteMaterial).opacity = age < 1.6 ? .5 * (1 - age / 1.6) : 0;
      puff.scale.setScalar(.25 + age * .5);
      puff.position.y += dt * .25;
    }
  }

  update(clock: number, body: Body, view: {
    flashlight: boolean; marker?: GroundPoint; showPrints: boolean; prints: Print[];
    figure?: GroundPoint; alert: number;
    ghost?: GroundPoint & { opacity: number }; apparition?: GroundPoint & { opacity: number }; flicker?: boolean;
    tide?: number;
  }) {
    this.tideLevel += ((view.tide ?? 0) - this.tideLevel) * .04;
    for (const water of this.tideWater) {
      water.visible = view.tide !== undefined && this.tideLevel > .02;
      (water.material as THREE.MeshBasicMaterial).opacity = .78 * this.tideLevel * (.9 + Math.sin(clock * 2 + water.position.x) * .1);
    }
    const { x, y, z, facing } = body;
    this.flashlight.visible = view.flashlight;
    // The beam stutters when something is close, or when a scene event asks for it.
    const stutter = view.flicker || view.alert > .3;
    const level = stutter && Math.sin(clock * 37) + Math.sin(clock * 53) > .9 ? .15 : 1;
    this.flashlight.intensity = 19 * level;
    this.beam.scale.setScalar(level < 1 ? .6 : 1);
    this.flashlight.position.set(x + facing.x * .4, y + 1.05, z + facing.z * .4);
    this.flashlight.target.position.set(x + facing.x * 7, .05, z + facing.z * 7);
    this.beam.visible = view.flashlight;
    this.beam.position.set(x + facing.x * .48, .095, z + facing.z * .48);
    this.beam.rotation.y = Math.atan2(-facing.z, facing.x);

    this.waypoint.visible = Boolean(view.marker);
    if (view.marker) this.waypoint.position.set(view.marker.x, .1, view.marker.z);
    this.diamond.position.y = 1.08 + Math.sin(clock * 2.8) * .16;
    this.diamond.rotation.y = clock * 1.5;

    this.prints.visible = view.showPrints;
    if (view.showPrints) {
      this.prints.count = view.prints.length;
      view.prints.forEach((print, i) => {
        const fade = Math.max(.15, 1 - print.age / 26);
        const side = i % 2 ? .09 : -.09;
        this.rotation.setFromAxisAngle(this.up, -print.angle);
        this.position.set(print.x + Math.sin(print.angle) * side, .03, print.z - Math.cos(print.angle) * side);
        this.scale.set(fade, 1, fade);
        this.prints.setMatrixAt(i, this.matrix.compose(this.position, this.rotation, this.scale));
      });
      this.prints.instanceMatrix.needsUpdate = true;
    }

    for (const [group, material, sighting] of [[this.ghost, this.ghostMaterial, view.ghost], [this.apparition, this.apparitionMaterial, view.apparition]] as const) {
      group.visible = Boolean(sighting && sighting.opacity > .01);
      if (sighting) {
        group.position.set(sighting.x, Math.sin(clock * 3) * .03, sighting.z);
        material.opacity = sighting.opacity;
      }
    }
    this.trail.visible = view.showPrints || this.trail.count > 0;

    this.figure.visible = Boolean(view.figure);
    if (view.figure) {
      this.figure.position.set(view.figure.x, Math.sin(clock * 5) * .035, view.figure.z);
      this.figureMaterial.opacity = .65 + view.alert * .28 + Math.sin(clock * 9) * .05;
    }
  }
}
