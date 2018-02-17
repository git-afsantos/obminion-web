(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false, $:false */

    var views = window.Game.Views,
        Portrait, InfoPanel;

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
            this.infoPanel = new InfoPanel({
                el: $("#team-player-panel .info-panel").eq(0),
                abilities: this.model.abilities
            });
            this.infoPanel.$el.hide();
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

        dismantle: function () {
            // TODO
            return this;
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
                this.infoPanel.model = null;
            } else {
                this.selected = portrait;
                this.infoPanel.model = portrait.model;
            }
            this.infoPanel.render();
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
                this.$el.addClass("highlight");
                this.trigger("select", this);
            } else this.deselect();
        },

        deselect: function () {
            this.selected = false;
            this.$el.removeClass("highlight");
        }
    });


    InfoPanel = Backbone.View.extend({
        initialize: function (options) {
            this.template = _.template($("#team-info-panel-content").html(), {variable: "data"});
            this.abilities = options.abilities;
        },

        render: function () {
            var ability;
            if (this.model != null) {
                ability = this.abilities.get(this.model.get("ability"));
                this.$el.html(this.template({
                    name: this.model._template.get("name"),
                    type: this.model._template.get("type"),
                    level: this.model.get("level"),
                    xp: this.model.get("experience"),
                    maxxp: this.model.maxExperience(),
                    ability: ability != null ? ability.get("name") : "None",
                    abilityDescription: ability != null ? ability.get("description") : "&nbsp;"
                }));
                this.$el.show();
            } else {
                this.$el.hide();
            }
            return this;
        }
    });
}());
