window.RunSummarySystem = {
    getRunHistory(game) {
        try {
            const raw = localStorage.getItem("runHistory");
            const parsed = JSON.parse(raw || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    },

    saveRunHistoryEntry(game, entry) {
        const history = this.getRunHistory(game);
        history.unshift(entry);
        localStorage.setItem("runHistory", JSON.stringify(history.slice(0, 10)));
    },

    buildSummaryRows(game, stats) {
        const order = ["ATK", "SPEED", "HP", "ARMOR", "RANGE", "VIEW", "SPECIAL"];
        return order.map(stat =>
            `<div class="summary-item"><span class="summary-label">${stat}</span><span class="summary-value">${stats[stat] || 0}</span></div>`
        ).join("");
    },

    buildKillRows(game, killsByType) {
        const order = ["NORMAL", "SPEEDSTER", "TANK", "ELITE", "BOSS", "SCOUT", "SHIELD", "SIEGE"];
        return order
            .filter(type => (killsByType[type] || 0) > 0)
            .map(type =>
                `<div class="summary-item"><span class="summary-label">${game.getEnemyDisplayName(type)}</span><span class="summary-value">${killsByType[type]}</span></div>`
            )
            .join("") || `<div class="summary-item"><span class="summary-label">Kills</span><span class="summary-value">0</span></div>`;
    },

    renderRunSummary(game) {
        if (!game.ui.runSummary || !game.ui.runHistory) return;

        const summaryHtml = `
            <div class="summary-title">RUN SUMMARY</div>
            <div class="summary-item"><span class="summary-label">Wave Reached</span><span class="summary-value">${game.wave}</span></div>
            <div class="summary-item"><span class="summary-label">Weapon</span><span class="summary-value">${game.getDisplayWeaponName()}</span></div>
            <div class="summary-item"><span class="summary-label">Cause of Death</span><span class="summary-value">${game.getEnemyDisplayName(game.runStats.causeOfDeath)}</span></div>
            <div class="summary-list">
                <div class="summary-title">BUILD</div>
                ${this.buildSummaryRows(game, game.playerStats)}
            </div>
            <div class="summary-list">
                <div class="summary-title">ENEMIES KILLED</div>
                ${this.buildKillRows(game, game.runStats.killsByType)}
            </div>
        `;
        game.ui.runSummary.innerHTML = summaryHtml;

        const history = this.getRunHistory(game);
        const historyHtml = history.length > 0
            ? history.map((entry, index) =>
                `<div class="summary-history-entry">#${index + 1}  Wave ${entry.wave}  ${entry.buildLabel}</div>`
            ).join("")
            : `<div class="summary-history-entry">No runs recorded yet.</div>`;

        game.ui.runHistory.innerHTML = `
            <div class="summary-title">RUN HISTORY</div>
            ${historyHtml}
        `;
    },

    finalizeRun(game, causeType = "UNKNOWN") {
        if (game.runStats.logged) return;

        game.runStats.causeOfDeath = causeType || "UNKNOWN";
        game.runStats.logged = true;

        this.saveRunHistoryEntry(game, {
            wave: game.wave,
            buildLabel: game.getBuildLabel(),
            weapon: game.getActiveWeapon(),
            causeOfDeath: game.runStats.causeOfDeath,
            playerStats: { ...game.playerStats }
        });

        this.renderRunSummary(game);
    },

    prepareGameOverUI(game) {
        game.toggleStatusOverlay(false);
        game.isPaused = true;
        game.ui.upgradePanel.style.display = "none";

        game.floatingTexts = [];
        game.particles = [];
        game.activeBeams = [];
        game.bullets = [];
        game.bioFields = [];
        game.relicEffects = [];

        if (game.ui.relicReward) {
            const hasRelicReward = game.ui.relicReward.innerHTML.trim().length > 0;
            game.ui.relicReward.style.display = hasRelicReward ? "block" : "none";
        }
        if (game.ui.keystoneReward) {
            const hasKeystoneReward = game.ui.keystoneReward.innerHTML.trim().length > 0;
            game.ui.keystoneReward.style.display = hasKeystoneReward ? "block" : "none";
        }
        if (game.ui.gameOver) {
            game.ui.gameOver.scrollTop = 0;
        }
    }
};
