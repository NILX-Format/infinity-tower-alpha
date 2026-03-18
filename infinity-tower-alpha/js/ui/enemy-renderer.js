window.EnemyRenderer = {
    drawSiegeBreaker(game, ctx, enemy) {
        const dx = game.turret.x - enemy.x;
        const dy = game.turret.y - enemy.y;
        const angle = Math.atan2(dy, dx);

        const chargeState = enemy.chargeState || "APPROACH";
        const isChargeUp = chargeState === "CHARGE_UP";
        const isCharging = chargeState === "CHARGING";
        const isRecover = chargeState === "RECOVER";
        const scale = enemy.radius / 16;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(angle + Math.PI / 2);

        ctx.save();
        ctx.translate(0, scale * 3);
        ctx.beginPath();
        ctx.moveTo(0, -scale * 16);
        ctx.lineTo(scale * 16, 0);
        ctx.lineTo(0, scale * 16);
        ctx.lineTo(-scale * 16, 0);
        ctx.closePath();
        ctx.fillStyle = "#0f0f1a";
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(0, -scale * 16);
        ctx.lineTo(scale * 16, 0);
        ctx.lineTo(0, scale * 16);
        ctx.lineTo(-scale * 16, 0);
        ctx.closePath();
        ctx.fillStyle = isRecover ? "#1a0d0d" : "#1a1a2e";
        ctx.strokeStyle = isRecover ? "#6b2020" : "#4a5568";
        ctx.lineWidth = scale * 1.5;
        ctx.fill();
        ctx.stroke();

        const energyAlpha = isCharging ? 0.85 : isChargeUp ? 0.6 : 0.45;
        const crossAlpha = isCharging ? 0.55 : 0.25;
        ctx.save();
        ctx.shadowBlur = isCharging ? scale * 7 : scale * 3;
        ctx.shadowColor = "#ff0000";
        ctx.strokeStyle = `rgba(255,0,0,${energyAlpha})`;
        ctx.lineWidth = scale * 1.0;
        ctx.beginPath();
        ctx.moveTo(0, -scale * 14);
        ctx.lineTo(0, scale * 14);
        ctx.stroke();
        ctx.globalAlpha = crossAlpha;
        ctx.beginPath();
        ctx.moveTo(-scale * 8, -scale * 8);
        ctx.lineTo(scale * 8, scale * 8);
        ctx.moveTo(scale * 8, -scale * 8);
        ctx.lineTo(-scale * 8, scale * 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.save();
        if (isCharging) {
            ctx.shadowBlur = scale * 10;
            ctx.shadowColor = "#ff0000";
        }
        ctx.beginPath();
        ctx.moveTo(0, -scale * 3);
        ctx.lineTo(-scale * 2, -scale * 1);
        ctx.lineTo(scale * 2, -scale * 1);
        ctx.closePath();
        ctx.fillStyle = "#ffa07a";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -scale * 7);
        ctx.lineTo(-scale * 3, -scale * 3);
        ctx.lineTo(scale * 3, -scale * 3);
        ctx.closePath();
        ctx.fillStyle = "#ff6b6b";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -scale * 12);
        ctx.lineTo(-scale * 4, -scale * 6);
        ctx.lineTo(scale * 4, -scale * 6);
        ctx.closePath();
        ctx.fillStyle = isCharging ? "#ffffff" : "#ff0000";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        if (isChargeUp) {
            const ratio = 1 - Math.max(0, (enemy.chargeTimer || 0) / enemy.chargeWindup);
            ctx.save();
            ctx.strokeStyle = "#ffd27f";
            ctx.lineWidth = scale * 2;
            ctx.shadowBlur = scale * 6;
            ctx.shadowColor = "#ffaa00";
            ctx.beginPath();
            ctx.arc(0, 0, scale * 16 + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        const eyeColor = isCharging ? "#ff0000" : isRecover ? "#882222" : "#ff0000";
        ctx.save();
        if (isCharging) {
            ctx.shadowBlur = scale * 5;
            ctx.shadowColor = "#ff0000";
        }
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-scale * 4, scale * 1, scale * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(scale * 4, scale * 1, scale * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        if (isCharging) {
            ctx.save();
            const trailPositions = [[-scale * 10, scale * 6], [0, scale * 8], [scale * 10, scale * 6]];
            trailPositions.forEach(([ox, oy], index) => {
                ctx.strokeStyle = `rgba(74,85,104,${0.55 - index * 0.1})`;
                ctx.lineWidth = scale * 0.8;
                ctx.beginPath();
                ctx.moveTo(ox, oy);
                ctx.lineTo(ox, oy + scale * (8 + index * 2));
                ctx.stroke();
            });
            ctx.restore();
        }

        ctx.restore();
    },

    drawEnemies(game, ctx, effective) {
        game.enemies.forEach(enemy => {
            const distToTurret = Math.hypot(enemy.x - game.turret.x, enemy.y - game.turret.y);
            if (!game.isPositionRevealed(enemy.x, enemy.y)) return;

            let alpha = 0.4;
            if (distToTurret < effective.range) alpha = 1.0;
            ctx.globalAlpha = alpha;

            if (enemy.type === "BOSS") {
                ctx.strokeStyle = "#9b59b6";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = "#1a1a2e";
                ctx.fillRect(enemy.x - 30, enemy.y - enemy.radius - 15, 60, 6);
                ctx.fillStyle = "#9b59b6";
                ctx.fillRect(enemy.x - 30, enemy.y - enemy.radius - 15, (enemy.hp / enemy.maxHp) * 60, 6);
            }

            if (enemy.type === "SIEGE") {
                this.drawSiegeBreaker(game, ctx, enemy);
            } else {
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            if (enemy.role === "shield" && enemy.armorLayers > 0) {
                const colors = ["#ff4444", "#cc2222", "#881111"];
                for (let ring = 0; ring < enemy.armorLayers; ring++) {
                    const radius = enemy.radius + 6 + ring * 5;
                    const color = colors[ring] || "#881111";
                    const hpFrac = ring === 0 ? (enemy.armorHP / enemy.maxArmorHP) : 1;
                    ctx.save();
                    ctx.strokeStyle = "rgba(80,0,0,0.4)";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.strokeStyle = color;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }

            if (enemy.fused) {
                const fusionLevel = enemy.fusionLevel || 1;
                if (enemy.fusionPulse === undefined) enemy.fusionPulse = 0;
                enemy.fusionPulse = (enemy.fusionPulse + 0.06) % (Math.PI * 2);
                const pulseRadius = enemy.radius + 4 + Math.sin(enemy.fusionPulse) * 3;
                const glowAlpha = 0.55 + 0.3 * Math.sin(enemy.fusionPulse);

                ctx.save();
                ctx.shadowBlur = 14 + fusionLevel * 3;
                ctx.shadowColor = fusionLevel >= 4 ? "#ff0088" : "#cc44ff";
                ctx.strokeStyle = fusionLevel >= 4
                    ? `rgba(255,0,136,${glowAlpha})`
                    : `rgba(180,60,255,${glowAlpha})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();

                const segments = Math.min(fusionLevel, 6);
                const gap = 0.12;
                const arcSpan = (Math.PI * 2 - gap * segments) / segments;
                const ringRadius = enemy.radius + 10 + fusionLevel;
                ctx.save();
                ctx.lineWidth = 2;
                for (let segment = 0; segment < segments; segment++) {
                    const startAngle = -Math.PI / 2 + segment * (arcSpan + gap);
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, ringRadius, startAngle, startAngle + arcSpan);
                    ctx.strokeStyle = fusionLevel >= 4 ? "#ff44aa" : "#dd66ff";
                    ctx.stroke();
                }
                ctx.restore();

                if (fusionLevel >= 2) {
                    ctx.save();
                    ctx.font = `bold ${9 + fusionLevel}px monospace`;
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = "#cc44ff";
                    ctx.fillText(`F${fusionLevel}`, enemy.x, enemy.y - enemy.radius - 14);
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }

            game.renderTopologyOverlay(enemy);

            if (enemy.burn) {
                const burnRatio = Math.min(enemy.burn.timer / 180, 1);
                const flickerAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.018 + enemy.x);
                ctx.save();
                ctx.strokeStyle = `rgba(255,100,0,${flickerAlpha * burnRatio})`;
                ctx.lineWidth = 2.5;
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ff6600";
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = `rgba(255,200,50,${flickerAlpha * 0.7})`;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(
                    enemy.x + Math.cos(Date.now() * 0.004) * (enemy.radius * 0.6),
                    enemy.y + Math.sin(Date.now() * 0.004) * (enemy.radius * 0.6),
                    2.5,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }

            if (enemy === game.markedTarget) {
                ctx.strokeStyle = "#ffd93d";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (enemy.hp < enemy.maxHp && enemy.type !== "BOSS") {
                ctx.fillStyle = "#1a1a2e";
                ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 8, 30, 4);
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 8, (enemy.hp / enemy.maxHp) * 30, 4);
            }
        });

        ctx.globalAlpha = 1;
    }
};
