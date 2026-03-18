window.WeaponStateSystem = {
    initialize(game) {
        game.weaponTier1Map = game.weaponTier1Map || (
            (window.WEAPON_DATA && window.WEAPON_DATA.tier1Map) || {
                ATK: "INCENDIARY",
                SPEED: "LASER",
                HP: "BIO_LAUNCHER",
                ARMOR: "REFLECT_SHIELD",
                SPECIAL: "PLASMA",
                RANGE: "RAILGUN",
                VIEW: "SNIPER"
            }
        );
        game.dominanceRatioThreshold = game.dominanceRatioThreshold || 1.18;
        game.currentWeapon = game.currentWeapon || "BULLET";
        game.weaponSwitchFlash = game.weaponSwitchFlash || 0;
        game.weaponHistory = Array.isArray(game.weaponHistory) ? game.weaponHistory : [];
        game.phantomState = {
            chanceBase: 0.03,
            chancePerSpecial: 0.005,
            softCap: 0.25,
            damageScale: 0.45,
            lastWeapon: null,
            flash: 0,
            ...(game.phantomState || {})
        };
    },

    resetProgress(game) {
        game.weaponHistory = [];
        if (game.phantomState) {
            game.phantomState.lastWeapon = null;
            game.phantomState.flash = 0;
        }
        game.currentWeapon = "BULLET";
        game.weaponSwitchFlash = 0;
    },

    getActiveWeapon(game) {
        return game.currentWeapon || "BULLET";
    },

    getDisplayWeaponName(game) {
        return game.getWeaponName(this.getActiveWeapon(game));
    },

    getBuildLabel(game) {
        const dominant = this.getDominantNode(game);
        if (dominant) return `${dominant} Build`;
        return this.getDisplayWeaponName(game);
    },

    getWeaponHintState(game) {
        const dominant = this.getDominantNode(game);
        if (dominant) {
            const weapon = game.weaponTier1Map[dominant];
            const color = game.weaponColors[weapon];
            return {
                borderColor: color,
                html: `<span style="color:${color}">⚡ ${game.getWeaponName(weapon)}</span> 已激活（${dominant} 领先）`
            };
        }

        return {
            borderColor: "#888",
            html: `<span style="color:#888">💡 某属性达到 ${game.dominanceRatioThreshold.toFixed(2)}x 优势时解锁专属武器</span>`
        };
    },

    updateLegacyWeaponHint(game) {
        const hint = game.ui.weaponHint;
        if (!hint) return;
        const state = this.getWeaponHintState(game);
        hint.style.display = "block";
        hint.style.borderColor = state.borderColor;
        hint.innerHTML = state.html;
    },

    getDominantNode(game) {
        let maxStat = null;
        let maxValue = -Infinity;
        let secondValue = -Infinity;

        for (const stat in game.playerStats) {
            const value = game.playerStats[stat];
            if (value > maxValue) {
                secondValue = maxValue;
                maxValue = value;
                maxStat = stat;
            } else if (value > secondValue) {
                secondValue = value;
            }
        }

        if (maxValue <= 0) return null;
        if (secondValue <= 0) return maxStat;
        const ratio = maxValue / secondValue;
        if (ratio < game.dominanceRatioThreshold) return null;
        return maxStat;
    },

    rememberWeaponForm(game, weapon) {
        if (!weapon || weapon === "BULLET") return;
        game.weaponHistory = game.weaponHistory.filter(w => w !== weapon);
        game.weaponHistory.push(weapon);
    },

    getPhantomChance(game) {
        const special = game.turret.stats.special || 0;
        const raw = game.phantomState.chanceBase + special * game.phantomState.chancePerSpecial;
        return Math.min(game.phantomState.softCap, raw);
    },

    getPhantomPool(game) {
        const current = this.getActiveWeapon(game);
        return game.weaponHistory.filter(w => w && w !== current);
    },

    pickPhantomWeapon(game) {
        const pool = this.getPhantomPool(game);
        if (pool.length === 0) return null;

        let totalWeight = 0;
        const weighted = pool.map((weapon, index) => {
            const weight = index + 1;
            totalWeight += weight;
            return { weapon, weight };
        });

        let roll = Math.random() * totalWeight;
        for (const entry of weighted) {
            roll -= entry.weight;
            if (roll <= 0) return entry.weapon;
        }
        return weighted[weighted.length - 1].weapon;
    },

    tryPhantomEcho(game, target) {
        if (!target || !game.isHostile(target)) return false;
        const pool = this.getPhantomPool(game);
        if (pool.length === 0) return false;
        if (Math.random() > this.getPhantomChance(game)) return false;

        const weapon = this.pickPhantomWeapon(game);
        if (!weapon) return false;

        game.phantomState.lastWeapon = weapon;
        game.phantomState.flash = 10;
        game.triggerPhantomAttack(weapon, target);
        return true;
    },

    updateWeaponFromTopology(game) {
        const dominant = this.getDominantNode(game);
        if (!dominant) return;

        const newWeapon = game.weaponTier1Map[dominant] || "BULLET";
        if (game.currentWeapon !== newWeapon) {
            game.currentWeapon = newWeapon;
            this.onWeaponChanged(game, newWeapon);
        }

        if (game.currentWeapon !== game.lastManifestType) {
            game.manifestFlash = 12;
            game.lastManifestType = game.currentWeapon;
        }
    },

    getWeaponFireRate(game, weapon) {
        const fireRates = {
            INCENDIARY: 16,
            LASER: 5,
            BIO_LAUNCHER: 20,
            REFLECT_SHIELD: 30,
            PLASMA: 18,
            RAILGUN: 42,
            SNIPER: 40,
            BULLET: 20
        };
        return fireRates[weapon] ?? 20;
    },

    onWeaponChanged(game, weapon) {
        const color = game.weaponColors[weapon] || "#3498db";
        game.weaponSwitchFlash = 1.0;

        game.turret.stats.fireRate = this.getWeaponFireRate(game, weapon);
        this.rememberWeaponForm(game, weapon);

        game.createExplosion(game.turret.x, game.turret.y, color, 25);
        console.log(`[Weapon] 切换至 ${weapon} (dominant: ${this.getDominantNode(game)})`);
    }
};
