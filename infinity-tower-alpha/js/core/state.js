window.CoreState = {
    game: null,

    setGame(instance) {
        this.game = instance;
        return this.game;
    },

    getGame() {
        return this.game;
    }
};
