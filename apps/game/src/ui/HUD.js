/**
 * HUD.js — minimal ammo HUD (bottom-right).
 */
export const HUD = {
    _currentEl: null,
    _reserveEl: null,

    init() {
        this._currentEl = document.getElementById('hud-ammo-current');
        this._reserveEl = document.getElementById('hud-ammo-reserve');
    },

    update(current, max) {
        if (this._currentEl) this._currentEl.textContent = current;
        if (this._reserveEl) this._reserveEl.textContent = max;
    },

    show() {
        const el = document.getElementById('hud');
        if (el) el.style.display = '';
    },

    hide() {
        const el = document.getElementById('hud');
        if (el) el.style.display = 'none';
    },
};
