window.InputController = {
    initialize(game) {
        game.autoWave = true;
        game.systemOpen = false;
        game.uiState = {};
        game.statusExpanded = false;
        game.dockLastActive = Date.now();
        game.speedMultiplier = 3;
        game.timeScale = 3;
    },

    bindAll(game) {
        this.bindHudControls(game);
        this.bindCanvasInput(game);
        this.bindWindowInput(game);
    },

    bindHudControls(game) {
        const autoBtn = document.getElementById("autoToggle");
        if (autoBtn) {
            autoBtn.classList.add("active");
            autoBtn.onclick = () => {
                game.autoWave = !game.autoWave;
                autoBtn.classList.toggle("active", game.autoWave);
                autoBtn.querySelector(".auto-label").textContent =
                    game.autoWave ? "AUTO" : "NEXT";
            };
        }

        const railControls = document.getElementById("railgunControls");
        const railLabel = document.getElementById("railPowerLabel");
        const updateRailLabel = () => {
            const railgunState = game.railgunState;
            if (!railgunState || !railLabel) return;
            railLabel.textContent = `PWR ${railgunState.chargeLevel}/${railgunState.maxCharge}`;
            railLabel.style.color = railgunState.chargeLevel === railgunState.maxCharge ? "#ff4422" : "#ff9f1c";
        };

        document.getElementById("railPowerDown")?.addEventListener("click", () => {
            const railgunState = game.railgunState;
            if (railgunState.chargeLevel > 1) {
                railgunState.chargeLevel--;
                updateRailLabel();
            }
        });

        document.getElementById("railPowerUp")?.addEventListener("click", () => {
            const railgunState = game.railgunState;
            if (railgunState.chargeLevel < railgunState.maxCharge) {
                railgunState.chargeLevel++;
                updateRailLabel();
            }
        });

        game._prevWeapon = null;
        setInterval(() => {
            const activeWeapon = game.getActiveWeapon ? game.getActiveWeapon() : null;
            if (activeWeapon !== game._prevWeapon) {
                game._prevWeapon = activeWeapon;
                if (railControls) railControls.style.display = activeWeapon === "RAILGUN" ? "flex" : "none";
                updateRailLabel();
            }
        }, 200);

        const systemToggle = document.getElementById("systemToggle");
        const systemPanel = document.getElementById("systemPanel");
        const closeSystemPanel = () => {
            systemPanel?.classList.remove("open");
            systemToggle?.classList.remove("open");
            game.systemOpen = false;
        };

        systemToggle?.addEventListener("click", event => {
            event.stopPropagation();
            if (game.systemOpen) {
                closeSystemPanel();
                return;
            }
            game.systemOpen = true;
            systemToggle.classList.add("open");
            systemPanel?.classList.add("open");
        });

        document.getElementById("soundToggle")?.addEventListener("click", () => {
            game.toggleMute();
            const enabled = game.audio ? game.audio.enabled : true;
            const stateEl = document.getElementById("soundState");
            const iconEl = document.querySelector("#soundToggle .si-icon");
            if (stateEl) {
                stateEl.textContent = enabled ? "ON" : "OFF";
                stateEl.classList.toggle("on", enabled);
            }
            if (iconEl) {
                iconEl.textContent = enabled ? "🔊" : "🔇";
            }
            closeSystemPanel();
        });

        document.getElementById("menuToggle")?.addEventListener("click", () => {
            game.toggleMenu();
            closeSystemPanel();
        });

        document.addEventListener("click", event => {
            if (game.systemOpen && !document.getElementById("systemWrapper")?.contains(event.target)) {
                closeSystemPanel();
            }
        });

        if (game.ui.speedToggle) {
            game.ui.speedToggle.textContent = "x3";
            game.ui.speedToggle.classList.add("active", "turbo");
            game.ui.speedToggle.addEventListener("click", () => {
                if (game.speedMultiplier === 1) {
                    game.speedMultiplier = 3;
                    game.ui.speedToggle.textContent = "x3";
                    game.ui.speedToggle.classList.add("active", "turbo");
                } else {
                    game.speedMultiplier = 1;
                    game.ui.speedToggle.textContent = "x1";
                    game.ui.speedToggle.classList.remove("active", "turbo");
                }
                game.timeScale = game.speedMultiplier;
            });
        }
    },

    bindCanvasInput(game) {
        canvas.addEventListener("click", event => game.handleClick(event));
        canvas.addEventListener("touchend", event => {
            event.preventDefault();
            const touch = event.changedTouches[0];
            game.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        canvas.addEventListener("pointerdown", () => game.resumeAudio());
        canvas.addEventListener("mousemove", event => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (event.clientX - rect.left) * scaleX;
            const my = (event.clientY - rect.top) * scaleY;
            game.hoveredNode = null;
            for (const node of game.radarNodes) {
                const dx = mx - node.x;
                const dy = my - node.y;
                if (Math.sqrt(dx * dx + dy * dy) < node.radius) {
                    game.hoveredNode = node.name;
                    break;
                }
            }
        });
    },

    bindWindowInput(game) {
        document.getElementById("resetProgressBtn")?.addEventListener("click", () => game.resetAllProgress());
        window.addEventListener("resize", () => game.updateContainerScale());
        window.addEventListener("keydown", event => {
            if (event.key === "c") {
                const target = game.findNearestEnemy();
                if (target) {
                    game.convertEnemy(target);
                    console.log("Converted enemy:", target);
                }
            }
        });
    }
};
