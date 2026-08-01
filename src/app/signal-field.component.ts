import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'lf-signal-field',
  standalone: true,
  template: `
    <div class="scene-frame" #sceneFrame>
      <canvas #sceneCanvas aria-hidden="true"></canvas>
      <div class="scene-fallback" [class.scene-fallback--visible]="showFallback">
        <div class="fallback-orbit fallback-orbit--one"></div>
        <div class="fallback-orbit fallback-orbit--two"></div>
        <div class="fallback-core"><span>LF</span></div>
        <p>Signal field / offline view</p>
      </div>
      <div class="scene-caption" aria-hidden="true">
        <span>Field study 01</span>
        <span>Rot. 04° 17′ 22″</span>
      </div>
    </div>
  `,
  styleUrl: './signal-field.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignalFieldComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sceneFrame', { static: true }) private readonly frameRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sceneCanvas', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  showFallback = false;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private root?: THREE.Group;
  private animationFrame = 0;
  private resizeObserver?: ResizeObserver;
  private readonly pointer = new THREE.Vector2(0.15, -0.1);
  private readonly targetPointer = new THREE.Vector2(0.15, -0.1);
  private reducedMotion = false;
  private hidden = false;
  private disposed = false;
  private lastRenderTime = 0;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initializeScene();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.disposeScene();
  }

  private initializeScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('webgl2', { alpha: true }) ?? canvas.getContext('webgl', { alpha: true });

    if (!context) {
      this.enableFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0.12, 7.2);
    this.root = new THREE.Group();
    this.scene.add(this.root);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch {
      this.enableFallback();
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.createField();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.frameRef.nativeElement);
    this.resize();
    this.frameRef.nativeElement.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    this.frameRef.nativeElement.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
    this.renderFrame(0);
    if (!this.reducedMotion) {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  }

  private createField(): void {
    if (!this.scene || !this.root) {
      return;
    }

    const ambient = new THREE.AmbientLight(0x9cb2a8, 1.6);
    this.scene.add(ambient);

    const keyLight = new THREE.PointLight(0xc8f16a, 18, 13, 2);
    keyLight.position.set(-2.4, 2.1, 3.2);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x7fa7ff, 10, 12, 2);
    fillLight.position.set(3.4, -1.4, 1.8);
    this.scene.add(fillLight);

    const coreGeometry = new THREE.IcosahedronGeometry(1.07, 4);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fbf73,
      emissive: 0x405f2c,
      emissiveIntensity: 1.5,
      roughness: 0.46,
      metalness: 0.22,
      transparent: true,
      opacity: 0.92
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.root.add(core);

    const wireGeometry = new THREE.IcosahedronGeometry(1.18, 3);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xd5ee9c,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    wire.rotation.set(0.28, 0.42, 0.08);
    this.root.add(wire);

    const haloGeometry = new THREE.SphereGeometry(1.32, 24, 16);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8e67a,
      transparent: true,
      opacity: 0.055,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.root.add(new THREE.Mesh(haloGeometry, haloMaterial));

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xbfd4d1,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending
    });
    const acidOrbitMaterial = new THREE.LineBasicMaterial({
      color: 0xc8f16a,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const orbitData = [
      { major: 1.92, minor: 1.44, rotation: [0.45, 0.1, -0.24], material: orbitMaterial },
      { major: 2.18, minor: 1.58, rotation: [-0.1, 0.48, 0.72], material: acidOrbitMaterial },
      { major: 2.48, minor: 1.72, rotation: [1.02, -0.32, -0.42], material: orbitMaterial }
    ] as const;

    orbitData.forEach((item, index) => {
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);

      const orbitPoints = new THREE.EllipseCurve(0, 0, item.major, item.minor, 0, Math.PI * 2, false, 0)
        .getPoints(96)
        .map((point) => new THREE.Vector3(point.x, point.y, 0));
      const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPoints), item.material);
      orbitGroup.add(orbit);

      const nodeGeometry = new THREE.SphereGeometry(index === 1 ? 0.075 : 0.05, 10, 8);
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0xc8f16a : 0xd9e9d5,
        transparent: true,
        opacity: index === 1 ? 0.96 : 0.78
      });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const angle = index === 0 ? 1.2 : index === 1 ? -0.42 : 2.56;
      this.positionNodeOnOrbit(node, angle, item.major, item.minor);
      orbitGroup.userData = { node, angle, major: item.major, minor: item.minor, speed: 0.22 + index * 0.06 };
      orbitGroup.add(node);
      this.root?.add(orbitGroup);
    });

    const dust = new THREE.BufferGeometry();
    const dustCount = 420;
    const positions = new Float32Array(dustCount * 3);
    const sizes = new Float32Array(dustCount);
    for (let index = 0; index < dustCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.7 + Math.random() * 4.1;
      positions[index * 3] = Math.cos(angle) * radius * (0.6 + Math.random() * 0.65);
      positions[index * 3 + 1] = (Math.random() - 0.5) * 4.8;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 2.8 - 1.1;
      sizes[index] = Math.random() < 0.07 ? 2.4 : 0.7 + Math.random() * 1.4;
    }
    dust.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dust.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xa5b9b4,
      size: 0.024,
      transparent: true,
      opacity: 0.46,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.scene.add(new THREE.Points(dust, dustMaterial));
  }

  private readonly animate = (time: number): void => {
    if (this.disposed) {
      return;
    }
    if (!this.hidden) {
      this.renderFrame(time);
    }
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private renderFrame(time: number): void {
    if (!this.renderer || !this.scene || !this.camera || !this.root) {
      return;
    }

    const seconds = time * 0.001;
    if (!this.reducedMotion) {
      const frameDelta = this.lastRenderTime > 0 ? Math.min(time - this.lastRenderTime, 50) : 16.67;
      this.lastRenderTime = time;
      this.pointer.lerp(this.targetPointer, 0.035);
      this.root.rotation.y = seconds * 0.075 + this.pointer.x * 0.1;
      this.root.rotation.x = Math.sin(seconds * 0.22) * 0.035 + this.pointer.y * 0.08;
      this.root.rotation.z = Math.cos(seconds * 0.18) * 0.02;
      this.root.children.forEach((child) => {
        const data = child.userData as { node?: THREE.Mesh; angle?: number; major?: number; minor?: number; speed?: number };
        if (data.node && data.angle !== undefined && data.major !== undefined && data.minor !== undefined && data.speed) {
          data.angle += frameDelta * 0.001 * data.speed;
          this.positionNodeOnOrbit(data.node, data.angle, data.major, data.minor);
        }
      });
    }

    this.camera.position.x += (this.pointer.x * 0.34 - this.camera.position.x) * 0.018;
    this.camera.position.y += (-this.pointer.y * 0.22 + 0.12 - this.camera.position.y) * 0.018;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  private positionNodeOnOrbit(node: THREE.Mesh, angle: number, major: number, minor: number): void {
    // Keep the marker in the exact same local plane and parametric ellipse as its line.
    node.position.set(Math.cos(angle) * major, Math.sin(angle) * minor, 0);
  }

  private resize(): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    const { width, height } = this.frameRef.nativeElement.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.reducedMotion) {
      this.renderFrame(0);
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.reducedMotion) {
      return;
    }
    const bounds = this.frameRef.nativeElement.getBoundingClientRect();
    this.targetPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.targetPointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  };

  private readonly handlePointerLeave = (): void => {
    this.targetPointer.set(0.15, -0.1);
  };

  private readonly handleVisibilityChange = (): void => {
    this.hidden = document.hidden;
    if (this.hidden) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    } else if (!this.reducedMotion && !this.disposed) {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  };

  private enableFallback(): void {
    queueMicrotask(() => {
      if (this.disposed) {
        return;
      }
      this.showFallback = true;
      this.changeDetector.markForCheck();
    });
  }

  private disposeScene(): void {
    this.frameRef?.nativeElement.removeEventListener('pointermove', this.handlePointerMove);
    this.frameRef?.nativeElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.scene?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material?.dispose();
      }
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.scene = undefined;
    this.camera = undefined;
    this.root = undefined;
    this.renderer = undefined;
  }
}
