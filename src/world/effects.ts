import * as THREE from 'three';
import type { Body, GroundPoint } from '../systems/movement';
import type { Print } from '../systems/field';

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
  }

  update(clock: number, body: Body, view: {
    flashlight: boolean; marker?: GroundPoint; showPrints: boolean; prints: Print[];
    figure?: GroundPoint; alert: number;
  }) {
    const { x, y, z, facing } = body;
    this.flashlight.visible = view.flashlight;
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

    this.figure.visible = Boolean(view.figure);
    if (view.figure) {
      this.figure.position.set(view.figure.x, Math.sin(clock * 5) * .035, view.figure.z);
      this.figureMaterial.opacity = .65 + view.alert * .28 + Math.sin(clock * 9) * .05;
    }
  }
}
