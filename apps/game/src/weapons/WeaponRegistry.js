/**
 * WeaponRegistry.js — all weapon definitions.
 * Every field is required per the spec.
 */
export const WeaponRegistry = {
    smg: {
        id: 'smg',
        slot: 'sr',
        name: 'SYNTH SMG',
        damage: 18,
        pellets: 1,
        fireRateHz: 12,
        magSize: 60,
        ammoWeight: 0.8,
        range: 35,
        spread: 0.04,
        tracerColor: 0x00ffff,
    },
    shotgun: {
        id: 'shotgun',
        slot: 'sr',
        name: 'CIRCUIT SHOTGUN',
        damage: 14,
        pellets: 8,
        fireRateHz: 1.2,
        magSize: 8,
        ammoWeight: 2.5,
        range: 20,
        spread: 0.15,
        tracerColor: 0xff00ff,
    },
    rifle: {
        id: 'rifle',
        slot: 'hr',
        name: 'LIGHTLINE RIFLE',
        damage: 55,
        pellets: 1,
        fireRateHz: 2.5,
        magSize: 20,
        ammoWeight: 3.0,
        range: 150,
        spread: 0.01,
        tracerColor: 0xffff00,
    },
    sniper: {
        id: 'sniper',
        slot: 'hr',
        name: 'GRID SNIPER',
        damage: 95,
        pellets: 1,
        fireRateHz: 0.6,
        magSize: 5,
        ammoWeight: 6.0,
        range: 300,
        spread: 0.002,
        tracerColor: 0x00ff88,
    },
};

export function getWeapon(id) {
    return WeaponRegistry[id] || null;
}

export function getWeaponsBySlot(slot) {
    return Object.values(WeaponRegistry).filter(w => w.slot === slot);
}
