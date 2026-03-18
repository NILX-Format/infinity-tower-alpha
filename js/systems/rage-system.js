window.RageSystem = {
    initialize(game) {
        game.rageState = {
            warningLeadMs: 10000,
            triggerDelayMs: 90000,
            stackIntervalMs: 5000,
            speedPerStack: 0.12,
            damagePerStack: 0.18,
            cooldownPerStack: 0.10,
            active: false,
            warning: false,
            warningTimerMs: 0,
            elapsedSinceSpawnCompleteMs: 0,
            stackTimerMs: 0,
            level: 0,
            ...(game.rageState || {})
        };
    },

    reset(game) {
        game.rageState.active = false;
        game.rageState.warning = false;
        game.rageState.warningTimerMs = 0;
        game.rageState.elapsedSinceSpawnCompleteMs = 0;
        game.rageState.stackTimerMs = 0;
        game.rageState.level = 0;
    },

    update(game, deltaMs) {
        if (game.waveTransitioning) {
            this.reset(game);
            return;
        }

        const hostileCount = game.enemies.filter(e => game.isHostile(e)).length;
        const allSpawned = game.enemiesSpawned >= game.enemiesToSpawn;

        if (!allSpawned || hostileCount < 1) {
            this.reset(game);
            return;
        }

        game.rageState.elapsedSinceSpawnCompleteMs += deltaMs;

        if (!game.rageState.warning && !game.rageState.active) {
            const threshold = game.rageState.triggerDelayMs - game.rageState.warningLeadMs;
            if (game.rageState.elapsedSinceSpawnCompleteMs >= threshold) {
                game.rageState.warning = true;
                game.rageState.warningTimerMs = game.rageState.warningLeadMs;
            }
        }

        if (game.rageState.warning) {
            game.rageState.warningTimerMs = Math.max(0, game.rageState.warningTimerMs - deltaMs);
            if (game.rageState.warningTimerMs <= 0) {
                game.rageState.warning = false;
                game.rageState.active = true;
                game.rageState.level = Math.max(1, game.rageState.level);
                game.rageState.stackTimerMs = game.rageState.stackIntervalMs;
            }
        } else if (game.rageState.active) {
            game.rageState.stackTimerMs -= deltaMs;
            if (game.rageState.stackTimerMs <= 0) {
                game.rageState.level++;
                game.rageState.stackTimerMs += game.rageState.stackIntervalMs;
            }
        }
    },

    getSpeedMultiplier(game) {
        if (!game.rageState.active || game.rageState.level <= 0) return 1;
        return 1 + game.rageState.speedPerStack * game.rageState.level;
    },

    getDamageMultiplier(game) {
        if (!game.rageState.active || game.rageState.level <= 0) return 1;
        return 1 + game.rageState.damagePerStack * game.rageState.level;
    },

    getCooldownMultiplier(game) {
        if (!game.rageState.active || game.rageState.level <= 0) return 1;
        return Math.max(0.35, 1 - game.rageState.cooldownPerStack * game.rageState.level);
    }
};
