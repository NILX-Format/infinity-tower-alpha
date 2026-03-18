window.VisibilitySystem = {
    getEffectiveView(game) {
        return window.ModifierSystem.getEffectiveView(game, game.turret.stats.view, game.viewCap);
    },

    isPositionRevealed(game, x, y) {
        return true;
    },

    getActiveFlares(game) {
        return game.activeFlares || [];
    },

    pruneExpiredFlares(game) {
        game.activeFlares = this.getActiveFlares(game).filter(flare => flare.expiresAtWave > game.wave);
    },

    shouldDrawFog(game) {
        return false;
    },

    launchFlare(game, x, y) {
        return false;
    }
};
