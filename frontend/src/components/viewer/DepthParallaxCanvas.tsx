import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface DepthParallaxCanvasProps {
  imageUrl: string;
  depthRaw16Url: string;
  strength: number;
  viewRange: number;
  fitMode: "contain" | "cover";
}

const vertexShader = `
  uniform sampler2D depthMap;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float depth = texture2D(depthMap, uv).r;
    vec3 displaced = position;
    displaced.z += (depth - 0.5) * strength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D colorMap;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(colorMap, vUv);
  }
`;

export function DepthParallaxCanvas({
  imageUrl,
  depthRaw16Url,
  strength,
  viewRange,
  fitMode,
}: DepthParallaxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<{ colorMap: { value: THREE.Texture | null }; depthMap: { value: THREE.Texture | null }; strength: { value: number } } | null>(null);
  const texturesRef = useRef<{ color: THREE.Texture; depth: THREE.Texture } | null>(null);
  const viewRangeRef = useRef(viewRange / 100);
  const fitModeRef = useRef(fitMode);
  const resizeRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    viewRangeRef.current = viewRange / 100;
  }, [viewRange]);

  useEffect(() => {
    fitModeRef.current = fitMode;
    resizeRef.current?.();
  }, [fitMode]);

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.strength.value = strength / 100;
    }
  }, [strength]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const target = new THREE.Vector2();
    let isDragging = false;
    let dragStart = new THREE.Vector2();
    let dragOrigin = new THREE.Vector2();

    const loadViewer = async () => {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin("anonymous");
        const [color, depth] = await Promise.all([
          textureLoader.loadAsync(imageUrl),
          textureLoader.loadAsync(depthRaw16Url),
        ]);

        if (cancelled) {
          color.dispose();
          depth.dispose();
          return;
        }

        color.colorSpace = THREE.SRGBColorSpace;
        [color, depth].forEach((texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
        });

        const uniforms = {
          colorMap: { value: color },
          depthMap: { value: depth },
          // Match depth_parallax_viewer.html: slider values map directly to 0–1.
          strength: { value: strength / 100 },
        };
        uniformsRef.current = uniforms;
        texturesRef.current = { color, depth };

        const aspect = color.image.width / color.image.height;
        // Match the standalone viewer's overscan. It keeps depth-stretched
        // pixels beyond the viewport as the camera moves.
        const planeHeight = 3.2 * 1.35;
        geometry = new THREE.PlaneGeometry(planeHeight * aspect, planeHeight, 256, 256);
        material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
        const imageMesh = new THREE.Mesh(geometry, material);
        imageMesh.scale.set(1, 1, 1);
        scene.add(imageMesh);

        const resize = () => {
          if (!renderer) return;
          const { width, height } = container.getBoundingClientRect();
          camera.aspect = width / Math.max(height, 1);
          if (fitModeRef.current === "cover") {
            // The Fill Screen view intentionally uses the exact fixed camera
            // setup from depth_parallax_viewer.html.
            camera.position.z = 5;
          } else {
            const halfFovRadians = THREE.MathUtils.degToRad(camera.fov / 2);
            const verticalDistance = planeHeight / (2 * Math.tan(halfFovRadians));
            const horizontalDistance = (planeHeight * aspect) / (2 * Math.tan(halfFovRadians) * camera.aspect);
            camera.position.z = Math.max(verticalDistance, horizontalDistance) * 1.03;
          }
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        resizeRef.current = resize;

        const updateTargetFromPointer = (clientX: number, clientY: number, drag = false) => {
          const rect = renderer!.domElement.getBoundingClientRect();
          const range = viewRangeRef.current;
          if (drag) {
            const dx = (clientX - dragStart.x) / rect.width;
            const dy = (clientY - dragStart.y) / rect.height;
            target.set(
              THREE.MathUtils.clamp(dragOrigin.x + dx * range * 2, -range, range),
              THREE.MathUtils.clamp(dragOrigin.y - dy * range * 2, -range, range),
            );
            return;
          }
          target.set(
            ((clientX - rect.left) / rect.width * 2 - 1) * range * 0.35,
            -((clientY - rect.top) / rect.height * 2 - 1) * range * 0.35,
          );
        };

        const onMouseDown = (event: MouseEvent) => {
          isDragging = true;
          dragStart = new THREE.Vector2(event.clientX, event.clientY);
          dragOrigin = target.clone();
        };
        const onMouseMove = (event: MouseEvent) => updateTargetFromPointer(event.clientX, event.clientY, isDragging);
        const onMouseUp = () => { isDragging = false; };
        const onTouchStart = (event: TouchEvent) => {
          const touch = event.touches[0];
          if (!touch) return;
          isDragging = true;
          dragStart = new THREE.Vector2(touch.clientX, touch.clientY);
          dragOrigin = target.clone();
        };
        const onTouchMove = (event: TouchEvent) => {
          const touch = event.touches[0];
          if (touch) updateTargetFromPointer(touch.clientX, touch.clientY, isDragging);
        };

        renderer.domElement.addEventListener("mousedown", onMouseDown);
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
        renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchend", onMouseUp);
        window.addEventListener("resize", resize);
        document.addEventListener("fullscreenchange", resize);
        resize();

        const animate = () => {
          animationFrame = requestAnimationFrame(animate);
          camera.position.x += (target.x - camera.position.x) * 0.08;
          camera.position.y += (target.y - camera.position.y) * 0.08;
          camera.lookAt(0, 0, 0);
          renderer!.render(scene, camera);
        };
        animate();

        return () => {
          renderer?.domElement.removeEventListener("mousedown", onMouseDown);
          renderer?.domElement.removeEventListener("mousemove", onMouseMove);
          renderer?.domElement.removeEventListener("touchstart", onTouchStart);
          renderer?.domElement.removeEventListener("touchmove", onTouchMove);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("touchend", onMouseUp);
          window.removeEventListener("resize", resize);
          document.removeEventListener("fullscreenchange", resize);
          resizeRef.current = null;
        };
      } catch {
        if (!cancelled) setError("Unable to load the 3D assets. Check that image URLs allow cross-origin access.");
      }
      return undefined;
    };

    let removeListeners: (() => void) | undefined;
    void loadViewer().then((cleanup) => { removeListeners = cleanup; });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      removeListeners?.();
      geometry?.dispose();
      material?.dispose();
      texturesRef.current?.color.dispose();
      texturesRef.current?.depth.dispose();
      texturesRef.current = null;
      uniformsRef.current = null;
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [imageUrl, depthRaw16Url]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0b0d]">
      <div ref={containerRef} className="h-full w-full" />
      {error && <p className="absolute inset-x-6 bottom-6 rounded-xl bg-red-950/80 p-4 text-center text-sm text-red-100">{error}</p>}
    </div>
  );
}
