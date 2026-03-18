window.WeaponSystem = {
    fireBullet(game) {
        if (!game.turret.target) return false;
        const effective = game.getEffectiveCombatStats();
        const dist = Math.hypot(
            game.turret.target.x - game.turret.x,
            game.turret.target.y - game.turret.y
        );
        const allowedRange = game.getAllowedRangeForTarget(game.turret.target, effective.range);
        if (dist > allowedRange) return false;
        const angle = Math.atan2(game.turret.target.y - game.turret.y, game.turret.target.x - game.turret.x);
        game.bullets.push({
            x: game.turret.x, y: game.turret.y,
            vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
            damage: effective.atk,
            distance: 0,
            maxDistance: window.ModifierSystem.getProjectileMaxDistance(game, allowedRange),
            radius: 3,
            speed: 7,
            isCannon: false,
            hasHitTarget: false
        });
        game.playShootSfx();
        game.turret.cooldown = game.turret.stats.fireRate * effective.cooldownMultiplier;
        return true;
    },

    fireLaser(game) {
        if (!game.turret.target) return false;
        const effective = game.getEffectiveCombatStats();
        const laserDmg = effective.atk * effective.speed * 0.3;
        const laserHit = window.CombatSystem.applyDamageWithCrit(game, laserDmg, game.turret.target);
        game.turret.target.hp -= laserHit.damage;

        game.createExplosion(game.turret.target.x, game.turret.target.y, "#4ecdc4", 2);
        game.playShootSfx();
        game.turret.cooldown = 6 * effective.cooldownMultiplier;
        game.laserTimer = 5;
        return true;
    },

    fireCannon(game) {
        if (!game.turret.target) return false;
        const effective = game.getEffectiveCombatStats();
        const dist = Math.hypot(
            game.turret.target.x - game.turret.x,
            game.turret.target.y - game.turret.y
        );
        const allowedRange = game.getAllowedRangeForTarget(game.turret.target, effective.range);
        if (dist > allowedRange) return false;

        const angle = Math.atan2(game.turret.target.y - game.turret.y, game.turret.target.x - game.turret.x);
        game.bullets.push({
            x: game.turret.x, y: game.turret.y,
            vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
            damage: effective.atk * 3,
            distance: 0, maxDistance: allowedRange * 1.5,
            radius: 8, isCannon: true,
            speed: 4,
            splashRadius: effective.splashRadius,
            weaponType: "CANNON"
        });
        game.playShootSfx();
        game.turret.cooldown = (game.turret.stats.fireRate * 3) * effective.cooldownMultiplier;
        return true;
    },

    autoShoot(game) {
        if (game.turret.cooldown > 0 || !game.turret.target) return false;
        const effective = game.getEffectiveCombatStats();
        const dist = Math.hypot(
            game.turret.target.x - game.turret.x,
            game.turret.target.y - game.turret.y
        );
        const allowedRange = game.getAllowedRangeForTarget(game.turret.target, effective.range);
        if (dist > allowedRange) return false;

        let fired = false;
        const activeWeapon = game.getActiveWeapon();
        switch (activeWeapon) {
            case "LASER":           fired = game.fireWeapon_LASER();          break;
            case "INCENDIARY":      fired = game.fireWeapon_INCENDIARY();     break;
            case "SNIPER":          fired = game.fireWeapon_SNIPER();         break;
            case "PLASMA":          fired = game.fireWeapon_PLASMA();         break;
            case "RAILGUN":         fired = game.fireWeapon_RAILGUN();        break;
            case "BIO_LAUNCHER":    fired = game.fireWeapon_BIO_LAUNCHER();   break;
            case "REFLECT_SHIELD":  fired = game.fireWeapon_REFLECT_SHIELD(); break;
            default:                fired = game.fireBullet();                break;
        }
        if (fired) game.tryPhantomEcho(game.turret.target);
        game.fireFallbackWeapon();
        return fired;
    },

    fireFallbackWeapon(game) {
        if (!game.turret.target) return false;
        const w = game.getActiveWeapon();
        if (w === "RAILGUN" || w === "SNIPER") return;

        if (game.fallbackCooldown > 0) {
            game.fallbackCooldown--;
            return;
        }

        game.fallbackCooldown = 45;
        const angle = Math.atan2(
            game.turret.target.y - game.turret.y,
            game.turret.target.x - game.turret.x
        );
        const damage = game.turret.stats.atk * 0.30;
        game.bullets.push({
            x: game.turret.x,
            y: game.turret.y,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            damage: damage,
            radius: 2,
            color: "#6a7a8a",
            isFallback: true,
            isCannon: false,
            speed: 6,
            distance: 0,
            hasHitTarget: false,
            maxDistance: window.ModifierSystem.getProjectileMaxDistance(
                game,
                game.getAllowedRangeForTarget(game.turret.target, game.turret.stats.range)
            )
        });
    },

    fireWeapon_LASER(game) {
        if (!game.turret.target) return false;

        const target = game.turret.target;
        const effective = game.getEffectiveCombatStats();
        game.laserFlash = 4;
        const damage = effective.atk * effective.tickMultiplier * 0.3;

        target.hp -= damage;
        game.audio.playTone(880, 0.05, 0.08, "square");

        game.activeBeams.push({
            x1: game.turret.x,
            y1: game.turret.y,
            x2: target.x,
            y2: target.y,
            life: 6
        });

        game.turret.cooldown = 6 * effective.cooldownMultiplier;
    },

    fireWeapon_INCENDIARY(game) {
        if (!game.turret.target) return;
        const effective = game.getEffectiveCombatStats();
        const dist = Math.hypot(
            game.turret.target.x - game.turret.x,
            game.turret.target.y - game.turret.y
        );
        const allowedRange = game.getAllowedRangeForTarget(game.turret.target, effective.range);
        if (dist > allowedRange) return false;

        const angle = Math.atan2(
            game.turret.target.y - game.turret.y,
            game.turret.target.x - game.turret.x
        );
        game.bullets.push({
            x: game.turret.x,
            y: game.turret.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            damage: effective.atk * 1.05,
            distance: 0,
            maxDistance: allowedRange * 1.1,
            radius: 5,
            speed: 5,
            type: "INCENDIARY",
            color: "#ff8844",
            isCannon: false,
            hasHitTarget: false
        });
        game.playShootSfx();
        game.turret.cooldown = game.turret.stats.fireRate * 1.05 * effective.cooldownMultiplier;
        return true;
    },

    fireWeapon_SNIPER(game) {
        const s = game.sniperState;
        if (s.ammo <= 0) return false;
        if (s.recoilCooldown > 0) return false;

        const minRange = game.sniperConfig.deadZone;
        const maxRange = game.turret.stats.range + game.sniperConfig.bonusRange;
        const target = game.getSniperTarget(minRange, maxRange);
        if (!target) return false;

        s.ammo--;
        s.recoilCooldown = 70;

        if (!s.isReloading) {
            s.isReloading = true;
            s.reloadTimer = s.reloadTime;
        }

        const dx = target.x - game.turret.x;
        const dy = target.y - game.turret.y;
        const dist = Math.hypot(dx, dy);
        const distanceFactor = 1 + ((dist - minRange) / 600) * 1.2;
        let damage = game.turret.stats.atk * 2.6 * distanceFactor;

        if (!target.sniperTagged) {
            damage *= 1.5;
            target.sniperTagged = true;
        }

        const penetration = Math.min(3, 1 + Math.floor((game.playerStats.VIEW || 0) / 3));
        game.spawnSniperBullet(target, damage, penetration);

        const effective = game.getEffectiveCombatStats();
        game.turret.cooldown = 2 * effective.cooldownMultiplier;
        return true;
    },

    spawnSniperBullet(game, target, damage, penetration) {
        const angle = Math.atan2(target.y - game.turret.y, target.x - game.turret.x);
        const speed = 18;
        const maxRange = game.turret.stats.range + game.sniperConfig.bonusRange;
        game.bullets.push({
            x: game.turret.x, y: game.turret.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            distance: 0,
            maxDistance: window.ModifierSystem.getProjectileMaxDistance(game, maxRange),
            radius: 4,
            speed,
            type: "SNIPER",
            hitEnemies: [],
            trailParticles: [],
            penetration,
            penetrationsLeft: penetration,
            hasHitTarget: false
        });

        target.sniperTargeted = 30;
        game.audio.playTone(1200, 0.08, 0.06, "sawtooth");
        game.audio.playTone(600, 0.15, 0.04, "sine");
    },

    fireWeapon_RAILGUN(game) {
        const r = game.railgunState;
        if (r.cooldown > 0) {
            game.turret.cooldown = 2;
            return false;
        }

        const level = r.chargeLevel;
        const damageMultiplier = 1 + 0.25 * (level - 1);
        const rangeMultiplier = 1 + 0.20 * (level - 1);
        const cooldownMultiplier = 1 + 0.35 * (level - 1);

        const effectiveRange = game.turret.stats.range * rangeMultiplier;
        const target = game.getTargetInRange(effectiveRange);
        if (!target) return false;

        const damage = game.turret.stats.atk * 4.0 * damageMultiplier;
        const isMax = (level === r.maxCharge);

        game.fireRailgunBeam(target, damage, effectiveRange, isMax);
        r.cooldown = Math.round(r.baseCooldown * cooldownMultiplier);
        game.turret.cooldown = r.cooldown;
        return true;
    },

    fireWeapon_PLASMA(game) {
        const first = game.turret.target;
        if (!first) return false;

        const effective = game.getEffectiveCombatStats();
        const config = game.plasmaConfig;
        const special = game.turret.stats.special || 0;
        const maxChains = Math.min(7, config.maxChains + Math.floor(special / 5));
        const chainRadius = config.chainRadius + special * 4;

        let current = first;
        let damage = effective.atk * config.baseDamageMult;
        const hitSet = new Set();
        let chains = 0;
        let prev = game.turret;

        // first hit: full crit evaluation with all effects
        const firstHit = window.CombatSystem.applyDamageWithCrit(game, damage, current);
        current.hp -= firstHit.damage;
        game.createPlasmaImpact(current.x, current.y);
        game.spawnPlasmaBeam(prev, current, chains);
        hitSet.add(current);
        prev = current;
        chains++;

        // subsequent hops: inherit crit, suppress hitStop/audio/particles
        const chainOpts = {
            suppressEffects:    true,
            forceCrit:          firstHit.isCrit,
            forceCritMultiplier: firstHit.isCrit
                ? (2.0 + special * 0.05)   // same multiplier formula, no re-roll
                : 1,
            forceRadiusScale:   firstHit.radiusScale || 1
        };

        damage *= config.falloff;
        current = game.findNearestChainTarget(prev, hitSet, chainRadius);

        while (current && chains < maxChains) {
            const hit = window.CombatSystem.applyDamageWithCrit(game, damage, current, chainOpts);
            current.hp -= hit.damage;
            // lighter impact for chain hops (2 particles instead of 6)
            game.createPlasmaImpact(current.x, current.y, true);
            game.spawnPlasmaBeam(prev, current, chains);
            hitSet.add(current);
            prev = current;
            current = game.findNearestChainTarget(current, hitSet, chainRadius);
            damage *= config.falloff;
            chains++;
        }

        game.playPlasmaSfx();
        game.turret.cooldown = Math.max(
            config.minCooldown || 0,
            game.turret.stats.fireRate *
            config.cooldownMult *
            effective.cooldownMultiplier
        );
        return true;
    },

    spawnPlasmaBeam(game, from, to, chainIndex = 0) {
        let plasmaBeamCount = 0;
        for (let i = 0; i < game.activeBeams.length; i++) {
            if (game.activeBeams[i].type === "PLASMA") plasmaBeamCount++;
        }
        if (plasmaBeamCount >= 18) {
            for (let i = 0; i < game.activeBeams.length; i++) {
                if (game.activeBeams[i].type === "PLASMA") {
                    game.activeBeams.splice(i, 1);
                    break;
                }
            }
        }

        const alpha = Math.max(0.35, 1 - chainIndex * 0.15);
        const life = Math.max(4, 8 - chainIndex * 2);
        game.activeBeams.push({
            x1: from.x, y1: from.y,
            x2: to.x, y2: to.y,
            life,
            maxLife: life,
            color: "#c77dff",
            type: "PLASMA",
            alpha,
            chainIndex
        });
    },

    fireWeapon_BIO_LAUNCHER(game) {
        return game.updateBioLauncher();
    },

    fireWeapon_REFLECT_SHIELD(game) {
        const effective = game.getEffectiveCombatStats();
        const pulseRadius = 95 + game.turret.stats.armor * 10;
        const pulseDamage = effective.atk * 0.35 + game.turret.stats.armor * 0.9;
        let hitCount = 0;

        for (const enemy of game.enemies) {
            if (!game.isHostile(enemy)) continue;
            const dist = Math.hypot(enemy.x - game.turret.x, enemy.y - game.turret.y);
            if (dist > pulseRadius) continue;

            if (!game.applyArmorIntercept(pulseDamage, enemy)) {
                enemy.hp -= pulseDamage;
            }
            game.applySlowMultiplier(enemy, 0.78);
            game.createExplosion(enemy.x, enemy.y, "#4d96ff", 4);
            hitCount++;
        }

        if (hitCount > 0) {
            game.createExplosion(game.turret.x, game.turret.y, "#4d96ff", 10);
            if (game.turret.shield.max > 0) {
                game.turret.shield.current = Math.min(
                    game.turret.shield.max,
                    game.turret.shield.current + Math.max(1, Math.floor(game.turret.stats.armor * 0.4))
                );
            }
        }
        game.turret.cooldown = game.turret.stats.fireRate * effective.cooldownMultiplier;
        return true;
    },

    createBioField(game, x, y) {
        game.bioFields.push({
            x,
            y,
            radius: 52,
            life: 240
        });
    },

    triggerPhantomAttack(game, weapon, target) {
        if (!weapon || !target) return false;

        const scale = game.phantomState?.damageScale ?? 0.45;
        const color = game.weaponColors[weapon] || "#ffffff";
        game.createExplosion(game.turret.x, game.turret.y, color, 8);

        switch (weapon) {
            case "LASER": {
                const damage = game.turret.stats.atk * Math.max(0.35, scale * 0.9);
                target.hp -= damage;
                game.activeBeams.push({
                    x1: game.turret.x,
                    y1: game.turret.y,
                    x2: target.x,
                    y2: target.y,
                    life: 4,
                    color
                });
                return true;
            }
            case "INCENDIARY": {
                const damage = game.turret.stats.atk * scale;
                if (!game.applyArmorIntercept(damage, target)) {
                    target.hp -= damage;
                }
                game.applyBurn(target);
                return true;
            }
            case "SNIPER": {
                const damage = game.turret.stats.atk * (2.0 * scale);
                const result = window.CombatSystem.applyDamageWithCrit(game, damage, target);
                if (!game.applyArmorIntercept(result.damage, target)) {
                    target.hp -= result.damage;
                }
                game.createExplosion(target.x, target.y, color, 6);
                return true;
            }
            case "PLASMA": {
                let current = target;
                let damage = game.turret.stats.atk * (1.2 * scale);
                const hitSet = new Set();
                let prev = game.turret;
                let chains = 0;

                const firstHit = window.CombatSystem.applyDamageWithCrit(game, damage, current);
                current.hp -= firstHit.damage;
                game.spawnPlasmaBeam(prev, current, chains);
                hitSet.add(current);
                prev = current;
                chains++;

                const special = game.turret.stats.special || 0;
                const chainOpts = {
                    suppressEffects: true,
                    forceCrit: firstHit.isCrit,
                    forceCritMultiplier: firstHit.isCrit ? (2.0 + special * 0.05) : 1,
                    forceRadiusScale: firstHit.radiusScale || 1
                };

                damage *= 0.85;
                current = game.findNearestChainTarget(prev, hitSet, 120);

                while (current && chains < 2) {
                    const result = window.CombatSystem.applyDamageWithCrit(game, damage, current, chainOpts);
                    current.hp -= result.damage;
                    game.createPlasmaImpact(current.x, current.y, true);
                    game.spawnPlasmaBeam(prev, current, chains);
                    hitSet.add(current);
                    prev = current;
                    current = game.findNearestChainTarget(current, hitSet, 120);
                    damage *= 0.85;
                    chains++;
                }
                return true;
            }
            case "RAILGUN": {
                game.fireRailgunBeam(target, game.turret.stats.atk * (1.8 * scale), game.turret.stats.range * 1.1, false);
                return true;
            }
            case "BIO_LAUNCHER": {
                game.bioFields.push({
                    x: target.x,
                    y: target.y,
                    radius: 34,
                    life: 120
                });
                return true;
            }
            case "REFLECT_SHIELD": {
                const pulseRadius = 70 + game.turret.stats.armor * 6;
                const pulseDamage = game.turret.stats.atk * 0.25 + game.turret.stats.armor * 0.5;
                for (const enemy of game.enemies) {
                    if (!game.isHostile(enemy)) continue;
                    const dist = Math.hypot(enemy.x - game.turret.x, enemy.y - game.turret.y);
                    if (dist > pulseRadius) continue;
                    if (!game.applyArmorIntercept(pulseDamage, enemy)) {
                        enemy.hp -= pulseDamage;
                    }
                    game.applySlowMultiplier(enemy, 0.85);
                }
                return true;
            }
            default:
                return false;
        }
    }
};
