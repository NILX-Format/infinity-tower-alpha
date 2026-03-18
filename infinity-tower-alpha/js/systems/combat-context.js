window.CombatContextSystem = {
    getContext(game) {
        return {
            focusDirection: game.focusDirection || null,
            heightLayer: game.heightLayer || 0,
            visibilityMode: game.visibilityMode || "radial",
            heightPenaltyMultiplier: 1,
            directionPenaltyMultiplier: 1,
            targetingConfidenceMultiplier: 1
        };
    },

    getEffectiveCombatStats(game) {
        const stats = game.turret.stats;
        const speedFactor = 1 + stats.speed * 0.25;
        const weaponCooldownMult = window.ModifierSystem.getWeaponCooldownMultiplier(
            game,
            game.getActiveWeapon()
        );
        const context = this.getContext(game);

        return {
            atk: stats.atk,
            speed: stats.speed,
            range: stats.range,
            cooldownMultiplier:
                (1 / speedFactor) *
                weaponCooldownMult *
                context.directionPenaltyMultiplier,
            tickMultiplier: speedFactor * context.targetingConfidenceMultiplier,
            heightPenaltyMultiplier: context.heightPenaltyMultiplier,
            directionPenaltyMultiplier: context.directionPenaltyMultiplier,
            targetingConfidenceMultiplier: context.targetingConfidenceMultiplier
        };
    }
};
