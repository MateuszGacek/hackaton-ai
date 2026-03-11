"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BufferGeometry, ShaderMaterial } from "three";
import * as THREE from "three";

type ScenePalette = {
  primary: string;
  accent: string;
  accentStrong: string;
  surface: string;
  surfaceBase: string;
};

type RenderProfile = {
  glyphCount: number;
  minDpr: number;
  maxDpr: number;
  initialDpr: number;
};

type OrbitInteractionState = {
  isDragging: boolean;
  lastX: number;
  lastY: number;
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
};

const ORBIT_LIMITS = {
  yaw: 1.24,
  pitch: 0.72,
};

const DEFAULT_PALETTE: ScenePalette = {
  primary: "#2cb3a9",
  accent: "#ff8c50",
  accentStrong: "#26d0bf",
  surface: "#0b141f",
  surfaceBase: "#070c12",
};

function cssColor(token: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value || fallback;
}

function readScenePalette(): ScenePalette {
  return {
    primary: cssColor("--primary", DEFAULT_PALETTE.primary),
    accent: cssColor("--accent", DEFAULT_PALETTE.accent),
    accentStrong: cssColor("--primary-strong", DEFAULT_PALETTE.accentStrong),
    surface: cssColor("--bg-900", DEFAULT_PALETTE.surface),
    surfaceBase: cssColor("--bg-950", DEFAULT_PALETTE.surfaceBase),
  };
}

function useScenePalette() {
  const [palette, setPalette] = useState<ScenePalette>(DEFAULT_PALETTE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setPalette(readScenePalette());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return palette;
}

function webglAvailable() {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
  );
}

function useAnimationGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setEnabled(false);
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(webglAvailable() && !motionQuery.matches);

    update();

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", update);
      return () => motionQuery.removeEventListener("change", update);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (motionQuery as any).addListener(update);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (motionQuery as any).removeListener(update);
  }, []);

  return enabled;
}

function detectRenderProfile(): RenderProfile {
  if (typeof window === "undefined") {
    return {
      glyphCount: 4200,
      minDpr: 0.95,
      maxDpr: 1.5,
      initialDpr: 1.05,
    };
  }

  const cores = navigator.hardwareConcurrency ?? 6;
  const memory = (
    navigator as Navigator & { deviceMemory?: number }
  ).deviceMemory ?? 8;
  const isLow = cores <= 4 || memory <= 4;
  const isMedium = !isLow && (cores <= 8 || memory <= 8);

  if (isLow) {
    return { glyphCount: 3200, minDpr: 0.8, maxDpr: 1.2, initialDpr: 0.9 };
  }

  if (isMedium) {
    return { glyphCount: 5200, minDpr: 0.9, maxDpr: 1.5, initialDpr: 1.1 };
  }

  return { glyphCount: 7600, minDpr: 1.0, maxDpr: 1.9, initialDpr: 1.25 };
}

function CameraRig({
  interaction,
}: {
  interaction: React.MutableRefObject<OrbitInteractionState>;
}) {
  const { camera, pointer } = useThree();

  useFrame((_, delta) => {
    const current = interaction.current;
    if (!current.isDragging) {
      current.targetYaw = THREE.MathUtils.damp(
        current.targetYaw,
        0,
        3.2,
        delta
      );
      current.targetPitch = THREE.MathUtils.damp(
        current.targetPitch,
        0,
        3.2,
        delta
      );
    }

    current.targetYaw = THREE.MathUtils.clamp(
      current.targetYaw,
      -ORBIT_LIMITS.yaw,
      ORBIT_LIMITS.yaw
    );
    current.targetPitch = THREE.MathUtils.clamp(
      current.targetPitch,
      -ORBIT_LIMITS.pitch,
      ORBIT_LIMITS.pitch
    );
    current.yaw = THREE.MathUtils.damp(current.yaw, current.targetYaw, 4.4, delta);
    current.pitch = THREE.MathUtils.damp(
      current.pitch,
      current.targetPitch,
      4.4,
      delta
    );

    const targetX = pointer.x * 0.6;
    const targetY = pointer.y * 0.35;
    const orbitX = current.yaw * 0.95;
    const orbitY = current.pitch * 0.62;

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      targetX + orbitX,
      2.4,
      delta
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      targetY + orbitY,
      2.1,
      delta
    );
    const orbitEnergy = THREE.MathUtils.clamp(
      Math.abs(current.yaw) * 0.5 + Math.abs(current.pitch) * 0.45,
      0,
      1
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      8.8 + orbitEnergy * 0.36,
      2.3,
      delta
    );
    camera.lookAt(current.yaw * 0.55, current.pitch * 0.32, 0);
  });

  return null;
}

