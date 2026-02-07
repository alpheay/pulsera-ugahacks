'use client';

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { cn } from '@/lib/utils';
import {
  OrbitControls,
  PerspectiveCamera,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { parse as parsePartialJson } from 'partial-json';
import type { AnalysisPhase } from '@/components/agent';
import { PolygonCoordinates } from '@/components/map';
import {
  calculateCentroid,
  fetchElevationGrid,
  calculateSlope,
  calculateAspect,
  calculateSolarSuitability,
  calculateWindSuitability,
  calculateBounds,
} from '@/lib/geo';
import { usePlanStore } from '@/stores/plan-store';

const TERRAIN_RESOLUTION = 128;
const TERRAIN_SIZE = 10;
const TERRAIN_HALF = TERRAIN_SIZE / 2;
const TERRAIN_BASE_Y = -0.5;
const TERRAIN_ELEVATION_SCALE = 0.8;
const PLACEMENT_BOUND = TERRAIN_HALF * 0.90;

type NormalizedPolygon = Array<{ x: number; z: number }>;

type PolygonBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  normalizedPolygon: NormalizedPolygon | null;
};

function getPolygonBounds(polygon: PolygonCoordinates[] | null | undefined): PolygonBounds {
  if (!polygon || polygon.length < 3) {
    // Default to terrain bounds
    return {
      minX: -PLACEMENT_BOUND,
      maxX: PLACEMENT_BOUND,
      minZ: -PLACEMENT_BOUND,
      maxZ: PLACEMENT_BOUND,
      centerX: 0,
      centerZ: 0,
      width: PLACEMENT_BOUND * 2,
      height: PLACEMENT_BOUND * 2,
      normalizedPolygon: null,
    };
  }

  const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon);

  const xs = normalized.map(p => p.x);
  const zs = normalized.map(p => p.z);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxZ - minZ,
    normalizedPolygon: normalized,
  };
}

// Map normalized [-1,1] coordinate to polygon bounds with margin
function toPolygonCoord(value: number, min: number, max: number, margin: number = 0.15): number {
  const clamped = clampNumber(value, -1, 1);
  const range = max - min;
  const marginedMin = min + range * margin;
  const marginedMax = max - range * margin;
  return marginedMin + ((clamped + 1) / 2) * (marginedMax - marginedMin);
}

function normalizePolygonTo3D(polygon: PolygonCoordinates[]): {
  normalized: NormalizedPolygon;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  scaleX: number;
  scaleZ: number;
} {
  if (!polygon || polygon.length < 3) {
    return {
      normalized: [
        { x: -TERRAIN_HALF, z: -TERRAIN_HALF },
        { x: TERRAIN_HALF, z: -TERRAIN_HALF },
        { x: TERRAIN_HALF, z: TERRAIN_HALF },
        { x: -TERRAIN_HALF, z: TERRAIN_HALF },
      ],
      bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 },
      scaleX: TERRAIN_SIZE,
      scaleZ: TERRAIN_SIZE,
    };
  }

  const minLat = Math.min(...polygon.map(p => p.lat));
  const maxLat = Math.max(...polygon.map(p => p.lat));
  const minLng = Math.min(...polygon.map(p => p.lng));
  const maxLng = Math.max(...polygon.map(p => p.lng));

  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;
  const aspectRatio = lngRange / latRange;

  const scaleX = aspectRatio >= 1 ? TERRAIN_SIZE : TERRAIN_SIZE * aspectRatio;
  const scaleZ = aspectRatio >= 1 ? TERRAIN_SIZE / aspectRatio : TERRAIN_SIZE;

  const normalized = polygon.map(p => ({
    x: ((p.lng - minLng) / lngRange - 0.5) * scaleX,
    z: -((p.lat - minLat) / latRange - 0.5) * scaleZ,
  }));

  return { normalized, bounds: { minLat, maxLat, minLng, maxLng }, scaleX, scaleZ };
}

function isPointInPolygon(x: number, y: number, polygon: NormalizedPolygon): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].z;
    const xj = polygon[j].x, yj = polygon[j].z;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToPolygonEdge(x: number, y: number, polygon: NormalizedPolygon): number {
  let minDist = Infinity;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const x1 = polygon[i].x, y1 = polygon[i].z;
    const x2 = polygon[j].x, y2 = polygon[j].z;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    let t = 0;
    if (len2 > 0) {
      t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
    }

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));

    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

