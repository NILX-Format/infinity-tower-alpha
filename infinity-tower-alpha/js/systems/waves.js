window.WaveSystem = {
    getTotalEnemiesFromPackets(game, packets) {
        return packets.reduce((sum, p) => sum + (p.count || 0), 0);
    },

    generateWavePackets(game, waveNumber) {
        const packets = [];
        const eliteCount = Math.floor(waveNumber / 5);

        if (waveNumber % 10 === 0) {
            packets.push({ type: "boss", count: 1, interval: 0 });
        }

        packets.push({
            type: "normal",
            count: 6 + waveNumber,
            interval: 180
        });

        if (waveNumber >= 4) {
            packets.push({
                type: "runner",
                count: 2 + Math.floor(waveNumber / 4),
                interval: 150
            });
        }

        if (eliteCount > 0) {
            packets.push({
                type: "elite",
                count: eliteCount,
                interval: 800
            });
        }

        if (waveNumber >= 6) {
            packets.push({
                type: "tank",
                count: 1 + Math.floor(waveNumber / 6),
                interval: 240
            });
        }

        if (waveNumber >= 3 && waveNumber < 7) {
            packets.push({ type: "shield", count: 1, interval: 300 });
        }
        if (waveNumber >= 7) {
            const shieldCount = Math.min(5, 2 + Math.floor((waveNumber - 7) / 5));
            packets.push({ type: "shield", count: shieldCount, interval: 400 });
        }

        if (waveNumber >= 12) {
            const siegeCount = 1 + Math.floor((waveNumber - 12) / 8);
            packets.push({
                type: "siege",
                count: Math.min(3, siegeCount),
                interval: 900
            });
        }

        return packets;
    },

    getEnemiesForWave(game) {
        return this.getTotalEnemiesFromPackets(game, this.generateWavePackets(game, game.wave));
    },

    updateWaveSpawning(game) {
        if (game.currentPacket < game.wavePackets.length) {
            const packet = game.wavePackets[game.currentPacket];
            game.packetTimer--;

            if (game.packetTimer <= 0) {
                game.spawnEnemy(packet.type);
                game.packetEnemyIndex++;

                if (game.packetEnemyIndex >= packet.count) {
                    game.currentPacket++;
                    game.packetEnemyIndex = 0;
                    if (game.currentPacket < game.wavePackets.length) {
                        game.packetTimer = game.msToTicks(2000);
                    }
                } else {
                    game.packetTimer = game.msToTicks(packet.interval);
                }
            }
        }
    },

    showNextWaveButton(game) {
        const panel = game.ui.upgradePanel;
        const btnContainer = game.ui.upgradeButtons;
        btnContainer.innerHTML = "";

        const optKeyToStatKey = { atk: "ATK", speed: "SPEED", maxHp: "HP", armor: "ARMOR", special: "SPECIAL", range: "RANGE", view: "VIEW" };
        const pool = game.upgradeOptions.filter(opt => {
            const statKey = optKeyToStatKey[opt.key];
            return !statKey || !game.isStatCapped(statKey);
        });
        if (pool.length === 0) pool.push({ key: "special", label: "✨ 特殊 +1", value: 1, desc: "提升暴击率" });

        const choices = [];
        const tempPool = [...pool];
        for (let i = 0; i < 3; i++) {
            if (tempPool.length === 0) break;
            const idx = Math.floor(Math.random() * tempPool.length);
            choices.push(tempPool.splice(idx, 1)[0]);
        }

        choices.forEach(opt => {
            const btn = document.createElement("button");
            btn.innerHTML = `
                <div style="font-weight: bold;">${opt.label}</div>
                <div style="font-size: 12px; color: #aaa; margin-top: 5px;">${opt.desc}</div>
            `;
            btn.onclick = () => game.applyUpgrade(opt);
            btnContainer.appendChild(btn);
        });

        game.ui.upgradeTitle.textContent = `Wave ${game.wave} 完成!`;

        window.WeaponStateSystem.updateLegacyWeaponHint(game);

        panel.style.display = "block";
    },

    checkWaveComplete(game) {
        if (game.waveTransitioning) return;
        const allSpawned = game.enemiesSpawned >= game.enemiesToSpawn;

        let hostileCount = 0;
        game.enemies.forEach(e => {
            if (game.isHostile(e)) hostileCount++;
        });
        const allDead = hostileCount === 0;

        if (allSpawned && allDead) {
            console.log(`Wave ${game.wave} 完成`);
            game.saveRun();
            game.waveTransitioning = true;
            game.isPaused = true;

            if (game.wave >= 300) {
                if (!game.relicAssimilatedThisRun) {
                    game.assimilateRelic();
                    game.relicAssimilatedThisRun = true;
                }
                game.ui.victory.style.display = "block";
                game.gameOver = true;
            } else {
                if (game.autoWave) {
                    game.showUpgradePanel();
                } else {
                    this.showNextWaveButton(game);
                }
            }
        }
    },

    advanceWave(game) {
        game.pendingWaveAdvance = false;
        game.wave++;
        game.enemiesSpawned = 0;
        game.wavePackets = this.generateWavePackets(game, game.wave);
        game.currentPacket = 0;
        game.packetEnemyIndex = 0;
        game.packetTimer = 0;
        game.enemiesToSpawn = this.getTotalEnemiesFromPackets(game, game.wavePackets);
        game.spawnTimer = 0;
        game.waveTransitioning = false;
        window.VisibilitySystem.pruneExpiredFlares(game);
        game.waveCountdown = 3;
        game.waveCountdownTimer = 0;
        game.isPaused = true;
        game.resetRageState();
        game.saveRun();
        console.log(`进入 Wave ${game.wave}, 敌人数量: ${game.enemiesToSpawn}`);
    },

    updateWaveCountdown(game, dt) {
        if (game.waveCountdown <= 0) return;
        game.waveCountdownTimer += dt;
        if (game.waveCountdownTimer >= 60) {
            game.waveCountdownTimer = 0;
            game.waveCountdown--;
            if (game.waveCountdown <= 0) {
                game.isPaused = false;
            }
        }
    }
};
