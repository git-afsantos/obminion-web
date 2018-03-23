(function () {
    "use strict";
    /* global window:false */

    var views = window.Game.Views;

    views.ResearchView = views.BaseView.extend({
        events: {
            "click #research-button-done": "goHome"
        },

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            this.router = options.router;
        },

        render: function () {
            return this;
        },

        goHome: function () {
            this.router.navigate("home", this.navOptions);
        }
    });
}());