function CodeGlyphField({
  palette,
  glyphCount,
}: {
  palette: ScenePalette;
  glyphCount: number;
}) {
  const materialRef = useRef<ShaderMaterial | null>(null);

  const geometry = useMemo<BufferGeometry>(() => {
    const nextGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(glyphCount * 3);
    const radius = new Float32Array(glyphCount);
    const theta = new Float32Array(glyphCount);
    const height = new Float32Array(glyphCount);
    const speed = new Float32Array(glyphCount);
    const seed = new Float32Array(glyphCount);

    for (let index = 0; index < glyphCount; index += 1) {
      const base = index * 3;
      positions[base] = 0;
      positions[base + 1] = 0;
      positions[base + 2] = 0;

      radius[index] = 1.8 + Math.pow(Math.random(), 0.42) * 6.8;
      theta[index] = Math.random() * Math.PI * 2;
      height[index] = Math.random() * 18 - 9;
      speed[index] = 0.55 + Math.random() * 1.2;
      seed[index] = Math.random();
    }

    nextGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    nextGeometry.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
    nextGeometry.setAttribute("aTheta", new THREE.BufferAttribute(theta, 1));
    nextGeometry.setAttribute("aHeight", new THREE.BufferAttribute(height, 1));
    nextGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    nextGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    return nextGeometry;
  }, [glyphCount]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPrimary: { value: new THREE.Color(palette.primary) },
      uAccent: { value: new THREE.Color(palette.accent) },
      uPointerX: { value: 0 },
      uPointerY: { value: 0 },
    }),
    [palette.accent, palette.primary]
  );

  const pointer = useThree((state) => state.pointer);

  useEffect(() => {
    uniforms.uPrimary.value.set(palette.primary);
    uniforms.uAccent.value.set(palette.accent);
  }, [palette.accent, palette.primary, uniforms]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uPointerX.value = pointer.x;
    materialRef.current.uniforms.uPointerY.value = pointer.y;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float aRadius;
          attribute float aTheta;
          attribute float aHeight;
          attribute float aSpeed;
          attribute float aSeed;

          uniform float uTime;
          uniform float uPointerX;
          uniform float uPointerY;

          varying float vSeed;
          varying float vDepth;
          varying float vPulse;

          void main() {
            float flow = mod(aHeight - (uTime * (2.7 + aSpeed * 1.8)) + aSeed * 5.0, 18.0) - 9.0;
            float swirl = uTime * (0.2 + aSpeed * 0.15) + sin(uTime * 0.7 + aSeed * 29.0) * 0.22;
            float theta = aTheta + swirl;
            float radius = aRadius + sin(uTime * 1.5 + aSeed * 23.0) * 0.12;

            vec3 transformed = vec3(
              cos(theta) * radius + uPointerX * 0.85,
              flow + uPointerY * 0.55,
              sin(theta) * radius
            );

            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            float depthFactor = 1.0 - clamp(abs(mvPosition.z) / 28.0, 0.0, 1.0);

            gl_PointSize = (2.6 + depthFactor * 7.6) * (0.72 + 0.3 * sin(uTime * 2.4 + aSeed * 41.0));
            gl_Position = projectionMatrix * mvPosition;

            vSeed = aSeed;
            vDepth = depthFactor;
            vPulse = 0.44 + 0.56 * sin(uTime * 4.1 + aSeed * 34.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uPrimary;
          uniform vec3 uAccent;

          varying float vSeed;
          varying float vDepth;
          varying float vPulse;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);

            float vertical = smoothstep(0.26, 0.02, abs(uv.x));
            float cap = smoothstep(-0.42, -0.05, uv.y);
            float bar = vertical * cap;

            float cross = smoothstep(0.24, 0.03, abs(uv.y + 0.14));
            float glyphMix = step(0.53, fract(vSeed * 47.0));
            float glyph = mix(bar, max(bar * 0.75, cross * 0.6), glyphMix);

            float soft = smoothstep(0.7, 0.08, length(uv));
            float alpha = glyph * soft * vPulse * (0.28 + vDepth * 0.85);

            vec3 color = mix(uAccent, uPrimary, fract(vSeed * 11.0 + vDepth * 0.4));
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </points>
  );
}

