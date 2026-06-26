/**
 * ArsenalUI.js — controls the arsenal loadout panel.
 */
import { getWeapon } from '../weapons/WeaponRegistry.js';

export const ArsenalUI = {
    _callback: null,
    _inited: false,

    show(srId, hrId, onEquip) {
        this._callback = onEquip;
        const el = document.getElementById('arsenal-ui');
        if (el) el.classList.remove('hidden');

        if (!this._inited) {
            this._init();
            this._inited = true;
        }

        // Set defaults
        const srSel = document.getElementById('sr-weapon');
        const hrSel = document.getElementById('hr-weapon');
        if (srSel) srSel.value = srId;
        if (hrSel) hrSel.value = hrId;
        this._updateWeight();

        // Release pointer lock for UI interaction
        document.exitPointerLock();
    },

    hide() {
        const el = document.getElementById('arsenal-ui');
        if (el) el.classList.add('hidden');
    },

    _init() {
        // Equip button
        const btn = document.getElementById('btn-equip');
        if (btn) {
            btn.addEventListener('click', () => this._equip());
        }

        // Range sliders update
        const srSlider = document.getElementById('sr-rounds');
        const hrSlider = document.getElementById('hr-rounds');
        if (srSlider) srSlider.addEventListener('input', () => this._updateWeight());
        if (hrSlider) hrSlider.addEventListener('input', () => this._updateWeight());

        // Weapon select changes
        const srSel = document.getElementById('sr-weapon');
        const hrSel = document.getElementById('hr-weapon');
        if (srSel) srSel.addEventListener('change', () => this._updateWeight());
        if (hrSel) hrSel.addEventListener('change', () => this._updateWeight());
    },

    _updateWeight() {
        const srSel = document.getElementById('sr-weapon');
        const hrSel = document.getElementById('hr-weapon');
        const srSlider = document.getElementById('sr-rounds');
        const hrSlider = document.getElementById('hr-rounds');
        const srRoundsVal = document.getElementById('sr-rounds-val');
        const hrRoundsVal = document.getElementById('hr-rounds-val');
        const srWeightEl = document.getElementById('sr-weight');
        const hrWeightEl = document.getElementById('hr-weight');
        const totalWeightEl = document.getElementById('total-weight');
        const weightBar = document.getElementById('weight-bar');

        if (!srSel || !hrSel || !srSlider || !hrSlider) return;

        const srWep = getWeapon(srSel.value);
        const hrWep = getWeapon(hrSel.value);
        const srRounds = parseInt(srSlider.value, 10);
        const hrRounds = parseInt(hrSlider.value, 10);

        const srWeight = srWep ? srRounds * srWep.ammoWeight : 0;
        const hrWeight = hrWep ? hrRounds * hrWep.ammoWeight : 0;
        const total = srWeight + hrWeight;

        if (srRoundsVal) srRoundsVal.textContent = srRounds;
        if (hrRoundsVal) hrRoundsVal.textContent = hrRounds;
        if (srWeightEl) srWeightEl.textContent = srWeight.toFixed(1);
        if (hrWeightEl) hrWeightEl.textContent = hrWeight.toFixed(1);
        if (totalWeightEl) totalWeightEl.textContent = `${Math.round(total)} / 100`;
        if (weightBar) {
            const pct = Math.min(100, total);
            weightBar.style.width = `${pct}%`;
            weightBar.className = total > 100 ? 'weight-fill over' : 'weight-fill';
        }

        // Clamp slider if over budget
        if (total > 100) {
            // Don't block yet; just visual feedback
        }
    },

    _equip() {
        const srSel = document.getElementById('sr-weapon');
        const hrSel = document.getElementById('hr-weapon');
        const srSlider = document.getElementById('sr-rounds');
        const hrSlider = document.getElementById('hr-rounds');

        if (!srSel || !hrSel || !srSlider || !hrSlider) return;

        const srWep = getWeapon(srSel.value);
        const hrWep = getWeapon(hrSel.value);
        const srRounds = parseInt(srSlider.value, 10);
        const hrRounds = parseInt(hrSlider.value, 10);

        const srWeight = srWep ? srRounds * srWep.ammoWeight : 0;
        const hrWeight = hrWep ? hrRounds * hrWep.ammoWeight : 0;
        if (srWeight + hrWeight > 100) return; // Over budget

        if (this._callback) {
            this._callback(srSel.value, hrSel.value, srRounds, hrRounds);
        }
    },
};
