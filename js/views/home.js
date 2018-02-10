(function () {
    "use strict";
    /* global window:false */

    var views = window.Game.Views;

    views.HomeView = views.BaseView.extend({
        events: {
            "click #home-button-team": "gotoTeam",
            "click #home-button-battle": "gotoBattle",
            "click #home-button-research": "gotoResearch"
        },

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            this.router = options.router;
        },

        gotoTeam: function () {
            this.router.navigate("team", this.navOptions);
        },

        gotoBattle: function () {
            this.model.createBattle();
            this.model.set("status", "battle");
            this.router.navigate("battle", this.navOptions);
        },

        gotoResearch: function () {
            this.router.navigate("research", this.navOptions);
        }
    });
}());
