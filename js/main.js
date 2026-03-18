const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function lerp(a, b, t) { return window.MathUtils.lerp(a, b, t); }

class Game {
    constructor() {
        // ===== Base resolution (internal canvas coords never change) =====
        this.baseWidth  = 760;
        this.baseHeight = 1080;

        window.WorldStateSystem.initialize(this);

        this.ui = {
            gameContainer: document.getElementById('gameContainer'),
            hp: document.getElementById('hp'),
            failWave: document.getElementById('failWave'),
            gameOver: document.getElementById('gameOver'),
            victory: document.getElementById('victory'),
            runSummary: document.getElementById('runSummary'),
            runHistory: document.getElementById('runHistory'),
            upgradePanel: document.getElementById('upgradePanel'),
            upgradeButtons: document.getElementById('upgradeButtons'),
            upgradeTitle: document.getElementById('upgradeTitle'),
            statusResources: document.getElementById('statusResources'),
            currentWeapon:   document.getElementById('currentWeapon'),
            statAtk:         document.getElementById('statAtk'),
            statSpeed:       document.getElementById('statSpeed'),
            statHp:          document.getElementById('statHp'),
            statArmor:       document.getElementById('statArmor'),
            statRange:       document.getElementById('statRange'),
            statView:        document.getElementById('statView'),
            statSpecial:     document.getElementById('statSpecial'),
            weaponHint:      document.getElementById('weaponHint'),
            relicList:       document.getElementById('relicList'),
            keystoneList:    document.getElementById('keystoneList'),
            relicReward:     document.getElementById('relicReward'),
            keystoneReward:  document.getElementById('keystoneReward'),
            speedToggle:     document.getElementById('speedToggle'),
            xpBarFill:       document.getElementById('xpBarFill'),
            waveLabel:       document.getElementById('waveLabel'),
            enemyCounter:    document.getElementById('enemyCounter'),
            fullStatDisplay: document.getElementById('fullStatDisplay'),
            overlayResources:document.getElementById('overlayResources'),
        };

        window.InputController.initialize(this);

        // ===== Audio System =====
        this.audio = new AudioManager();

        this.turret = {
            x: canvas.width / 2,
            y: this.zones.defenseY,
            baseRadius: 25,
            angle: 0,
            cooldown: 0,
            target: null,
            stats: {
                atk: 1,
                speed: 1.0,
                fireRate: 20,
                hp: 10,
                maxHp: 10,
                armor: 0,
                view: 150,
                special: 0,
                range: 120,
                weaponType: 'BULLET'
            },
            // ===== Armor Shield Topology =====
            shield: {
                max: 0,
                current: 0,
                radius: 0,
                rebuildProgress: 0,
                rebuildRequired: 12,
                state: "ACTIVE",
                rebuildFlash: 0
            }
        };

        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.gameOver = false;
        this.isPaused = true; // 由 waveCountdown 解除

        this.armorForm = {
            active: false,
            type: null,
            lastDominant: null
        };
        this.wallForm = {
            active: false,
            type: null
        };
        this.fireShieldTimer = 0;
        this.wave = 1;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.wavePackets = this.generateWavePackets(this.wave);
        this.currentPacket = 0;
        this.packetEnemyIndex = 0;
        this.packetTimer = 0;
        this.enemiesToSpawn = this.getTotalEnemiesFromPackets(this.wavePackets);
        this.laserTimer = 0;
        this.timeScale = 1.0;
        this.waveTransitioning = false;
        this.waveCountdown = 3;       // FIX 6: Wave 1 也显示倒数
        this.waveCountdownTimer = 0;
        this.isPaused = true;          // 由 countdown 解除
        window.TargetingSystem.initialize(this);
        this.hitStopMs = 0;
        this.superCritFlashMs = 0;
        this.critFeedbackCooldownMs = 0;
        this.lastFrameTime = performance.now();
        this.uiElapsedMs = 0;
        this.collectedResources = { atk: 0, speed: 0, armor: 0, hp: 0, special: 0 };
        this.runStats = {
            killsByType: {
                NORMAL: 0,
                SPEEDSTER: 0,
                TANK: 0,
                ELITE: 0,
                BOSS: 0,
                SCOUT: 0,
                SHIELD: 0,
                SIEGE: 0
            },
            causeOfDeath: null,
            logged: false
        };
        window.RageSystem.initialize(this);

        const config = window.GAME_CONFIG || {};
        const enemyRoleData = window.ENEMY_ROLE_DATA || {};

        // 迷雾系统
        this.fogSystem = new FogOfWarSystem(canvas);
        this.flareCharges = 0;
        this.flareMax = 3;
        this.activeFlares = [];
        this.bioFields = [];
        this.activeBeams = [];
        this.effectLimits = {
            particles: 900,
            beams: 48
        };
        this.flareConfig = {
            ...(config.flareConfig || { radius: 140, durationWaves: 1 })
        };
        this.viewCap = config.viewCap ?? 600;
        
        // ===== PLASMA Chain Config =====
        this.plasmaConfig = {
            ...(config.plasmaConfig || {
                chainRadius: 140,
                maxChains: 5,
                baseDamageMult: 1.4,
                falloff: 0.78,
                cooldownMult: 1.3,
                minCooldown: 8
            })
        };
        this.railgunState = {
            chargeLevel:  1,
            maxCharge:    5,
            baseCooldown: 120,
            cooldown:     0
        };
        this.sniperState = {
            ammo:           1,
            maxAmmo:        1,
            reloadTime:     210,
            reloadTimer:    0,
            isReloading:    false,
            recoilCooldown: 0
        };
        this.sniperConfig = {
            ...(config.sniperConfig || { deadZone: 600, bonusRange: 600 })
        };
        this.lastPlasmaTarget = null;
        this.floatingTexts = [];
        this.relicEffects = [];

        const legacyRelicRaw = localStorage.getItem("metaRelics");
        const legacyRelicValue = /^\d+$/.test(legacyRelicRaw || "") ? parseInt(legacyRelicRaw, 10) : 0;
        this.meta = {
            relics: parseInt(
                localStorage.getItem("metaRelicsCurrency") || String(legacyRelicValue) || "0"
            ),

            lifetimeKills: parseInt(
                localStorage.getItem("metaKills") || "0"
            )

        };

        // ===== Regen Suppression System =====
        this.regenSuppressionTimer = 0;
        this.regenSuppressionDuration = 120; // 2 seconds @ 60fps
        this.regenSuppressed = false;
        this.currentRegenRate = 0;
        this.suppressionHintCooldown = 0;
        this.fallbackCooldown = 0;
        this.manifestFlash = 0;
        this.lastManifestType = null;
        this.laserFlash = 0;

        // ===== State Caps System =====
        this.statCaps = {
            ...(config.statCaps || {
                ATK: Infinity,
                SPEED: Infinity,
                HP: Infinity,
                ARMOR: Infinity,
                SPECIAL: Infinity,
                RANGE: Infinity,
                VIEW: this.viewCap
            }),
            VIEW: this.viewCap
        };

        // ===== Enemy Role System =====
        this.ENEMY_TYPES = {};
        const fallbackEnemyTypes = {
            normal: { hp: 100, speed: 1.0, damage: 1.0, radius: 15, color: "#ff6b6b", reward: "atk", attackCooldown: 60 },
            runner: { hp: 50, speed: 1.8, damage: 1.0, radius: 10, color: "#4ecdc4", reward: "speed", attackCooldown: 50 },
            tank:   { hp: 300, speed: 0.5, damage: 2.0, radius: 22, color: "#95a5a6", reward: "armor", attackCooldown: 75 },
            elite:  { hp: 400, speed: 0.7, damage: 2.0, radius: 18, color: "#f39c12", reward: "special", attackCooldown: 70 },
            boss:   { hp: 900, speed: 0.45, damage: 3.5, radius: 40, color: "#9b59b6", reward: "special", attackCooldown: 95 },
            scout:  { hp: 80, speed: 2.2, damage: 0.8, radius: 11, color: "#f7d794", reward: "special", attackCooldown: 75 },
            shield: { hp: 120, speed: 0.85, damage: 1.2, radius: 17, color: "#e74c3c", reward: "armor", attackCooldown: 65 },
            siege:  { hp: 240, speed: 0.42, damage: 2.6, radius: 24, color: "#ff8c42", reward: "armor", attackCooldown: 90 }
        };
        const sourceEnemyTypes = Object.keys(enemyRoleData).length > 0
            ? enemyRoleData
            : fallbackEnemyTypes;
        for (const role in sourceEnemyTypes) {
            this.ENEMY_TYPES[role] = { ...sourceEnemyTypes[role] };
        }

        // ===== Meta Relic System =====
        this.metaRelics = {
            ATK:    { level: 0, count: 0 },
            SPEED:  { level: 0, count: 0 },
            HP:     { level: 0, count: 0 },
            ARMOR:  { level: 0, count: 0 },
            SPECIAL:{ level: 0, count: 0 },
            RANGE:  { level: 0, count: 0 },
            VIEW:   { level: 0, count: 0 }
        };
        const savedRelics =
            localStorage.getItem("metaRelics");

        if (savedRelics)
        {
            try {
                this.metaRelics =
                    JSON.parse(savedRelics);
            } catch (_) {}
        }

        this.nodeBias = {
            ATK: 0, SPEED: 0, HP: 0, ARMOR: 0, SPECIAL: 0, RANGE: 0, VIEW: 0
        };
        this.assimilationFlash = null;
        this.lineageFlash = null;
        this.relicAssimilatedThisRun = false;
        this.lineage = this.detectLineage();
        const savedLineage =
            localStorage.getItem("lineage");

        if (savedLineage)
        {
            this.lineage = savedLineage;
        }
        this.relicUpgradeCost = [...((window.RELIC_DATA && window.RELIC_DATA.upgradeCost) || [0, 4, 6, 10, 16, 24])];

        this.runUpgrades = {
            ATK: 0, SPEED: 0, HP: 0, ARMOR: 0, SPECIAL: 0, RANGE: 0, VIEW: 0
        };

        // ===== Topology Weapon System =====
        // playerStats: 独立于 runUpgrades，用于 radar topology + weapon manifestation
        this.playerStats = {
            ATK: 0, SPEED: 0, HP: 0, ARMOR: 0, SPECIAL: 0, RANGE: 0, VIEW: 0
        };

        // ===== Node Threshold System (L2.5 → L3 Bridge) =====
        this.nodeThresholds = {
            ATK:     [3, 6, 10],
            SPEED:   [3, 6, 10],
            HP:      [3, 6, 10],
            ARMOR:   [3, 6, 10],
            SPECIAL: [3, 6, 10],
            RANGE:   [3, 6, 10],
            VIEW:    [3, 6, 10]
        };

        this.nodeUnlocked = {
            ATK: {}, SPEED: {}, HP: {}, ARMOR: {}, SPECIAL: {}, RANGE: {}, VIEW: {}
        };

        // ===== L4 Modifier Layer =====
        // modifierDefs: 完整定义表，class 决定激活条件
        window.ModifierSystem.initialize(this);

        // threshold 触发时暂存，wave推进等选完modifier再继续
        this.pendingWaveAdvance = false;

        this.weaponColors = {
            ...((window.WEAPON_DATA && window.WEAPON_DATA.colors) || {
                INCENDIARY: "#ff3b3b",
                LASER: "#ffd93d",
                BIO_LAUNCHER: "#6bcb77",
                REFLECT_SHIELD: "#4d96ff",
                PLASMA: "#c77dff",
                RAILGUN: "#ff9f1c",
                SNIPER: "#00f5d4",
                BULLET: "#3498db"
            })
        };

        this.currentWeapon = 'BULLET';  // 初始 fallback
        this.weaponSwitchFlash = 0;

        this.keystones = {};
        this.keystoneDefs = {};
        this.keystoneDirty = false;
        window.KeystoneSystem.initialize(this);

        // 遗物追踪字段
        this.lastRelicGained = null;
        this.lastRelicUpgraded = false;
        this.lastKeystoneGained = null;
        this.relicDirty = true;
        this.keystoneDirty = true;

        // ===== Radar System =====
        this.radarExpanded = false;
        this.radarTransition = 0;
        this.radarNodes = [];
        this.hoveredNode = null;
        this.radarPaused = false;

        window.WeaponStateSystem.initialize(this);

        this.scoutConfig = {
            beaconRangeScale: 0.25,
            exitMargin: 50,
            priorityThreshold: 130
        };

        this.upgradeOptions = [
            ...((window.WEAPON_DATA && window.WEAPON_DATA.upgradeOptions) || [
                { key: "atk", label: "🔥 攻击力 +1", value: 1, desc: "提升伤害输出" },
                { key: "speed", label: "⚡ 攻速 +0.3", value: 0.3, desc: "提升射击频率" },
                { key: "maxHp", label: "❤️ 生命上限 +5", value: 5, desc: "提升生存能力" },
                { key: "armor", label: "🛡️ 护甲 +1", value: 1, desc: "减少受到的伤害" },
                { key: "range", label: "📏 射程 +25", value: 25, desc: "扩大攻击范围" },
                { key: "view", label: "📡 HEIGHT +30", value: 30, desc: "提升高度与锁定精度" },
                { key: "special", label: "✨ 特殊 +1", value: 1, desc: "提升暴击率" }
            ])
        ];

        this.applyRelics();
        this.applyRelicBias();
        this.applyLineageBias();
        this.updateShieldStats();
        this.updateUI();
        this.updateContainerScale();
        window.InputController.bindAll(this);
        // this.loop();
    }

