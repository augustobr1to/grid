import * as THREE from 'three';

export type ShaderFactory<TParams extends Record<string, unknown> = Record<string, unknown>> = (
  params?: TParams
) => THREE.ShaderMaterial;

export class ShaderLibrary {
  private readonly factories = new Map<string, ShaderFactory>();

  register<TParams extends Record<string, unknown>>(name: string, factory: ShaderFactory<TParams>): void {
    if (this.factories.has(name)) throw new Error(`[ShaderLibrary] Shader already registered: ${name}`);
    // Widen the param type for storage; create() narrows again at the call site.
    this.factories.set(name, factory as ShaderFactory);
  }

  create<TParams extends Record<string, unknown>>(name: string, params?: TParams): THREE.ShaderMaterial {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`[ShaderLibrary] Unknown shader: ${name}`);
    return factory(params);
  }

  list(): string[] {
    return [...this.factories.keys()].sort();
  }
}

export const shaderLibrary = new ShaderLibrary();

export interface HologramMaterialParams {
  color?: THREE.ColorRepresentation;
  fresnelPower?: number;
  opacity?: number;
}

export function createHologramMaterial(params: HologramMaterialParams = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(params.color ?? 0x45f3ff) },
      uTime: { value: 0 },
      uFresnelPower: { value: params.fresnelPower ?? 2.2 },
      uOpacity: { value: params.opacity ?? 0.72 },
    },
    vertexShader: hologramVertexShader,
    fragmentShader: hologramFragmentShader,
  });
}

export interface GridPulseMaterialParams {
  lineColor?: THREE.ColorRepresentation;
  baseColor?: THREE.ColorRepresentation;
  cellSize?: number;
}

export function createGridPulseMaterial(params: GridPulseMaterialParams = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLineColor: { value: new THREE.Color(params.lineColor ?? 0x6be7ff) },
      uBaseColor: { value: new THREE.Color(params.baseColor ?? 0x050816) },
      uCellSize: { value: params.cellSize ?? 1 },
      uTime: { value: 0 },
    },
    vertexShader: gridPulseVertexShader,
    fragmentShader: gridPulseFragmentShader,
  });
}

export function advanceShaderTime(material: THREE.Material, deltaTimeInSec: number): void {
  if (!(material instanceof THREE.ShaderMaterial)) return;
  const time = material.uniforms.uTime;
  if (time && typeof time.value === 'number') time.value += deltaTimeInSec;
}

const hologramVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const hologramFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uFresnelPower;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), uFresnelPower);
  float scan = smoothstep(0.02, 0.0, abs(fract(vUv.y * 18.0 - uTime * 1.6) - 0.5));
  float alpha = clamp((fresnel + scan * 0.35) * uOpacity, 0.08, 1.0);
  gl_FragColor = vec4(uColor * (0.65 + fresnel), alpha);
}
`;

const gridPulseVertexShader = /* glsl */ `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const gridPulseFragmentShader = /* glsl */ `
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uCellSize;
uniform float uTime;

varying vec3 vWorldPosition;

float gridLine(vec2 coord) {
  vec2 grid = abs(fract(coord / uCellSize - 0.5) - 0.5) / fwidth(coord / uCellSize);
  return 1.0 - min(min(grid.x, grid.y), 1.0);
}

void main() {
  float line = gridLine(vWorldPosition.xz);
  float pulse = 0.5 + 0.5 * sin(length(vWorldPosition.xz) * 1.8 - uTime * 3.0);
  vec3 color = mix(uBaseColor, uLineColor, line * (0.55 + pulse * 0.45));
  gl_FragColor = vec4(color, 1.0);
}
`;

shaderLibrary.register('hologram', createHologramMaterial);
shaderLibrary.register('gridPulse', createGridPulseMaterial);
