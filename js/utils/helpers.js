window.HelperUtils = {
    byId(id) {
        return document.getElementById(id);
    },

    parseJSON(raw, fallback = null) {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (_) {
            return fallback;
        }
    }
};