    showMainMenu() {
        this.isPaused = true;
    }

    continueRun() {
        this.loadRun();
        this.updateShieldStats();
        this.updateUI();

        document.getElementById("mainMenu").style.display = "none";

        this.isPaused = false;

        if (!this.loopStarted) {
            this.loopStarted = true;
            this.loop();
        }
    }

    newRun() {
        localStorage.removeItem("infinityTowerSave");
        location.reload();
    }

    resetProgress() {
        localStorage.clear();
        location.reload();
    }

    // Layer check: 只在对应 weapon/topology 激活时生效
    isKeystoneActive(id) {
        return window.KeystoneSystem.isKeystoneActive(this, id);
    }

    // 向后兼容保留（内部改用 isKeystoneActive，外部旧调用不报错）
    hasKeystone(id) {
        return window.KeystoneSystem.hasKeystone(this, id);
    }

    getActiveWeapon() {
        return window.WeaponStateSystem.getActiveWeapon(this);
    }

    rememberWeaponForm(weapon) {
        return window.WeaponStateSystem.rememberWeaponForm(this, weapon);
    }

    getPhantomChance() {
        return window.WeaponStateSystem.getPhantomChance(this);
    }

    getPhantomPool() {
        return window.WeaponStateSystem.getPhantomPool(this);
    }

    pickPhantomWeapon() {
        return window.WeaponStateSystem.pickPhantomWeapon(this);
    }

    tryPhantomEcho(target) {
        return window.WeaponStateSystem.tryPhantomEcho(this, target);
    }

    triggerPhantomAttack(weapon, target) {
        return window.WeaponSystem.triggerPhantomAttack(this, weapon, target);
    }

    resetAllProgress() {
        if (!confirm('Reset ALL progress?\nThis cannot be undone.')) return;

        localStorage.removeItem('metaRelics');
        localStorage.removeItem('keystones');
        localStorage.removeItem('infinityTowerSave');

        for (let stat in this.metaRelics) {
            this.metaRelics[stat].level = 0;
            this.metaRelics[stat].count = 0;
        }
        window.KeystoneSystem.resetProgress(this);

        window.WeaponStateSystem.resetProgress(this);

        window.ModifierSystem.resetProgress(this);
        for (const stat in this.nodeUnlocked) this.nodeUnlocked[stat] = {};

        this.relicDirty   = true;
        this.keystoneDirty = true;

        alert('Progress reset complete.');
    }

    // 第3步: 授予 keystone
    grantKeystone(id) {
        return window.KeystoneSystem.grantKeystone(this, id);
    }

    // 第4步: 显示 keystone 奖励
    showKeystoneReward() {
        return window.KeystoneSystem.showKeystoneReward(this);
    }

    // 更新 Keystone UI（显示分层标签）
    updateKeystoneUI() {
        return window.KeystoneSystem.updateKeystoneUI(this);
    }

    // 统一敌人死亡 Hook，所有 keystone/relic 触发都集中在这里
    onEnemyKilled(enemy) {
        const enemyType = enemy?.type || "UNKNOWN";
        this.runStats.killsByType[enemyType] = (this.runStats.killsByType[enemyType] || 0) + 1;

        this.audio.playTone(
            220,
            0.12,
            0.12,
            "sawtooth"
        );

        this.meta.lifetimeKills++;
        this.saveMeta();

        if (Math.random() < 0.15)
        {
            this.meta.relics++;

            this.createRelicPickupEffect(
                enemy.x,
                enemy.y
            );

            this.saveMeta();
        }

        if (enemy.type === 'SCOUT' && this.hasKeystone('SIGNAL_ECHO')) {
            this.turret.stats.view = Math.min(this.viewCap, this.turret.stats.view + 5);
        }
        this.onEnemyKilledShieldRebuild();
        // 未来新增 keystone 效果只需在这里加
    }

