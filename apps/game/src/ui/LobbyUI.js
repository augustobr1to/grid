/**
 * LobbyUI.js — lobby panel controller (player counts, map seed, join button).
 */
export const LobbyUI = {
    show(data) {
        // Lobby rendering — currently handled inline in main menu
        console.log('[LobbyUI] Show', data);
    },

    hide() {
        // No-op for now; lobby is integrated into main menu
    },

    update(playerCounts, mapSeed, matchState) {
        // Update lobby display
        console.log('[LobbyUI] Update', { playerCounts, mapSeed, matchState });
    },
};
