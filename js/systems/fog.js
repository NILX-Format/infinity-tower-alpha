class FogOfWarSystem {
    constructor(canvas) {
        this.canvas = canvas;

        // 噪声纹理（只生成一次）
        this.noiseCanvas = document.createElement("canvas");
        this.noiseCanvas.width = 256;
        this.noiseCanvas.height = 256;
        const noiseCtx = this.noiseCanvas.getContext("2d");
        this.generateNoiseTexture(noiseCtx);
        this.pattern = noiseCtx.createPattern(this.noiseCanvas, "repeat");

        // 离屏合成 canvas（和主 canvas 同尺寸）
        this.offscreen = document.createElement("canvas");
        this.offscreen.width  = canvas.width;
        this.offscreen.height = canvas.height;
        this.offCtx = this.offscreen.getContext("2d");

        // 流动参数
        this.offsetX = 0;
        this.offsetY = 0;
        this.speedX  = 0.02;
        this.speedY  = 0.015;
    }

    generateNoiseTexture(ctx) {
        const imageData = ctx.createImageData(256, 256);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const n = Math.random();
            data[i]     = 20 + n * 20;
            data[i + 1] = 30 + n * 25;
            data[i + 2] = 50 + n * 35;
            data[i + 3] = 165;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    update(dt) {
        this.offsetX += this.speedX * dt;
        this.offsetY += this.speedY * dt;
    }

    draw(ctx, turretX, turretY, viewRadius, flares = []) {
        const oc  = this.offCtx;
        const w   = this.canvas.width;
        const h   = this.canvas.height;

        // 1. 深色底层
        oc.save();
        oc.clearRect(0, 0, w, h);
        oc.globalCompositeOperation = "source-over";
        oc.fillStyle = "rgba(8,12,25,0.4)";
        oc.fillRect(0, 0, w, h);

        // 2. 离屏画整层流动迷雾
        oc.fillStyle = this.pattern;
        oc.save();
        oc.translate(-(this.offsetX % 256), -(this.offsetY % 256));
        oc.fillRect(0, 0, w + 256, h + 256);
        oc.restore();

        // 3. 在离屏上挖出主视野
        oc.globalCompositeOperation = "destination-out";
        const grad = oc.createRadialGradient(
            turretX, turretY, viewRadius * 0.6,
            turretX, turretY, viewRadius
        );
        grad.addColorStop(0,    "rgba(0,0,0,1)");
        grad.addColorStop(0.7,  "rgba(0,0,0,1)");
        grad.addColorStop(0.92, "rgba(0,0,0,0.2)");
        grad.addColorStop(1,    "rgba(0,0,0,0)");
        oc.fillStyle = grad;
        oc.beginPath();
        oc.arc(turretX, turretY, viewRadius, 0, Math.PI * 2);
        oc.fill();

        // 4. 挖出 flare 视野
        flares.forEach(flare => {
            const fg = oc.createRadialGradient(
                flare.x, flare.y, 0,
                flare.x, flare.y, flare.radius
            );
            fg.addColorStop(0,   "rgba(0,0,0,1)");
            fg.addColorStop(0.7, "rgba(0,0,0,0.8)");
            fg.addColorStop(1,   "rgba(0,0,0,0)");
            oc.fillStyle = fg;
            oc.beginPath();
            oc.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
            oc.fill();
        });

        oc.restore();

        // 5. 把离屏迷雾合成到主 canvas
        ctx.drawImage(this.offscreen, 0, 0);

        // 6. 视野边缘极淡光晕
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(80,140,255,0.05)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(turretX, turretY, viewRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 7. flare 暖光晕（在迷雾之上）
        flares.forEach(flare => {
            const wg = ctx.createRadialGradient(
                flare.x, flare.y, 0,
                flare.x, flare.y, flare.radius
            );
            wg.addColorStop(0,   "rgba(255,245,180,0.18)");
            wg.addColorStop(0.5, "rgba(255,230,120,0.08)");
            wg.addColorStop(1,   "rgba(255,220,100,0)");
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

window.FogOfWarSystem = FogOfWarSystem;
