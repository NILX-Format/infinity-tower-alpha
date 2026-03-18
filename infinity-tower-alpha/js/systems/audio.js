class AudioManager
{
    constructor()
    {
        this.ctx = null;
        this.enabled = true;
    }

    init()
    {
        if (!this.ctx)
        {
            this.ctx =
                new (window.AudioContext ||
                     window.webkitAudioContext)();
        }

        if (this.ctx && this.ctx.state === "suspended")
        {
            this.ctx.resume().catch(() => {});
        }
    }

    playTone(freq, duration, volume = 0.1, type = "sine")
    {
        if (!this.enabled) return;

        this.init();
        if (!this.ctx) return;

        const osc =
            this.ctx.createOscillator();

        const gain =
            this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.value = volume;

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            this.ctx.currentTime + duration
        );

        osc.stop(
            this.ctx.currentTime + duration
        );
    }
}

window.AudioManager = AudioManager;
