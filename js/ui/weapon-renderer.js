window.WeaponRenderer = {
    drawSniperBullets(game, ctx) {
        game.bullets.forEach(bullet => {
            if (bullet.type !== "SNIPER") return;

            bullet.trailParticles.forEach(particle => {
                const alpha = particle.life / 14;
                ctx.fillStyle = `rgba(0,245,212,${alpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#00f5d4";
            ctx.fillStyle = "rgba(0,245,212,0.55)";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    },

    drawSniperTargets(game, ctx) {
        game.enemies.forEach(enemy => {
            if (!enemy.sniperTargeted) return;
            const flash = Math.sin(Date.now() / 80) * 0.4 + 0.6;
            const size = enemy.radius + 10;
            const gap = 5;

            ctx.save();
            ctx.globalAlpha = flash;
            ctx.strokeStyle = "#00f5d4";
            ctx.lineWidth = 1.5;

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
                ctx.beginPath();
                ctx.moveTo(enemy.x + sx * size, enemy.y + sy * (size - gap));
                ctx.lineTo(enemy.x + sx * size, enemy.y + sy * size);
                ctx.lineTo(enemy.x + sx * (size - gap), enemy.y + sy * size);
                ctx.stroke();
            });

            ctx.restore();
            enemy.sniperTargeted--;
        });
    },

    drawSniperAmmo(game, ctx) {
        if (game.getActiveWeapon() !== "SNIPER") return;
        const sniper = game.sniperState;
        const baseX = game.turret.x;
        const baseY = game.turret.y + 30;

        ctx.save();
        for (let i = 0; i < sniper.maxAmmo; i++) {
            const offset = (i - (sniper.maxAmmo - 1) / 2) * 14;
            ctx.beginPath();
            ctx.arc(baseX + offset, baseY, 5, 0, Math.PI * 2);
            if (i < sniper.ammo) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = "#00f5d4";
                ctx.fillStyle = "#ffffff";
                ctx.fill();
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#555555";
                ctx.stroke();
            }
            ctx.closePath();
        }

        if (sniper.ammo === 0 && sniper.isReloading) {
            const progress = 1 - (sniper.reloadTimer / sniper.reloadTime);
            ctx.strokeStyle = "rgba(0,245,212,0.5)";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(baseX, baseY, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
        }

        ctx.restore();
    },

    drawRailgunPower(game, ctx) {
        if (game.getActiveWeapon() !== "RAILGUN") return;
        const railgun = game.railgunState;
        const x = game.turret.x;
        const y = game.turret.y - 30;

        if (railgun.cooldown > 0) {
            const maxCooldown = railgun.baseCooldown * (1 + 0.35 * (railgun.chargeLevel - 1));
            const progress = 1 - railgun.cooldown / maxCooldown;
            ctx.save();
            ctx.strokeStyle = "rgba(255,159,28,0.25)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, game.turret.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < railgun.maxCharge; i++) {
            const offset = (i - 2) * 12;
            const filled = i < railgun.chargeLevel;
            const color = filled
                ? (railgun.chargeLevel === railgun.maxCharge ? "#ff4422" : "#ff9f1c")
                : null;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x + offset - 4, y - 4, 8, 8);
            if (filled) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = color;
                ctx.fillStyle = color;
                ctx.fill();
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#444";
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = railgun.chargeLevel === railgun.maxCharge ? "#ff4422" : "#ff9f1c";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#ff9f1c";
        ctx.fillText(`PWR ${railgun.chargeLevel}/${railgun.maxCharge}`, x, y - 12);
        ctx.restore();
    },

    drawTurretWeaponState(game, ctx) {
        ctx.save();
        ctx.translate(game.turret.x, game.turret.y);
        ctx.rotate(game.turret.angle);

        const coreColor = game.weaponColors[game.getActiveWeapon()] || "#3498db";

        ctx.fillStyle = "#34495e";
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#95a5a6";
        ctx.fillRect(0, -8, 40, 16);

        if (game.weaponSwitchFlash > 0) {
            game.weaponSwitchFlash = Math.max(0, game.weaponSwitchFlash - 0.04);
            ctx.save();
            ctx.globalAlpha = game.weaponSwitchFlash * 0.6;
            ctx.shadowBlur = 30;
            ctx.shadowColor = coreColor;
            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        if (game.superCritFlashMs > 0) {
            const t = game.superCritFlashMs / 140;
            const alpha = Math.max(0.2, t);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#ffffff";
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (game.manifestFlash > 0) {
            const ratio = game.manifestFlash / 12;
            ctx.strokeStyle = `rgba(255,255,255,${ratio})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, 25 + (1 - ratio) * 10, 0, Math.PI * 2);
            ctx.stroke();
            game.manifestFlash--;
        }

        if (game.laserFlash > 0) {
            ctx.fillStyle = "rgba(255,217,61,0.4)";
            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, 10 + game.laserFlash * 2, 0, Math.PI * 2);
            ctx.fill();
            game.laserFlash--;
        }

        if (game.keystones && game.keystones.OVERCHARGE_PROTOCOL) {
            ctx.strokeStyle = "rgba(255,100,100,0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(game.turret.x, game.turret.y, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
};
