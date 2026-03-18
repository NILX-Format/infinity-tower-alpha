window.WorldStateSystem = {
    initialize(game) {
        game.worldState = game.worldState || {};
        game.worldState.zones = {
            spawnTop: canvas.height * 0.15,
            forwardTop: canvas.height * 0.20,
            forwardBottom: canvas.height * 0.55,
            combatBottom: canvas.height * 0.80,
            defenseY: canvas.height * 0.85
        };

        // Backward-compatible alias while legacy systems still read game.zones.
        game.zones = game.worldState.zones;
        game.structures = Array.isArray(game.structures) ? game.structures : [];
        game.structureSpawnTimer = game.structureSpawnTimer || 0;
    },

    getZones(game) {
        return game.worldState?.zones || game.zones;
    },

    getForwardZoneBounds(game) {
        const zones = this.getZones(game);
        return {
            top: zones.forwardTop,
            bottom: zones.forwardBottom
        };
    },

    getForwardZoneCenter(game) {
        const bounds = this.getForwardZoneBounds(game);
        return {
            x: canvas.width * 0.5,
            y: (bounds.top + bounds.bottom) * 0.5
        };
    },

    getBeaconSpawnPosition(game) {
        const bounds = this.getForwardZoneBounds(game);
        return {
            x: Math.random() * canvas.width,
            y: bounds.top + Math.random() * (bounds.bottom - bounds.top)
        };
    },

    spawnBeacon(game) {
        const position = this.getBeaconSpawnPosition(game);

        game.structures.push({
            x: position.x,
            y: position.y,
            size: 20,
            range: 120,
            hp: 40 + game.wave * 10,
            maxHp: 40 + game.wave * 10,
            rotation: 0,
            pulse: Math.random() * Math.PI * 2,
            type: "BEACON"
        });
    },

    updateStructureSpawning(game, dt) {
        game.structureSpawnTimer += dt;
        if (game.structureSpawnTimer <= 600) return;

        game.structureSpawnTimer = 0;
        if (game.structures.length < 2) {
            this.spawnBeacon(game);
        }
    }
};
