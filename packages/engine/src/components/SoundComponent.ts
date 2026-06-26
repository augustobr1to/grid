/**
 * SoundComponent — loads audio and creates THREE.PositionalAudio.
 */
import * as THREE from 'three';
import Component from '../Component';
import type { SoundComponentJSON } from '../types';

export default class SoundComponent extends Component {
    private _positionalAudio: THREE.PositionalAudio | null = null;

    async load(): Promise<void> {
        const data = this.jsonData as SoundComponentJSON;
        const scene = this.gameObject.getScene();
        const game = scene.game;

        // Get the audio listener from the renderer
        const listener = game.renderer.getCameraAudioListener();
        if (!listener) return;

        // Load audio buffer
        const asset = await game.assetStore.load(data.assetPath);
        const buffer = asset.data as AudioBuffer;
        if (!buffer) return;

        this._positionalAudio = new THREE.PositionalAudio(listener);
        this._positionalAudio.setBuffer(buffer);

        if (data.loop !== undefined) this._positionalAudio.setLoop(data.loop);
        if (data.volume !== undefined) this._positionalAudio.setVolume(data.volume);
        if (data.playbackRate !== undefined) this._positionalAudio.playbackRate = data.playbackRate;
        if (data.refDistance !== undefined) this._positionalAudio.setRefDistance(data.refDistance);
        if (data.rolloffFactor !== undefined) this._positionalAudio.setRolloffFactor(data.rolloffFactor);
        if (data.distanceModel !== undefined) this._positionalAudio.setDistanceModel(data.distanceModel);
        if (data.maxDistance !== undefined) this._positionalAudio.setMaxDistance(data.maxDistance);

        this.gameObject.threeJSGroup.add(this._positionalAudio);

        if (data.autoplay) {
            this._positionalAudio.play();
        }
    }

    playSound(delayInSec?: number, detune?: number): void {
        if (!this._positionalAudio) return;
        if (this._positionalAudio.isPlaying) {
            this._positionalAudio.stop();
        }
        if (detune !== undefined) this._positionalAudio.setDetune(detune);
        if (delayInSec !== undefined) {
            setTimeout(() => this._positionalAudio?.play(), delayInSec * 1000);
        } else {
            this._positionalAudio.play();
        }
    }

    unload(): void {
        if (this._positionalAudio) {
            if (this._positionalAudio.isPlaying) {
                this._positionalAudio.stop();
            }
            this.gameObject.threeJSGroup.remove(this._positionalAudio);
            this._positionalAudio = null;
        }
    }
}
