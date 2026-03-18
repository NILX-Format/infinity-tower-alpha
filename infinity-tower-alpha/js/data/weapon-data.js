window.WEAPON_DATA = {
    tier1Map: {
        ATK: "INCENDIARY",
        SPEED: "LASER",
        HP: "BIO_LAUNCHER",
        ARMOR: "REFLECT_SHIELD",
        SPECIAL: "PLASMA",
        RANGE: "RAILGUN",
        VIEW: "SNIPER"
    },
    colors: {
        INCENDIARY: "#ff3b3b",
        LASER: "#ffd93d",
        BIO_LAUNCHER: "#6bcb77",
        REFLECT_SHIELD: "#4d96ff",
        PLASMA: "#c77dff",
        RAILGUN: "#ff9f1c",
        SNIPER: "#00f5d4",
        BULLET: "#3498db"
    },
    upgradeOptions: [
        { key: "atk", label: "🔥 攻击力 +1", value: 1, desc: "提升伤害输出" },
        { key: "speed", label: "⚡ 攻速 +0.3", value: 0.3, desc: "提升射击频率" },
        { key: "maxHp", label: "❤️ 生命上限 +5", value: 5, desc: "提升生存能力" },
        { key: "armor", label: "🛡️ 护甲 +1", value: 1, desc: "减少受到的伤害" },
        { key: "range", label: "📏 射程 +25", value: 25, desc: "扩大攻击范围" },
        { key: "view", label: "📡 HEIGHT +30", value: 30, desc: "提升高度与锁定精度" },
        { key: "special", label: "✨ 特殊 +1", value: 1, desc: "提升暴击率" }
    ]
};
