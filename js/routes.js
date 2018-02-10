
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
                if (Game.view != null) Game.view.hide();
                Game.startView.show().build();
                Game.view = Game.startView;
            },

            home: function() {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.view != null) Game.view.hide();
                Game.mainView.show().build();
                Game.view = Game.mainView;
            },

            team: function() {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.view != null) Game.view.hide();
                Game.teamView.show().build();
                Game.view = Game.teamView;
            },

            battle: function() {
                if (Game.state.get("status") !== "battle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.view != null) Game.view.hide();
                Game.battleView.show().build([Game.state.playerTeam, Game.state.opponentTeam]);
                Game.view = Game.battleView;
            },

            research: function(what) {
                if (Game.state.get("status") !== "idle")
                    return Game.router.navigate("", this.navOptions);
                if (Game.view != null) Game.view.hide();
                Game.researchView.show().build(what);
                Game.view = Game.researchView;
            }
        });
    Game.router = new Router();
})();
