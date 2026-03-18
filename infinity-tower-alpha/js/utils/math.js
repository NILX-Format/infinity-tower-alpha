window.MathUtils = {
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    msToTicks(ms) {
        return Math.max(1, Math.floor(ms / 16.6667));
    },

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }
};
