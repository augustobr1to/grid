/**
 * ModelComponent — loads a GLTF/GLB model and adds it to the ThreeJS group.
 */
import * as THREE from 'three';
import Component from '../Component';
import type { ModelComponentJSON } from '../types';
import GLTFAsset from '../assets/GLTFAsset';

export default class ModelComponent extends Component {
    private _model: THREE.Object3D | null = null;

    async load(): Promise<void> {
        const data = this.jsonData as ModelComponentJSON;
        const game = this.gameObject.getScene().game;
        const asset = await game.assetStore.load(data.assetPath) as GLTFAsset;

        if (asset.gltf) {
            this._model = asset.gltf.scene.clone();

            // Apply local transform overrides
            if (data.position) {
                this._model.position.set(
                    data.position.x ?? 0,
                    data.position.y ?? 0,
                    data.position.z ?? 0
                );
            }
            if (data.scale) {
                this._model.scale.set(
                    data.scale.x ?? 1,
                    data.scale.y ?? 1,
                    data.scale.z ?? 1
                );
            }
            if (data.rotation) {
                this._model.rotation.set(
                    data.rotation.x ?? 0,
                    data.rotation.y ?? 0,
                    data.rotation.z ?? 0,
                    (data.rotation.order as THREE.EulerOrder) ?? 'XYZ'
                );
            }

            this.gameObject.threeJSGroup.add(this._model);
        }
    }

    unload(): void {
        if (this._model) {
            this.gameObject.threeJSGroup.remove(this._model);
            this._model = null;
        }
    }
}
