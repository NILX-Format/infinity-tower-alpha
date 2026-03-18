window.SaveSystem = {
    cloneJSONSafe(value, fallback) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return fallback;
        }
    },

    saveMeta(game) {
        localStorage.setItem(
            "metaRelicsCurrency",
            game.meta.relics
        );

        localStorage.setItem(
            "metaKills",
            game.meta.lifetimeKills
        );
    },

    saveMetaRelics(game) {
        localStorage.setItem(
            "metaRelics",
            JSON.stringify(game.metaRelics)
        );
    },

    saveLineage(game) {
        localStorage.setItem(
            "lineage",
            game.lineage
        );
    },

    saveRun(game) {
        const data = {
            wave: game.wave,
            turretStats: this.cloneJSONSafe(game.turret.stats, {}),
            turretShield: this.cloneJSONSafe(game.turret.shield, {}),
            playerStats: this.cloneJSONSafe(game.playerStats, {}),
            runUpgrades: this.cloneJSONSafe(game.runUpgrades, {}),
            keystones: this.cloneJSONSafe(game.keystones, {}),
            metaRelics: this.cloneJSONSafe(game.metaRelics, {}),
            lineage: game.lineage,
            currentWeapon: game.currentWeapon,
            ownedModifiers: Array.from(game.ownedModifiers || []),
            nodeUnlocked: this.cloneJSONSafe(game.nodeUnlocked, {}),
            modifierState: this.cloneJSONSafe(game.modifierState, {}),
            flareCharges: game.flareCharges || 0,
            activeFlares: this.cloneJSONSafe(game.activeFlares, []),
            structures: this.cloneJSONSafe(game.structures, []),
            bioFields: this.cloneJSONSafe(game.bioFields, []),
            railgunState: this.cloneJSONSafe(game.railgunState, {}),
            sniperState: this.cloneJSONSafe(game.sniperState, {}),
            weaponHistory: this.cloneJSONSafe(game.weaponHistory, []),
            fallbackCooldown: game.fallbackCooldown || 0,
            structureSpawnTimer: game.structureSpawnTimer || 0,
            waveCountdown: game.waveCountdown || 0,
            waveCountdownTimer: game.waveCountdownTimer || 0,
            relicAssimilatedThisRun: !!game.relicAssimilatedThisRun,
            collectedResources: this.cloneJSONSafe(game.collectedResources, {})
        };
        localStorage.setItem("infinityTowerSave", JSON.stringify(data));
        this.saveMeta(game);
        this.saveLineage(game);
    },

    loadRun(game) {
        const raw = localStorage.getItem("infinityTowerSave");
        if (!raw) return;

        let data = null;
        try {
            data = JSON.parse(raw);
        } catch (_) {
            return;
        }
        if (!data) return;

        game.wave = data.wave || 1;
        Object.assign(game.turret.stats, data.turretStats || {});
        Object.assign(game.turret.shield, data.turretShield || {});
        Object.assign(game.playerStats, data.playerStats || {});
        Object.assign(game.runUpgrades, data.runUpgrades || {});
        Object.assign(game.keystones, data.keystones || {});
        Object.assign(game.modifierState, data.modifierState || {});
        Object.assign(game.railgunState, data.railgunState || {});
        Object.assign(game.sniperState, data.sniperState || {});
        Object.assign(game.collectedResources, data.collectedResources || {});

        game.lineage = data.lineage || game.lineage;
        game.currentWeapon = data.currentWeapon || game.currentWeapon;
        game.ownedModifiers = new Set(Array.isArray(data.ownedModifiers) ? data.ownedModifiers : []);

        if (data.nodeUnlocked) {
            for (const stat in game.nodeUnlocked) {
                game.nodeUnlocked[stat] = {
                    ...(game.nodeUnlocked[stat] || {}),
                    ...(data.nodeUnlocked[stat] || {})
                };
            }
        }

        game.flareCharges = Math.max(0, Math.min(game.flareMax, data.flareCharges ?? game.flareCharges));
        game.activeFlares = Array.isArray(data.activeFlares) ? data.activeFlares : [];
        game.structures = Array.isArray(data.structures) ? data.structures : [];
        game.bioFields = Array.isArray(data.bioFields) ? data.bioFields : [];
        game.weaponHistory = Array.isArray(data.weaponHistory) ? data.weaponHistory : [];
        game.fallbackCooldown = Math.max(0, data.fallbackCooldown || 0);
        game.structureSpawnTimer = Math.max(0, data.structureSpawnTimer || 0);
        game.waveCountdown = Math.max(0, data.waveCountdown ?? 3);
        game.waveCountdownTimer = Math.max(0, data.waveCountdownTimer || 0);
        game.relicAssimilatedThisRun = !!data.relicAssimilatedThisRun;

        if (data.metaRelics) {
            for (const stat in game.metaRelics) {
                if (data.metaRelics[stat]) game.metaRelics[stat] = data.metaRelics[stat];
            }
        }

        game.updateWeaponFromTopology();
        if (data.currentWeapon) {
            game.currentWeapon = data.currentWeapon;
            game.lastManifestType = game.currentWeapon;
            game.turret.stats.fireRate = game.getWeaponFireRate(game.currentWeapon);
        }
        game.rememberWeaponForm(game.currentWeapon);
        game.updateShieldStats();

        game.wavePackets = game.generateWavePackets(game.wave);
        game.currentPacket = 0;
        game.packetEnemyIndex = 0;
        game.packetTimer = 0;
        game.enemiesSpawned = 0;
        game.enemiesToSpawn = game.getTotalEnemiesFromPackets(game.wavePackets);
        game.waveTransitioning = false;
        game.isPaused = game.waveCountdown > 0;
        game.markedTarget = null;
        game.markTimer = 0;
        game.relicDirty = true;
        game.keystoneDirty = true;
    }
};
