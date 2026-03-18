window.GameCore = {
    startGame(loadSave) {
        window.HelperUtils.byId("mainMenu").style.display = "none";

        const game = window.CoreState.setGame(new Game());
        window.game = game;
        game.audio.init();

        if (loadSave) game.loadRun();

        game.updateShieldStats();
        game.updateUI();
        game.setSpeed(1.0);
        game.loop();
    },

    bindMenu() {
        window.HelperUtils.byId("continueBtn")?.addEventListener("click", () => {
            this.startGame(true);
        });
        window.HelperUtils.byId("newRunBtn").onclick = () => {
            localStorage.removeItem("infinityTowerSave");
            this.startGame(false);
        };
        window.HelperUtils.byId("resetBtn").onclick = () => {
            if (confirm("Reset ALL progress?")) {
                localStorage.clear();
                location.reload();
            }
        };

        if (!localStorage.getItem("infinityTowerSave")) {
            window.HelperUtils.byId("continueBtn").disabled = true;
            window.HelperUtils.byId("continueBtn").style.opacity = 0.5;
            window.HelperUtils.byId("continueInfo").textContent = "（暂无存档）";
        } else {
            const save = window.HelperUtils.parseJSON(localStorage.getItem("infinityTowerSave"), null);
            if (save) {
                const wave = save.wave || "?";
                const atk = save.turretStats?.atk?.toFixed(0) || "?";
                const hp = save.turretStats?.maxHp || "?";
                window.HelperUtils.byId("continueInfo").textContent =
                    `Wave ${wave} · ATK ${atk} · HP ${hp}`;
            } else {
                window.HelperUtils.byId("continueInfo").textContent = "存档已记录";
            }
        }
    }
};

window.game = window.CoreState.getGame();
window.GameCore.bindMenu();
