window.TargetingSystem = {
    initialize(game) {
        game.markedTarget = null;
        game.markTimer = 0;
        game.markCooldown = 0;
        game.markDuration = 180;
        game.markCooldownMax = 480;
    },

    update(game, dt) {
        if (game.markTimer > 0) {
            game.markTimer = Math.max(0, game.markTimer - dt);
            if (game.markTimer <= 0) game.markedTarget = null;
        }
        if (game.markCooldown > 0) {
            game.markCooldown = Math.max(0, game.markCooldown - dt);
        }
        if (game.markedTarget && !game.enemies.includes(game.markedTarget) && !game.structures.includes(game.markedTarget)) {
            game.markedTarget = null;
            game.markTimer = 0;
        }
    },

    clearMarkedTarget(game, target) {
        if (game.markedTarget !== target) return;
        game.markedTarget = null;
        game.markTimer = 0;
    },

    findNearestHostile(game, unit) {
        return window.EnemySystem.findNearestHostile(game, unit);
    },

    findNearestEnemy(game) {
        return window.EnemySystem.findNearestEnemy(game);
    },

    findNearestVisibleEnemy(game) {
        return window.EnemySystem.findNearestVisibleEnemy(game);
    },

    getSniperTarget(game, minRange, maxRange) {
        let best = null;
        let bestDist = 0;
        for (const enemy of game.enemies) {
            if (!game.isHostile(enemy)) continue;
            const dist = Math.hypot(enemy.x - game.turret.x, enemy.y - game.turret.y);
            if (dist < minRange) continue;
            if (dist > maxRange) continue;
            if (dist > bestDist) {
                bestDist = dist;
                best = enemy;
            }
        }
        return best;
    },

    getTargetInRange(game, range) {
        const target = game.turret.target;
        if (!target) return null;
        const dist = Math.hypot(target.x - game.turret.x, target.y - game.turret.y);
        return dist <= range ? target : null;
    },

    handleClick(game, event) {
        if (game.gameOver || game.isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (event.clientX - rect.left) * scaleX;
        const my = (event.clientY - rect.top) * scaleY;

        let closest = null;
        let closestDist = 30;

        if (game.markCooldown <= 0) {
            game.enemies.forEach(enemy => {
                const d = Math.hypot(enemy.x - mx, enemy.y - my);
                if (d < closestDist) {
                    closest = enemy;
                    closestDist = d;
                }
            });
        }

        if (closest) {
            game.markedTarget = closest;
            game.markTimer = game.markDuration;
            game.markCooldown = game.markCooldownMax;
            game.createExplosion(closest.x, closest.y, "#ffd93d", 15);
            return;
        }

        if (!game.isPositionRevealed(mx, my)) {
            game.launchFlare(mx, my);
        }
    }
};
