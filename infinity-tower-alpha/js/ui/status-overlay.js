window.StatusOverlayUI = {
    updateFullStats(game) {
        const el = game.ui.fullStatDisplay;
        if (!el) return;

        const s = game.turret.stats;
        const effective = game.getEffectiveCombatStats();
        const armorRatio = Math.min(s.armor * 0.05, 0.75);
        const crit = game.computeCritStats(s.special || 0);
        const viewValue = game.playerStats.VIEW || 0;
        const viewText = game.isStatCapped("VIEW")
            ? `${viewValue} <span style="color:#ff6b6b">MAX</span>`
            : `${viewValue}/${game.viewCap}`;
        const shield = game.turret.shield;
        const shieldText = shield.max > 0
            ? `<span style="color:#4d96ff">${Math.max(0, Math.ceil(shield.current))}/${shield.max}</span>`
            : `<span style="color:#444">—</span>`;

        el.innerHTML = `
            <div class="stat-row"><span>WEAPON</span>  <span style="color:#ffd93d">${game.getWeaponName(game.getActiveWeapon())}</span></div>
            <div class="stat-row"><span>WAVE</span>    <span style="color:#4ecdc4">${game.wave}</span></div>
            <div class="stat-row"><span>ATK</span>     <span>${s.atk.toFixed(1)}</span></div>
            <div class="stat-row"><span>SPEED</span>   <span>${s.speed.toFixed(2)}</span></div>
            <div class="stat-row"><span>HP</span>      <span style="color:#6bcb77">${Math.ceil(s.hp)} / ${s.maxHp}</span></div>
            <div class="stat-row"><span>SHIELD</span>  ${shieldText}</div>
            <div class="stat-row"><span>ARMOR</span>   <span>${(armorRatio * 100).toFixed(0)}%</span></div>
            <div class="stat-row"><span>RANGE</span>   <span>${Math.round(effective.range)}</span></div>
            <div class="stat-row"><span>VIEW</span>    <span>${viewText}</span></div>
            <div class="stat-row"><span>CRIT</span>    <span style="color:#c77dff">${(crit.critChance * 100).toFixed(0)}%</span></div>
            <div class="stat-row"><span>FLARES</span>  <span>🔦 ${game.flareCharges}/${game.flareMax}</span></div>
        `;
    },

    toggleStatusOverlay(game, open) {
        game.radarExpanded = open;
        const overlay = document.getElementById("statusOverlay");
        if (!overlay) return;

        if (open) {
            overlay.classList.add("open");
            game.isPaused = true;
            this.updateFullStats(game);
            this.drawStatusRadar(game);
        } else {
            overlay.classList.remove("open");
            game.isPaused = false;
        }
    },

    drawStatusRadar(game) {
        const canvas = document.getElementById("radarCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawHeptagonRadar(game, ctx, cx, cy, cx * 0.75);
        this.drawRadarCenterInfo(game, ctx, cx, cy);
    },

    drawHeptagonRadar(game, ctx, cx, cy, radius) {
        const stats = game.playerStats;
        const nodes = [
            { name: "ATK", value: stats.ATK, color: "#ff6b6b" },
            { name: "SPEED", value: stats.SPEED, color: "#ffd93d" },
            { name: "HP", value: stats.HP, color: "#6bcb77" },
            { name: "ARMOR", value: stats.ARMOR, color: "#4d96ff" },
            { name: "SPECIAL", value: stats.SPECIAL, color: "#c77dff" },
            { name: "RANGE", value: stats.RANGE, color: "#ff9f1c" },
            { name: "VIEW", value: stats.VIEW, color: "#00f5d4" }
        ];

        const maxValue = 10;
        const nodeCount = nodes.length;

        ctx.save();
        ctx.translate(cx, cy);

        ctx.beginPath();
        for (let i = 0; i < nodeCount; i++) {
            const angle = -Math.PI / 2 + i * (2 * Math.PI / nodeCount);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        for (let ring = 1; ring <= 3; ring++) {
            ctx.beginPath();
            for (let i = 0; i < nodeCount; i++) {
                const angle = -Math.PI / 2 + i * (2 * Math.PI / nodeCount);
                const ringRadius = radius * (ring / 3);
                const x = Math.cos(angle) * ringRadius;
                const y = Math.sin(angle) * ringRadius;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        for (let i = 0; i < nodeCount; i++) {
            const angle = -Math.PI / 2 + i * (2 * Math.PI / nodeCount);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            ctx.stroke();
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(120,200,255,0.5)";
        ctx.beginPath();
        for (let i = 0; i < nodeCount; i++) {
            const normalized = Math.min(nodes[i].value / maxValue, 1);
            const angle = -Math.PI / 2 + i * (2 * Math.PI / nodeCount);
            const nodeRadius = radius * normalized;
            const x = Math.cos(angle) * nodeRadius;
            const y = Math.sin(angle) * nodeRadius;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(120,200,255,0.25)";
        ctx.strokeStyle = "rgba(120,200,255,0.9)";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        game.radarNodes = [];
        for (let i = 0; i < nodeCount; i++) {
            const node = nodes[i];
            const angle = -Math.PI / 2 + i * (2 * Math.PI / nodeCount);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            game.radarNodes.push({ name: node.name, x: cx + x, y: cy + y, radius: 10 });

            const isHovered = node.name === game.hoveredNode;
            const dotRadius = isHovered ? 7 : 4;

            ctx.shadowBlur = isHovered ? 15 : 6;
            ctx.shadowColor = node.color;
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = isHovered ? node.color : "#ffffff";
            ctx.font = isHovered ? "bold 9px monospace" : "9px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(node.name, x, y + 8);
            if (isHovered) {
                ctx.fillStyle = "rgba(255,255,255,0.85)";
                ctx.font = "9px monospace";
                ctx.fillText(`×${node.value}`, x, y + 18);
            }
        }

        ctx.restore();
    },

    drawRadarCenterInfo(game, ctx, cx, cy) {
        if (!game.hoveredNode) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.font = "10px monospace";
            ctx.fillText("hover a node", cx, cy);
            return;
        }

        const stat = game.hoveredNode;
        const upgrades = game.playerStats[stat];
        const info = {
            ATK: { desc: "伤害输出", per: "+1 ATK / 点" },
            SPEED: { desc: "射击频率", per: "+0.3 速度 / 点" },
            HP: { desc: "生存能力", per: "+5 最大HP / 点" },
            ARMOR: { desc: "减伤比例", per: "+5% 减伤 / 点" },
            SPECIAL: { desc: "暴击率", per: "+2% 暴击 / 点" },
            RANGE: { desc: "攻击范围", per: "+25 射程 / 点" },
            VIEW: { desc: "高度与锁定", per: "+30 HEIGHT / 点" }
        };
        const colors = {
            ATK: "#ff6b6b",
            SPEED: "#ffd93d",
            HP: "#6bcb77",
            ARMOR: "#4d96ff",
            SPECIAL: "#c77dff",
            RANGE: "#ff9f1c",
            VIEW: "#00f5d4"
        };

        const color = colors[stat];
        const { desc, per } = info[stat] || { desc: "", per: "" };

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.font = "bold 16px monospace";
        ctx.fillText(stat, cx, cy - 22);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(120,200,255,0.95)";
        ctx.font = "bold 22px monospace";
        ctx.fillText(`+${upgrades}`, cx, cy + 2);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "9px monospace";
        ctx.fillText(desc, cx, cy + 22);
        ctx.fillText(per, cx, cy + 34);
        ctx.restore();
    }
};
