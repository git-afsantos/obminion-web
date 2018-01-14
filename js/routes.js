
(function () {
    "use strict";
    var Game = window.Game,
        Router = Backbone.Router.extend({
            routes: {
                "":                 "start",
                "home":             "home",
                "battle":           "battle",
                "research":         "research", // #research
                "research/:what":   "research"  // #research/herbs
            },

            start: function() {
                Game.state = "start";
                // Game.router.navigate("home", { trigger: true });
            },

            home: function() {
                if (Game.state != "home") {
                    // handle transition
                }
                Game.state = "home";
            },

            battle: function() {
                if (Game.board != null) Game.board.hide();
                // Game.navigation.goTo("dashboard");
                // Game.dashboard.show().build(Game.project);
                // Game.board = Game.dashboard;
            },

            research: function(what) {
                if (Game.project == null)
                    return Game.router.navigate("", { trigger: true });
                if (Game.board != null) Game.board.hide();
                // Game.navigation.goTo("issues");
                // Game.issueBoard.show().build(Game.project, pkg, page);
                // Game.board = Game.issueBoard;
            }
        });
    Game.router = new Router();
})();
