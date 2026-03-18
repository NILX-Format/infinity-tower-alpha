window.SurvivalSystem = {
    updateCooldowns(game, dt) {
        window.ModifierSystem.updateShieldField(game, dt);

        if (game.modifierState.reviveCooldown > 0) {
            game.modifierState.reviveCooldown = Math.max(0, game.modifierState.reviveCooldown - dt);
            if (game.modifierState.reviveCooldown <= 0) {
                game.modifierState.reviveUsed = false;
            }
        }
        if (game.modifierState.immortalCooldown > 0) {
            game.modifierState.immortalCooldown = Math.max(0, game.modifierState.immortalCooldown - dt);
        }
    },

    updatePassiveRegen(game, dt) {
        const deltaTime = dt / 60;
        let regenRate = game.getRegenRate();
        if (game.regenSuppressed) regenRate *= 0.5;
        game.currentRegenRate = regenRate;

        game.turret.stats.hp = Math.min(
            game.turret.stats.maxHp,
            game.turret.stats.hp + regenRate * deltaTime
        );
        window.ModifierSystem.applyPassiveHpRegen(game, dt);
    },

    processEnemyAttack(game, enemy, rageCooldownMult) {
        if (window.ModifierSystem.consumeShieldField(game, enemy)) {
            return true;
        }

        const rageDamageMult = window.RageSystem.getDamageMultiplier(game);
        let damage = Math.max(0.5, enemy.damage * rageDamageMult)
            * window.ModifierSystem.getIncomingDamageMultiplier(game);

        if (game.handleShieldHit(enemy, damage)) {
            return true;
        }

        game.turret.stats.hp -= damage;
        game.triggerRegenSuppression();
        enemy.attackTimer = Math.max(8, enemy.attackCooldown * rageCooldownMult);
        window.ModifierSystem.applyReflectOnHit(game, enemy, damage);

        game.createExplosion(game.turret.x, game.turret.y, "#ff4444", 3);
        return this.handleLethalDamage(game, enemy.type);
    },

    handleLethalDamage(game, causeType = "UNKNOWN") {
        if (game.turret.stats.hp > 0) return false;

        if (window.ModifierSystem.tryPreventLethal(game)) {
            return true;
        }

        game.grantRelic();
        game.showRelicReward();

        if (!game.relicAssimilatedThisRun) {
            game.assimilateRelic();
            game.relicAssimilatedThisRun = true;
        }

        game.finalizeRun(causeType);
        game.gameOver = true;
        game.prepareGameOverUI();
        game.ui.failWave.innerHTML =
            `Wave ${game.wave} 失败<br>总战力: ${(
                game.turret.stats.atk +
                game.turret.stats.speed +
                game.turret.stats.armor
            ).toFixed(1)}`;
        game.ui.gameOver.style.display = "block";
        return true;
    }
};
