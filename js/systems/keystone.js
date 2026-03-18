window.KeystoneSystem = {
    defs: {
        BEAM_OVERLOAD:       { type: "WEAPON",   weapon: "LASER"      },
        SNIPER_CORE:         { type: "WEAPON",   weapon: "SNIPER"     },
        INCENDIARY_CATALYST: { type: "WEAPON",   weapon: "INCENDIARY" },
        PLASMA_RESONANCE:    { type: "WEAPON",   weapon: "PLASMA"     },
        SPEED_RESONATOR:     { type: "TOPOLOGY", node: "SPEED"        },
        ARMOR_RESONATOR:     { type: "TOPOLOGY", node: "ARMOR"        },
        RANGE_AMPLIFIER:     { type: "TOPOLOGY", node: "RANGE"        },
        VITAL_SURGE:         { type: "TOPOLOGY", node: "HP"           },
        SIGNAL_ECHO:         { type: "GLOBAL"                           },
        OVERCHARGE_PROTOCOL: { type: "GLOBAL"                           },
        WARHEAD_REPLICATOR:  { type: "GLOBAL"                           },
        FORWARD_RELAY:       { type: "GLOBAL"                           }
    },

    initialize(game) {
        game.keystoneDefs = { ...this.defs };
        game.keystones = game.keystones || {};
        for (const id in game.keystoneDefs) {
            if (typeof game.keystones[id] !== "boolean") {
                game.keystones[id] = false;
            }
        }
        game.keystoneDirty = true;
    },

    isKeystoneActive(game, id) {
        if (!game.keystones[id]) return false;
        const ks = game.keystoneDefs[id];
        if (!ks) return false;
        if (ks.type === "GLOBAL") return true;
        if (ks.type === "WEAPON") return game.getActiveWeapon() === ks.weapon;
        if (ks.type === "TOPOLOGY") return game.getDominantNode() === ks.node;
        return false;
    },

    hasKeystone(game, id) {
        return this.isKeystoneActive(game, id);
    },

    grantKeystone(game, id) {
        if (game.keystones[id]) return;
        game.keystones[id] = true;
        game.lastKeystoneGained = id;
        game.keystoneDirty = true;
        this.showKeystoneReward(game);
        this.updateKeystoneUI(game);
        try { localStorage.setItem("keystones", JSON.stringify(game.keystones)); } catch (_) {}
        console.log(`[Keystone] 获得 ${id}`);
    },

    showKeystoneReward(game) {
        if (!game.lastKeystoneGained) return;
        game.ui.keystoneReward.innerHTML =
            "✨ Keystone Acquired<br>" +
            game.lastKeystoneGained.replace(/_/g, " ");
        game.ui.keystoneReward.style.display = "block";
    },

    updateKeystoneUI(game) {
        if (!game.keystoneDirty) return;
        game.keystoneDirty = false;
        const typeColors = { WEAPON: "#ff9f1c", TOPOLOGY: "#4d96ff", GLOBAL: "#c77dff" };
        const typeLabels = { WEAPON: "W", TOPOLOGY: "T", GLOBAL: "G" };
        let html = "";
        for (let id in game.keystones) {
            if (!game.keystones[id]) continue;
            const def = game.keystoneDefs[id];
            const tc = typeColors[def?.type] || "#888";
            const tl = typeLabels[def?.type] || "?";
            const active = this.isKeystoneActive(game, id);
            const opacity = active ? "1" : "0.4";
            html += `<span style="opacity:${opacity}">` +
                    `<span style="color:${tc};font-size:9px">[${tl}]</span> ` +
                    `${id.replace(/_/g, " ")}</span><br>`;
        }
        if (html === "") html = "<span style='color:#555'>无</span>";
        if (game.ui.keystoneList) game.ui.keystoneList.innerHTML = html;
    },

    resetProgress(game) {
        localStorage.removeItem("keystones");
        for (let id in game.keystones) game.keystones[id] = false;
        game.keystoneDirty = true;
    },

    loadOwnedFromStorage(game) {
        try {
            const saved = localStorage.getItem("keystones");
            if (!saved) return;
            const parsed = JSON.parse(saved);
            Object.assign(game.keystones, parsed || {});
            game.keystoneDirty = true;
        } catch (_) {}
    }
};
