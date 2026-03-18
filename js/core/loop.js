window.LoopCore = {
    runFrame(game, now = performance.now()) {
        const deltaMs = Math.min(50, Math.max(0, now - game.lastFrameTime));
        game.lastFrameTime = now;
        if (game.hitStopMs > 0) game.hitStopMs = Math.max(0, game.hitStopMs - deltaMs);
        if (game.superCritFlashMs > 0) game.superCritFlashMs = Math.max(0, game.superCritFlashMs - deltaMs);
        const hitStopFactor = game.hitStopMs > 0 ? 0.15 : 1;
        const dt = (deltaMs / 16.6667) * game.timeScale * hitStopFactor;

        game.update(dt);
        game.draw();
        game.uiElapsedMs += deltaMs;
        if (game.uiElapsedMs >= 100) {
            game.uiElapsedMs = 0;
            game.updateUI();
        }
        requestAnimationFrame((ts) => game.loop(ts));
        WallSystem.update(game);
    }
};
