(function () {
    "use strict";
    /* global window:false */

    var views = window.Game.Views;

    views.TeamView = views.BaseView.extend({
        events: {
            "click #team-button-done": "goHome",
            "click .scroll-up": "scrollUp",
            "click .scroll-down": "scrollDown"
        },

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            this.router = options.router;
            this.$collection = this.$("#team-collection-viewer .icon-unit");
            this.$portraits = this.$collection.children("img");
        },

        render: function () {
            var m, el, i = 0, len = this.$portraits.length;
            for (; i < len; ++i) {
                el = this.$portraits.eq(i);
                m = this.model.playerCollection.at(i);
                if (m != null) {
                    el.show().attr("src", "assets/sprites/" + m._template.get("portrait") + ".png");
                    this.$collection.eq(i).removeClass("disabled");
                } else {
                    el.attr("src", "").hide();
                    this.$collection.eq(i).addClass("disabled");
                }
            }
        },

        goHome: function () {
            this.router.navigate("home", this.navOptions);
        },

        scrollUp: function () {
            this.render();
        },

        scrollDown: function () {
            this.render();
        }
    });
}());
