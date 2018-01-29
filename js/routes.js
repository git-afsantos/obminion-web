
(function () {
    "use strict";
    var Game = window.Game,
        Router = Backbone.Router.extend({
            navOptions: { trigger: true, replace: true },

            routes: {
                "":                 "start",
                "home":             "home",
                "battle":           "battle",
                "research":         "research", // #research
                "research/:what":   "research"  // #research/herbs
            },

            start: function() {
                Game.state.set("status", "idle");
                if (Game.board != null) Game.board.hide();
                Game.startView.show().build();
                Game.board = Game.startView;
            },

            home: function() {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.mainView.show().build();
                Game.board = Game.mainView;
            },

            battle: function() {
                if (Game.state.get("status") !== "battle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.battleView.show().build();
                Game.board = Game.battleView;
            },

            research: function(what) {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.researchView.show().build();
                Game.board = Game.researchView;
            }
        });
    Game.router = new Router();
})();
