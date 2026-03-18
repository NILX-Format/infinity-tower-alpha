window.FormatUI = {
    getWeaponName(type) {
        const names = {
            BULLET: "🔫 基础子弹",
            LASER: "⚡ 激光",
            INCENDIARY: "🔥 燃烧弹",
            BIO_LAUNCHER: "🧬 生化炮",
            REFLECT_SHIELD: "🛡️ 反射盾",
            PLASMA: "🌀 等离子",
            RAILGUN: "🚀 轨道炮",
            SNIPER: "🎯 狙击枪"
        };
        return names[type] || type;
    }
};