function HolographicCore({ palette }: { palette: ScenePalette }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPrimary: { value: new THREE.Color(palette.primary) },
      uAccent: { value: new THREE.Color(palette.accentStrong) },
    }),
    [palette.accentStrong, palette.primary]
  );

  useEffect(() => {
    uniforms.uPrimary.value.set(palette.primary);
    uniforms.uAccent.value.set(palette.accentStrong);
  }, [palette.accentStrong, palette.primary, uniforms]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;

    if (meshRef.current) {
      meshRef.current.rotation.x = elapsed * 0.18;
      meshRef.current.rotation.y = elapsed * 0.26;
      meshRef.current.rotation.z = Math.sin(elapsed * 0.16) * 0.22;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsed;
    }
  });

  return (
    <group>
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.4, 0.022, 14, 220]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 3.4, 0.18, 0.3]}>
        <torusGeometry args={[1.7, 0.018, 12, 180]} />
        <meshBasicMaterial
          color={palette.primary}
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.1, 6]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            uniform float uTime;

            varying vec3 vNormalW;
            varying vec3 vWorldPosition;

            void main() {
              float waveA = sin(position.x * 6.0 + uTime * 1.5);
              float waveB = sin(position.y * 5.3 - uTime * 1.2);
              float waveC = sin(position.z * 7.2 + uTime * 1.8);
              float displacement = (waveA + waveB + waveC) * 0.035;

              vec3 transformed = position + normal * displacement;
              vec4 world = modelMatrix * vec4(transformed, 1.0);
              vec4 view = viewMatrix * world;

              vWorldPosition = world.xyz;
              vNormalW = normalize(mat3(modelMatrix) * normal);

              gl_Position = projectionMatrix * view;
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform vec3 uPrimary;
            uniform vec3 uAccent;

            varying vec3 vNormalW;
            varying vec3 vWorldPosition;

            void main() {
              vec3 viewDir = normalize(cameraPosition - vWorldPosition);
              float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.4);
              float bands = 0.5 + 0.5 * sin(vWorldPosition.y * 8.0 + uTime * 3.2);

              vec3 base = mix(uAccent, uPrimary, bands);
              vec3 color = base * (0.34 + fresnel * 1.5);

              float alpha = 0.24 + fresnel * 0.7;
              gl_FragColor = vec4(color, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function SceneContents({
  palette,
  glyphCount,
  interaction,
}: {
  palette: ScenePalette;
  glyphCount: number;
  interaction: React.MutableRefObject<OrbitInteractionState>;
}) {
  const orbitGroupRef = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    if (!orbitGroupRef.current) return;
    orbitGroupRef.current.rotation.y = THREE.MathUtils.damp(
      orbitGroupRef.current.rotation.y,
      interaction.current.yaw * 0.42,
      3.2,
      delta
    );
    orbitGroupRef.current.rotation.x = THREE.MathUtils.damp(
      orbitGroupRef.current.rotation.x,
      -interaction.current.pitch * 0.32,
      3.2,
      delta
    );
  });

  return (
    <>
      <color attach="background" args={[palette.surface]} />
      <fog attach="fog" args={[palette.surface, 6, 24]} />
      <ambientLight intensity={0.35} />
      <pointLight
        position={[4, 5, 4]}
        intensity={18}
        decay={2}
        distance={22}
        color={palette.primary}
      />
      <pointLight
        position={[-5, -3, 6]}
        intensity={14}
        decay={2}
        distance={18}
        color={palette.accent}
      />
      <CameraRig interaction={interaction} />
      <group ref={orbitGroupRef} position={[0, 0, -1.2]}>
        <HolographicCore palette={palette} />
        <CodeGlyphField palette={palette} glyphCount={glyphCount} />
      </group>
    </>
  );
}

