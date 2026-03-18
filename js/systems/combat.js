window.CombatSystem = {
    applySoftCap(rawCritChance) {
        const knee = 0.35;
        const maxCrit = 0.8;
        if (rawCritChance <= knee) return rawCritChance;
        const overflow = rawCritChance - knee;
        const compressed = (1 - Math.exp(-overflow * 2.2)) * (maxCrit - knee);
        return Math.min(maxCrit, knee + compressed);
    },

    computeCritStats(game, special) {
        const baseCritChance = 0.05;
        const rawCritChance = baseCritChance + special * 0.02;
        const critChance = this.applySoftCap(rawCritChance);
        const critMultiplier = 2.0 + special * 0.05;
        const critRadiusScale = 1.0 + special * 0.03;
        return { critChance, critMultiplier, critRadiusScale };
    },

    applyArmorIntercept(game, damage, enemy) {
        if (enemy.role !== "shield" || enemy.armorLayers <= 0) return false;

        enemy.armorHP -= damage;

        if (enemy.armorHP <= 0) {
            enemy.armorLayers--;
            enemy.armorHP = enemy.armorLayers > 0 ? enemy.maxArmorHP : 0;
            game.createExplosion(enemy.x, enemy.y, "#ff4444", 8);
            game.audio.playTone(300, 0.12, 0.07, "square");
        }

        return true;
    },

    applyDamageWithCrit(game, baseDamage, target, opts = {}) {
        // opts.suppressEffects — skip particles/audio/hitStop (used by chain hits)
        // opts.forceCrit / opts.forceCritMultiplier — inherit crit from first hit
        const suppress = opts.suppressEffects === true;
        const countForAcceleration = opts.countForAcceleration !== false;

        const special = game.turret.stats.special || 0;
        const crit = this.computeCritStats(game, special);

        const overchargeBoost = window.ModifierSystem.consumeOvercharge(game, target, suppress);

        const execution = window.ModifierSystem.tryExecution(game, target);
        if (execution) {
            if (countForAcceleration) {
                window.ModifierSystem.registerHit(game, opts);
            }
            return execution;
        }

        // if caller is supplying a crit result to inherit, use it directly
        if (opts.forceCrit !== undefined) {
            const damage = baseDamage * (opts.forceCritMultiplier || crit.critMultiplier) * overchargeBoost;
            if (countForAcceleration) {
                window.ModifierSystem.registerHit(game, opts);
            }
            return { damage, isCrit: opts.forceCrit, radiusScale: opts.forceRadiusScale || 1 };
        }

        const critChance = window.ModifierSystem.getCritChance(game, crit.critChance);

        const isCrit = Math.random() < critChance;

        if (!isCrit) {
            game.modifierState.chainCritReady = false;
            if (countForAcceleration) {
                window.ModifierSystem.registerHit(game, opts);
            }
            return { damage: baseDamage * overchargeBoost, isCrit: false, radiusScale: 1 };
        }

        const damage = baseDamage * crit.critMultiplier * overchargeBoost;
        const allowCritFeedback = !suppress && (game.critFeedbackCooldownMs || 0) <= 0;

        if (allowCritFeedback) {
            const particles = Math.max(8, Math.round(8 * crit.critRadiusScale));
            game.createExplosion(target.x, target.y, "#ffd93d", particles);
            game.playCritSfx(crit.critRadiusScale);

            const stopMs = Math.min(80, 30 + (crit.critRadiusScale - 1) * 40);
            game.hitStopMs = Math.max(game.hitStopMs, stopMs);
            if (crit.critMultiplier >= 2.8) game.superCritFlashMs = 140;
            game.critFeedbackCooldownMs = 45;
        }

        window.ModifierSystem.applyCritCascade(game, target, baseDamage, allowCritFeedback);

        window.ModifierSystem.applyCritCooldownReset(game);

        if (game.isKeystoneActive("OVERCHARGE_PROTOCOL") && game.activeFlares.length < 10) {
            game.activeFlares.push({ x: target.x, y: target.y, radius: 120, expiresAtWave: game.wave + 2 });
        }

        if (countForAcceleration) {
            window.ModifierSystem.registerHit(game, opts);
        }
        return { damage, isCrit: true, radiusScale: crit.critRadiusScale };
    },

    isHostile(game, enemy) {
        return enemy && !enemy.dead && enemy.faction === "ENEMY";
    },

    applyBurn(game, enemy) {
        if (!enemy || enemy.dead || enemy.hp <= 0) return;
        const burnDps = game.turret.stats.atk * 0.35;
        const burnDuration = 180;

        if (!enemy.burn) {
            enemy.burn = { dps: burnDps, timer: burnDuration, tickTimer: 0 };
        } else {
            enemy.burn.timer = burnDuration;
            enemy.burn.dps = Math.min(
                Math.max(enemy.burn.dps, burnDps) * 1.1,
                burnDps * 2
            );
        }

        this.createBurnEffect(game, enemy.x, enemy.y);

        for (const other of game.enemies) {
            if (other === enemy || !this.isHostile(game, other)) continue;
            if (Math.hypot(other.x - enemy.x, other.y - enemy.y) < 40) {
                if (!other.burn) {
                    other.burn = {
                        dps: burnDps * 0.5,
                        timer: burnDuration * 0.6,
                        tickTimer: 15
                    };
                    this.createBurnEffect(game, other.x, other.y);
                }
            }
        }
    },

    updateBurn(game, dt) {
        for (const enemy of game.enemies) {
            if (!enemy.burn) continue;
            enemy.burn.timer -= dt;
            enemy.burn.tickTimer -= dt;

            if (enemy.burn.tickTimer <= 0) {
                const dmg = enemy.burn.dps;
                enemy.hp -= dmg;
                enemy.burn.tickTimer = 30;
                game.spawnFloatingText(
                    enemy.x + (Math.random() - 0.5) * 10,
                    enemy.y - enemy.radius - 6,
                    `-${Math.floor(dmg)}🔥`,
                    "#ff8844",
                    0.7
                );
                this.createBurnEffect(game, enemy.x, enemy.y);
            }

            if (enemy.burn.timer <= 0) {
                enemy.burn = null;
            }
        }
    },

    createBurnEffect(game, x, y) {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            game.particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 1.2,
                vy: -0.8 - Math.random() * 1.8,
                life: 25 + Math.floor(Math.random() * 20),
                color: Math.random() < 0.5 ? "#ff6600" : "#ffaa22"
            });
        }
    }
    
};