function createPolygonTerrainGeometry(
  normalizedPolygon: NormalizedPolygon,
  terrainData: Float32Array,
  resolution: number,
  scaleX: number,
  scaleZ: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(scaleX, scaleZ, resolution - 1, resolution - 1);
  const positions = geo.attributes.position.array as Float32Array;
  const uvs = geo.attributes.uv.array as Float32Array;

  const alphas = new Float32Array(positions.length / 3);
  const edgeDistances = new Float32Array(positions.length / 3);

  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];

    const u = uvs[i * 2];
    const v = uvs[i * 2 + 1];

    const gx = Math.floor(u * (resolution - 1));
    const gy = Math.floor((1 - v) * (resolution - 1));
    const clampedGx = Math.max(0, Math.min(resolution - 1, gx));
    const clampedGy = Math.max(0, Math.min(resolution - 1, gy));
    const elevation = terrainData[clampedGy * resolution + clampedGx] || 0;

    positions[i * 3 + 2] = elevation * TERRAIN_ELEVATION_SCALE;

    const worldZ = -y;
    const inPolygon = isPointInPolygon(x, worldZ, normalizedPolygon);
    const edgeDist = distanceToPolygonEdge(x, worldZ, normalizedPolygon);
    const signedDist = inPolygon ? edgeDist : -edgeDist;

    edgeDistances[i] = signedDist;
    alphas[i] = 1.0;
  }

  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('edgeDist', new THREE.BufferAttribute(edgeDistances, 1));
  geo.computeVertexNormals();

  return geo;
}

const CROSS_SECTION_DEPTH = 1.5;

function sampleTerrainHeightAt(
  terrainData: Float32Array,
  resolution: number,
  x: number,
  z: number,
  scaleX: number,
  scaleZ: number
): number {
  const u = (x / scaleX + 0.5);
  const v = (-z / scaleZ + 0.5);

  const gx = u * (resolution - 1);
  const gy = (1 - v) * (resolution - 1);

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);

  const tx = gx - x0;
  const ty = gy - y0;

  const clampX0 = Math.max(0, Math.min(resolution - 1, x0));
  const clampY0 = Math.max(0, Math.min(resolution - 1, y0));
  const clampX1 = Math.max(0, Math.min(resolution - 1, x1));
  const clampY1 = Math.max(0, Math.min(resolution - 1, y1));

  const h00 = terrainData[clampY0 * resolution + clampX0] || 0;
  const h10 = terrainData[clampY0 * resolution + clampX1] || 0;
  const h01 = terrainData[clampY1 * resolution + clampX0] || 0;
  const h11 = terrainData[clampY1 * resolution + clampX1] || 0;

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;

  return hx0 + (hx1 - hx0) * ty;
}