    getDisplayWeaponName() {
        return window.WeaponStateSystem.getDisplayWeaponName(this);
    }

    getEnemyDisplayName(type) {
        const names = {
            NORMAL: "Normal",
            SPEEDSTER: "Runner",
            TANK: "Tank",
            ELITE: "Elite",
            BOSS: "Boss",
            SCOUT: "Scout",
            SHIELD: "Shield",
            SIEGE: "Siege Charger"
        };
        return names[type] || "Unknown";
    }

    getBuildLabel() {
        return window.WeaponStateSystem.getBuildLabel(this);
    }

    getRunHistory() {
        return window.RunSummarySystem.getRunHistory(this);
    }

    saveRunHistoryEntry(entry) {
        return window.RunSummarySystem.saveRunHistoryEntry(this, entry);
    }

    buildSummaryRows(stats) {
        return window.RunSummarySystem.buildSummaryRows(this, stats);
    }

    buildKillRows(killsByType) {
        return window.RunSummarySystem.buildKillRows(this, killsByType);
    }

    renderRunSummary() {
        return window.RunSummarySystem.renderRunSummary(this);
    }

    finalizeRun(causeType = "UNKNOWN") {
        return window.RunSummarySystem.finalizeRun(this, causeType);
    }

    prepareGameOverUI() {
        return window.RunSummarySystem.prepareGameOverUI(this);
    }

    resetRageState() {
        return window.RageSystem.reset(this);
    }

    updateRageState(deltaMs) {
        return window.RageSystem.update(this, deltaMs);
    }

    onEnemyKilledShieldRebuild() {
        return window.ShieldSystem.onEnemyKilledRebuild(this);
    }

    detectDominantTopology()
    {
        return window.RelicSystem.detectDominantTopology(this);
    }

    detectLineage()
    {
        return window.RelicSystem.detectLineage(this);
    }

    assimilateRelic()
    {
        return window.RelicSystem.assimilateRelic(this);
    }

    saveMetaRelics()
    {
        return window.SaveSystem.saveMetaRelics(this);
    }

    saveLineage()
    {
        return window.SaveSystem.saveLineage(this);
    }

    applyRelicBias()
    {
        return window.RelicSystem.applyRelicBias(this);
    }

    applyLineageBias()
    {
        return window.RelicSystem.applyLineageBias(this);
    }

    checkLineageTransition()
    {
        return window.RelicSystem.checkLineageTransition(this);
    }

    showAssimilationEffect(stat)
    {
        return window.RelicSystem.showAssimilationEffect(this, stat);
    }

    showLineageTransition()
    {
        return window.RelicSystem.showLineageTransition(this);
    }

    saveMeta()
    {
        return window.SaveSystem.saveMeta(this);
    }

    saveRun() {
        return window.SaveSystem.saveRun(this);
    }

    loadRun() {
        return window.SaveSystem.loadRun(this);
    }

    getTotalEnemiesFromPackets(packets) {
        return window.WaveSystem.getTotalEnemiesFromPackets(this, packets);
    }

    msToTicks(ms) {
        return window.MathUtils.msToTicks(ms);
    }

    getRegenRate() {
        return 0.5 + (this.playerStats.HP || 0) * 0.2;
    }

    getAllowedRangeForTarget(target, baseRange) {
        return window.ModifierSystem.getAllowedRange(this, baseRange, target);
    }

    applySlowMultiplier(enemy, multiplier) {
        if (!enemy || enemy.ignoreSlow) return;
        enemy.speedMultiplier = Math.min(enemy.speedMultiplier || 1, multiplier);
    }

    updateShieldStats() {
        return window.ShieldSystem.updateShieldStats(this);
    }

    createShieldBreakEffect(x, y) {
        return window.ShieldSystem.createShieldBreakEffect(this, x, y);
    }

    createShieldRestoreEffect(x, y) {
        return window.ShieldSystem.createShieldRestoreEffect(this, x, y);
    }

    updateEnemyShieldContactState(enemy) {
        return window.ShieldSystem.updateEnemyShieldContactState(this, enemy);
    }

    handleShieldHit(enemy, damage) {
        return window.ShieldSystem.handleShieldHit(this, enemy, damage);
    }

    triggerRegenSuppression() {
        return window.ShieldSystem.triggerRegenSuppression(this);
    }

    createRelicPickupEffect(x, y)
    {
        this.relicEffects.push({

            x,
            y,

            life: 40

        });
    }

    spawnFloatingText(x, y, text, color = "#ffffff", scale = 1) {
        return window.EffectsUI.spawnFloatingText(this, x, y, text, color, scale);
    }

    generateWavePackets(waveNumber) {
        return window.WaveSystem.generateWavePackets(this, waveNumber);
    }

    getEnemiesForWave() {
        return window.WaveSystem.getEnemiesForWave(this);
    }

    updateWaveSpawning() {
        return window.WaveSystem.updateWaveSpawning(this);
    }

    spawnBeacon() {
        return window.WorldStateSystem.spawnBeacon(this);
    }

    getEffectiveView() {
        return window.VisibilitySystem.getEffectiveView(this);
    }

    isPositionRevealed(x, y) {
        return window.VisibilitySystem.isPositionRevealed(this, x, y);
    }

    launchFlare(x, y) {
        return window.VisibilitySystem.launchFlare(this, x, y);
    }

    findNearestBeacon(enemy) {
        return window.EnemySystem.findNearestBeacon(this, enemy);
    }

    handleScoutDefeat(enemy) {
        return window.EnemySystem.handleScoutDefeat(this, enemy);
    }

    updateScoutBehavior(enemy, dt) {
        return window.EnemySystem.updateScoutBehavior(this, enemy, dt);
    }

    // ── Speed control ──────────────────────────────────────────
    setSpeed(speed) {
        this.resumeAudio();
        this.timeScale = speed;
        const label = document.getElementById('speedLabel');
        if (label) label.textContent = `x${speed.toFixed(1)}`;
        const speedToggle = document.getElementById('speedToggle');
        if (speedToggle) {
            speedToggle.classList.toggle('active', speed > 1.0);
            speedToggle.classList.toggle('turbo',  speed > 1.0);
        }
    }

    cycleSpeed() {
        const speeds = [1.0, 3.0];
        const next   = speeds[(speeds.indexOf(this.timeScale) + 1) % speeds.length];
        this.setSpeed(next);
    }

    // ── XP / wave progress bar ─────────────────────────────────
   updateXpBar() {
    return window.HudUI.updateXpBar(this);
}

    updateFullStats() {
        return window.StatusOverlayUI.updateFullStats(this);
    }

    // legacy alias so old code still works
    toggleStatusPanel() { this.toggleStatusOverlay(!this.radarExpanded); }

    toggleStatusOverlay(open) {
        return window.StatusOverlayUI.toggleStatusOverlay(this, open);
    }

    toggleMute() {
        if (!this.audio) return;
        this.audio.enabled = !this.audio.enabled;
    }

    toggleMenu() {
        this.isPaused = true;
        document.getElementById('mainMenu').style.display = 'block';
        // show continue button since a run is active
        const cont = document.getElementById('continueBtn');
        if (cont) {
            cont.disabled = false;
            cont.style.opacity = '1';
            document.getElementById('continueInfo').textContent = `Wave ${this.wave}`;
        }
    }

    drawStatusRadar() {
        return window.OverlayUI.drawStatusRadar(this);
    }

    updateContainerScale() {
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // fit canvas inside viewport maintaining 760×1080 aspect ratio
        const scale = Math.max(0.45, Math.min(
            viewportW  / 760,
            viewportH  / 1080
        ));

        const cssW = Math.floor(760  * scale);
        const cssH = Math.floor(1080 * scale);

        // scale CSS display size; keep internal resolution fixed at 760×1080
        canvas.style.width  = cssW + 'px';
        canvas.style.height = cssH + 'px';

        // drive all calc(Xpx * var(--ui-scale)) values
        const uiScale = Math.max(0.6, scale);
        document.documentElement.style.setProperty('--ui-scale', uiScale);

        // gameContainer matches canvas
        this.ui.gameContainer.style.width  = cssW + 'px';
        this.ui.gameContainer.style.height = cssH + 'px';

        // clear any old transform-based scaling
        this.ui.gameContainer.style.transform = '';
    }

    resumeAudio() {
        this.audio.init();
    }

