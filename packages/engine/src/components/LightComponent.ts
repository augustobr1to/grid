/**
 * LightComponent — creates a THREE.Light and adds it to the group.
 */
import * as THREE from 'three';
import Component from '../Component';
import type { LightComponentJSON } from '../types';

export default class LightComponent extends Component {
    private _light: THREE.Light | null = null;

    async load(): Promise<void> {
        const data = this.jsonData as LightComponentJSON;
        const color = data.color ? new THREE.Color(data.color) : new THREE.Color(0xffffff);
        const intensity = data.intensity ?? 1;

        switch (data.lightType) {
            case 'AmbientLight':
                this._light = new THREE.AmbientLight(color, intensity);
                break;
            case 'DirectionalLight':
                this._light = new THREE.DirectionalLight(color, intensity);
                break;
            case 'HemisphereLight':
                this._light = new THREE.HemisphereLight(color, new THREE.Color(0x444444), intensity);
                break;
            case 'PointLight':
                this._light = new THREE.PointLight(color, intensity);
                break;
            case 'SpotLight':
                this._light = new THREE.SpotLight(color, intensity);
                break;
            default:
                throw new Error(`[LightComponent] Unknown light type: ${data.lightType}`);
        }

        if (data.position && this._light) {
            this._light.position.set(
                data.position.x ?? 0,
                data.position.y ?? 0,
                data.position.z ?? 0
            );
        }

        if (this._light) {
            this.gameObject.threeJSGroup.add(this._light);
        }
    }

    unload(): void {
        if (this._light) {
            this.gameObject.threeJSGroup.remove(this._light);
            this._light.dispose();
            this._light = null;
        }
    }
}
