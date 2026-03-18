window.HudUI = {
    setText(game, key, el, value) {
        if (!el) return;
        if (game.uiState[key] !== value) {
            game.uiState[key] = value;
            el.textContent = value;
        }
    },

    updateXpBar(game) {
        const fill = game.ui.xpBarFill;
        if (!fill) return;

        const total = Math.max(1, game.enemiesToSpawn);
        const alive = game.enemies.filter(e => game.isHostile(e)).length;
        const spawned = Math.min(game.enemiesSpawned, total);
        const killed = Math.max(0, spawned - alive);
        const pct = Math.min((killed / total) * 100, 100);

        fill.style.width = pct + "%";

        if (pct < 70) {
            fill.style.background = "#4ecdc4";
            fill.style.boxShadow = "0 0 8px #4ecdc4";
            fill.style.animation = "";
        } else if (pct < 90) {
            fill.style.background = "#ffd93d";
            fill.style.boxShadow = "0 0 12px #ffd93d";
            fill.style.animation = "";
        } else {
            fill.style.background = "#ff6b6b";
            fill.style.boxShadow = "0 0 18px #ff6b6b";
            fill.style.animation = "xpPulse 0.8s infinite";
        }

        if (pct >= 100) {
            fill.style.animation = "";
            fill.style.boxShadow = "0 0 30px white";
            setTimeout(() => {
                fill.style.boxShadow = "";
            }, 100);
        }
    },

    updateUI(game) {
        const hpRatio = game.turret.stats.maxHp > 0 ? game.turret.stats.hp / game.turret.stats.maxHp : 0;
        const hpText = hpRatio < 0.5
            ? `❤️ ${Math.ceil(game.turret.stats.hp)}/${game.turret.stats.maxHp}`
            : "";
        game.ui.hp.style.color = hpRatio < 0.25 ? "#ff6b6b" : "#ffd93d";
        game.ui.hp.style.textShadow = hpRatio < 0.25 ? "0 0 8px #ff6b6b" : "0 0 6px #ffd93d";

        let hostileCount = 0;
        game.enemies.forEach(e => { if (game.isHostile(e)) hostileCount++; });
        const resourceText = `🧨 FLR:${game.flareCharges}`;

        if (game.ui.waveLabel) {
            game.ui.waveLabel.textContent = `WAVE ${game.wave}`;
        }
        if (game.ui.enemyCounter) {
            game.ui.enemyCounter.textContent = `${hostileCount} / ${game.enemiesToSpawn}`;
        }

        this.setText(game, "hp", game.ui.hp, hpText);
        this.setText(game, "statusResources", game.ui.statusResources, resourceText);
        this.setText(game, "currentWeapon", game.ui.currentWeapon, game.getWeaponName(game.getActiveWeapon()));
        this.setText(game, "statAtk", game.ui.statAtk, String(game.turret.stats.atk));
        this.setText(game, "statSpeed", game.ui.statSpeed, game.turret.stats.speed.toFixed(1));
        this.setText(game, "statHp", game.ui.statHp, `${Math.ceil(game.turret.stats.hp)}/${game.turret.stats.maxHp}`);
        const shieldVal = game.turret.shield.max > 0
            ? `${Math.max(0, Math.ceil(game.turret.shield.current))} / ${game.turret.shield.max}`
            : "—";
        this.setText(game, "statArmor", game.ui.statArmor, shieldVal);
        this.setText(game, "statRange", game.ui.statRange, String(Math.round(game.getEffectiveCombatStats().range)));
        const viewValue = game.playerStats.VIEW || 0;
        const viewText = game.isStatCapped("VIEW") ? `${viewValue} (MAX)` : `${viewValue}/${game.viewCap}`;
        this.setText(game, "statView", game.ui.statView, viewText);
        const critStats = game.computeCritStats(game.turret.stats.special || 0);
        this.setText(game, "statSpecial", game.ui.statSpecial, `${(critStats.critChance * 100).toFixed(0)}%`);
        game.ui.hp.style.top = `${game.turret.y + 62}px`;
        game.ui.hp.style.left = `${game.turret.x}px`;
        game.updateRelicUI();
        game.updateKeystoneUI();
    }
};
