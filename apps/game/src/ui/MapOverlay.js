/**
 * MapOverlay.js — tactical map toggle (M key).
 * Renders capture points, players onto a 2D canvas.
 */
export const MapOverlay = {
    _visible: false,
    _canvas: null,
    _ctx: null,

    toggle() {
        this._visible = !this._visible;
        const el = document.getElementById('map-overlay');
        if (el) el.style.display = this._visible ? '' : 'none';

        if (this._visible && !this._canvas) {
            this._canvas = document.getElementById('map-canvas');
            if (this._canvas) this._ctx = this._canvas.getContext('2d');
        }
    },

    isOpen() { return this._visible; },

    render(playerPos, playerYaw, capturePoints, remotePlayers, localTeam) {
        if (!this._ctx || !this._canvas) return;

        const ctx = this._ctx;
        const w = this._canvas.width;
        const h = this._canvas.height;
        const mapScale = 0.4;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1a1a3e';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 20) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let i = 0; i < h; i += 20) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        // Capture points
        for (const cp of capturePoints) {
            const sx = cx + cp.position.x * mapScale;
            const sy = cy + cp.position.z * mapScale;

            ctx.beginPath();
            ctx.arc(sx, sy, cp.isBase ? 8 : 5, 0, Math.PI * 2);

            if (cp.ownerTeam === 'blue') ctx.fillStyle = '#4488ff';
            else if (cp.ownerTeam === 'red') ctx.fillStyle = '#ff4444';
            else ctx.fillStyle = '#666666';

            ctx.fill();

            if (cp.active) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Index label
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px monospace';
            ctx.fillText(String(cp.index), sx - 3, sy + 3);
        }

        // Remote players
        for (const [_id, mesh] of remotePlayers) {
            const sx = cx + mesh.position.x * mapScale;
            const sy = cy + mesh.position.z * mapScale;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#888888';
            ctx.fill();
        }

        // Local player
        const lx = cx + playerPos.x * mapScale;
        const ly = cy + playerPos.z * mapScale;

        // Direction arrow
        const arrowLen = 12;
        const ax = lx + Math.sin(playerYaw) * -arrowLen;
        const ay = ly + Math.cos(playerYaw) * -arrowLen;
        ctx.strokeStyle = localTeam === 'blue' ? '#4488ff' : '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        // Player dot
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = localTeam === 'blue' ? '#44bbff' : '#ff6666';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    },
};
