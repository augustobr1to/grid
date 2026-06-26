/**
 * MainMenu.js — main menu controller.
 */
export const MainMenu = {
    _callback: null,

    init(onPlay) {
        this._callback = onPlay;

        const btn = document.getElementById('btn-play');
        if (btn) {
            btn.addEventListener('click', () => this._onPlay());
        }

        // Team preference buttons
        const teamBtns = document.querySelectorAll('.team-btn');
        teamBtns.forEach(b => {
            b.addEventListener('click', () => {
                teamBtns.forEach(tb => tb.classList.remove('active'));
                b.classList.add('active');
            });
        });
    },

    show() {
        const el = document.getElementById('main-menu');
        if (el) el.classList.remove('hidden');
    },

    hide() {
        const el = document.getElementById('main-menu');
        if (el) el.classList.add('hidden');
    },

    _onPlay() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput?.value || 'Player';
        const activeBtn = document.querySelector('.team-btn.active');
        const teamPref = activeBtn?.id === 'team-blue' ? 'blue'
            : activeBtn?.id === 'team-red' ? 'red' : 'auto';
        if (this._callback) this._callback(name, teamPref);
    },
};