export function CodePulseShowcase() {
  const allowAnimation = useAnimationGate();
  const palette = useScenePalette();
  const [profile] = useState<RenderProfile>(() => detectRenderProfile());
  const [dpr, setDpr] = useState(profile.initialDpr);
  const [isDragging, setIsDragging] = useState(false);
  const canvasDomRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef<OrbitInteractionState>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  });
  const activePointerIdRef = useRef<number | null>(null);

  const endDrag = () => {
    interactionRef.current.isDragging = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    activePointerIdRef.current = event.pointerId;
    interactionRef.current.isDragging = true;
    interactionRef.current.lastX = event.clientX;
    interactionRef.current.lastY = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactionRef.current.isDragging) return;
    if (activePointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - interactionRef.current.lastX;
    const deltaY = event.clientY - interactionRef.current.lastY;

    interactionRef.current.lastX = event.clientX;
    interactionRef.current.lastY = event.clientY;

    interactionRef.current.targetYaw = THREE.MathUtils.clamp(
      interactionRef.current.targetYaw + deltaX * 0.0055,
      -ORBIT_LIMITS.yaw,
      ORBIT_LIMITS.yaw
    );
    interactionRef.current.targetPitch = THREE.MathUtils.clamp(
      interactionRef.current.targetPitch + deltaY * 0.0046,
      -ORBIT_LIMITS.pitch,
      ORBIT_LIMITS.pitch
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  useEffect(() => {
    if (!canvasDomRef.current) return;
    canvasDomRef.current.style.cursor = isDragging ? "grabbing" : "grab";
  }, [isDragging]);

  if (!allowAnimation) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 15% 20%, rgba(44,179,169,0.22) 0%, transparent 42%), radial-gradient(circle at 85% 80%, rgba(255,140,80,0.18) 0%, transparent 48%)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        if (!interactionRef.current.isDragging) return;
        endDrag();
      }}
    >
      <Canvas
        dpr={dpr}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 120 } }}
        camera={{ position: [0, 0, 9], fov: 46, near: 0.1, far: 60 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
          canvasDomRef.current = gl.domElement;
          gl.domElement.style.cursor = isDragging ? "grabbing" : "grab";
        }}
      >
        <PerformanceMonitor
          flipflops={4}
          onDecline={() =>
            setDpr((value) =>
              Math.max(profile.minDpr, Number((value - 0.08).toFixed(2)))
            )
          }
          onIncline={() =>
            setDpr((value) =>
              Math.min(profile.maxDpr, Number((value + 0.06).toFixed(2)))
            )
          }
        />
        <SceneContents
          palette={palette}
          glyphCount={profile.glyphCount}
          interaction={interactionRef}
        />
      </Canvas>

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: "0 0 0 0",
          bottom: 0,
          height: "10rem",
          background: `linear-gradient(to top, ${palette.surface}, transparent)`,
        }}
      />
    </div>
  );
}
