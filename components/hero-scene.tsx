'use client';

import { useEffect, useRef } from 'react';

export function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef(-.16);
  useEffect(() => {
    let disposed = false;
    let animationFrame = 0;
    let cleanup = () => {};
    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
    ]).then(([THREE, { GLTFLoader }]) => {
      if (disposed || !mountRef.current) return;
      const mount = mountRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 1.15, 8.8);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      // Preserve the model's authored paint and material colors; avoid warm studio tinting.
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(mount.clientWidth, mount.clientHeight); renderer.setClearColor(0x000000, 0); mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x33404a, 1.8));
      const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(4, 5, 5); scene.add(key);
      const rim = new THREE.PointLight(0xd6e9ff, 3, 12); rim.position.set(-4, 2.5, 3); scene.add(rim);
      const fill = new THREE.PointLight(0xffffff, 2.8, 12); fill.position.set(3, 1.5, 4); scene.add(fill);
      const group = new THREE.Group(); scene.add(group);
      const parkedX = .57;
      const parkedY = .66;
      const positionFor = (x: number, y: number) => {
        const frameHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const frameWidth = frameHeight * camera.aspect;
        return { x: (x - .5) * frameWidth, y: camera.position.y + (.5 - y) * frameHeight };
      };
      const initialPosition = positionFor(parkedX, parkedY);
      const modelGroup = new THREE.Group(); modelGroup.position.set(initialPosition.x, initialPosition.y, 0); modelGroup.rotation.y = -.62; modelGroup.rotation.z = -.035; group.add(modelGroup);
      mount.dataset.modelState = 'loading';
      new GLTFLoader().load('/65_ford_mustang_convertible.glb', (gltf) => {
          const car = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(car);
          const center = bounds.getCenter(new THREE.Vector3());
          const size = bounds.getSize(new THREE.Vector3());
          // Fit against the car's longest axis and the hero's narrower dimension.
          const scale = Math.min(6.55 / Math.max(size.x, size.y, size.z), 6.05 / Math.max(size.x, size.z));
          car.scale.setScalar(scale);
          car.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
          car.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.castShadow = true;
              object.receiveShadow = true;
            }
          });
          modelGroup.add(car);
          // Keep the entire car in the hero frame on common desktop/mobile ratios.
          modelGroup.position.z = 0;
          mount.dataset.modelState = 'loaded';
          mount.setAttribute('aria-label', 'Interactive 1965 Ford Mustang convertible 3D scene');
      }, undefined, (error) => {
        mount.dataset.modelState = 'failed';
        console.error('Mustang convertible model could not be loaded', error);
      });
      const particleGeometry = new THREE.BufferGeometry(); const particleCount = 180; const positions = new Float32Array(particleCount * 3); for (let i = 0; i < particleCount * 3; i += 3) { positions[i] = (Math.random() - .5) * 8; positions[i + 1] = (Math.random() - .5) * 5; positions[i + 2] = (Math.random() - .5) * 4; } particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); scene.add(new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x7d929e, size: .018, transparent: true, opacity: .7 })));
      const pointer = { x: 0, y: 0 }; const onPointer = (event: PointerEvent) => { const bounds = mount.getBoundingClientRect(); pointer.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2)); pointer.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2)); }; const resetPointer = () => { pointer.x = 0; pointer.y = 0; }; mount.addEventListener('pointermove', onPointer); mount.addEventListener('pointerleave', resetPointer);
      const resize = () => { if (!mount.clientWidth || !mount.clientHeight) return; camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); }; window.addEventListener('resize', resize);
      const animate = () => { const target = positionFor(parkedX + pointer.x * .008, parkedY + pointer.y * .008); modelGroup.position.x += (target.x - modelGroup.position.x) * .035; modelGroup.position.y += (target.y - modelGroup.position.y) * .035; modelGroup.rotation.y += (-.62 + pointer.x * .018 - modelGroup.rotation.y) * .035; modelGroup.rotation.z += (tiltRef.current + pointer.x * -.003 - modelGroup.rotation.z) * .035; renderer.render(scene, camera); animationFrame = requestAnimationFrame(animate); }; animate();
      cleanup = () => { cancelAnimationFrame(animationFrame); mount.removeEventListener('pointermove', onPointer); mount.removeEventListener('pointerleave', resetPointer); window.removeEventListener('resize', resize); renderer.dispose(); mount.removeChild(renderer.domElement); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } }); };
    }).catch((error: unknown) => { console.error('Hero 3D scene could not initialize', error); mountRef.current?.setAttribute('aria-label', `Hero 3D scene failed: ${error instanceof Error ? error.message : String(error)}`); });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div className="hero-scene" ref={mountRef} aria-label="Interactive 1965 Ford Mustang convertible 3D scene" role="img" />;
}
