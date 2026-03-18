window.WallSystem = {

update(game) {

    if (!game.wallForm || game.wallForm.type !== "FIRE") return;

    const effective = game.getEffectiveCombatStats();
    const range = effective.range;

    for (const enemy of game.enemies) {

        if (!game.isHostile(enemy)) continue;

        const dx = enemy.x - game.turret.x;
        const dy = enemy.y - game.turret.y;
        const dist = Math.hypot(dx, dy);

        const band = 18;

        if (dist > range - band && dist < range + band) {

            this.applyDrag(game, enemy);

            if (!enemy.fireWallTick || enemy.fireWallTick <= 0) {

                game.applyBurn(enemy);

                enemy.fireWallTick = 30;

            }

        }

        if (enemy.fireWallTick > 0) enemy.fireWallTick--;

    }

},

applyDrag(game, enemy) {
    game.applySlowMultiplier(enemy, 0.7);

},

draw(game, ctx) {

    const t = Date.now() * 0.002;

    if (!game.wallForm || game.wallForm.type !== "FIRE") return;

    const range = game.getEffectiveCombatStats().range;

    const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.05;

    const flames = 24;   // 火焰数量

    for (let i = 0; i < flames; i++) {

    const angle = (i / flames) * Math.PI * 2 + t;

    const jitter = 4;

    const x = game.turret.x + Math.cos(angle) * range + (Math.random()-0.5)*jitter;
    const y = game.turret.y + Math.sin(angle) * range + (Math.random()-0.5)*jitter;

    // 如果有 incendiary 火焰函数
    if (game.spawnIncendiaryFlame) {
        game.spawnIncendiaryFlame(x, y);
    }

    }

    ctx.save();

    ctx.strokeStyle = "rgba(255,120,40,0.45)";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ff4400";

    ctx.beginPath();
    ctx.arc(game.turret.x, game.turret.y, range * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,200,80,0.35)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(game.turret.x, game.turret.y, range * pulse - 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

}

};
