window.RelicSystem = {
    detectDominantTopology(game) {
        let maxStat = null;
        let maxValue = -Infinity;

        for (const stat in game.playerStats) {
            const value = game.playerStats[stat];
            if (value > maxValue) {
                maxValue = value;
                maxStat = stat;
            }
        }

        return maxStat;
    },

    detectLineage(game) {
        let dominant = null;
        let maxLevel = -1;

        for (const stat in game.metaRelics) {
            const level = game.metaRelics[stat].level;
            if (level > maxLevel) {
                maxLevel = level;
                dominant = stat;
            }
        }

        if (maxLevel <= 0) return "NEUTRAL";
        return dominant;
    },

    assimilateRelic(game) {
        const dominant = this.detectDominantTopology(game);
        if (!dominant) return;

        if (!game.metaRelics[dominant]) {
            game.metaRelics[dominant] = { level: 0, count: 0 };
        }

        game.metaRelics[dominant].count++;
        game.metaRelics[dominant].level =
            Math.floor(game.metaRelics[dominant].count / 3);

        game.saveMetaRelics();
        game.applyRelicBias();
        game.checkLineageTransition();
        game.applyLineageBias();
        game.showAssimilationEffect(dominant);
    },

    applyRelicBias(game) {
        for (const stat in game.metaRelics) {
            const level = game.metaRelics[stat].level;
            if (level <= 0) {
                game.nodeBias[stat] = 0;
                continue;
            }
            game.nodeBias[stat] = level * 0.15;
        }
    },

    applyLineageBias(game) {
        if (!game.lineage || game.lineage === "NEUTRAL") return;

        const level = game.metaRelics[game.lineage].level;
        game.nodeBias[game.lineage] = level * 0.25;
    },

    checkLineageTransition(game) {
        const newLineage = this.detectLineage(game);
        if (newLineage !== game.lineage) {
            game.lineage = newLineage;
            game.showLineageTransition();
            game.saveLineage();
        }
    },

    showAssimilationEffect(game, stat) {
        game.assimilationFlash = {
            stat: stat,
            life: 120
        };
    },

    showLineageTransition(game) {
        game.lineageFlash = {
            text: "Lineage Established: " + game.lineage,
            life: 180
        };
    },

    showRelicReward(game) {
        if (!game.lastRelicGained) return;

        const stat = game.lastRelicGained;
        const relic = game.metaRelics[stat];
        const cost = game.relicUpgradeCost[relic.level] || "-";

        const colors = {
            ATK: "#ff6b6b",
            SPEED: "#ffd93d",
            HP: "#6bcb77",
            ARMOR: "#4d96ff",
            SPECIAL: "#c77dff",
            RANGE: "#ff9f1c",
            VIEW: "#00f5d4"
        };

        let text =
            `<span style='color:${colors[stat] || "#ffd93d"}'>${stat}</span> Relic +1<br>` +
            `Lv${relic.level} (${relic.count}/${cost})`;

        if (game.lastRelicUpgraded) {
            text += "<br><span style='color:#6bcb77'>✨ LEVEL UP!</span>";
        }

        game.ui.relicReward.innerHTML = text;
        game.ui.relicReward.style.display = "block";
    },

    grantRelic(game) {
        let total = 0;
        for (let stat in game.runUpgrades) total += game.runUpgrades[stat];
        if (total > 0) {
            let roll = Math.random() * total;
            let cumulative = 0;
            for (let stat in game.runUpgrades) {
                cumulative += game.runUpgrades[stat];
                if (roll < cumulative) {
                    game.metaRelics[stat].count += 1;
                    game.lastRelicGained = stat;
                    const beforeLevel = game.metaRelics[stat].level;
                    game.tryUpgradeRelic(stat);
                    const afterLevel = game.metaRelics[stat].level;
                    game.lastRelicUpgraded = (afterLevel > beforeLevel);
                    game.relicDirty = true;

                    try { localStorage.setItem("metaRelics", JSON.stringify(game.metaRelics)); } catch (_) {}
                    console.log(`[Relic] 获得 ${stat} 碎片, 当前:`, game.metaRelics[stat]);
                    break;
                }
            }
        }

        if (Math.random() < 0.10) {
            const pools = { WEAPON: [], TOPOLOGY: [], GLOBAL: [] };
            for (let id in game.keystones) {
                if (!game.keystones[id] && game.keystoneDefs[id]) {
                    pools[game.keystoneDefs[id].type]?.push(id);
                }
            }
            const roll = Math.random();
            let pool;
            if (roll < 0.40) pool = pools.WEAPON;
            else if (roll < 0.80) pool = pools.TOPOLOGY;
            else pool = pools.GLOBAL;

            if (!pool || pool.length === 0) {
                pool = [...pools.WEAPON, ...pools.TOPOLOGY, ...pools.GLOBAL];
            }
            if (pool.length > 0) {
                game.grantKeystone(pool[Math.floor(Math.random() * pool.length)]);
            }
        }
    },

    tryUpgradeRelic(game, stat) {
        const relic = game.metaRelics[stat];
        const cost = game.relicUpgradeCost[relic.level];
        if (cost > 0 && relic.count >= cost) {
            relic.count -= cost;
            relic.level += 1;
            console.log(`[Relic] ${stat} 升级到 Lv${relic.level}!`);
        }
    },

    applyRelics(game) {
        window.KeystoneSystem.loadOwnedFromStorage(game);

        for (let stat in game.metaRelics) {
            const relic = game.metaRelics[stat];
            if (relic.level <= 0) continue;
            const multiplier = 1 + 0.6 * (relic.level - 1);
            let bonus = 0;
            switch (stat) {
                case "ATK":     bonus = 2 * multiplier; break;
                case "SPEED":   bonus = 0.25 * multiplier; break;
                case "HP":      bonus = 15 * multiplier; break;
                case "ARMOR":   bonus = 0; break;
                case "SPECIAL": bonus = 2 * multiplier; break;
                case "RANGE":   bonus = 20 * multiplier; break;
                case "VIEW":    bonus = 40 * multiplier; break;
            }
            if (stat === "HP") {
                game.turret.stats.maxHp += bonus;
                game.turret.stats.hp += bonus;
            } else if (stat === "ATK") {
                game.turret.stats.atk += bonus;
            } else if (stat === "SPEED") {
                game.turret.stats.speed += bonus;
            } else if (stat === "ARMOR") {
                game.turret.stats.armor += bonus;
            } else if (stat === "SPECIAL") {
                game.turret.stats.special += bonus;
            } else if (stat === "RANGE") {
                game.turret.stats.range += bonus;
            } else if (stat === "VIEW") {
                game.turret.stats.view = Math.min(game.viewCap, game.turret.stats.view + bonus);
            }
        }
        game.updateShieldStats();
    },

    updateRelicUI(game) {
        if (!game.relicDirty) return;
        game.relicDirty = false;
        const colors = {
            ATK: "#ff6b6b",
            SPEED: "#ffd93d",
            HP: "#6bcb77",
            ARMOR: "#4d96ff",
            SPECIAL: "#c77dff",
            RANGE: "#ff9f1c",
            VIEW: "#00f5d4"
        };

        let html = "";
        for (let stat in game.metaRelics) {
            const relic = game.metaRelics[stat];
            if (relic.level <= 0 && relic.count <= 0) continue;
            const cost = game.relicUpgradeCost[relic.level] || "✦MAX";
            html +=
                `<span style="color:${colors[stat]}">${stat}</span>` +
                ` Lv${relic.level}` +
                ` <span style="color:#888">(${relic.count}/${cost})</span><br>`;
        }

        if (html === "") html = "<span style=\"color:#555\">尚无遗物</span>";
        if (game.ui.relicList) game.ui.relicList.innerHTML = html;
    }
};
