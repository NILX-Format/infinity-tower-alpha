window.OverlayUI = {
    drawStatusRadar(game) {
        return window.StatusOverlayUI.drawStatusRadar(game);
    },

    drawWaveCountdown(game) {
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (game.rageState?.warning) {
            const pulse = 0.45 + 0.35 * Math.sin(Date.now() * 0.02);
            ctx.save();
            ctx.strokeStyle = `rgba(255,60,60,${pulse})`;
            ctx.lineWidth = 8;
            ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
            ctx.fillStyle = `rgba(120,0,0,${0.12 + pulse * 0.08})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff6b6b";
            ctx.font = "bold 24px monospace";
            ctx.fillText("RAGE INCOMING", cx, cy - 26);
            ctx.font = "bold 16px monospace";
            ctx.fillStyle = "#ffd6d6";
            const secs = Math.max(1, Math.ceil((game.rageState.warningTimerMs || 0) / 1000));
            ctx.fillText(`Enemy escalation in ${secs}s`, cx, cy + 8);
            ctx.restore();
        }

        if (game.waveCountdown <= 0) return;

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.fillStyle = "#4ecdc4";
        ctx.font = "bold 28px monospace";
        ctx.fillText(`— WAVE ${game.wave} —`, cx, cy - 60);

        const pulse = 1 + 0.15 * Math.sin(game.waveCountdownTimer * 0.2);
        const numSize = Math.round(96 * pulse);
        ctx.font = `bold ${numSize}px monospace`;

        const colors = ["#ff6b6b", "#ffd93d", "#4ecdc4"];
        ctx.fillStyle = colors[game.waveCountdown - 1] || "#fff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillText(String(game.waveCountdown), cx, cy + 30);
        ctx.shadowBlur = 0;

        ctx.font = "16px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText("准备好了吗？", cx, cy + 70);
        ctx.textAlign = "left";
    },

    drawFog(game) {
        if (!window.VisibilitySystem.shouldDrawFog(game)) return;
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const effectiveView = game.getEffectiveView();
        const gradient = ctx.createRadialGradient(
            game.turret.x, game.turret.y, effectiveView * 0.3,
            game.turret.x, game.turret.y, effectiveView
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(0.6, "rgba(0,0,0,0.4)");
        gradient.addColorStop(1, "rgba(0,0,0,0.95)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        game.activeFlares.forEach(flare => {
            const flareGrad = ctx.createRadialGradient(flare.x, flare.y, 0, flare.x, flare.y, flare.radius);
            flareGrad.addColorStop(0, "rgba(255, 245, 180, 0.75)");
            flareGrad.addColorStop(0.5, "rgba(255, 230, 120, 0.30)");
            flareGrad.addColorStop(1, "rgba(255, 220, 100, 0)");
            ctx.fillStyle = flareGrad;
            ctx.fillRect(flare.x - flare.radius, flare.y - flare.radius, flare.radius * 2, flare.radius * 2);
        });
    },

    drawRangeIndicators(game) {
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const effective = game.getEffectiveCombatStats();
        ctx.strokeStyle = "rgba(255, 217, 61, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(game.turret.x, game.turret.y, effective.range, 0, Math.PI * 2);
        ctx.stroke();

        WallSystem.draw(game, ctx);
    }
};
