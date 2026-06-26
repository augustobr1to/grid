/**
 * Scoreboard.js — hold-tab scoreboard.
 */
export const Scoreboard = {
    show() {
        const el = document.getElementById('scoreboard');
        if (el) el.style.display = '';
    },

    hide() {
        const el = document.getElementById('scoreboard');
        if (el) el.style.display = 'none';
    },

    update(teams) {
        const content = document.getElementById('score-content');
        if (!content) return;

        content.innerHTML = '';
        for (const team of Object.keys(teams)) {
            const section = document.createElement('div');
            section.className = 'mb-3';
            section.innerHTML = `<div class="${team === 'blue' ? 'neon-text' : 'neon-text-red'} font-bold mb-1">${team.toUpperCase()}</div>`;
            for (const player of teams[team]) {
                const row = document.createElement('div');
                row.className = 'flex justify-between text-gray-300 text-xs px-2';
                row.innerHTML = `<span>${player.name}</span><span>${player.kills}K/${player.deaths}D</span>`;
                section.appendChild(row);
            }
            content.appendChild(section);
        }
    },
};
