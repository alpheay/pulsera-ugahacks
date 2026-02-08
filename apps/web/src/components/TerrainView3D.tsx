"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Heart,
  Activity,
  Satellite,
  Layers,
  Mountain,
  Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════ */

const TERRAIN_RESOLUTION = 96;
const TERRAIN_SIZE = 12;
const TERRAIN_HALF = TERRAIN_SIZE / 2;
const TERRAIN_BASE_Y = -0.8;
const TERRAIN_ELEVATION_SCALE = 1.2;

// UGA Campus bounding box (Athens, GA)
const UGA_BOUNDS = {
  minLat: 33.940,
  maxLat: 33.958,
  minLng: -83.390,
  maxLng: -83.368,
};

interface MemberPin {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  latitude: number;
  longitude: number;
  heartRate: number;
  status: string;
  location: string;
}

/* ═══════════════════════════════════════════
   TERRAIN GENERATION (Seeded FBM Noise)
   ═══════════════════════════════════════════ */

function generateRealisticTerrain(
  width: number,
  height: number,
  seed: number = 33948
): Float32Array {
  const data = new Float32Array(width * height);

  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return n - Math.floor(n);
  };

  const smoothNoise = (x: number, y: number, scale: number) => {
    const x0 = Math.floor(x / scale);
    const y0 = Math.floor(y / scale);
    const fx = x / scale - x0;
    const fy = y / scale - y0;
    const sfx = fx * fx * (3 - 2 * fx);
    const sfy = fy * fy * (3 - 2 * fy);
    const v00 = hash(x0, y0);
    const v10 = hash(x0 + 1, y0);
    const v01 = hash(x0, y0 + 1);
    const v11 = hash(x0 + 1, y0 + 1);
    return (v00 * (1 - sfx) + v10 * sfx) * (1 - sfy) + (v01 * (1 - sfx) + v11 * sfx) * sfy;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let elevation = 0;
      // Multi-octave FBM with real-ish terrain character
      elevation += smoothNoise(x, y, 40) * 1.0;
      elevation += smoothNoise(x, y, 20) * 0.55;
      elevation += smoothNoise(x, y, 10) * 0.28;
      elevation += smoothNoise(x, y, 5) * 0.14;
      elevation += smoothNoise(x, y, 2.5) * 0.06;

      // Ridge noise for more dramatic terrain features
      const ridge = 1.0 - Math.abs(smoothNoise(x, y, 15) * 2.0 - 1.0);
      elevation += ridge * ridge * 0.3;

      // Gentle valley in the center (mimicking Oconee River valley near UGA)
      const cx = x / width - 0.5;
      const cy = y / height - 0.5;
      const valleyDist = Math.sqrt(cx * cx * 0.5 + cy * cy);
      elevation -= Math.exp(-valleyDist * valleyDist * 8) * 0.3;

      data[y * width + x] = elevation;
    }
  }

  // Normalize to [0, 1.8]
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    data[i] = ((data[i] - min) / range) * 1.8;
  }

  return data;
}

/* ═══════════════════════════════════════════
   GEO HELPERS
   ═══════════════════════════════════════════ */

function geoTo3D(lat: number, lng: number): { x: number; z: number } {
  const nx = (lng - UGA_BOUNDS.minLng) / (UGA_BOUNDS.maxLng - UGA_BOUNDS.minLng);
  const nz = 1 - (lat - UGA_BOUNDS.minLat) / (UGA_BOUNDS.maxLat - UGA_BOUNDS.minLat);
  return {
    x: (nx - 0.5) * TERRAIN_SIZE,
    z: (nz - 0.5) * TERRAIN_SIZE,
  };
}

