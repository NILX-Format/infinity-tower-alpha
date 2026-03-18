window.ShieldSystem = {
    updateShieldStats(game) {
        const armorLevel = game.turret.stats.armor || 0;
        const shield = game.turret.shield;
        const prevMax = shield.max;

        shield.max = Math.max(0, armorLevel * 12);
        shield.radius = game.turret.baseRadius + 40 + armorLevel * 3;

        if (shield.max <= 0) {
            shield.current = 0;
            shield.state = "BROKEN";
            shield.rebuildProgress = 0;
            return;
        }

        if (prevMax <= 0 && shield.max > 0) {
            shield.state = "ACTIVE";
            shield.current = shield.max;
            shield.rebuildProgress = 0;
            return;
        }

        if (shield.state !== "BROKEN") {
            shield.state = "ACTIVE";
            shield.current = shield.max;
        } else {
            shield.current = Math.min(shield.current, shield.max);
        }
    },

    createShieldBreakEffect(game, x, y) {
        game.createExplosion(x, y, "#44aaff", 16);
        game.spawnFloatingText(x, y - 36, "SHIELD BREAK", "#44aaff", 0.9);
    },

    createShieldRestoreEffect(game, x, y) {
        game.createExplosion(x, y, "#7ad3ff", 12);
        game.spawnFloatingText(x, y - 36, "SHIELD RESTORED", "#7ad3ff", 0.9);
    },

    onEnemyKilledRebuild(game) {
        if (game.turret.shield.state === "BROKEN") {
            game.turret.shield.rebuildProgress++;
            if (game.turret.shield.rebuildProgress >= game.turret.shield.rebuildRequired) {
                game.turret.shield.state = "ACTIVE";
                game.turret.shield.current = game.turret.shield.max;
                game.turret.shield.rebuildProgress = 0;
                game.turret.shield.rebuildFlash = 20;
                game.audio.playTone(440, 0.2, 0.1, "sine");
                this.createShieldRestoreEffect(game, game.turret.x, game.turret.y);
            }
        }
    },

    updateEnemyShieldContactState(game, enemy) {
        if (enemy.faction === "PLAYER") {
            enemy.state = "MOVING";
            return;
        }

        const shield = game.turret.shield;
        const distToTurret = Math.hypot(game.turret.x - enemy.x, game.turret.y - enemy.y);

        if (shield.state !== "BROKEN" && shield.current > 0 && distToTurret <= shield.radius) {
            if (enemy.state !== "ATTACKING_SHIELD") {
                enemy.state = "ATTACKING_SHIELD";
                enemy.attackTimer = enemy.attackWindup;
            }
        } else if (distToTurret <= game.turret.baseRadius) {
            if (enemy.state !== "ATTACKING") {
                enemy.state = "ATTACKING";
                enemy.attackTimer = enemy.attackWindup;
            }
        } else {
            enemy.state = "MOVING";
        }
    },

    handleShieldHit(game, enemy, damage) {
        if (enemy.state !== "ATTACKING_SHIELD") return false;

        const shield = game.turret.shield;
        shield.current -= damage;
        if (shield.current <= 0) {
            shield.current = 0;
            shield.state = "BROKEN";
            shield.rebuildProgress = 0;
            game.audio.playTone(140, 0.25, 0.15, "triangle");
            this.createShieldBreakEffect(game, game.turret.x, game.turret.y);
        }
        enemy.attackTimer = enemy.attackCooldown;
        return true;
    },

    triggerRegenSuppression(game) {
        if (game.turret.shield.state === "BROKEN") {
            game.regenSuppressionTimer = game.regenSuppressionDuration;
            game.regenSuppressed = true;
            if (game.suppressionHintCooldown <= 0) {
                game.spawnFloatingText(
                    game.turret.x,
                    game.turret.y - 30,
                    "REGEN SUPPRESSED",
                    "#ffaa44",
                    0.8
                );
                game.suppressionHintCooldown = 30;
            }
        }
    },

    drawShieldRebuildBar(game, ctx) {
        const shield = game.turret.shield;
        if (shield.state !== "BROKEN" || shield.max <= 0) return;

        const ratio = shield.rebuildProgress / shield.rebuildRequired;
        const SH_R = 50;
        const START = -Math.PI / 2;
        const sweep = Math.PI * 2 * ratio;

        ctx.save();
        ctx.beginPath();
        ctx.arc(game.turret.x, game.turret.y, SH_R, START, START + sweep);
        ctx.strokeStyle = "rgba(80,160,255,0.35)";
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    drawArmorArc(game, ctx) {
        const shield = game.turret.shield;
        if (shield.max <= 0) return;

        const armorLevel = game.turret.stats.armor || 0;
        const totalSegs = Math.min(armorLevel, 12);
        if (totalSegs === 0) return;

        const filledSegs = Math.ceil((shield.current / shield.max) * totalSegs);
        const SH_R = 50;
        const GAP = 0.06;
        const ARC = (Math.PI * 2 - GAP * totalSegs) / totalSegs;
        const START = -Math.PI / 2;

        let flashOffset = 0;
        if (shield.rebuildFlash > 0) {
            flashOffset = (shield.rebuildFlash / 20) * 6;
            shield.rebuildFlash--;
        }

        ctx.save();
        for (let i = 0; i < totalSegs; i++) {
            const segStart = START + i * (ARC + GAP);
            const segEnd = segStart + ARC;
            const filled = i < filledSegs;

            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, SH_R + flashOffset, segStart, segEnd);

            if (filled) {
                const ratio = shield.current / shield.max;
                ctx.strokeStyle = `rgba(80,180,255,${0.55 + ratio * 0.45})`;
                ctx.lineWidth = 5;
                ctx.shadowBlur = 6;
                ctx.shadowColor = "#4db8ff";
            } else {
                ctx.strokeStyle = "rgba(80,140,200,0.15)";
                ctx.lineWidth = 4;
                ctx.shadowBlur = 0;
            }
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        if (game.armorForm.active && game.armorForm.type === "FIRE" && shield.current > 0) {
            const flicker = 0.55 + 0.35 * Math.sin(Date.now() * 0.012);
            const pulse = SH_R + flashOffset + 8 + Math.sin(Date.now() * 0.008) * 3;
            ctx.save();
            ctx.strokeStyle = `rgba(255,106,0,${flicker})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#ff4400";
            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,200,50,${flicker * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, pulse - 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
};