function TerrainCrossSection({
  polygon,
  terrainData,
  resolution,
  revealProgress,
}: {
  polygon: PolygonCoordinates[] | null | undefined;
  terrainData: Float32Array;
  resolution: number;
  revealProgress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, scaleX, scaleZ } = useMemo(() => {
    if (!polygon || polygon.length < 3) {
      return { geometry: null, scaleX: TERRAIN_SIZE, scaleZ: TERRAIN_SIZE };
    }

    const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon);
    const segmentsPerEdge = 48;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const baseElevations: number[] = [];
    const indices: number[] = [];

    let vertexIndex = 0;

    for (let i = 0; i < normalized.length; i++) {
      const p1 = normalized[i];
      const p2 = normalized[(i + 1) % normalized.length];

      for (let j = 0; j < segmentsPerEdge; j++) {
        const t1 = j / segmentsPerEdge;
        const t2 = (j + 1) / segmentsPerEdge;

        const x1 = p1.x + (p2.x - p1.x) * t1;
        const z1 = p1.z + (p2.z - p1.z) * t1;
        const x2 = p1.x + (p2.x - p1.x) * t2;
        const z2 = p1.z + (p2.z - p1.z) * t2;

        const elev1 = sampleTerrainHeightAt(terrainData, resolution, x1, z1, scaleX, scaleZ);
        const elev2 = sampleTerrainHeightAt(terrainData, resolution, x2, z2, scaleX, scaleZ);

        const uCoord1 = (i + t1) / normalized.length;
        const uCoord2 = (i + t2) / normalized.length;

        vertices.push(
          x1, elev1, z1,
          x2, elev2, z2,
          x1, 0, z1,
          x2, 0, z2
        );

        baseElevations.push(elev1, elev2, elev1, elev2);

        uvs.push(
          uCoord1, 1.0,
          uCoord2, 1.0,
          uCoord1, 0.0,
          uCoord2, 0.0
        );

        indices.push(
          vertexIndex, vertexIndex + 2, vertexIndex + 1,
          vertexIndex + 1, vertexIndex + 2, vertexIndex + 3
        );

        vertexIndex += 4;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('baseElev', new THREE.Float32BufferAttribute(baseElevations, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return { geometry: geo, scaleX, scaleZ };
  }, [polygon, terrainData, resolution]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRevealProgress: { value: 0 },
        uElevationScale: { value: 0 },
        uBaseY: { value: TERRAIN_BASE_Y },
        uDepth: { value: CROSS_SECTION_DEPTH },
      },
      vertexShader: `
        attribute float baseElev;
        
        uniform float uElevationScale;
        uniform float uBaseY;
        uniform float uDepth;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDepth;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          float isTop = uv.y;
          float scaledElev = baseElev * uElevationScale * 0.8;
          float topY = uBaseY + scaledElev;
          float bottomY = uBaseY - uDepth;
          
          float finalY = mix(bottomY, topY, isTop);
          vec3 newPosition = vec3(position.x, finalY, position.z);
          
          vPosition = newPosition;
          vDepth = 1.0 - uv.y;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uRevealProgress;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDepth;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          vec3 topsoil = vec3(0.35, 0.25, 0.15);
          vec3 darkSoil = vec3(0.25, 0.18, 0.12);
          vec3 clay = vec3(0.55, 0.35, 0.25);
          vec3 sandstone = vec3(0.76, 0.60, 0.42);
          vec3 limestone = vec3(0.85, 0.82, 0.75);
          vec3 shale = vec3(0.40, 0.38, 0.35);
          vec3 bedrock = vec3(0.30, 0.28, 0.26);
          
          float depth = vDepth;
          
          float layerNoise = noise(vec2(vUv.x * 20.0, depth * 3.0)) * 0.15;
          float wavyDepth = depth + sin(vUv.x * 25.0 + depth * 5.0) * 0.03 + layerNoise;
          
          vec3 layerColor;
          float layerBlend;
          
          if (wavyDepth < 0.08) {
            layerBlend = wavyDepth / 0.08;
            layerColor = mix(topsoil, darkSoil, layerBlend);
          } else if (wavyDepth < 0.2) {
            layerBlend = (wavyDepth - 0.08) / 0.12;
            layerColor = mix(darkSoil, clay, layerBlend);
          } else if (wavyDepth < 0.4) {
            layerBlend = (wavyDepth - 0.2) / 0.2;
            layerColor = mix(clay, sandstone, layerBlend);
          } else if (wavyDepth < 0.6) {
            layerBlend = (wavyDepth - 0.4) / 0.2;
            layerColor = mix(sandstone, limestone, layerBlend);
          } else if (wavyDepth < 0.8) {
            layerBlend = (wavyDepth - 0.6) / 0.2;
            layerColor = mix(limestone, shale, layerBlend);
          } else {
            layerBlend = (wavyDepth - 0.8) / 0.2;
            layerColor = mix(shale, bedrock, layerBlend);
          }
          
          float grainNoise = noise(vUv * 80.0) * 0.08;
          float mediumNoise = noise(vUv * 30.0) * 0.05;
          layerColor += vec3(grainNoise + mediumNoise) - 0.06;
          
          float strataNoise = noise(vec2(vUv.x * 50.0, depth * 8.0));
          float strataLine = smoothstep(0.48, 0.5, strataNoise) * smoothstep(0.52, 0.5, strataNoise);
          layerColor = mix(layerColor, layerColor * 0.85, strataLine * 0.5);
          
          vec3 lightDir = normalize(vec3(0.3, 0.5, 0.4));
          float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.4 + 0.6;
          layerColor *= diffuse;
          
          float alpha = smoothstep(0.0, 0.3, uRevealProgress);
          
          gl_FragColor = vec4(layerColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uRevealProgress.value = revealProgress;

      const targetScale = Math.min(revealProgress * 2, 1);
      materialRef.current.uniforms.uElevationScale.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uElevationScale.value,
        targetScale,
        0.05
      );
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}



type PlacementZone = {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  suitability: number;
  type: 'solar' | 'wind' | 'battery_storage' | 'agrivoltaic' | 'pollinator_habitat' | 'buffer';
  id?: string;
  name?: string;
  estimatedCapacityMW?: number;
  notes?: string;
};

type PlacementPlan = {
  zones: PlacementZone[];
};

function validateZone(zone: PlacementZone): boolean {
  const MIN_ZONE_SIZE = 0.05;
  const COORD_MIN = -1.5;
  const COORD_MAX = 1.5;

  if (zone.x1 < COORD_MIN || zone.x1 > COORD_MAX) return false;
  if (zone.x2 < COORD_MIN || zone.x2 > COORD_MAX) return false;
  if (zone.z1 < COORD_MIN || zone.z1 > COORD_MAX) return false;
  if (zone.z2 < COORD_MIN || zone.z2 > COORD_MAX) return false;

  if (zone.x2 <= zone.x1) return false;
  if (zone.z2 <= zone.z1) return false;

  const width = zone.x2 - zone.x1;
  const height = zone.z2 - zone.z1;
  if (width < MIN_ZONE_SIZE || height < MIN_ZONE_SIZE) {
    return false;
  }

  return true;
}

const ZONE_COLORS: Record<PlacementZone['type'], string> = {
  solar: '#f59e0b',
  wind: '#3b82f6',
  battery_storage: '#8b5cf6',
  agrivoltaic: '#10b981',
  pollinator_habitat: '#ec4899',
  buffer: '#6b7280',
};

const ZONE_ICONS: Record<PlacementZone['type'], string> = {
  solar: '\u2600',
  wind: '\u2741',
  battery_storage: '\u26A1',
  agrivoltaic: '\u2618',
  pollinator_habitat: '\u273F',
  buffer: '\u26D4',
};

function ZoneHighlightMesh({
  zone,
  getSurfaceHeight,
  isSelected,
  onSelect,
  renderOrder,
}: {
  zone: {
    x: number;
    z: number;
    width: number;
    depth: number;
    color: string;
    type: PlacementZone['type'];
  } & PlacementZone;
  getSurfaceHeight: (x: number, z: number) => number;
  isSelected: boolean;
  onSelect: () => void;
  renderOrder: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const resolution = 12;

  const baseGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(zone.width, zone.depth, resolution - 1, resolution - 1);
    return geo;
  }, [zone.width, zone.depth]);

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      const localX = positions[i * 3];
      const localY = positions[i * 3 + 1];

      const worldX = zone.x + localX;
      const worldZ = zone.z - localY;

      const height = getSurfaceHeight(worldX, worldZ) + 0.15;
      positions[i * 3 + 2] = height;
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  });

  const baseOpacity = zone.type === 'buffer' ? 0.3 : 0.55;
  const opacity = isSelected ? 0.8 : baseOpacity;

  return (
    <mesh
      ref={meshRef}
      geometry={baseGeometry.clone()}
      position={[zone.x, 0, zone.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <meshBasicMaterial
        color={zone.color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        depthTest={true}
        polygonOffset={true}
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

function ZoneLabel({
  x,
  z,
  color,
  icon,
  getSurfaceHeight,
}: {
  x: number;
  z: number;
  color: string;
  icon: string;
  getSurfaceHeight: (x: number, z: number) => number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = getSurfaceHeight(x, z) + 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[x, getSurfaceHeight(x, z) + 0.5, z]}>
      <Html
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            border: '2px solid rgba(255,255,255,0.8)',
          }}
        >
          {icon}
        </div>
      </Html>
    </group>
  );
}

function ZoneOverlays({
  zones,
  getSurfaceHeight,
  polygonBounds,
  onZoneClick,
  selectedZoneId,
}: {
  zones: PlacementZone[];
  getSurfaceHeight: (x: number, z: number) => number;
  polygonBounds: PolygonBounds;
  onZoneClick?: (zone: PlacementZone | null) => void;
  selectedZoneId?: string | null;
}) {
  const processedZones = useMemo(() => {
    return zones.map((zone) => {
      const wx1 = toPolygonCoord(zone.x1, polygonBounds.minX, polygonBounds.maxX);
      const wz1 = toPolygonCoord(zone.z1, polygonBounds.minZ, polygonBounds.maxZ);
      const wx2 = toPolygonCoord(zone.x2, polygonBounds.minX, polygonBounds.maxX);
      const wz2 = toPolygonCoord(zone.z2, polygonBounds.minZ, polygonBounds.maxZ);

      const centerX = (wx1 + wx2) / 2;
      const centerZ = (wz1 + wz2) / 2;
      const width = Math.abs(wx2 - wx1);
      const depth = Math.abs(wz2 - wz1);

      const color = ZONE_COLORS[zone.type] || '#6b7280';

      return {
        ...zone,
        x: centerX,
        z: centerZ,
        width: Math.max(width, 0.5),
        depth: Math.max(depth, 0.5),
        color,
        labelX: wx1 + width * 0.12,
        labelZ: wz1 + depth * 0.12,
      };
    });
  }, [zones, polygonBounds]);

  return (
    <group renderOrder={100}>
      {processedZones.map((zone, i) => {
        const isSelected = selectedZoneId === zone.id;

        return (
          <group key={zone.id || i}>
            <ZoneHighlightMesh
              zone={zone}
              getSurfaceHeight={getSurfaceHeight}
              isSelected={isSelected}
              onSelect={() => onZoneClick?.(isSelected ? null : zone)}
              renderOrder={100 + i}
            />

            {zone.type !== 'buffer' && (
              <ZoneLabel
                x={zone.labelX}
                z={zone.labelZ}
                color={zone.color}
                icon={ZONE_ICONS[zone.type]}
                getSurfaceHeight={getSurfaceHeight}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

// Generate realistic terrain heightmap using multiple noise octaves
function generateTerrainData(width: number, height: number, seed: number = 42) {
  const data = new Float32Array(width * height);

  const random = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return n - Math.floor(n);
  };

  const smoothNoise = (x: number, y: number, scale: number) => {
    const x0 = Math.floor(x / scale);
    const y0 = Math.floor(y / scale);
    const fx = (x / scale) - x0;
    const fy = (y / scale) - y0;

    const v00 = random(x0, y0);
    const v10 = random(x0 + 1, y0);
    const v01 = random(x0, y0 + 1);
    const v11 = random(x0 + 1, y0 + 1);

    const i1 = v00 * (1 - fx) + v10 * fx;
    const i2 = v01 * (1 - fx) + v11 * fx;

    return i1 * (1 - fy) + i2 * fy;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let elevation = 0;
      elevation += smoothNoise(x, y, 32) * 1.0;
      elevation += smoothNoise(x, y, 16) * 0.5;
      elevation += smoothNoise(x, y, 8) * 0.25;
      elevation += smoothNoise(x, y, 4) * 0.125;

      data[y * width + x] = elevation;
    }
  }

  return data;
}

// Cubic interpolation for smoother upscaling
function cubicInterpolate(p0: number, p1: number, p2: number, p3: number, t: number) {
  const v0 = p2 - p0;
  const v1 = 2 * p0 - 5 * p1 + 4 * p2 - p3;
  const v2 = -p0 + 3 * p1 - 3 * p2 + p3;
  return p1 + 0.5 * t * (v0 + t * (v1 + t * v2));
}

// Bicubic interpolation for 2D grid
function bicubicInterpolate(grid: Float32Array, gridSize: number, x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const dx = x - xi;
  const dy = y - yi;

  const p = [];
  for (let j = -1; j <= 2; j++) {
    const row = [];
    for (let i = -1; i <= 2; i++) {
      let gx = xi + i;
      let gy = yi + j;
      // Clamp to edges
      if (gx < 0) gx = 0;
      if (gx >= gridSize) gx = gridSize - 1;
      if (gy < 0) gy = 0;
      if (gy >= gridSize) gy = gridSize - 1;
      row.push(grid[gy * gridSize + gx]);
    }
    p.push(row);
  }

  const colResults = [];
  for (let i = 0; i < 4; i++) {
    colResults.push(cubicInterpolate(p[i][0], p[i][1], p[i][2], p[i][3], dx));
  }

  return cubicInterpolate(colResults[0], colResults[1], colResults[2], colResults[3], dy);
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildTerrainHeightmap(
  realElevationData: Float32Array | null,
  resolution: number,
  gridWidth: number | null = null,
  gridHeight: number | null = null
) {
  // Use real elevation data if available with valid dimensions
  if (realElevationData && realElevationData.length > 0 && gridWidth && gridHeight) {
    const expectedLength = gridWidth * gridHeight;
    if (realElevationData.length !== expectedLength) {
      console.warn(`Elevation data length mismatch: got ${realElevationData.length}, expected ${expectedLength}`);
      return generateTerrainData(resolution, resolution);
    }

    const data = new Float32Array(resolution * resolution);

    let minElev = Infinity;
    let maxElev = -Infinity;
    for (let i = 0; i < realElevationData.length; i++) {
      minElev = Math.min(minElev, realElevationData[i]);
      maxElev = Math.max(maxElev, realElevationData[i]);
    }

    const range = maxElev - minElev || 1;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const gx = (x / (resolution - 1)) * (gridWidth - 1);
        const gy = (y / (resolution - 1)) * (gridHeight - 1);
        let elev = bicubicInterpolate(realElevationData, gridWidth, gx, gy);
        elev = ((elev - minElev) / range) * 2.0;
        data[y * resolution + x] = elev;
      }
    }

    return data;
  }

  return generateTerrainData(resolution, resolution);
}

function sampleTerrainHeight(terrainData: Float32Array, resolution: number, x: number, z: number) {
  const u = clampNumber((x + TERRAIN_HALF) / TERRAIN_SIZE, 0, 1);
  const v = clampNumber((-z + TERRAIN_HALF) / TERRAIN_SIZE, 0, 1);

  const gx = u * (resolution - 1);
  const gy = (1 - v) * (resolution - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const tx = gx - x0;
  const ty = gy - y0;

  const h00 = terrainData[y0 * resolution + x0];
  const h10 = terrainData[y0 * resolution + x1];
  const h01 = terrainData[y1 * resolution + x0];
  const h11 = terrainData[y1 * resolution + x1];

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;
  return hx0 + (hx1 - hx0) * ty;
}

function getTerrainSurfaceHeight(
  terrainData: Float32Array,
  resolution: number,
  x: number,
  z: number,
  revealScale: number
) {
  const elevation = sampleTerrainHeight(terrainData, resolution, x, z) * TERRAIN_ELEVATION_SCALE;
  return TERRAIN_BASE_Y + elevation * revealScale;
}

function downsampleTerrainData(
  terrainData: Float32Array,
  resolution: number,
  gridSize: number
): number[] {
  const downsampled: number[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const worldX = (x / (gridSize - 1)) * TERRAIN_SIZE - TERRAIN_HALF;
      const worldZ = (y / (gridSize - 1)) * TERRAIN_SIZE - TERRAIN_HALF;
      downsampled.push(sampleTerrainHeight(terrainData, resolution, worldX, worldZ));
    }
  }
  return downsampled;
}



function TerrainMesh({
  phase,
  progress,
  revealProgress,
  terrainData,
  polygon,
}: {
  phase: AnalysisPhase;
  progress: number;
  revealProgress: number;
  terrainData: Float32Array;
  polygon?: PolygonCoordinates[] | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const resolution = TERRAIN_RESOLUTION;

  const geometryData = useMemo(() => {
    const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon || []);

    if (polygon && polygon.length >= 3) {
      return createPolygonTerrainGeometry(normalized, terrainData, resolution, scaleX, scaleZ);
    }

    const geo = new THREE.PlaneGeometry(10, 10, resolution - 1, resolution - 1);
    const positions = geo.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const alphas = new Float32Array(vertexCount).fill(1.0);
    const edgeDistances = new Float32Array(vertexCount).fill(1.0);

    for (let i = 0; i < terrainData.length; i++) {
      const elevation = terrainData[i];
      positions[i * 3 + 2] = elevation * TERRAIN_ELEVATION_SCALE;
    }

    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('edgeDist', new THREE.BufferAttribute(edgeDistances, 1));
    geo.computeVertexNormals();
    return geo;
  }, [terrainData, polygon, resolution]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRevealProgress: { value: 0 },
        uElevationScale: { value: 0 },
      },
      vertexShader: `
        attribute float alpha;
        attribute float edgeDist;
        
        uniform float uRevealProgress;
        uniform float uElevationScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        varying float vEdgeDist;
        
        void main() {
          vUv = uv;
          vEdgeDist = edgeDist;
          
          float targetZ = position.z;
          float revealedZ = targetZ * uElevationScale;
          
          vec3 newPosition = vec3(position.x, position.y, revealedZ);
          vPosition = newPosition;
          vElevation = targetZ;
          
          float distFromCenter = length(uv - 0.5) * 2.0;
          vReveal = smoothstep(distFromCenter, distFromCenter + 0.3, uRevealProgress * 1.5);
          
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uRevealProgress;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        varying float vEdgeDist;
        
        vec3 getTerrainColor(float elevation) {
          vec3 water = vec3(0.56, 0.75, 0.82);
          vec3 sand = vec3(0.94, 0.91, 0.78);
          vec3 grass = vec3(0.64, 0.78, 0.46);
          vec3 forest = vec3(0.42, 0.63, 0.35);
          vec3 highland = vec3(0.58, 0.68, 0.45);
          vec3 rock = vec3(0.65, 0.60, 0.52);
          vec3 snow = vec3(0.96, 0.97, 0.98);
          
          float t = clamp(elevation, 0.0, 1.0);
          
          if (t < 0.08) {
            return mix(water, sand, t / 0.08);
          } else if (t < 0.20) {
            return mix(sand, grass, (t - 0.08) / 0.12);
          } else if (t < 0.45) {
            return mix(grass, forest, (t - 0.20) / 0.25);
          } else if (t < 0.65) {
            return mix(forest, highland, (t - 0.45) / 0.20);
          } else if (t < 0.85) {
            return mix(highland, rock, (t - 0.65) / 0.20);
          } else {
            return mix(rock, snow, (t - 0.85) / 0.15);
          }
        }
        
        void main() {
          float edgeAA = smoothstep(-0.05, 0.05, vEdgeDist);
          if (edgeAA < 0.01) {
            discard;
          }
          
          float normalizedElev = clamp(vElevation / 2.0, 0.0, 1.0);
          vec3 terrainColor = getTerrainColor(normalizedElev);
          
          vec3 lightDir = normalize(vec3(0.5, 0.4, 0.8));
          vec3 lightColor = vec3(1.0, 0.98, 0.95);
          
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.55;
          
          vec3 litColor = terrainColor * ambient;
          litColor += terrainColor * diffuse * 0.5 * lightColor;
          
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
          litColor += vec3(0.9, 0.95, 1.0) * fresnel * 0.08;
          
          float alpha = vReveal * edgeAA;
          
          gl_FragColor = vec4(litColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uRevealProgress.value = revealProgress;

      const targetScale = Math.min(revealProgress * 2, 1);
      materialRef.current.uniforms.uElevationScale.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uElevationScale.value,
        targetScale,
        0.05
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometryData}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, TERRAIN_BASE_Y, 0]}
    >
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}


// Beautiful animated grid floor
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
          vec2 uv = vUv * 50.0;
          
          float lineX = abs(fract(uv.x - 0.5) - 0.5) / fwidth(uv.x);
          float lineY = abs(fract(uv.y - 0.5) - 0.5) / fwidth(uv.y);
          float line = 1.0 - min(min(lineX, lineY), 1.0);
          
          // Radial reveal
          float dist = length(vUv - 0.5) * 2.0;
          float reveal = smoothstep(dist, dist + 0.2, uReveal * 1.5);
          float fade = 1.0 - smoothstep(0.4, 1.0, dist);
          
          // Pulse effect
          float pulse = 0.5 + 0.5 * sin(uTime * 0.8 - dist * 4.0);
          
          // Green-tinted grid
           vec3 gridColor = vec3(0.22, 0.58, 0.48);
           vec3 color = gridColor * line * fade * pulse * reveal;
           float alpha = line * fade * 0.18 * reveal;
          
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[35, 35]} />
      <primitive object={gridMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

function CameraController({ isEntering }: { phase: AnalysisPhase; isEntering: boolean }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(10, 7, 10));
  const animationProgress = useRef(0);
  const isAnimating = useRef(true);

  useEffect(() => {
    if (isEntering) {
      camera.position.set(20, 15, 20);
      targetPosition.current.set(10, 7, 10);
      animationProgress.current = 0;
      isAnimating.current = true;
    }
  }, [isEntering, camera]);

  useFrame(() => {
    if (!isAnimating.current) return;

    animationProgress.current += 0.015;

    if (animationProgress.current >= 1) {
      isAnimating.current = false;
      return;
    }

    camera.position.lerp(targetPosition.current, 0.03);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// Main scene component with transition support
interface TerrainAnalysisSceneProps {
  phase: AnalysisPhase;
  progress: number;
  isVisible: boolean;
  onTransitionComplete?: () => void;
  polygon?: PolygonCoordinates[] | null;
  className?: string;
}

export function TerrainAnalysisScene({
  phase,
  progress,
  isVisible,
  onTransitionComplete,
  polygon,
  className
}: TerrainAnalysisSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [revealProgress, setRevealProgress] = useState(0);
  const [realElevationData, setRealElevationData] = useState<Float32Array | null>(null);
  const [elevationBounds, setElevationBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [elevationGridWidth, setElevationGridWidth] = useState<number | null>(null);
  const [elevationGridHeight, setElevationGridHeight] = useState<number | null>(null);
  const [placementPlan, setPlacementPlan] = useState<PlacementPlan | null>(null);
  const [selectedZone, setSelectedZone] = useState<PlacementZone | null>(null);
  const draftConstraints = usePlanStore((state) => state.draftConstraints);
  const terrainData = useMemo(
    () => buildTerrainHeightmap(realElevationData, TERRAIN_RESOLUTION, elevationGridWidth, elevationGridHeight),
    [realElevationData, elevationGridWidth, elevationGridHeight]
  );

  // Calculate polygon bounds for placing objects within the terrain
  const polygonBounds = useMemo(() => getPolygonBounds(polygon), [polygon]);
  // Use ref to track revealProgress so useFrame callbacks get current value
  const revealProgressRef = useRef(revealProgress);
  useEffect(() => {
    revealProgressRef.current = revealProgress;
  }, [revealProgress]);

  const getSurfaceHeight = useCallback(
    (x: number, z: number) => {
      const revealScale = Math.min(revealProgressRef.current * 2, 1);
      return getTerrainSurfaceHeight(terrainData, TERRAIN_RESOLUTION, x, z, revealScale);
    },
    [terrainData]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      fetchElevationGrid(polygon)
        .then(({ data, gridWidth, gridHeight, bounds }) => {
          setRealElevationData(data);
          setElevationBounds(bounds);
          setElevationGridWidth(gridWidth);
          setElevationGridHeight(gridHeight);
        })
        .catch(err => {
          console.error("Failed to load elevation data", err);
        });
    }
  }, [polygon]);

  useEffect(() => {
    if (!draftConstraints?.budget || !draftConstraints?.energy || !draftConstraints?.technical) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const hasRealData = realElevationData && elevationBounds && elevationGridWidth && elevationGridHeight;
    const gridWidth = hasRealData ? elevationGridWidth : 10;
    const gridHeight = hasRealData ? elevationGridHeight : 10;
    const elevationGrid = hasRealData
      ? Array.from(realElevationData)
      : downsampleTerrainData(terrainData, TERRAIN_RESOLUTION, gridWidth);

    const bounds = hasRealData
      ? elevationBounds
      : calculateBounds(polygon?.map(p => ({ lat: p.lat, lng: p.lng })) ?? []);

    if (!bounds) {
      console.warn('Cannot calculate placements: missing bounds');
      return;
    }

    const latRange = bounds.north - bounds.south;
    const cellSizeMeters = (latRange * 111320) / gridHeight;

    const elevationFloat32 = new Float32Array(elevationGrid);
    const slopeGrid = calculateSlope(elevationFloat32, gridWidth, gridHeight, cellSizeMeters);
    const aspectGrid = calculateAspect(elevationFloat32, gridWidth, gridHeight);
    const solarSuitability = calculateSolarSuitability(elevationFloat32, slopeGrid, aspectGrid, gridWidth, gridHeight);
    const windSuitability = calculateWindSuitability(elevationFloat32, slopeGrid, gridWidth, gridHeight);

    const streamPlacements = async () => {
      console.log('[Placements] Starting fetch...');
      try {
        const res = await fetch('/api/terrain/placements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elevationGrid,
            gridWidth,
            gridHeight,
            slopeGrid: Array.from(slopeGrid),
            aspectGrid: Array.from(aspectGrid),
            solarSuitability: Array.from(solarSuitability),
            windSuitability: Array.from(windSuitability),
            constraints: draftConstraints,
            bounds,
          }),
          signal: controller.signal,
        });

        console.log('[Placements] Response status:', res.status);
        if (!res.ok) throw new Error('Placement plan request failed');
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          console.log('[Placements] Chunk received:', chunk.length, 'chars');

          try {
            const jsonStart = accumulated.indexOf('{');
            if (jsonStart === -1) continue;

            const jsonPart = accumulated.slice(jsonStart);
            const parsed = parsePartialJson(jsonPart) as Partial<PlacementPlan>;

            if (parsed?.zones?.length) {
              const validatedZones = parsed.zones.filter(z => validateZone(z));
              console.log('[Placements] Validated zones:', validatedZones.length);
              setPlacementPlan({ zones: validatedZones });
            }
          } catch {
            // partial-json couldn't parse yet
          }
        }

        console.log('[Placements] Stream complete. Total:', accumulated.length, 'chars');
        if (!cancelled) {
          try {
            const jsonStart = accumulated.indexOf('{');
            const jsonEnd = accumulated.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
              const finalJson = JSON.parse(accumulated.slice(jsonStart, jsonEnd + 1)) as PlacementPlan;
              const validatedZones = (finalJson.zones ?? []).filter(z => validateZone(z));

              if (validatedZones.length === 0) {
                throw new Error('No valid zones found in response');
              }

              console.log('[Placements] Final zones:', validatedZones.length);
              setPlacementPlan({ zones: validatedZones });
            }
          } catch (parseError) {
            console.error('[Placements] Failed to parse final JSON or no zones:', parseError);
            throw parseError;
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[Placements] Error:', error);

          console.log('[Placements] Activating fallback demo data');
          const fallbackZones: PlacementZone[] = [
            { x1: -0.5, z1: 0.2, x2: 0.5, z2: 0.6, type: 'solar', suitability: 95 },
            { x1: 0.4, z1: -0.7, x2: 0.7, z2: -0.4, type: 'wind', suitability: 88 }
          ];
          setPlacementPlan({ zones: fallbackZones });
        }
      }
    };

    streamPlacements();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [realElevationData, terrainData, elevationBounds, elevationGridWidth, elevationGridHeight, draftConstraints, polygon]);

  // Progressive reveal animation
  useEffect(() => {
    if (isVisible) {
      setIsEntering(true);
      setRevealProgress(0);

      // Animate reveal progress
      const startTime = Date.now();
      const duration = 3000; // 3 seconds for full reveal

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setRevealProgress(newProgress);

        if (newProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsEntering(false);
          onTransitionComplete?.();
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isVisible, onTransitionComplete]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1]
          }}
          className={cn(
            "absolute top-0 bottom-0 left-0 right-[420px] z-0",
            className
          )}
        >
          <Canvas
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance'
            }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#f8fafc']} />

            <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={45} />
            <CameraController phase={phase} isEntering={isEntering} />

            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 15, 8]}
              intensity={1.0}
              color="#fff7ed"
            />
            <pointLight position={[-8, 5, -8]} intensity={0.35} color="#86efac" />
            <pointLight position={[8, 3, 8]} intensity={0.25} color="#7dd3fc" />
            <hemisphereLight args={['#cfe8ff', '#b7e4c7', 0.35]} />

            <TerrainMesh
              phase={phase}
              progress={progress}
              revealProgress={revealProgress}
              terrainData={terrainData}
              polygon={polygon}
            />
            <TerrainCrossSection
              polygon={polygon}
              terrainData={terrainData}
              resolution={TERRAIN_RESOLUTION}
              revealProgress={revealProgress}
            />
            {placementPlan?.zones && (
              <ZoneOverlays
                zones={placementPlan.zones}
                getSurfaceHeight={getSurfaceHeight}
                polygonBounds={polygonBounds}
                onZoneClick={setSelectedZone}
                selectedZoneId={selectedZone?.id}
              />
            )}
            <GridFloor revealProgress={revealProgress} />

            <OrbitControls
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={50}
              minPolarAngle={0.1}
              maxPolarAngle={Math.PI / 2.05}
              autoRotate={false}
              enableDamping={true}
              dampingFactor={0.08}
              rotateSpeed={0.8}
              zoomSpeed={1.2}
              panSpeed={0.8}
            />

            {/* Atmospheric fog */}
            <fog attach="fog" args={['#f8fafc', 14, 40]} />
          </Canvas>

          {selectedZone && (
            <div className="absolute bottom-4 left-4 max-w-sm bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ZONE_ICONS[selectedZone.type]}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {selectedZone.name || selectedZone.id || 'Zone'}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {selectedZone.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Suitability</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${selectedZone.suitability}%`,
                          backgroundColor: ZONE_COLORS[selectedZone.type],
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{selectedZone.suitability}%</span>
                  </div>
                </div>

                {selectedZone.estimatedCapacityMW && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Est. Capacity</span>
                    <span className="text-xs font-medium text-gray-700">
                      {selectedZone.estimatedCapacityMW} {selectedZone.type === 'battery_storage' ? 'MWh' : 'MW'}
                    </span>
                  </div>
                )}

                {selectedZone.notes && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-gray-100">
                    {selectedZone.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TerrainAnalysisScene;
