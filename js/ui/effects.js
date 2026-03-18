window.EffectsUI = {
    spawnFloatingText(game, x, y, text, color = "#ffffff", scale = 1) {
        game.floatingTexts.push({
            x,
            y,
            text,
            color,
            scale,
            life: 45,
            maxLife: 45
        });
    },

    createExplosion(game, x, y, color, count = 5) {
        const maxParticles = game.effectLimits?.particles ?? 900;
        if (game.particles.length >= maxParticles) return;

        const available = Math.max(0, maxParticles - game.particles.length);
        const spawnCount = Math.min(count, available);
        for (let i = 0; i < count; i++) {
            if (i >= spawnCount) break;
            game.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30, color, alpha: 1
            });
        }
    },

    drawBeams(game, ctx) {
        const maxBeams = game.effectLimits?.beams ?? 48;
        if (game.activeBeams.length > maxBeams) {
            game.activeBeams.splice(0, game.activeBeams.length - maxBeams);
        }

        for (let i = game.activeBeams.length - 1; i >= 0; i--) {
            const beam = game.activeBeams[i];

            let alpha = 1;
            if (beam.life && beam.maxLife) alpha = Math.max(0, beam.life / beam.maxLife);

            if (beam.type === "RAILGUN") {
                const color = beam.color || "#ff9f1c";
                const width = beam.width || 24;

                const sx = game.screenShake || 0;
                const jitterX = (Math.random() - 0.5) * sx * 0.35;
                const jitterY = (Math.random() - 0.5) * sx * 0.35;

                ctx.save();
                ctx.globalCompositeOperation = "lighter";

                ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
                ctx.lineWidth = width + 10;
                ctx.lineCap = "round";
                ctx.shadowBlur = 18;
                ctx.shadowColor = color;
                ctx.beginPath();
                ctx.moveTo(beam.x1 + jitterX, beam.y1 + jitterY);
                ctx.lineTo(beam.x2 + jitterX, beam.y2 + jitterY);
                ctx.stroke();

                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.shadowBlur = 14;
                ctx.shadowColor = color;
                ctx.beginPath();
                ctx.moveTo(beam.x1 + jitterX, beam.y1 + jitterY);
                ctx.lineTo(beam.x2 + jitterX, beam.y2 + jitterY);
                ctx.stroke();

                ctx.strokeStyle = "rgba(255,240,220,0.9)";
                ctx.lineWidth = Math.max(2, width * 0.25);
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#ffffff";
                ctx.beginPath();
                ctx.moveTo(beam.x1 + jitterX, beam.y1 + jitterY);
                ctx.lineTo(beam.x2 + jitterX, beam.y2 + jitterY);
                ctx.stroke();

                ctx.restore();
            } else if (beam.type === "PLASMA") {
                const baseColor = beam.color || "#c77dff";
                const chainIndex = beam.chainIndex || 0;
                const width = Math.max(2, 6 - chainIndex);
                const beamAlpha = (beam.alpha || 1) * alpha;

                ctx.save();
                ctx.globalCompositeOperation = "lighter";

                ctx.strokeStyle = `rgba(231, 180, 255, ${0.22 * beamAlpha})`;
                ctx.lineWidth = width + 6;
                ctx.lineCap = "round";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#e6b4ff";
                ctx.beginPath();
                ctx.moveTo(beam.x1, beam.y1);
                ctx.lineTo(beam.x2, beam.y2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(199, 125, 255, ${0.45 * beamAlpha})`;
                ctx.lineWidth = width + 2;
                ctx.shadowBlur = 8;
                ctx.shadowColor = baseColor;
                ctx.beginPath();
                ctx.moveTo(beam.x1, beam.y1);
                ctx.lineTo(beam.x2, beam.y2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(245, 225, 255, ${0.85 * beamAlpha})`;
                ctx.lineWidth = Math.max(1.5, width * 0.4);
                ctx.shadowBlur = 4;
                ctx.shadowColor = "#fff2ff";
                ctx.beginPath();
                ctx.moveTo(beam.x1, beam.y1);
                ctx.lineTo(beam.x2, beam.y2);
                ctx.stroke();

                const pulse = 2.5 + Math.sin(Date.now() * 0.02 + chainIndex) * 0.8;
                [ [beam.x1, beam.y1], [beam.x2, beam.y2] ].forEach(([x, y]) => {
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(231, 180, 255, ${0.35 * beamAlpha})`;
                    ctx.arc(x, y, pulse + 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(255,255,255, ${0.85 * beamAlpha})`;
                    ctx.arc(x, y, Math.max(1, pulse * 0.55), 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
            } else {
                ctx.strokeStyle = "#ffd93d";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(beam.x1, beam.y1);
                ctx.lineTo(beam.x2, beam.y2);
                ctx.stroke();
            }

            beam.life--;
            if (beam.life <= 0) game.activeBeams.splice(i, 1);
        }
    },

    drawBioFields(game, ctx) {
        for (let i = game.bioFields.length - 1; i >= 0; i--) {
            const f = game.bioFields[i];

            ctx.strokeStyle = "#6bcb77";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.stroke();

            f.life--;
            if (f.life <= 0) game.bioFields.splice(i, 1);
        }
    },

    drawRelicEffects(game, ctx) {
        for (let i = game.relicEffects.length - 1; i >= 0; i--) {
            const r = game.relicEffects[i];
            const alpha = r.life / 40;

            ctx.fillStyle = `rgba(255,215,0,${alpha})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            ctx.fill();

            r.life--;
            if (r.life <= 0) game.relicEffects.splice(i, 1);
        }
    },

    drawAssimilationEffect(game, ctx) {
        if (!game.assimilationFlash) return;

        ctx.fillStyle = "#ffd700";
        ctx.font = "12px monospace";
        ctx.fillText(
            "Assimilated: " + game.assimilationFlash.stat,
            game.turret.x - 50,
            game.turret.y - 50
        );

        game.assimilationFlash.life--;
        if (game.assimilationFlash.life <= 0) game.assimilationFlash = null;
    },

    drawLineageFlash(game, ctx) {
        if (!game.lineageFlash) return;

        ctx.fillStyle = "#ffd700";
        ctx.font = "18px monospace";
        ctx.fillText(
            game.lineageFlash.text,
            game.turret.x - 100,
            game.turret.y - 80
        );

        game.lineageFlash.life--;
        if (game.lineageFlash.life <= 0) game.lineageFlash = null;
    }
};
