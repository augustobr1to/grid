/**
 * VoiceChat.js — P2P proximity-agnostic voice via PeerJS (WebRTC).
 *
 * Colyseus brokers PeerJS ids through room state; this module dials every known
 * remote peer and plays their audio. Voice is best-effort: any failure (mic
 * denied, peer unreachable) is logged and never breaks the game loop.
 *
 * peerjs is imported dynamically so a denied/absent mic never blocks app start
 * and the WebRTC bundle is only fetched when the player actually enters a match.
 */
export default class VoiceChat {
    constructor() {
        this._peer = null;
        this._localStream = null;
        this._myId = null;
        this._calls = new Map(); // remote peerId → MediaConnection
        this._enabled = false;
    }

    /**
     * Acquire mic, create the PeerJS peer, and report our peer id via onPeerId.
     * Returns false (not throws) if voice could not start.
     */
    async init(onPeerId) {
        try {
            this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const { default: Peer } = await import('peerjs');
            this._peer = new Peer();

            this._peer.on('open', (id) => {
                this._myId = id;
                this._enabled = true;
                onPeerId?.(id);
            });
            this._peer.on('call', (call) => {
                call.answer(this._localStream);
                this._bindCall(call);
            });
            this._peer.on('error', (err) => console.warn('[Voice] peer error', err));
            return true;
        } catch (err) {
            console.warn('[Voice] disabled (mic denied or PeerJS unavailable):', err);
            return false;
        }
    }

    /** Dial any peer ids we are not already connected to. */
    connectPeers(peerIds) {
        if (!this._enabled || !this._peer || !this._localStream) return;
        for (const pid of peerIds) {
            if (!pid || pid === this._myId || this._calls.has(pid)) continue;
            try {
                const call = this._peer.call(pid, this._localStream);
                if (call) this._bindCall(call);
            } catch (err) {
                console.warn('[Voice] call failed', pid, err);
            }
        }
    }

    _bindCall(call) {
        this._calls.set(call.peer, call);
        call.on('stream', (remoteStream) => this._play(call.peer, remoteStream));
        call.on('close', () => this._cleanup(call.peer));
        call.on('error', () => this._cleanup(call.peer));
    }

    _play(peerId, stream) {
        let el = document.getElementById(`voice-${peerId}`);
        if (!el) {
            el = document.createElement('audio');
            el.id = `voice-${peerId}`;
            el.autoplay = true;
            document.body.appendChild(el);
        }
        el.srcObject = stream;
    }

    _cleanup(peerId) {
        const el = document.getElementById(`voice-${peerId}`);
        if (el) el.remove();
        this._calls.delete(peerId);
    }

    dispose() {
        for (const peerId of this._calls.keys()) this._cleanup(peerId);
        this._localStream?.getTracks().forEach((t) => t.stop());
        this._peer?.destroy();
        this._enabled = false;
    }
}