function sampleHeight(
  terrainData: Float32Array,
  resolution: number,
  x: number,
  z: number
): number {
  const u = Math.max(0, Math.min(1, (x + TERRAIN_HALF) / TERRAIN_SIZE));
  const v = Math.max(0, Math.min(1, (-z + TERRAIN_HALF) / TERRAIN_SIZE));
  const gx = u * (resolution - 1);
  const gy = (1 - v) * (resolution - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const h00 = terrainData[y0 * resolution + x0] || 0;
  const h10 = terrainData[y0 * resolution + x1] || 0;
  const h01 = terrainData[y1 * resolution + x0] || 0;
  const h11 = terrainData[y1 * resolution + x1] || 0;
  return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
}

/* ═══════════════════════════════════════════
   TERRAIN MESH (Black/Red/Ember Shader)
   ═══════════════════════════════════════════ */

function TerrainMesh({
  terrainData,
  revealProgress,
}: {
  terrainData: Float32Array;
  revealProgress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const resolution = TERRAIN_RESOLUTION;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      resolution - 1,
      resolution - 1
    );
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < terrainData.length && i < positions.length / 3; i++) {
      positions[i * 3 + 2] = terrainData[i] * TERRAIN_ELEVATION_SCALE;
    }
    geo.computeVertexNormals();
    return geo;
  }, [terrainData, resolution]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRevealProgress: { value: 0 },
        uElevationScale: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uRevealProgress;
        uniform float uElevationScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        
        void main() {
          vUv = uv;
          
          float targetZ = position.z;
          float revealedZ = targetZ * uElevationScale;
          
          vec3 newPosition = vec3(position.x, position.y, revealedZ);
          vPosition = newPosition;
          vElevation = targetZ;
          
          float distFromCenter = length(uv - 0.5) * 2.0;
          vReveal = smoothstep(distFromCenter, distFromCenter + 0.3, uRevealProgress * 1.6);
          
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uRevealProgress;
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        
        // Ember/lava color ramp: deep black -> dark crimson -> ember red -> hot orange
        vec3 getTerrainColor(float elevation) {
          vec3 abyss    = vec3(0.02, 0.01, 0.01);   // near-black
          vec3 deep     = vec3(0.08, 0.02, 0.02);   // very dark red
          vec3 crimson  = vec3(0.35, 0.06, 0.04);   // dark crimson
          vec3 ember    = vec3(0.72, 0.14, 0.08);   // Pulsera red (#E8524A approx)
          vec3 hot      = vec3(0.91, 0.32, 0.18);   // bright ember
          vec3 glow     = vec3(1.0, 0.55, 0.25);    // orange glow at peaks
          
          float t = clamp(elevation / 1.8, 0.0, 1.0);
          
          if (t < 0.12) {
            return mix(abyss, deep, t / 0.12);
          } else if (t < 0.3) {
            return mix(deep, crimson, (t - 0.12) / 0.18);
          } else if (t < 0.55) {
            return mix(crimson, ember, (t - 0.3) / 0.25);
          } else if (t < 0.78) {
            return mix(ember, hot, (t - 0.55) / 0.23);
          } else {
            return mix(hot, glow, (t - 0.78) / 0.22);
          }
        }
        
        void main() {
          float normalizedElev = clamp(vElevation / 1.8, 0.0, 1.0);
          vec3 terrainColor = getTerrainColor(vElevation);
          
          // Directional light with warm tint
          vec3 lightDir = normalize(vec3(0.4, 0.5, 0.7));
          vec3 lightColor = vec3(1.0, 0.85, 0.75);
          
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.25;
          
          vec3 litColor = terrainColor * ambient;
          litColor += terrainColor * diffuse * 0.65 * lightColor;
          
          // Rim/fresnel glow
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
          litColor += vec3(0.9, 0.2, 0.1) * fresnel * 0.15;
          
          // Subtle pulse on higher elevations
          float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + normalizedElev * 6.28);
          litColor += vec3(0.4, 0.05, 0.02) * pulse * normalizedElev * 0.08;
          
          // Contour lines (topographic feel)
          float contourFreq = 18.0;
          float contour = abs(fract(vElevation * contourFreq) - 0.5) * 2.0;
          contour = smoothstep(0.0, 0.06, contour);
          litColor *= mix(0.75, 1.0, contour);
          
          float alpha = vReveal;
          
          gl_FragColor = vec4(litColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uRevealProgress.value = revealProgress;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      const targetScale = Math.min(revealProgress * 2.5, 1);
      materialRef.current.uniforms.uElevationScale.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uElevationScale.value,
        targetScale,
        0.04
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, TERRAIN_BASE_Y, 0]}
    >
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   ANIMATED GRID FLOOR (Dark / Red)
   ═══════════════════════════════════════════ */

