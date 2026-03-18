window.WorldRenderer = {
    drawGameObjects(game, ctx) {
        const effective = game.getEffectiveCombatStats();

        if (game.laserTimer > 0 && game.turret.target) {
            ctx.strokeStyle = "#4ecdc4";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#4ecdc4";
            ctx.beginPath();
            ctx.moveTo(game.turret.x, game.turret.y);
            ctx.lineTo(game.turret.target.x, game.turret.target.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        game.bullets.forEach(bullet => {
            if (bullet.type === "INCENDIARY") {
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = "#ff8844";
                ctx.fillStyle = "#ffaa44";
                ctx.globalAlpha = 0.95;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ff5500";
                ctx.shadowBlur = 6;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(
                    bullet.x - bullet.vx * 1.5,
                    bullet.y - bullet.vy * 1.5,
                    bullet.radius * 0.6,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
                return;
            }

            ctx.fillStyle = bullet.isFallback ? "#6a7a8a" : "#ffffff";
            ctx.globalAlpha = bullet.isFallback ? 0.4 : 1;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        game.drawBeams(ctx);
        game.drawBioFields(ctx);
        window.EnemyRenderer.drawEnemies(game, ctx, effective);

        game.particles.forEach(particle => {
            if (!game.isPositionRevealed(particle.x, particle.y)) return;
            ctx.globalAlpha = Math.max(0, particle.life / 30);
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        });
        ctx.globalAlpha = 1;

        game.floatingTexts.forEach(text => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
            ctx.fillStyle = text.color;
            ctx.font = `bold ${Math.max(10, Math.floor(16 * text.scale))}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText(text.text, text.x, text.y);
            ctx.restore();
        });

        window.WeaponRenderer.drawTurretWeaponState(game, ctx);
        game.drawArmorArc(ctx);
        game.drawShieldRebuildBar(ctx);
        this.drawTurretBars(game, ctx);

        game.structures.forEach(structure => {
            if (!game.isPositionRevealed(structure.x, structure.y)) return;

            const pulseSize = structure.range + Math.sin(structure.pulse) * 6;
            ctx.save();
            ctx.translate(structure.x, structure.y);
            ctx.fillStyle = "rgba(255,217,61,0.08)";
            ctx.fillRect(-pulseSize, -pulseSize, pulseSize * 2, pulseSize * 2);
            ctx.restore();

            ctx.save();
            ctx.translate(structure.x, structure.y);
            ctx.rotate(Math.PI / 4 + structure.rotation);
            ctx.strokeStyle = "#ffd93d";
            ctx.lineWidth = 3;
            ctx.strokeRect(-structure.size, -structure.size, structure.size * 2, structure.size * 2);
            ctx.restore();
        });
    },

    drawTurretBars(game, ctx) {
        const { x, y } = game.turret;
        const hpRatio = game.turret.stats.maxHp > 0
            ? Math.max(0, game.turret.stats.hp / game.turret.stats.maxHp)
            : 0;

        const radius = 38;
        const width = 6;
        const start = -Math.PI / 2;
        const end = start + Math.PI * 2 * hpRatio;

        let hpColor;
        if (hpRatio > 0.5) hpColor = "#6bcb77";
        else if (hpRatio > 0.25) hpColor = "#ffd93d";
        else hpColor = "#ff6b6b";

        const lowPulse = hpRatio < 0.25
            ? 0.55 + 0.45 * Math.sin(Date.now() * 0.006)
            : 1;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = width;
        ctx.stroke();

        if (hpRatio > 0) {
            ctx.beginPath();
            ctx.arc(x, y, radius, start, end);
            ctx.strokeStyle = hpColor;
            ctx.globalAlpha = lowPulse;
            ctx.lineWidth = width;
            ctx.shadowBlur = hpRatio < 0.25 ? 10 : 4;
            ctx.shadowColor = hpColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        const regenRate = game.currentRegenRate || 0;
        if (regenRate > 0 && hpRatio < 1) {
            const sparkX = x + Math.cos(end) * radius;
            const sparkY = y + Math.sin(end) * radius;
            const sparkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.012);
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.globalAlpha = sparkAlpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#6bcb77";
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
};
