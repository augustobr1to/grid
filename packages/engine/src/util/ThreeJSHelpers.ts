/**
 * Three.js utility helpers for common operations.
 */
import * as THREE from 'three';

/**
 * Disposes all geometries, materials, and textures in a Three.js object recursively.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                        disposeMaterial(mat);
                    });
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });
}

function disposeMaterial(material: THREE.Material): void {
    material.dispose();
    // Dispose textures on the material
    const mat = material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    if (mat.aoMap) mat.aoMap.dispose();
    if (mat.emissiveMap) mat.emissiveMap.dispose();
    if (mat.envMap) mat.envMap.dispose();
}