function GridFloor({ revealProgress }: { revealProgress: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const gridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uReveal;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv * 60.0;
          
          float lineX = abs(fract(uv.x - 0.5) - 0.5) / fwidth(uv.x);
          float lineY = abs(fract(uv.y - 0.5) - 0.5) / fwidth(uv.y);
          float line = 1.0 - min(min(lineX, lineY), 1.0);
          
          // Radial reveal from center
          float dist = length(vUv - 0.5) * 2.0;
          float reveal = smoothstep(dist, dist + 0.2, uReveal * 1.6);
          float fade = 1.0 - smoothstep(0.35, 0.95, dist);
          
          // Slow pulse
          float pulse = 0.5 + 0.5 * sin(uTime * 0.6 - dist * 3.0);
          
          // Deep red grid
          vec3 gridColor = vec3(0.55, 0.08, 0.05);
          vec3 color = gridColor * line * fade * pulse * reveal;
          float alpha = line * fade * 0.15 * reveal;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uReveal.value = revealProgress;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.0, 0]}>
      <planeGeometry args={[40, 40]} />
      <primitive object={gridMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   MEMBER PIN 3D (floating above terrain)
   ═══════════════════════════════════════════ */

function MemberPin3D({
  member,
  terrainData,
  revealProgress,
  isSelected,
  onSelect,
}: {
  member: MemberPin;
  terrainData: Float32Array;
  revealProgress: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { x, z } = geoTo3D(member.latitude, member.longitude);

  useFrame((state) => {
    if (groupRef.current) {
      const elevScale = Math.min(revealProgress * 2.5, 1);
      const elev = sampleHeight(terrainData, TERRAIN_RESOLUTION, x, z) * TERRAIN_ELEVATION_SCALE;
      const surfaceY = TERRAIN_BASE_Y + elev * elevScale;
      const hover = Math.sin(state.clock.elapsedTime * 2 + x * 3) * 0.05;
      groupRef.current.position.y = surfaceY + 0.5 + hover;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
    }
  });

  const statusDotColor =
    member.status === "critical"
      ? "#E8524A"
      : member.status === "warning"
      ? "#D4873E"
      : "#7B8F4E";

  if (revealProgress < 0.3) return null;

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <Html center distanceFactor={10} style={{ pointerEvents: "auto" }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="cursor-pointer select-none group"
          style={{ transform: "translateY(-8px)" }}
        >
          {/* Pin body */}
          <div
            className="relative flex flex-col items-center"
            style={{ filter: isSelected ? `drop-shadow(0 0 12px ${member.avatarColor}80)` : "none" }}
          >
            {/* Avatar circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold tracking-wide transition-transform duration-200 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${member.avatarColor}40, ${member.avatarColor}80)`,
                color: member.avatarColor,
                border: isSelected
                  ? `2.5px solid ${member.avatarColor}`
                  : `2px solid ${member.avatarColor}60`,
                boxShadow: `0 0 20px ${member.avatarColor}30, 0 4px 12px rgba(0,0,0,0.5)`,
              }}
            >
              {member.avatar}
            </div>

            {/* Status dot */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{
                background: statusDotColor,
                border: "2px solid #0F0705",
                boxShadow: `0 0 6px ${statusDotColor}80`,
              }}
            />

            {/* Name label */}
            <div
              className="mt-1.5 px-2 py-0.5 rounded-md text-[8px] font-medium whitespace-nowrap"
              style={{
                background: "rgba(15,7,5,0.85)",
                color: "#FFF1E6",
                border: "1px solid rgba(232,82,74,0.15)",
                backdropFilter: "blur(8px)",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {member.name}
              {member.heartRate > 0 && (
                <span className="ml-1 opacity-50">{member.heartRate} bpm</span>
              )}
            </div>

            {/* Pulse ring for critical */}
            {member.status === "critical" && (
              <div
                className="absolute -inset-1 rounded-full animate-ping"
                style={{
                  background: "rgba(232,82,74,0.2)",
                  animationDuration: "2s",
                }}
              />
            )}
          </div>

          {/* Connecting line to surface */}
          <div
            className="w-px h-3 mx-auto"
            style={{
              background: `linear-gradient(to bottom, ${member.avatarColor}60, transparent)`,
            }}
          />
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════════════════════════════
   GEOFENCE RING 3D
   ═══════════════════════════════════════════ */

function GeofenceRing({
  latitude,
  longitude,
  radius,
  terrainData,
  revealProgress,
}: {
  latitude: number;
  longitude: number;
  radius: number; // meters -> 3D units
  terrainData: Float32Array;
  revealProgress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { x, z } = geoTo3D(latitude, longitude);

  // Convert meter radius to 3D space (rough approximation for this area)
  const metersPerDegree = 111320;
  const lngSpan = UGA_BOUNDS.maxLng - UGA_BOUNDS.minLng;
  const scale3d = TERRAIN_SIZE / (lngSpan * metersPerDegree * Math.cos((latitude * Math.PI) / 180));
  const r3d = radius * scale3d;

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uReveal;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          
          // Ring edge
          float ring = smoothstep(0.85, 0.9, dist) * smoothstep(1.0, 0.95, dist);
          
          // Fill
          float fill = smoothstep(1.0, 0.8, dist);
          
          // Pulse
          float pulse = 0.5 + 0.5 * sin(uTime * 2.0 - dist * 4.0);
          
          vec3 col = vec3(0.91, 0.32, 0.29); // Pulsera red
          float alpha = (ring * 0.6 + fill * 0.06 * pulse) * uReveal;
          
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uReveal.value = Math.max(0, (revealProgress - 0.4) / 0.6);
    }
    if (meshRef.current) {
      const elevScale = Math.min(revealProgress * 2.5, 1);
      const elev = sampleHeight(terrainData, TERRAIN_RESOLUTION, x, z) * TERRAIN_ELEVATION_SCALE;
      meshRef.current.position.y = TERRAIN_BASE_Y + elev * elevScale + 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, TERRAIN_BASE_Y + 0.05, z]}
    >
      <planeGeometry args={[r3d * 2, r3d * 2]} />
      <primitive object={ringMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   CAMERA CONTROLLER (entry animation)
   ═══════════════════════════════════════════ */

function CameraController({ isEntering }: { isEntering: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(9, 7, 9));
  const progress = useRef(0);
  const animating = useRef(true);

  useEffect(() => {
    if (isEntering) {
      camera.position.set(18, 14, 18);
      target.current.set(9, 7, 9);
      progress.current = 0;
      animating.current = true;
    }
  }, [isEntering, camera]);

  useFrame(() => {
    if (!animating.current) return;
    progress.current += 0.012;
    if (progress.current >= 1) {
      animating.current = false;
      return;
    }
    camera.position.lerp(target.current, 0.025);
    camera.lookAt(0, -0.3, 0);
  });

  return null;
}

/* ═══════════════════════════════════════════
   AMBIENT PARTICLES
   ═══════════════════════════════════════════ */

function AmbientParticles({ count = 60, revealProgress }: { count?: number; revealProgress: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 5 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      sz[i] = Math.random() * 0.03 + 0.01;
    }
    return { positions: pos, sizes: sz };
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      const posArr = meshRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.002;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
      (meshRef.current.material as THREE.PointsMaterial).opacity = revealProgress * 0.4;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#E8524A"
        size={0.04}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════
   TRANSITION OVERLAY
   ═══════════════════════════════════════════ */

function TransitionOverlay({
  isTransitioning,
  onComplete,
}: {
  isTransitioning: boolean;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"capture" | "process" | "render">("capture");
  const [text, setText] = useState("Capturing geospatial data...");

  useEffect(() => {
    if (!isTransitioning) return;

    setPhase("capture");
    setText("Capturing geospatial data...");

    const t1 = setTimeout(() => {
      setPhase("process");
      setText("Processing elevation topology...");
    }, 700);
    const t2 = setTimeout(() => {
      setText("Constructing 3D terrain mesh...");
    }, 1300);
    const t3 = setTimeout(() => {
      setPhase("render");
      setText("Rendering topographic view...");
    }, 1900);
    const t4 = setTimeout(onComplete, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isTransitioning, onComplete]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(ellipse at center, rgba(15,7,5,0.97), rgba(10,3,2,1))" }}
        >
          {/* Concentric rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ border: "1px solid rgba(232,82,74,0.15)" }}
                initial={{ width: 40, height: 40, opacity: 0 }}
                animate={{
                  width: [40, 300 + i * 120],
                  height: [40, 300 + i * 120],
                  opacity: [0, 0.3, 0],
                }}
                transition={{ duration: 2.5, delay: i * 0.2, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* Scan lines */}
          {phase === "process" && (
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-px w-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(232,82,74,0.25), transparent)" }}
                  initial={{ y: -10 }}
                  animate={{ y: ["0%", "100%"] }}
                  transition={{ duration: 1.8, delay: i * 0.12, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </motion.div>
          )}

          {/* Central content */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {/* Animated icon */}
            <motion.div
              className="relative"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(232,82,74,0.35) 0%, transparent 65%)",
                  filter: "blur(16px)",
                }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, rgba(232,82,74,0.15), rgba(232,82,74,0.05))",
                  border: "1px solid rgba(232,82,74,0.3)",
                  boxShadow: "0 0 40px rgba(232,82,74,0.15)",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full"
                  style={{ border: "1px dashed rgba(232,82,74,0.2)" }}
                />

                {phase === "capture" && <Satellite className="w-8 h-8 text-[#E8524A]" />}
                {phase === "process" && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="w-8 h-8 text-[#E8524A]" />
                  </motion.div>
                )}
                {phase === "render" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                    <Mountain className="w-8 h-8 text-[#E8524A]" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              className="text-center space-y-1.5"
              key={text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2
                className="text-base font-bold text-[#FFF1E6]/90 flex items-center gap-2"
                style={{ fontFamily: "var(--font-garet), sans-serif" }}
              >
                <Layers className="w-4 h-4 text-[#E8524A]/70" />
                Terrain Analysis
              </h2>
              <p
                className="text-[11px] text-[#FFF1E6]/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {text}
              </p>
            </motion.div>

            {/* Progress dots */}
            <div className="flex gap-2">
              {(["capture", "process", "render"] as const).map((p, i) => (
                <motion.div
                  key={p}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      ["capture", "process", "render"].indexOf(phase) >= i
                        ? "#E8524A"
                        : "rgba(255,241,230,0.15)",
                  }}
                  animate={{ scale: phase === p ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.5, repeat: phase === p ? Infinity : 0 }}
                />
              ))}
            </div>
          </motion.div>

          {/* Corner brackets */}
          {([
            "top-6 left-6 border-l-2 border-t-2",
            "top-6 right-6 border-r-2 border-t-2",
            "bottom-6 left-6 border-l-2 border-b-2",
            "bottom-6 right-6 border-r-2 border-b-2",
          ] as const).map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-10 h-10 ${cls}`}
              style={{ borderColor: "rgba(232,82,74,0.2)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT: TerrainView3D
   ═══════════════════════════════════════════ */

interface TerrainView3DProps {
  members: MemberPin[];
  selectedMember: string | null;
  onSelectMember: (id: string | null) => void;
  savedPlaces?: Array<{ latitude: number; longitude: number; radius: number }>;
}

export default function TerrainView3D({
  members,
  selectedMember,
  onSelectMember,
  savedPlaces = [],
}: TerrainView3DProps) {
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [isEntering, setIsEntering] = useState(true);

  const terrainData = useMemo(
    () => generateRealisticTerrain(TERRAIN_RESOLUTION, TERRAIN_RESOLUTION),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    setSceneReady(true);
  }, []);

  // Progressive reveal after transition
  useEffect(() => {
    if (!sceneReady) return;

    const startTime = Date.now();
    const duration = 3500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - p, 3);
      setRevealProgress(eased);

      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsEntering(false);
      }
    };

    requestAnimationFrame(animate);
  }, [sceneReady]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <div
        className="absolute inset-0"
        style={{
          opacity: sceneReady ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <Canvas
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#0A0302"]} />

          <PerspectiveCamera makeDefault position={[12, 9, 12]} fov={42} />
          <CameraController isEntering={isEntering} />

          {/* Lighting: warm ember tones */}
          <ambientLight intensity={0.15} color="#FFF1E6" />
          <directionalLight position={[10, 12, 8]} intensity={0.7} color="#FFE0C0" />
          <pointLight position={[-6, 4, -6]} intensity={0.25} color="#E8524A" />
          <pointLight position={[6, 3, 6]} intensity={0.15} color="#D4873E" />
          <hemisphereLight args={["#1A0B08", "#050101", 0.2]} />

          <TerrainMesh terrainData={terrainData} revealProgress={revealProgress} />
          <GridFloor revealProgress={revealProgress} />
          <AmbientParticles revealProgress={revealProgress} />

          {/* Member pins */}
          {members.map((member) => (
            <MemberPin3D
              key={member.id}
              member={member}
              terrainData={terrainData}
              revealProgress={revealProgress}
              isSelected={selectedMember === member.id}
              onSelect={() =>
                onSelectMember(selectedMember === member.id ? null : member.id)
              }
            />
          ))}

          {/* Geofence rings */}
          {savedPlaces.map((place, i) => (
            <GeofenceRing
              key={i}
              latitude={place.latitude}
              longitude={place.longitude}
              radius={place.radius}
              terrainData={terrainData}
              revealProgress={revealProgress}
            />
          ))}

          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={30}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate={true}
            autoRotateSpeed={0.3}
            enableDamping={true}
            dampingFactor={0.06}
            rotateSpeed={0.7}
            zoomSpeed={1.0}
            panSpeed={0.7}
          />

          {/* Dark fog */}
          <fog attach="fog" args={["#0A0302", 16, 45]} />
        </Canvas>
      </div>

      {/* Transition overlay */}
      <TransitionOverlay
        isTransitioning={isTransitioning}
        onComplete={handleTransitionComplete}
      />

      {/* Legend overlay */}
      <AnimatePresence>
        {sceneReady && revealProgress > 0.5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-4 left-4 z-10"
          >
            <div
              className="px-3.5 py-2.5 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(15,7,5,0.85)",
                border: "1px solid rgba(232,82,74,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <Activity size={10} className="text-[#E8524A]/60" />
                <span
                  className="text-[8px] font-medium tracking-[0.15em] uppercase text-[#FFF1E6]/50"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Elevation
                </span>
              </div>
              <div
                className="w-20 h-1.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #0F0201, #380A06, #B81D10, #E8524A, #FF8C45)",
                }}
              />
              <div className="flex items-center gap-3">
                <span className="text-[8px] text-[#FFF1E6]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Low
                </span>
                <span className="text-[8px] text-[#FFF1E6]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  High
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geospatial badge */}
      <AnimatePresence>
        {sceneReady && revealProgress > 0.3 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-4 right-4 z-10"
          >
            <div
              className="px-3 py-2 rounded-xl flex items-center gap-2"
              style={{
                background: "rgba(15,7,5,0.85)",
                border: "1px solid rgba(232,82,74,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <MapPin size={10} className="text-[#E8524A]/50" />
              <span
                className="text-[8px] text-[#FFF1E6]/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                33.948&deg;N, 83.377&deg;W
              </span>
              <div className="w-px h-3 bg-[#FFF1E6]/08" />
              <span
                className="text-[8px] text-[#FFF1E6]/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Athens, GA
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
