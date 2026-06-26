/**
 * SFXManifest.js — Howler sprite offsets for all game SFX.
 * All SFX packed into a single sprite file.
 */
export const SFX_SPRITE = {
    shoot_smg: [0, 200],
    shoot_shotgun: [300, 400],
    shoot_rifle: [800, 300],
    shoot_sniper: [1200, 500],
    reload_smg: [1800, 800],
    reload_rifle: [2700, 800],
    footstep_a: [3600, 150],
    footstep_b: [3800, 150],
    point_capture: [4000, 1000],
    spawn: [5100, 600],
    hit_confirm: [5800, 200],
    ui_click: [6100, 100],
};

export const SFX_KEYS = Object.keys(SFX_SPRITE);