    playTone(freq, duration, type = 'square', gain = 0.06, endFreq = null) {
        this.audio.playTone(freq, duration, gain, type);
    }

    playShootSfx() {
        const type = this.turret.stats.weaponType;
        if (type === 'LASER') {
            this.playTone(900, 0.09, 'sawtooth', 0.05, 380);
        } else if (type === 'CANNON') {
            this.playTone(120, 0.12, 'square', 0.08, 70);
        } else {
            this.playTone(620, 0.05, 'square', 0.04, 420);
        }
    }

    playCritSfx(radiusScale = 1) {
        const gainBoost = Math.min(1.4, radiusScale);
        this.playTone(720, 0.05, 'triangle', 0.045 * gainBoost, 980);
    }

    applySoftCap(rawCritChance) {
        return window.CombatSystem.applySoftCap(rawCritChance);
    }

    computeCritStats(special) {
        return window.CombatSystem.computeCritStats(this, special);
    }

    // Shield Unit 护甲拦截
    // 返回 true 表示伤害被护甲完全吸收，调用方跳过扣血
    applyArmorIntercept(damage, enemy) {
        return window.CombatSystem.applyArmorIntercept(this, damage, enemy);
    }

    getEffectiveCombatStats() {
        return window.CombatContextSystem.getEffectiveCombatStats(this);
    }

    fireBullet() {
        return window.WeaponSystem.fireBullet(this);
    }

    fireLaser() {
        return window.WeaponSystem.fireLaser(this);
    }

    fireCannon() {
        return window.WeaponSystem.fireCannon(this);
    }

    autoShoot() {
        return window.WeaponSystem.autoShoot(this);
    }

    fireFallbackWeapon() {
        return window.WeaponSystem.fireFallbackWeapon(this);
    }

    // ===== Weapon Stubs（各自独立，之后逐个替换为真实行为）=====

    fireWeapon_LASER() {
        return window.WeaponSystem.fireWeapon_LASER(this);
    }

    fireWeapon_INCENDIARY() {
        return window.WeaponSystem.fireWeapon_INCENDIARY(this);
    }

    // ══════════════════════════════════════════
    //  SNIPER
    // ══════════════════════════════════════════
    fireWeapon_SNIPER() {
        return window.WeaponSystem.fireWeapon_SNIPER(this);
    }

    updateSniperBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.type !== 'SNIPER') continue;

            // 轨迹粒子
            if (Math.random() < 0.5) {
                b.trailParticles.push({ x: b.x, y: b.y, life: 14 });
            }
            b.trailParticles = b.trailParticles.filter(p => {
                p.life -= dt;
                return p.life > 0;
            });

            // 穿透检测
            this.enemies.forEach(e => {
                if (b.hitEnemies.includes(e)) return;
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
                    b.hasHitTarget = true;
                    const result = window.CombatSystem.applyDamageWithCrit(this, b.damage, e);
                    // Shield Unit 护甲拦截
                    if (this.applyArmorIntercept(result.damage, e)) {
                        b.hitEnemies.push(e);
                        return;
                    }
                    e.hp -= result.damage;
                    b.hitEnemies.push(e);
                    this.createExplosion(e.x, e.y, '#00f5d4', 10);
                    this.createExplosion(e.x, e.y - 20, '#00f5d4', 4);
                    if (e.hp <= 0) {
                        this.onEnemyKilled(e);
                        this.handleScoutDefeat(e);
                        this.collectedResources[e.reward] = (this.collectedResources[e.reward] || 0) + 1;
                        this.createExplosion(e.x, e.y, e.color, 8);
                        const idx = this.enemies.indexOf(e);
                        if (idx !== -1) this.enemies.splice(idx, 1);
                    }
                }
            });
        }
    }

    updateSniperReload() {
        const s = this.sniperState;
        if (!s.isReloading) return;
        s.reloadTimer--;
        if (s.reloadTimer <= 0) {
            if (s.ammo < s.maxAmmo) {
                s.ammo++;
                s.reloadTimer = s.reloadTime;
            }
            if (s.ammo >= s.maxAmmo) {
                s.isReloading = false;
            }
        }
    }

    updateSniperRecoil() {
        const s = this.sniperState;
        if (s.recoilCooldown > 0) s.recoilCooldown--;
    }

    updateArmorForm() {
        const armor    = this.turret.stats.armor;
        const dominant = this.getDominantNode();
        const fireWallActive = armor >= 4 && dominant === 'ATK';

        if (fireWallActive) {
            this.armorForm.active = true;
            this.armorForm.type   = 'FIRE';
        } else {
            this.armorForm.active = false;
            this.armorForm.type   = null;
        }

        this.wallForm.active = fireWallActive;
        this.wallForm.type = fireWallActive ? 'FIRE' : null;
    }

    updateFireShield() {
        if (!this.armorForm.active)         return;
        if (this.armorForm.type !== 'FIRE') return;
        if (this.turret.shield.current <= 0) return;

        this.fireShieldTimer--;
        if (this.fireShieldTimer > 0) return;

        const radius = 180;
        const damage = this.turret.stats.atk * 0.6;

        this.enemies.forEach(e => {
            if (e.faction === 'PLAYER') return;
            const dist = Math.hypot(e.x - this.turret.x, e.y - this.turret.y);
            if (dist <= radius) {
                // Shield Unit 护甲也受到火盾灼烧
                if (!this.applyArmorIntercept(damage, e)) {
                    e.hp -= damage;
                }
                this.createExplosion(e.x, e.y, '#ff6a00', 4);
                if (e.hp <= 0) {
                    this.onEnemyKilled(e);
                    this.handleScoutDefeat(e);
                    this.collectedResources[e.reward] = (this.collectedResources[e.reward] || 0) + 1;
                    this.createExplosion(e.x, e.y, e.color, 8);
                    const idx = this.enemies.indexOf(e);
                    if (idx !== -1) this.enemies.splice(idx, 1);
                }
            }
        });

        this.fireShieldTimer = 30;
    }

    getSniperTarget(minRange, maxRange) {
        return window.TargetingSystem.getSniperTarget(this, minRange, maxRange);
    }

    spawnSniperBullet(target, damage, penetration) {
        return window.WeaponSystem.spawnSniperBullet(this, target, damage, penetration);
    }
    drawSniperBullets(ctx) {
        return window.WeaponRenderer.drawSniperBullets(this, ctx);
    }

    drawSniperTargets(ctx) {
        return window.WeaponRenderer.drawSniperTargets(this, ctx);
    }

    drawSniperAmmo(ctx) {
        return window.WeaponRenderer.drawSniperAmmo(this, ctx);
    }
    // ══════════════════════════════════════════
    // ══════════════════════════════════════════
    //  RAILGUN V2 — 可调毁灭炮
    // ══════════════════════════════════════════
    fireWeapon_RAILGUN() {
        return window.WeaponSystem.fireWeapon_RAILGUN(this);
    }

    updateRailgunCooldown() {
        const r = this.railgunState;
        if (r.cooldown > 0) r.cooldown--;
    }

    getTargetInRange(range) {
        return window.TargetingSystem.getTargetInRange(this, range);
    }

    fireRailgunBeam(target, damage, beamLength, isMax) {
        const angle    = Math.atan2(target.y - this.turret.y, target.x - this.turret.x);
        const length   = window.ModifierSystem.getBeamLength(this, beamLength);
        const beamWidth = 30;
        const endX = this.turret.x + Math.cos(angle) * length;
        const endY = this.turret.y + Math.sin(angle) * length;

        // 收集穿透目标（先收集，再处理，避免 splice 乱序）
        const hitList = [];
        this.enemies.forEach(e => {
            const dist       = this.pointToLineDistance(e.x, e.y, this.turret.x, this.turret.y, endX, endY);
            const toAngle    = Math.atan2(e.y - this.turret.y, e.x - this.turret.x);
            let   angleDiff  = Math.abs(toAngle - angle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            const fromTurret = Math.hypot(e.x - this.turret.x, e.y - this.turret.y);
            if (dist < beamWidth / 2 + e.radius && fromTurret < length && angleDiff < Math.PI / 4) {
                hitList.push(e);
            }
        });

        hitList.forEach(e => {
            // 满格：忽护盾（但不忽略护甲层，满格才是真正的"贯穿"）
            let finalDamage = damage;
            if (isMax) {
                finalDamage += (e.shield || 0);
            }
            // Shield Unit 护甲拦截（满格 RAILGUN 直接穿透护甲）
            if (!isMax && this.applyArmorIntercept(finalDamage, e)) {
                this.createExplosion(e.x, e.y, '#ff9f1c', 3);
                return;
            }
            const result = window.CombatSystem.applyDamageWithCrit(this, finalDamage, e);
            e.hp -= result.damage;
            this.createExplosion(e.x, e.y, '#ff9f1c', isMax ? 10 : 6);
            if (e.hp <= 0) {
                this.onEnemyKilled(e);
                this.handleScoutDefeat(e);
                this.collectedResources[e.reward] = (this.collectedResources[e.reward] || 0) + 1;
                this.createExplosion(e.x, e.y, e.color, 8);
                const idx = this.enemies.indexOf(e);
                if (idx !== -1) this.enemies.splice(idx, 1);
            }
        });

        // 满格：更宽更亮的 beam
        this.activeBeams.push({
            type:    'RAILGUN',
            x1: this.turret.x, y1: this.turret.y,
            x2: endX, y2: endY,
            width:   isMax ? 50 : 30,
            life:    isMax ? 28 : 20,
            maxLife: isMax ? 28 : 20,
            color:   isMax ? '#ff6644' : '#ff9f1c',
            isMax
        });

        // 音效 + 震屏（满格更强）
        const shakeIntensity = 8 + (this.railgunState.chargeLevel - 1) * 4;
        this.audio.playTone(60,  0.5,  0.06 + this.railgunState.chargeLevel * 0.01, 'square');
        this.audio.playTone(200, 0.25, 0.04, 'sawtooth');
        this.screenShake = shakeIntensity;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        return window.MathUtils.pointToLineDistance(px, py, x1, y1, x2, y2);
    }

    drawRailgunPower(ctx) {
        return window.WeaponRenderer.drawRailgunPower(this, ctx);
    }
    fireWeapon_PLASMA() {
        return window.WeaponSystem.fireWeapon_PLASMA(this);
    }

    findNearestChainTarget(origin, excludeSet, radius) {
        let best = null, bestDist = radius;
        for (const enemy of this.enemies) {
            if (excludeSet.has(enemy)) continue;
            if (!this.isHostile(enemy))  continue;
            const dist = Math.hypot(enemy.x - origin.x, enemy.y - origin.y);
            if (dist < bestDist) { best = enemy; bestDist = dist; }
        }
        return best;
    }

    spawnPlasmaBeam(from, to, chainIndex = 0) {
        return window.WeaponSystem.spawnPlasmaBeam(this, from, to, chainIndex);
    }

    createPlasmaImpact(x, y, light = false) {
        const maxParticles = this.effectLimits?.particles ?? 900;
        if (this.particles.length >= maxParticles) return;

        const sparkCount = light ? 2 : 5;
        this.createExplosion(x, y, '#c77dff', light ? 2 : 6);

        // Chain hops use a much lighter impact to avoid particle spikes.
        for (let i = 0; i < sparkCount; i++) {
            if (this.particles.length >= maxParticles) break;
            const angle = (Math.PI * 2 / sparkCount) * i;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * (light ? 0.75 + Math.random() * 0.4 : 1.2 + Math.random()),
                vy: Math.sin(angle) * (light ? 0.75 + Math.random() * 0.4 : 1.2 + Math.random()),
                life: light ? 10 + Math.floor(Math.random() * 6) : 18 + Math.floor(Math.random() * 12),
                color: Math.random() < 0.5 ? '#c77dff' : '#e0aaff'
            });
        }
    }

    playPlasmaSfx() {
        // low hum
        this.audio.playTone(180, 0.08, 0.12, 'sawtooth');
        // high zap (slight delay feel via second call)
        this.audio.playTone(320, 0.12, 0.06, 'square');
    }

    fireWeapon_BIO_LAUNCHER() {
        return window.WeaponSystem.fireWeapon_BIO_LAUNCHER(this);
    }

    // ===== BIO_LAUNCHER Manifestation =====
    updateBioLauncher() {

        if (!this.lastBioFire)
            this.lastBioFire = 0;

        const now = performance.now();

        const cooldown = 900; // ms

        if (now - this.lastBioFire < cooldown)
            return false;

        this.lastBioFire = now;

        // target nearest enemy
        const target = this.findNearestEnemy();

        if (!target)
            return false;

        this.createBioField(target.x, target.y);
        return true;

    }

    fireWeapon_REFLECT_SHIELD() {
        return window.WeaponSystem.fireWeapon_REFLECT_SHIELD(this);
    }

    handleSiegeImpact(enemy) {
        return window.EnemySystem.handleSiegeImpact(this, enemy);
    }

    repositionSiegeOutsideCore(enemy, shieldActive = false) {
        return window.EnemySystem.repositionSiegeOutsideCore(this, enemy, shieldActive);
    }

    updateSiegeBehavior(enemy, dt) {
        return window.EnemySystem.updateSiegeBehavior(this, enemy, dt);
    }

    handleClick(e) {
        return window.TargetingSystem.handleClick(this, e);
    }

    update(dt) {
        const deltaMs = dt * 16.6667;

        // 倒计时在 isPaused 期间仍需更新
        this.updateWaveCountdown(dt);
        if (window.VisibilitySystem.shouldDrawFog(this)) {
            this.fogSystem.update(dt);
        }

        if (this.gameOver || this.isPaused) return;

        if (this.laserTimer > 0) this.laserTimer = Math.max(0, this.laserTimer - dt);
        if (this.turret.cooldown > 0) this.turret.cooldown = Math.max(0, this.turret.cooldown - dt);
        if (this.phantomState.flash > 0) this.phantomState.flash = Math.max(0, this.phantomState.flash - dt);
        if (this.critFeedbackCooldownMs > 0) {
            this.critFeedbackCooldownMs = Math.max(0, this.critFeedbackCooldownMs - deltaMs);
        }
        window.SurvivalSystem.updateCooldowns(this, dt);

        // ===== Update Regen Suppression =====
        if (this.regenSuppressionTimer > 0) {
            this.regenSuppressionTimer = Math.max(0, this.regenSuppressionTimer - dt);
            this.regenSuppressed = true;
        } else {
            this.regenSuppressed = false;
        }

        if (this.suppressionHintCooldown > 0) {
            this.suppressionHintCooldown = Math.max(0, this.suppressionHintCooldown - dt);
        }

        window.SurvivalSystem.updatePassiveRegen(this, dt);
        window.TargetingSystem.update(this, dt);
        window.VisibilitySystem.pruneExpiredFlares(this);
        this.updateRageState(deltaMs);

        // Beacon生成控制
        window.WorldStateSystem.updateStructureSpawning(this, dt);

        // 重置强化状态
        this.enemies.forEach(enemy => {
            enemy.speedMultiplier = 1.0;
            enemy.targetType = 'enemy';
        });

        if (this.rageState.active && this.rageState.level > 0) {
            const speedBoost = window.RageSystem.getSpeedMultiplier(this);
            this.enemies.forEach(enemy => {
                if (!this.isHostile(enemy)) return;
                enemy.speedMultiplier = Math.max(enemy.speedMultiplier, speedBoost);
            });
        }

        // Beacon 光场强化
        this.structures.forEach(s => {
            if (s.type !== 'BEACON') return;
            s.rotation += 0.01 * dt;
            s.pulse += 0.05 * dt;
            s.targetType = 'structure';

            this.enemies.forEach(e => {
                const dx = e.x - s.x;
                const dy = e.y - s.y;
                if (Math.abs(dx) < s.range && Math.abs(dy) < s.range) {
                    e.speedMultiplier = Math.max(e.speedMultiplier, 1.6);
                }
            });
        });

        // 寻找目标
        let target = null;

        // priority 1: enemies attacking tower
        target = this.enemies.find(e =>
            !e.dead &&
            e.faction === "ENEMY" &&
            (e.state === "ATTACKING" || e.state === "ATTACKING_SHIELD")
        );

        // priority 2: nearest enemy
        if (!target)
            target = this.findNearestVisibleEnemy();

        this.turret.target = target;

        // 瞄准并射击
        if (this.turret.target) {
            const targetAngle = Math.atan2(
                this.turret.target.y - this.turret.y,
                this.turret.target.x - this.turret.x
            );
            this.turret.angle += (targetAngle - this.turret.angle) * 0.2;
            this.autoShoot();
        }

        this.updateRailgunCooldown();
        this.updateSniperBullets(dt);
        this.updateSniperReload();
        this.updateSniperRecoil();
        this.updateArmorForm();
        this.updateFireShield();

        // 敌人生成（Wave Packet System）
        this.updateWaveSpawning();

        // 移动与碰撞
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // converted unit lifetime expired → silent removal
            if (e.dead) {
                window.TargetingSystem.clearMarkedTarget(this, e);
                this.enemies.splice(i, 1);
                continue;
            }

            if (e.hp <= 0) {
                this.onEnemyKilled(e);
                this.handleScoutDefeat(e);
                this.collectedResources[e.reward] = (this.collectedResources[e.reward] || 0) + 1;
                this.createExplosion(e.x, e.y, e.color, 8);
                window.TargetingSystem.clearMarkedTarget(this, e);
                this.enemies.splice(i, 1);
                continue;
            }
            const dx = this.turret.x - e.x, dy = this.turret.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.001) continue;

            if (e.type === 'SCOUT') {
                const scoutResult = this.updateScoutBehavior(e, dt);
                if (scoutResult.remove) {
                    window.TargetingSystem.clearMarkedTarget(this, e);
                    if (scoutResult.reason === 'reinforce') {
                        this.createExplosion(e.x, e.y, '#ffd93d', 10);
                    }
                    this.enemies.splice(i, 1);
                    continue;
                }
            } else {
                // ===== FACTION-BASED MOVEMENT =====
                if (e.type === 'SIEGE') {
                    this.updateSiegeBehavior(e, dt);
                } else {
                    let targetX, targetY;
                    if (e.faction === "PLAYER") {
                        // allied → target nearest hostile enemy
                        const hostile = this.findNearestHostile(e);
                        if (!hostile) continue;
                        targetX = hostile.x;
                        targetY = hostile.y;
                    } else {
                        // hostile → approach from flanks instead of collapsing into a front queue
                        const hostileTarget = window.EnemySystem.getHostileMoveTarget(this, e);
                        targetX = hostileTarget.x;
                        targetY = hostileTarget.y;
                    }
                    const fdx = targetX - e.x;
                    const fdy = targetY - e.y;
                    const fdist = Math.hypot(fdx, fdy);
                    if (fdist < 0.001) continue;

                    // state: shield contact first, then core contact
                    this.updateEnemyShieldContactState(e);

                    if (e.state === "MOVING") {
                        const moveSpeed = e.speed * (e.speedMultiplier || 1) * 0.5 * dt;
                        e.x += (fdx / fdist) * moveSpeed;
                        e.y += (fdy / fdist) * moveSpeed;
                    }
                }
            }

            // 攻击炮台（仅敌对单位，持续攻击不消失）
            if (e.faction !== "PLAYER" && e.type !== 'SCOUT' && e.type !== 'SIEGE' && (e.state === "ATTACKING" || e.state === "ATTACKING_SHIELD")) {
                e.attackTimer--;

                if (e.attackTimer <= 0) {
                    const rageCooldownMult = window.RageSystem.getCooldownMultiplier(this);
                    if (window.SurvivalSystem.processEnemyAttack(this, e, rageCooldownMult)) {
                        continue;
                    }
                }
            }

            // 子弹碰撞（仅敌对单位）
            if (e.faction === "PLAYER") continue;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
                    const hitResult = window.CombatSystem.applyDamageWithCrit(this, b.damage, e);
                    let finalDmg = hitResult.damage;

                    // Shield Unit 护甲拦截
                    if (this.applyArmorIntercept(finalDmg, e)) {
                        this.bullets.splice(j, 1);
                        continue;
                    }

                    e.hp -= finalDmg;

                    // 🔥 INCENDIARY: apply burn on hit
                    if (b.type === 'INCENDIARY') {
                        this.applyBurn(e);
                        if (window.ModifierSystem.shouldKeepProjectileAfterHit(this, b)) {
                            continue; // bullet keeps flying through
                        }
                    }
                    
                    // 子弹即将移除，先保存属性用于后续
                    const wasCannon = b.isCannon;
                    const splashRad = b.splashRadius || 0;
                    const bulletX = b.x, bulletY = b.y;
                    const bulletDmg = b.damage;

                    this.bullets.splice(j, 1);

                    if (wasCannon && splashRad > 0) {
                        const scaledSplash = splashRad * (hitResult.radiusScale || 1);
                        this.createExplosion(e.x, e.y, '#ff9f43', 10);
                        this.enemies.forEach(nearby => {
                            if (nearby === e || nearby.hp <= 0) return;
                            const sd = Math.hypot(nearby.x - e.x, nearby.y - e.y);
                            if (sd < scaledSplash) {
                                const splashHit = window.CombatSystem.applyDamageWithCrit(this, bulletDmg * 0.5, nearby);
                                nearby.hp -= splashHit.damage;
                            }
                        });

                        // Hook #3: WARHEAD_REPLICATOR (火箭暴击时额外爆炸)
                        if (hitResult.isCrit && this.hasKeystone("WARHEAD_REPLICATOR")) {
                            this.createExplosion(bulletX, bulletY, '#ff6b6b', 15);
                            this.enemies.forEach(nearby => {
                                if (nearby.hp <= 0) return;
                                const sd = Math.hypot(nearby.x - bulletX, nearby.y - bulletY);
                                if (sd < 80) nearby.hp -= bulletDmg * 0.3;
                            });
                        }
                    }
                    
                    if (e.hp <= 0) {
                        this.onEnemyKilled(e);
                        this.handleScoutDefeat(e);
                        // 激光连锁爆炸
                        if (this.turret.stats.weaponType === 'LASER') {
                            this.enemies.forEach(nearby => {
                                if (Math.hypot(nearby.x - e.x, nearby.y - e.y) < 60) {
                                    nearby.hp -= this.turret.stats.atk * 0.5;
                                }
                            });
                        }
                        
                        this.collectedResources[e.reward] = (this.collectedResources[e.reward] || 0) + 1;
                        this.createExplosion(e.x, e.y, e.color, 8);
                        window.TargetingSystem.clearMarkedTarget(this, e);
                        this.enemies.splice(i, 1);
                        break;
                    }
                }
            }

            // converted unit lifetime decay
            if (e.isConverted) {

                e.convertedLifetime -= dt;

                if (e.convertedLifetime <= 0) {
                    e.dead = true;
                }
            }
        }

        // 子弹移动
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.distance += b.speed * dt;
            if (b.distance > b.maxDistance) {
                if (!b.hasHitTarget) {
                    window.ModifierSystem.registerMiss(this);
                }
                this.bullets.splice(i, 1);
            }
        }

        // 子弹与结构碰撞（只有揭示后可攻击）
        for (let i = this.structures.length - 1; i >= 0; i--) {
            const s = this.structures[i];
            if (s.hp <= 0) {
                this.createExplosion(s.x, s.y, '#f5cd79', 20);
                this.structures.splice(i, 1);
                continue;
            }
            const visible = this.isPositionRevealed(s.x, s.y);
            if (!visible) continue;

            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (Math.abs(b.x - s.x) < s.size && Math.abs(b.y - s.y) < s.size) {
                    const structureHit = window.CombatSystem.applyDamageWithCrit(this, b.damage, s);
                    s.hp -= structureHit.damage;
                    this.bullets.splice(j, 1);

                    if (s.hp <= 0) {
                        this.createExplosion(s.x, s.y, '#f5cd79', 20);
                        this.structures.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // 粒子效果
        const maxParticles = this.effectLimits?.particles ?? 900;
        if (this.particles.length > maxParticles) {
            this.particles.splice(0, this.particles.length - maxParticles);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 🔥 Burn DoT tick
        this.updateBurn(dt);
        this.updateXpBar();

        // BIO field update
        this.bioFields.forEach(field => {
            if (field.life <= 0) return;

            this.enemies.forEach(enemy => {

                if (enemy.dead) return;
                if (enemy.isConverted) return;

                const dx = enemy.x - field.x;
                const dy = enemy.y - field.y;

                const distSq = dx*dx + dy*dy;

                if (distSq <= field.radius * field.radius) {

                    const hpLevel = this.playerStats.HP || 0;
                    const conversionRate = 0.006 + hpLevel * 0.004;
                    enemy.conversionProgress += conversionRate;
                    this.applySlowMultiplier(enemy, 0.82);

                    if (enemy.conversionProgress >= 1) {
                        this.convertEnemy(enemy);
                    }
                }
            });

        });

        // floating texts update
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.life -= dt;
            t.y -= 0.45 * dt;
            if (t.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // ⚗️ Enemy fusion — cap at 150 live hostiles
        const liveHostiles = this.enemies.filter(e => this.isHostile(e)).length;
        if (liveHostiles > 150) {
            this.fuseClosestEnemies();
        }

        // 🎯 波次完成检测
        this.checkWaveComplete();
        
    }

    isHostile(enemy) {
        return window.CombatSystem.isHostile(this, enemy);
    }

    // ═══════════════════════════════════════
    // 🔥  INCENDIARY BURN SYSTEM
    // ═══════════════════════════════════════

    applyBurn(enemy) {
        return window.CombatSystem.applyBurn(this, enemy);
    }

    updateBurn(dt) {
        return window.CombatSystem.updateBurn(this, dt);
    }

    createBurnEffect(x, y) {
        return window.CombatSystem.createBurnEffect(this, x, y);
    }

    // ═══════════════════════════════════════
    // ⚗️  ENEMY FUSION SYSTEM
    // ═══════════════════════════════════════

    fuseClosestEnemies() {
        // only fuse hostile, non-converted enemies; skip bosses (they're already apex)
        const candidates = this.enemies.filter(e =>
            this.isHostile(e) && !e.isConverted && e.type !== 'BOSS'
        );
        if (candidates.length < 2) return;

        let bestA = null, bestB = null, bestDist = Infinity;

        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const a = candidates[i], b = candidates[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDist) { bestDist = d2; bestA = a; bestB = b; }
            }
        }

        if (!bestA || !bestB) return;
        this.createFusedEnemy(bestA, bestB);

        // remove originals
        [bestA, bestB].forEach(e => {
            const idx = this.enemies.indexOf(e);
            if (idx !== -1) this.enemies.splice(idx, 1);
        });
    }

    createFusedEnemy(a, b) {
        const fusionLevel = (a.fusionLevel || 0) + (b.fusionLevel || 0) + 1;

        // derive a blended color — lerp toward magenta the deeper the fusion
        const fusionT    = Math.min(fusionLevel / 5, 1); // saturates at lv 5
        const baseColor  = a.color; // keep the heavier unit's color as base

        const newEnemy = {
            x: (a.x + b.x) * 0.5,
            y: (a.y + b.y) * 0.5,

            hp:    (a.hp    + b.hp)    * 1.2,
            maxHp: (a.maxHp + b.maxHp) * 1.2,

            damage:       Math.max(a.damage, b.damage) * 1.1,
            radius:       Math.sqrt(a.radius * a.radius + b.radius * b.radius),
            speed:        Math.min(a.speed, b.speed) * 0.9,

            // inherit heavier unit's type/color, then override visually
            type:         a.maxHp >= b.maxHp ? a.type : b.type,
            color:        baseColor,
            reward:       a.reward, // carried forward for relic drops

            faction:      "ENEMY",
            entityType:   "COMBAT",
            state:        "MOVING",

            attackWindup:  Math.min(a.attackWindup  || 30, b.attackWindup  || 30),
            attackTimer:   Math.min(a.attackTimer   || 30, b.attackTimer   || 30),
            attackCooldown:Math.min(a.attackCooldown|| 60, b.attackCooldown|| 60),
            attackRange:   Math.sqrt(a.radius * a.radius + b.radius * b.radius) + 35,

            isConverted:        false,
            conversionProgress: 0,
            originalHP:         (a.hp + b.hp) * 1.2,
            originalSpeed:      Math.min(a.speed, b.speed) * 0.9,

            // fusion metadata (drives visuals)
            fused:       true,
            fusionLevel,
            fusionT,     // 0→1 colour-shift intensity
            fusionPulse: 0,  // animates on spawn
        };

        this.enemies.push(newEnemy);
        this.enemiesSpawned++;
        this.createFusionEffect(newEnemy.x, newEnemy.y, fusionLevel);
    }

    createFusionEffect(x, y, level = 1) {
        // burst of magenta particles
        const count = 12 + level * 4;
        for (let i = 0; i < count; i++) {
            const angle  = (Math.PI * 2 / count) * i;
            const speed  = 1.5 + Math.random() * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: level >= 3 ? '#ff0088' : '#cc44ff',
                life: 30 + Math.floor(Math.random() * 20)
            });
        }
        // floating text
        const label = level >= 4 ? '⚗️ APEX FUSION' : level >= 2 ? '⚗️ FUSED' : '⚗️';
        this.spawnFloatingText(x, y - 24, label, '#cc44ff', 1.1);
    }

    showNextWaveButton() {
        return window.WaveSystem.showNextWaveButton(this);
    }

    checkWaveComplete() {
        return window.WaveSystem.checkWaveComplete(this);
    }

    loop(now = performance.now()) {
        return window.LoopCore.runFrame(this, now);
    }

    spawnEnemy(requestedType = null) {
        return window.EnemySystem.spawnEnemy(this, requestedType);
    }

    createBioField(x, y) {
        return window.WeaponSystem.createBioField(this, x, y);
    }

    findNearestHostile(unit) {
        return window.TargetingSystem.findNearestHostile(this, unit);
    }

    findNearestEnemy() {
        return window.TargetingSystem.findNearestEnemy(this);
    }

    findNearestVisibleEnemy() {
        return window.TargetingSystem.findNearestVisibleEnemy(this);
    }

    // ===== Assimilation Conversion Function =====
    getConversionCapacity() {
        const hpLevel = this.playerStats.HP || 0;
        return Math.floor(2 + hpLevel * 0.8);
    }

    getConvertedCount() {
        let count = 0;
        this.enemies.forEach(enemy => {
            if (!enemy.dead && enemy.isConverted) count++;
        });
        return count;
    }

    convertEnemy(enemy) {

        if (!enemy) return;
        if (enemy.isConverted) return;

        const capacity = this.getConversionCapacity();
        const current = this.getConvertedCount();

        if (current >= capacity) {

            // capacity full → retire oldest converted unit to make room
            let oldest = null;

            this.enemies.forEach(e => {

                if (!e.isConverted || e.dead) return;

                if (!oldest ||
                    e.convertedLifetime < oldest.convertedLifetime)
                {
                    oldest = e;
                }

            });

            if (oldest) oldest.dead = true;
            else return; // safety: no slot freed, abort
        }

        enemy.isConverted = true;
        enemy.faction = "PLAYER";

        // topology snapshot scaling
        const hpLevel = this.playerStats.HP || 0;
        const topologyScaling = 1 + hpLevel * 0.07;

        enemy.hp = enemy.originalHP * 0.6 * topologyScaling;
        enemy.maxHp = enemy.hp;

        enemy.speed = enemy.originalSpeed * 0.9;

        // lifetime scales with HP node
        const baseLifetime = 3600;
        const lifetimeScaling = 1 + hpLevel * 0.10;
        enemy.maxConvertedLifetime = Math.floor(baseLifetime * lifetimeScaling);
        enemy.convertedLifetime = enemy.maxConvertedLifetime;

    }

    createExplosion(x, y, color, count = 5) {
        return window.EffectsUI.createExplosion(this, x, y, color, count);
    }

    // ===== Topology Overlay Visual System (Safe Version) =====
    renderTopologyOverlay(entity) {

        if (!entity) return;

        // conversion progress ring (visible before full conversion)
        if (!entity.isConverted && entity.conversionProgress > 0) {

            ctx.strokeStyle = "rgba(80,255,180,0.6)";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(
                entity.x,
                entity.y,
                entity.radius * 1.6,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * entity.conversionProgress
            );
            ctx.stroke();
        }

        if (!entity.isConverted) return;

        const x = entity.x;
        const y = entity.y;
        const r = entity.radius || 10;

        ctx.save();

        // topology glow
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "rgba(80,255,180,0.35)";
        ctx.beginPath();
        ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // core indicator
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(120,255,200,0.9)";
        ctx.beginPath();
        ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    getDominantNode() {
        return window.WeaponStateSystem.getDominantNode(this);
    }

    updateWeaponFromTopology() {
        return window.WeaponStateSystem.updateWeaponFromTopology(this);
    }

    getWeaponFireRate(weapon) {
        return window.WeaponStateSystem.getWeaponFireRate(this, weapon);
    }

    onWeaponChanged(weapon) {
        return window.WeaponStateSystem.onWeaponChanged(this, weapon);
    }

    // 旧方法保留为空壳，防止残留调用报错
    updateWeaponType() {
        this.updateWeaponFromTopology();
    }

    showUpgradePanel() {
        const panel = this.ui.upgradePanel;
        const btnContainer = this.ui.upgradeButtons;
        btnContainer.innerHTML = '';
        
        const choices = [];
        // Map option key → stat key for cap checking
        const optKeyToStatKey = { atk: 'ATK', speed: 'SPEED', maxHp: 'HP', armor: 'ARMOR', special: 'SPECIAL', range: 'RANGE', view: 'VIEW' };
        const pool = this.upgradeOptions.filter(opt => {
            const statKey = optKeyToStatKey[opt.key];
            return !statKey || !this.isStatCapped(statKey);
        });
        // Fallback: if somehow all capped, at least show SPECIAL
        if (pool.length === 0) {
            pool.push({ key: 'special', label: '✨ 特殊 +1', value: 1, desc: '提升暴击率' });
        }
        
        for(let i=0; i<3; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            choices.push(pool.splice(idx, 1)[0]);
        }
        
        choices.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerHTML = `
                <div style="font-weight: bold;">${opt.label}</div>
                <div style="font-size: 12px; color: #aaa; margin-top: 5px;">${opt.desc}</div>
            `;
            btn.onclick = () => this.applyUpgrade(opt);
            btnContainer.appendChild(btn);
        });
        
        this.ui.upgradeTitle.textContent = `Wave ${this.wave} 完成!`;
        window.WeaponStateSystem.updateLegacyWeaponHint(this);
        
        panel.style.display = 'block';
    }

    getWeaponName(type) {
        return window.FormatUI.getWeaponName(type);
    }

    isStatCapped(statKey) {
        const cap = this.statCaps[statKey];
        if (cap === undefined || cap === Infinity) return false;
        // Map stat keys (ATK, VIEW…) to turret stat property names
        const propMap = { ATK: 'atk', SPEED: 'speed', HP: 'maxHp', ARMOR: 'armor', SPECIAL: 'special', RANGE: 'range', VIEW: 'view' };
        const prop = propMap[statKey];
        if (!prop) return false;
        return (this.turret.stats[prop] || 0) >= cap;
    }

    applyUpgrade(opt) {
        console.log(`升级选择: ${opt.key} +${opt.value}`);
        
        if (opt.key === 'maxHp') {
            this.turret.stats.maxHp += opt.value;
            this.turret.stats.hp = this.turret.stats.maxHp;
        } else if (opt.key === 'view') {
            this.turret.stats.view = Math.min(this.viewCap, (this.turret.stats.view || 0) + opt.value);
        } else {
            this.turret.stats[opt.key] = (this.turret.stats[opt.key] || 0) + opt.value;
        }
        
        const statKeyMap = { atk: 'ATK', speed: 'SPEED', maxHp: 'HP', armor: 'ARMOR', special: 'SPECIAL', range: 'RANGE', view: 'VIEW' };
        if (statKeyMap[opt.key]) {
            this.runUpgrades[statKeyMap[opt.key]] += 1;
            this.playerStats[statKeyMap[opt.key]] += 1;
        }
        if (opt.key === 'armor') this.updateShieldStats();

        this.collectedResources[opt.key] = (this.collectedResources[opt.key] || 0) + 1;
        this.updateWeaponFromTopology();
        this.ui.upgradePanel.style.display = 'none';

        // threshold 检测 — 若触发则暂存 wave 推进，等 modifier 选完再继续
        this.pendingWaveAdvance = true;
        if (statKeyMap[opt.key]) {
            this.checkNodeThresholdUnlock(statKeyMap[opt.key]);
        }

        // 没有 threshold 触发（面板没有再次打开），直接推进
        if (this.pendingWaveAdvance) {
            this.advanceWave();
        }
    }

    advanceWave() {
        return window.WaveSystem.advanceWave(this);
    }

    updateWaveCountdown(dt) {
        return window.WaveSystem.updateWaveCountdown(this, dt);
    }

    // ===== Node Threshold System =====

    checkNodeThresholdUnlock(stat) {
        const value = this.playerStats[stat];
        const thresholds = this.nodeThresholds[stat];
        if (!thresholds) return;

        for (const t of thresholds) {
            if (value >= t && !this.nodeUnlocked[stat][t]) {
                this.nodeUnlocked[stat][t] = true;
                this.triggerModifierUnlock(stat, t);
                return; // 每次只弹一个，串行处理
            }
        }
    }

    triggerModifierUnlock(stat, threshold) {
        console.log(`[Modifier Unlock] ${stat} reached ${threshold}`);
        const options = this.getModifierOptions(stat, threshold);
        if (options.length === 0) return;
        this.showModifierSelection(stat, threshold, options);
    }

    getModifierOptions(stat, threshold) {
        return window.ModifierSystem.getModifierOptions(this, stat, threshold);
    }

    showModifierSelection(stat, threshold, options) {
        return window.ModifierSystem.showModifierSelection(this, stat, threshold, options);
    }

    applyModifier(mod) {
        return window.ModifierSystem.applyModifier(this, mod);
    }

    // 动态计算 modifier 是否激活（不依赖 stored flag）
    isModifierActive(id) {
        return window.ModifierSystem.isModifierActive(this, id);
    }

    // 向后兼容 — 内部全部改用 isModifierActive
    hasModifier(id) {
        return window.ModifierSystem.hasModifier(this, id);
    }

    ownModifier(id) {
        return window.ModifierSystem.ownModifier(this, id);
    }

    draw() {
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 游戏对象先画
        this.drawRailgunPower(ctx);
        this.drawGameObjects();
        this.drawSniperAmmo(ctx);
        this.drawSniperBullets(ctx);
        this.drawSniperTargets(ctx);
        this.drawRelicEffects(ctx);
        this.drawAssimilationEffect(ctx);
        this.drawLineageFlash(ctx);
        this.drawRangeIndicators();

        // 迷雾最后盖上去，挖出视野
        if (window.VisibilitySystem.shouldDrawFog(this)) {
            this.fogSystem.draw(
                ctx,
                this.turret.x,
                this.turret.y,
                this.getEffectiveView(),
                window.VisibilitySystem.getActiveFlares(this)
            );
        }

        // Wave 倒计时覆盖层（在迷雾之上）
        this.drawWaveCountdown();
    }

    drawWaveCountdown() {
        return window.OverlayUI.drawWaveCountdown(this);
    }

    drawFog() {
        return window.OverlayUI.drawFog(this);
    }

    // ═══════════════════════════════════════════════════
    // 🦏  SIEGE BREAKER — canvas renderer (SVG-faithful)
    // ═══════════════════════════════════════════════════
    drawSiegeBreaker(ctx, e) {
        return window.EnemyRenderer.drawSiegeBreaker(this, ctx, e);
    }

    drawBeams(ctx) {
        return window.EffectsUI.drawBeams(this, ctx);
    }

    drawBioFields(ctx)
    {
        return window.EffectsUI.drawBioFields(this, ctx);
    }

    drawRelicEffects(ctx)
    {
        return window.EffectsUI.drawRelicEffects(this, ctx);
    }

    drawAssimilationEffect(ctx)
    {
        return window.EffectsUI.drawAssimilationEffect(this, ctx);
    }

    drawLineageFlash(ctx)
    {
        return window.EffectsUI.drawLineageFlash(this, ctx);
    }

    drawGameObjects() {
        return window.WorldRenderer.drawGameObjects(this, ctx);
    }

    drawRangeIndicators() {
        return window.OverlayUI.drawRangeIndicators(this);
    }

    drawHeptagonRadar(ctx, cx, cy, radius) {
        return window.StatusOverlayUI.drawHeptagonRadar(this, ctx, cx, cy, radius);
    }

    drawRadarCenterInfo(ctx, cx, cy) {
        return window.StatusOverlayUI.drawRadarCenterInfo(this, ctx, cx, cy);
    }

    drawBar(x, y, width, height, ratio, color) {
        const clamped = Math.max(0, Math.min(1, ratio || 0));
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * clamped, height);
    }

    // ── HP ring (smooth 360° arc, colour shifts green→yellow→red) ──
    drawTurretBars() {
        return window.WorldRenderer.drawTurretBars(this, ctx);
    }

    // ── Shield rebuild sweep (replaces the old flat bar) ──
    drawShieldRebuildBar(ctx) {
        return window.ShieldSystem.drawShieldRebuildBar(this, ctx);
    }

    // ── Segmented shield arc (structural, discrete segments) ──
    drawArmorArc(ctx) {
        return window.ShieldSystem.drawArmorArc(this, ctx);
    }

    setText(key, el, value) {
        return window.HudUI.setText(this, key, el, value);
    }

    updateUI() {
    return window.HudUI.updateUI(this);
}

    showRelicReward() {
        return window.RelicSystem.showRelicReward(this);
    }

    grantRelic() {
        return window.RelicSystem.grantRelic(this);
    }

    tryUpgradeRelic(stat) {
        return window.RelicSystem.tryUpgradeRelic(this, stat);
    }

    applyRelics() {
        return window.RelicSystem.applyRelics(this);
    }

    updateRelicUI() {
        return window.RelicSystem.updateRelicUI(this);
    }

    restart() { 
        location.reload(); 
    }
    
}
