import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { advanceShaderTime, createGridPulseMaterial, createHologramMaterial } from '@thegridcn/engine';

export default function EnginePreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.6, 7);

    const gridMaterial = createGridPulseMaterial({ cellSize: 0.55 });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(12, 12, 1, 1), gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);

    const hologramMaterial = createHologramMaterial({ color: 0x45f3ff });
    const ship = new THREE.Mesh(new THREE.TorusKnotGeometry(1.05, 0.28, 180, 24), hologramMaterial);
    ship.position.y = 1.35;
    scene.add(ship);

    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(4, 6, 4);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x8edcff, 0.65));

    let frame = 0;
    let last = performance.now();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };

    // Resize on layout changes only, via ResizeObserver — calling
    // getBoundingClientRect() every frame forces a synchronous layout reflow.
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      const delta = Math.min((time - last) / 1000, 0.05);
      last = time;
      ship.rotation.x += delta * 0.22;
      ship.rotation.y += delta * 0.42;
      advanceShaderTime(gridMaterial, delta);
      advanceShaderTime(hologramMaterial, delta);
      renderer.render(scene, camera);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      grid.geometry.dispose();
      ship.geometry.dispose();
      gridMaterial.dispose();
      hologramMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-[2rem]" />;
}
