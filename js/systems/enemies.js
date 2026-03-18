window.EnemySystem = {
    findNearestBeacon(game, enemy) {
        let nearest = null;
        let minDist = Infinity;
        game.structures.forEach(s => {
            if (s.type !== "BEACON" || s.hp <= 0) return;
            const d = Math.hypot(enemy.x - s.x, enemy.y - s.y);
            if (d < minDist) {
                minDist = d;
                nearest = s;
            }
        });
        return { beacon: nearest, dist: minDist };
    },

    handleScoutDefeat(game, enemy) {
        if (enemy.type === "BOSS") {
            game.flareCharges = Math.min(game.flareMax, game.flareCharges + 1);
            return;
        }
        if (enemy.type === "SCOUT" && enemy.canDropFlare && Math.random() <= 0.5) {
            game.flareCharges = Math.min(game.flareMax, game.flareCharges + 1);
        }
    },

    updateScoutBehavior(game, enemy, dt) {
        const { beacon: nearestBeacon, dist } = this.findNearestBeacon(game, enemy);
        if (nearestBeacon) enemy.state = "SEEK_BEACON";
        else enemy.state = "PATROL_FORWARD_ZONE";

        const forwardBounds = window.WorldStateSystem.getForwardZoneBounds(game);
        const minY = forwardBounds.top - game.scoutConfig.exitMargin;
        const maxY = forwardBounds.bottom;

        if (enemy.state === "SEEK_BEACON" && nearestBeacon) {
            const dx = nearestBeacon.x - enemy.x;
            const dy = nearestBeacon.y - enemy.y;
            const len = Math.hypot(dx, dy) || 1;
            const moveSpeed = enemy.speed * (enemy.speedMultiplier || 1) * 0.5 * dt;
            enemy.x += (dx / len) * moveSpeed;
            enemy.y += (dy / len) * moveSpeed;

            if (dist <= nearestBeacon.range) {
                enemy.state = "REINFORCE_BEACON";
            }
        }

        if (enemy.state === "PATROL_FORWARD_ZONE") {
            const forwardCenter = window.WorldStateSystem.getForwardZoneCenter(game);
            const tx = forwardCenter.x;
            const ty = forwardCenter.y;
            const dx = tx - enemy.x;
            const dy = ty - enemy.y;
            const len = Math.hypot(dx, dy) || 1;
            const moveSpeed = enemy.speed * (enemy.speedMultiplier || 1) * 0.45 * dt;
            enemy.x += (dx / len) * moveSpeed;
            enemy.y += (dy / len) * moveSpeed;
        }

        if (enemy.y >= forwardBounds.top) {
            enemy.hasEnteredForwardZone = true;
        }

        if (
            enemy.hasEnteredForwardZone &&
            enemy.y < forwardBounds.top - game.scoutConfig.exitMargin
        ) {
            return { remove: true, reason: "despawn" };
        }

        enemy.y = Math.max(minY, Math.min(maxY, enemy.y));

        if (enemy.state === "REINFORCE_BEACON" && nearestBeacon) {
            nearestBeacon.maxHp += enemy.hp;
            nearestBeacon.hp += enemy.hp;
            nearestBeacon.range += enemy.hp * game.scoutConfig.beaconRangeScale;
            return { remove: true, reason: "reinforce" };
        }

        return { remove: false, reason: null };
    },

    handleSiegeImpact(game, enemy) {
        const shield = game.turret.shield;
        const shieldActive = shield.state !== "BROKEN" && shield.current > 0;

        if (shieldActive) {
            const totalSegs = Math.max(1, Math.min(game.turret.stats.armor || 0, 12));
            const currentSegs = Math.ceil((shield.current / shield.max) * totalSegs);
            const remainingSegs = Math.max(0, currentSegs - enemy.chargeImpactDamage);
            shield.current = remainingSegs <= 0
                ? 0
                : (shield.max / totalSegs) * remainingSegs;
            if (shield.current <= 0) {
                shield.current = 0;
                shield.state = "BROKEN";
                shield.rebuildProgress = 0;
                game.createShieldBreakEffect(game.turret.x, game.turret.y);
            } else {
                game.createExplosion(game.turret.x, game.turret.y, "#ff8c42", 12);
                game.spawnFloatingText(game.turret.x, game.turret.y - 44, `-${enemy.chargeImpactDamage} SHIELD`, "#ffb36b", 1);
            }
        } else {
            const crashDamage = Math.max(2, enemy.damage * 1.8);
            game.turret.stats.hp -= crashDamage;
            game.createExplosion(game.turret.x, game.turret.y, "#ff6b6b", 18);
            game.spawnFloatingText(game.turret.x, game.turret.y - 44, `-${Math.ceil(crashDamage)} RAM`, "#ff6b6b", 1);
        }

        game.screenShake = Math.max(game.screenShake || 0, 14);
        enemy.chargeState = "RECOVER";
        enemy.ignoreSlow = false;
        enemy.state = "MOVING";
        enemy.chargeTimer = 25;
        enemy.chargeCooldownTimer = enemy.chargeCooldown;
        enemy.attackTimer = enemy.attackCooldown;
        this.repositionSiegeOutsideCore(game, enemy, shieldActive);
    },

    repositionSiegeOutsideCore(game, enemy, shieldActive = false) {
        const dx = enemy.x - game.turret.x;
        const dy = enemy.y - game.turret.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const shieldRadius = game.turret.shield.radius || 0;
        const coreRadius = game.turret.baseRadius || 0;
        const safeRadius = Math.max(
            coreRadius + enemy.radius + 22,
            (shieldActive ? shieldRadius : coreRadius) + enemy.radius + 14
        );

        enemy.x = game.turret.x + nx * safeRadius;
        enemy.y = game.turret.y + ny * safeRadius;
    },

    updateSiegeBehavior(game, enemy, dt) {
        const dx = game.turret.x - enemy.x;
        const dy = game.turret.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (enemy.chargeCooldownTimer > 0) {
            enemy.chargeCooldownTimer = Math.max(0, enemy.chargeCooldownTimer - dt);
        }

        if (!enemy.chargeState || enemy.chargeState === "APPROACH") {
            enemy.chargeState = "APPROACH";
            enemy.ignoreSlow = false;
            if (dist <= 260 && enemy.chargeCooldownTimer <= 0) {
                enemy.chargeState = "CHARGE_UP";
                enemy.chargeTimer = enemy.chargeWindup;
                enemy.state = "MOVING";
                return;
            }
            const moveSpeed = enemy.speed * (enemy.speedMultiplier || 1) * 0.42 * dt;
            enemy.x += (dx / dist) * moveSpeed;
            enemy.y += (dy / dist) * moveSpeed;
            return;
        }

        if (enemy.chargeState === "CHARGE_UP") {
            enemy.chargeTimer -= dt;
            if (enemy.chargeTimer <= 0) {
                enemy.chargeState = "CHARGING";
                enemy.ignoreSlow = true;
            }
            return;
        }

        if (enemy.chargeState === "CHARGING") {
            const chargeMove = enemy.chargeSpeed * dt;
            enemy.x += (dx / dist) * chargeMove;
            enemy.y += (dy / dist) * chargeMove;

            const shield = game.turret.shield;
            const hitShield = shield.state !== "BROKEN" && shield.current > 0 && dist <= shield.radius + enemy.radius + 6;
            const hitCore = dist <= game.turret.baseRadius + enemy.radius + 4;
            if (hitShield || hitCore) {
                this.handleSiegeImpact(game, enemy);
            }
            return;
        }

        if (enemy.chargeState === "RECOVER") {
            const minRecoverRadius = game.turret.baseRadius + enemy.radius + 18;
            if (dist < minRecoverRadius) {
                this.repositionSiegeOutsideCore(game, enemy, false);
            }
            enemy.chargeTimer = (enemy.chargeTimer || 25) - dt;
            if (enemy.chargeTimer <= 0) {
                enemy.chargeState = "APPROACH";
                enemy.chargeTimer = 0;
            }
        }
    },

    getHostileMoveTarget(game, enemy) {
        return {
            x: game.turret.x + Math.cos(enemy.attackAngle) * enemy.attackRadius,
            y: game.turret.y + Math.sin(enemy.attackAngle) * enemy.attackRadius
        };
    },

    spawnEnemy(game, requestedType = null) {
        const x = Math.random() * canvas.width;
        const y = -40;

        let role = (requestedType || "normal").toLowerCase();
        if (role === "fast") role = "runner";
        if (role === "speedster") role = "runner";
        if (!game.ENEMY_TYPES[role]) role = "normal";

        if (!requestedType) {
            const roll = Math.random();
            if (roll < 0.60) role = "normal";
            else if (roll < 0.80) role = "runner";
            else role = "tank";
        }

        const typeMap = {
            normal: "NORMAL",
            runner: "SPEEDSTER",
            tank: "TANK",
            elite: "ELITE",
            boss: "BOSS",
            scout: "SCOUT",
            shield: "SHIELD",
            siege: "SIEGE"
        };
        const type = typeMap[role] || "NORMAL";

        const base = game.ENEMY_TYPES[role] || game.ENEMY_TYPES.normal;
        const hpScale = 0.03 * Math.pow(1.12, game.wave);
        const speedScale = 1 + game.wave * 0.015;
        const dmgScale = 1 + game.wave * 0.01;

        const stats = {
            hp: Math.max(1, Math.floor(base.hp * hpScale)),
            speed: base.speed * speedScale,
            radius: base.radius,
            color: base.color,
            reward: base.reward
        };

        if (type === "SCOUT") {
            stats.speed = Math.max(stats.speed, 2.2);
        }

        const shieldRadius = game.turret.shield.radius || (game.turret.baseRadius + 40);
        const attackRadius = Math.max(
            game.turret.baseRadius + stats.radius + 10,
            shieldRadius - stats.radius - 6
        );
        const attackAngle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.9);

        const enemy = {
            x, y, type,
            hp: stats.hp,
            maxHp: stats.hp,
            speed: stats.speed,
            radius: stats.radius,
            color: stats.color,
            reward: stats.reward,
            faction: "ENEMY",
            entityType: "COMBAT",
            isConverted: false,
            conversionProgress: 0,
            burn: null,
            originalHP: stats.hp,
            originalSpeed: stats.speed,
            state: "MOVING",
            attackWindup: 30,
            attackTimer: 30,
            attackCooldown: Math.max(35, Math.floor(base.attackCooldown)),
            damage: base.damage * dmgScale * 0.7,
            attackRange: stats.radius + 35,
            attackAngle,
            attackRadius
        };
        if (type === "SCOUT") {
            enemy.state = "SEEK_BEACON";
            enemy.canDropFlare = true;
            enemy.priorityTarget = "BEACON";
            enemy.hasEnteredForwardZone = false;
        }

        if (type === "SHIELD") {
            enemy.role = "shield";
            enemy.maxArmorLayers = 3;
            enemy.armorLayers = 3;
            enemy.armorHP = 30;
            enemy.maxArmorHP = 30;
            enemy.speed *= 0.85;
        }

        if (type === "SIEGE") {
            enemy.role = "siege";
            enemy.state = "MOVING";
            enemy.chargeState = "APPROACH";
            enemy.chargeWindup = 70;
            enemy.chargeTimer = 0;
            enemy.chargeSpeed = Math.max(4.4, enemy.speed * 5.4);
            enemy.ignoreSlow = false;
            enemy.chargeImpactDamage = 3;
            enemy.chargeCooldown = 150;
            enemy.chargeCooldownTimer = 60;
        }

        game.enemies.push(enemy);
        game.enemiesSpawned++;
    },

    findNearestHostile(game, unit) {
        let nearest = null;
        let bestDist = Infinity;
        game.enemies.forEach(e => {
            if (e.dead) return;
            if (e.faction === unit.faction) return;

            const dx = e.x - unit.x;
            const dy = e.y - unit.y;
            const dist = dx * dx + dy * dy;

            if (dist < bestDist) {
                bestDist = dist;
                nearest = e;
            }
        });
        return nearest;
    },

    findNearestEnemy(game) {
        let nearest = null;
        let bestDist = Infinity;

        game.enemies.forEach(enemy => {
            if (enemy.dead) return;
            if (enemy.isConverted) return;

            const dx = enemy.x - game.turret.x;
            const dy = enemy.y - game.turret.y;
            const dist = dx * dx + dy * dy;

            if (dist < bestDist) {
                bestDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    },

    findNearestVisibleEnemy(game) {
        let nearest = null;
        let minDist = Infinity;

        for (const e of game.enemies) {
            if (e.hp <= 0) continue;
            if (!game.isPositionRevealed(e.x, e.y)) continue;

            const d = Math.hypot(
                e.x - game.turret.x,
                e.y - game.turret.y
            );

            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        }

        return nearest;
    }
};
