(function () {
    "use strict";
    /* global window:false */

    var views = window.Game.Views,
        Portrait;

    views.TeamView = views.BaseView.extend({
        events: {
            "click #team-button-done": "goHome",
            "click .scroll-up": "scrollUp",
            "click .scroll-down": "scrollDown"
        },

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            this.router = options.router;
            this.selected = null;
            this.pageOffset = 0;
            this._initPortraits();
        },

        build: function () {
            var i, len;
            for (i = 0, len = this.teamPortraits.length; i < len; ++i) {
                this.teamPortraits[i].model = this.model.instances.at(i);
            }
            for (i = 0, len = this.collectionPortraits.length; i < len; ++i) {
                this.collectionPortraits[i].model = this.model.playerCollection.at(this.pageOffset + i);
            }
            return this.render();
        },

        render: function () {
            var i;
            for (i = this.teamPortraits.length; i--;) {
                this.teamPortraits[i].render();
            }
            for (i = this.collectionPortraits.length; i--;) {
                this.collectionPortraits[i].render();
            }
            return this;
        },

        goHome: function () {
            this.router.navigate("home", this.navOptions);
        },

        scrollUp: function () {
            this.render();
        },

        scrollDown: function () {
            this.render();
        },

        onSelect: function (portrait) {
            if (this.selected != null) {
                this.selected.deselect();
            }
            if (this.selected === portrait) {
                this.selected = null;
            } else {
                this.selected = portrait;
            }
        },

        _initPortraits: function () {
            var i, len, p, $icons;
            this.teamPortraits = [];
            this.collectionPortraits = [];
            $icons = this.$("#team-player-panel .portrait");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i)});
                this.teamPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
            $icons = this.$("#team-player-panel .icon-unit");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i)});
                this.teamPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
            $icons = this.$("#team-collection-viewer .icon-unit");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i)});
                this.collectionPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
        }
    });


    Portrait = Backbone.View.extend({
        events: {
            "click": "select"
        },

        initialize: function () {
            this.selected = false;
            this.$img = this.$("img");
        },

        render: function () {
            if (this.model == null) {
                this.$el.addClass("disabled");
                this.$img.attr("src", "").hide();
            } else {
                this.$el.removeClass("disabled");
                this.$img.attr("src", "assets/sprites/" + this.model._template.get("portrait") + ".png").show();
            }
            return this;
        },

        select: function () {
            if (this.model != null) {
                this.selected = true;
                this.$el.addClass("selected");
                this.trigger("select", this);
            } else this.deselect();
        },

        deselect: function () {
            this.selected = false;
            this.$el.removeClass("selected");
        }
    });
}());
