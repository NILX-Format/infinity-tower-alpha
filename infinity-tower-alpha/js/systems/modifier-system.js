window.ModifierSystem = {
    initialize(game) {
        game.modifierDefs = {
            "ATK-T1-A": { class: "TOPOLOGY", node: "ATK" },
            "ATK-T1-B": { class: "GLOBAL" },
            "ATK-T2-A": { class: "WEAPON", weapon: "INCENDIARY" },
            "ATK-T2-B": { class: "GLOBAL" },
            "ATK-T3-A": { class: "GLOBAL" },
            "SPD-T1-A": { class: "GLOBAL" },
            "SPD-T1-B": { class: "WEAPON", weapon: "LASER" },
            "SPD-T2-A": { class: "GLOBAL" },
            "SPD-T3-A": { class: "GLOBAL" },
            "HP-T1-A": { class: "GLOBAL" },
            "HP-T2-A": { class: "GLOBAL" },
            "HP-T3-A": { class: "GLOBAL" },
            "ARM-T1-A": { class: "GLOBAL" },
            "ARM-T2-A": { class: "GLOBAL" },
            "ARM-T3-A": { class: "GLOBAL" },
            "SPC-T1-A": { class: "GLOBAL" },
            "SPC-T2-A": { class: "GLOBAL" },
            "SPC-T3-A": { class: "GLOBAL" },
            "RNG-T1-A": { class: "GLOBAL" },
            "RNG-T2-A": { class: "GLOBAL" },
            "RNG-T3-A": { class: "GLOBAL" },
            "VIEW-T1-A": { class: "GLOBAL" },
            "VIEW-T2-A": { class: "GLOBAL" },
            "VIEW-T3-A": { class: "GLOBAL" }
        };

        game.ownedModifiers = game.ownedModifiers instanceof Set
            ? game.ownedModifiers
            : new Set(Array.isArray(game.ownedModifiers) ? game.ownedModifiers : []);

        game.modifierState = {
            overchargeCounter: 0,
            accelerateStacks: 0,
            chainCritReady: false,
            reviveCooldown: 0,
            reviveUsed: false,
            hpRegenTimer: 0,
            shieldFieldTimer: 0,
            shieldFieldReady: false,
            immortalActive: false,
            immortalCooldown: 0,
            ...(game.modifierState || {})
        };
    },

    resetProgress(game) {
        game.ownedModifiers.clear();
        game.modifierState.overchargeCounter = 0;
        game.modifierState.chainCritReady = false;
        game.modifierState.accelerateStacks = 0;
        game.modifierState.reviveUsed = false;
        game.modifierState.reviveCooldown = 0;
        game.modifierState.hpRegenTimer = 0;
        game.modifierState.shieldFieldTimer = 0;
        game.modifierState.shieldFieldReady = false;
        game.modifierState.immortalCooldown = 0;
    },

    getModifierOptions(game, stat, threshold) {
        const pool = {
            ATK: {
                3: [
                    { id: "ATK-T1-A", name: "Focus Fire", desc: "目标优先级改为最远敌人" },
                    { id: "ATK-T1-B", name: "Overcharge Protocol", desc: "每第4次攻击造成300%伤害" }
                ],
                6: [
                    { id: "ATK-T2-A", name: "Piercing Rounds", desc: "子弹穿透所有敌人直至最大射程（需 INCENDIARY 激活）" },
                    { id: "ATK-T2-B", name: "Execution Protocol", desc: "HP低于20%的敌人直接处决" }
                ],
                10: [
                    { id: "ATK-T3-A", name: "Terminal Singularity", desc: "敌人死亡触发爆炸 radius:80, 50%伤害" }
                ]
            },
            SPEED: {
                3: [
                    { id: "SPD-T1-A", name: "Acceleration Feedback", desc: "每次连续命中+5%攻速，未命中归零" },
                    { id: "SPD-T1-B", name: "Temporal Compression", desc: "冷却时间减少30%（需 LASER 激活）" }
                ],
                6: [
                    { id: "SPD-T2-A", name: "Time Fracture", desc: "暴击后下次攻击冷却归零" }
                ],
                10: [
                    { id: "SPD-T3-A", name: "Overclock Singularity", desc: "移除攻速上限" }
                ]
            },
            HP: {
                3: [
                    { id: "HP-T1-A", name: "Regeneration", desc: "每3秒回复1 HP" }
                ],
                6: [
                    { id: "HP-T2-A", name: "Death Prevention", desc: "致命伤害留1 HP，60s冷却" }
                ],
                10: [
                    { id: "HP-T3-A", name: "Immortal Core", desc: "致命伤害保留25% HP，45s冷却" }
                ]
            },
            ARMOR: {
                3: [
                    { id: "ARM-T1-A", name: "Damage Reflection", desc: "受击反弹20%伤害给攻击者" }
                ],
                6: [
                    { id: "ARM-T2-A", name: "Shield Field", desc: "每5s生成护盾，可吸收一次伤害" }
                ],
                10: [
                    { id: "ARM-T3-A", name: "Absolute Defense", desc: "永久减伤50%" }
                ]
            },
            SPECIAL: {
                3: [
                    { id: "SPC-T1-A", name: "Critical Cascade", desc: "暴击触发 radius:60 二次爆炸" }
                ],
                6: [
                    { id: "SPC-T2-A", name: "Probability Distortion", desc: "暴击率翻倍" }
                ],
                10: [
                    { id: "SPC-T3-A", name: "Reality Collapse", desc: "每次攻击随机触发额外效果" }
                ]
            },
            RANGE: {
                3: [
                    { id: "RNG-T1-A", name: "Extended Ballistics", desc: "弹体存活时间+50%" }
                ],
                6: [
                    { id: "RNG-T2-A", name: "Rail Penetration", desc: "弹体穿透所有敌人" }
                ],
                10: [
                    { id: "RNG-T3-A", name: "Infinite Projection", desc: "射程无限制" }
                ]
            },
            VIEW: {
                3: [
                    { id: "VIEW-T1-A", name: "Target Lock", desc: "持续命中同一目标时，锁定效率逐步提升" }
                ],
                6: [
                    { id: "VIEW-T2-A", name: "Predictive Targeting", desc: "对高速目标的瞄准与命中更稳定" }
                ],
                10: [
                    { id: "VIEW-T3-A", name: "Weakpoint Analysis", desc: "远距目标获得额外锁定与弱点分析" }
                ]
            }
        };

        return pool[stat]?.[threshold] ?? [];
    },

    showModifierSelection(game, stat, threshold, options) {
        game.pendingWaveAdvance = false;
        game.isPaused = true;

        const nodeColors = {
            ATK: "#ff6b6b",
            SPEED: "#ffd93d",
            HP: "#6bcb77",
            ARMOR: "#4d96ff",
            SPECIAL: "#c77dff",
            RANGE: "#ff9f1c",
            VIEW: "#00f5d4"
        };
        const color = nodeColors[stat] || "#4ecdc4";

        const panel = game.ui.upgradePanel;
        const btnContainer = game.ui.upgradeButtons;
        btnContainer.innerHTML = "";

        game.ui.upgradeTitle.innerHTML =
            `<span style="color:${color}">${stat}</span>` +
            ` Threshold <span style="color:#ffd93d">${threshold}</span> 达成`;

        game.ui.weaponHint.style.display = "none";

        options.forEach(mod => {
            const btn = document.createElement("button");
            btn.innerHTML =
                `<div style="font-weight:bold;color:${color}">${mod.name}</div>` +
                `<div style="font-size:12px;color:#aaa;margin-top:5px">${mod.desc}</div>`;
            btn.onclick = () => {
                this.applyModifier(game, mod);
                panel.style.display = "none";
                game.pendingWaveAdvance = true;
                game.advanceWave();
            };
            btnContainer.appendChild(btn);
        });

        panel.style.display = "block";
    },

    ownModifier(game, id) {
        if (game.ownedModifiers.has(id)) return;
        game.ownedModifiers.add(id);
        console.log(`[Modifier Owned] ${id} | class: ${game.modifierDefs[id]?.class}`);
    },

    applyModifier(game, mod) {
        this.ownModifier(game, mod.id);

        switch (mod.id) {
            case "ATK-T1-B":
                game.modifierState.overchargeCounter = 0;
                break;
            case "HP-T2-A":
                game.modifierState.reviveUsed = false;
                game.modifierState.reviveCooldown = 0;
                break;
            case "HP-T3-A":
                game.modifierState.immortalCooldown = 0;
                break;
            case "VIEW-T3-A":
                game.turret.stats.view = 99999;
                break;
            case "ARM-T3-A":
                break;
        }
    },

    isModifierActive(game, id) {
        if (!game.ownedModifiers.has(id)) return false;
        const def = game.modifierDefs[id];
        if (!def) return false;
        if (def.class === "GLOBAL") return true;
        if (def.class === "WEAPON") return game.getActiveWeapon() === def.weapon;
        if (def.class === "TOPOLOGY") return game.getDominantNode() === def.node;
        return false;
    },

    getRangeBonus(game) {
        return this.isModifierActive(game, "RNG-T1-A") ? 1.5 : 1.0;
    },

    getProjectileMaxDistance(game, baseDistance) {
        if (this.hasInfiniteRange(game)) return 99999;
        return baseDistance * this.getRangeBonus(game);
    },

    getBeamLength(game, baseLength) {
        if (this.hasInfiniteRange(game)) return 99999;
        return baseLength * this.getRangeBonus(game);
    },

    getAllowedRange(game, baseRange, target = null) {
        if (this.hasInfiniteRange(game)) return 99999;

        let allowed = baseRange;
        if (target && target.state === "ATTACKING_SHIELD") {
            allowed = Math.max(
                allowed,
                game.turret.shield.radius + (target.radius || 0) + 12
            );
        }
        return allowed;
    },

    hasInfiniteRange(game) {
        return this.isModifierActive(game, "RNG-T3-A");
    },

    getEffectiveView(game, baseView, viewCap) {
        if (this.hasOmniscience(game)) {
            return Math.max(baseView, viewCap, 99999);
        }
        return Math.min(baseView, viewCap);
    },

    hasOmniscience(game) {
        return this.isModifierActive(game, "VIEW-T3-A");
    },

    isPositionRevealed(game, x, y, effectiveView) {
        if (this.hasOmniscience(game)) return true;

        const inView = Math.hypot(x - game.turret.x, y - game.turret.y) <= effectiveView;
        if (inView) return true;

        return game.activeFlares.some(flare => Math.hypot(x - flare.x, y - flare.y) <= flare.radius);
    },

    getWeaponCooldownMultiplier(game, weapon) {
        let mult = 1.0;
        if (weapon === "LASER" && this.isModifierActive(game, "SPD-T1-B")) {
            mult *= 0.7;
        }

        if (this.isModifierActive(game, "SPD-T1-A")) {
            const stacks = Math.max(0, game.modifierState.accelerateStacks || 0);
            mult *= Math.max(0.35, 1 - stacks * 0.05);
        }

        return mult;
    },

    shouldPierceRounds(game) {
        return this.isModifierActive(game, "ATK-T2-A");
    },

    shouldKeepProjectileAfterHit(game, projectile) {
        return projectile?.type === "INCENDIARY" && this.shouldPierceRounds(game);
    },

    registerHit(game, opts = {}) {
        if (!this.isModifierActive(game, "SPD-T1-A")) return;
        if (opts.countForAcceleration === false) return;

        game.modifierState.accelerateStacks = Math.min(
            10,
            (game.modifierState.accelerateStacks || 0) + 1
        );
    },

    registerMiss(game, opts = {}) {
        if (!this.isModifierActive(game, "SPD-T1-A")) return;
        if (opts.resetsAcceleration === false) return;
        game.modifierState.accelerateStacks = 0;
    },

    updateShieldField(game, dt) {
        if (!this.isModifierActive(game, "ARM-T2-A")) {
            game.modifierState.shieldFieldTimer = 0;
            game.modifierState.shieldFieldReady = false;
            return;
        }

        if (game.modifierState.shieldFieldReady) return;

        game.modifierState.shieldFieldTimer += dt;
        if (game.modifierState.shieldFieldTimer < 300) return;

        game.modifierState.shieldFieldTimer = 0;
        game.modifierState.shieldFieldReady = true;
        game.spawnFloatingText(game.turret.x, game.turret.y - 46, "SHIELD FIELD", "#7ad3ff", 0.8);
    },

    consumeShieldField(game, enemy) {
        if (!this.isModifierActive(game, "ARM-T2-A")) return false;
        if (!game.modifierState.shieldFieldReady) return false;

        game.modifierState.shieldFieldReady = false;
        game.modifierState.shieldFieldTimer = 0;
        if (enemy) {
            enemy.attackTimer = enemy.attackCooldown;
        }
        game.createExplosion(game.turret.x, game.turret.y, "#7ad3ff", 12);
        game.spawnFloatingText(game.turret.x, game.turret.y - 30, "FIELD BLOCK", "#7ad3ff", 0.85);
        return true;
    },

    consumeOvercharge(game, target, suppress = false) {
        if (!this.isModifierActive(game, "ATK-T1-B")) return 1;

        game.modifierState.overchargeCounter++;
        if (game.modifierState.overchargeCounter < 4) return 1;

        game.modifierState.overchargeCounter = 0;
        if (!suppress) {
            game.createExplosion(target.x, target.y, "#ff3b3b", 14);
        }
        return 3;
    },

    tryExecution(game, target) {
        if (!this.isModifierActive(game, "ATK-T2-B")) return null;
        if (target.hp === undefined || target.maxHp === undefined) return null;
        if (target.hp / target.maxHp >= 0.20) return null;
        return { damage: target.hp + 1, isCrit: true, radiusScale: 1.5, execution: true };
    },

    getCritChance(game, baseCritChance) {
        if (!this.isModifierActive(game, "SPC-T2-A")) return baseCritChance;
        return Math.min(0.95, baseCritChance * 2);
    },

    applyCritCascade(game, target, baseDamage, allowEffects) {
        if (!allowEffects || !this.isModifierActive(game, "SPC-T1-A")) return;

        game.enemies.forEach(nearby => {
            if (nearby === target || nearby.hp <= 0) return;
            if (Math.hypot(nearby.x - target.x, nearby.y - target.y) < 60) {
                nearby.hp -= baseDamage * 0.5;
            }
        });
        game.createExplosion(target.x, target.y, "#c77dff", 8);
    },

    applyCritCooldownReset(game) {
        if (!this.isModifierActive(game, "SPD-T2-A")) return;
        game.turret.cooldown = 0;
    },

    applyPassiveHpRegen(game, dt) {
        if (!this.isModifierActive(game, "HP-T1-A")) return;

        game.modifierState.hpRegenTimer += dt;
        if (game.modifierState.hpRegenTimer < 180) return;

        game.modifierState.hpRegenTimer = 0;
        game.turret.stats.hp = Math.min(game.turret.stats.maxHp, game.turret.stats.hp + 1);
    },

    getIncomingDamageMultiplier(game) {
        return this.isModifierActive(game, "ARM-T3-A") ? 0.5 : 1;
    },

    applyReflectOnHit(game, enemy, damage) {
        if (!this.isModifierActive(game, "ARM-T1-A")) return;

        enemy.hp -= damage * 0.20;
        game.createExplosion(enemy.x, enemy.y, "#4d96ff", 5);
    },

    tryPreventLethal(game) {
        if (this.isModifierActive(game, "HP-T3-A") && game.modifierState.immortalCooldown <= 0) {
            game.turret.stats.hp = Math.ceil(game.turret.stats.maxHp * 0.25);
            game.modifierState.immortalCooldown = 2700;
            game.createExplosion(game.turret.x, game.turret.y, "#b084ff", 24);
            game.spawnFloatingText(game.turret.x, game.turret.y - 56, "IMMORTAL CORE", "#d8b4ff", 1);
            return true;
        }

        if (this.isModifierActive(game, "HP-T2-A") && !game.modifierState.reviveUsed) {
            game.modifierState.reviveUsed = true;
            game.modifierState.reviveCooldown = 3600;
            game.turret.stats.hp = 1;
            game.createExplosion(game.turret.x, game.turret.y, "#6bcb77", 30);
            game.playTone(440, 0.3, "triangle", 0.1, 880);
            return true;
        }

        return false;
    },

    hasModifier(game, id) {
        return this.isModifierActive(game, id);
    }
};
