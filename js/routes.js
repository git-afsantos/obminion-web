
(function () {
    "use strict";
    /* global window:false, Backbone:false */

    var Game = window.Game,
        Router = Backbone.Router.extend({
            navOptions: { trigger: true, replace: true },

            routes: {
                "":                 "start",
                "home":             "home",
                "team":             "team",
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

            team: function() {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.teamView.show().build();
                Game.board = Game.teamView;
            },

            battle: function() {
                if (Game.state.get("status") !== "battle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.battleView.show().build([Game.state._player, Game.state._opponent]);
                Game.board = Game.battleView;
            },

            research: function(what) {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.board != null) Game.board.hide();
                Game.researchView.show().build(what);
                Game.board = Game.researchView;
            }
        });
    Game.router = new Router();
})();
