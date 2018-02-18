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
            this.updateCollectionPortraits();
            this.clearHighlights();
            return this.render();
        },

        dismantle: function () {
            // TODO
            return this;
        },

        render: function () {
            var i;
            if (this.visible) {
                for (i = this.teamPortraits.length; i--;) {
                    this.teamPortraits[i].render();
                }
                for (i = this.collectionPortraits.length; i--;) {
                    this.collectionPortraits[i].render();
                }
            }
            return this;
        },

        goHome: function () {
            this.router.navigate("home", this.navOptions);
        },

        scrollUp: function () {
            var clen = this.model.playerCollection.length,
                pages = ((clen / this.collectionPortraits.length) | 0) + 1;
            this.pageOffset--;
            if (this.pageOffset < 0) {
                this.pageOffset = pages - 1;
            }
            this.updateCollectionPortraits();
            this.clearHighlights();
            this.render();
        },

        scrollDown: function () {
            var clen = this.model.playerCollection.length,
                pages = ((clen / this.collectionPortraits.length) | 0) + 1;
            this.pageOffset++;
            if (this.pageOffset >= pages) {
                this.pageOffset = 0;
            }
            this.updateCollectionPortraits();
            this.clearHighlights();
            this.render();
        },

        onSelect: function (portrait) {
            if (this.selected != null) {
                this.selected.select(false);
                if (this.selected === portrait) {
                    this.highlightParty(false);
                    this.selected = null;
                    this.infoPanel.model = null;
                } else if (portrait.teamPortrait) {
                    this.highlightParty(false);
                    this.swapTeamUnit(this.selected, portrait);
                    this.selected.render();
                    portrait.render();
                    this.selected = null;
                    this.infoPanel.model = null;
                } else {
                    this.selected = portrait;
                    this.highlightParty(true);
                    portrait.select(true);
                    this.infoPanel.model = portrait.model;
                }
            } else {
                this.selected = portrait;
                this.highlightParty(true);
                portrait.select(true);
                this.infoPanel.model = portrait.model;
            }
            this.infoPanel.render();
        },

        swapTeamUnit: function (sourceView, targetView) {
            var sourceUnit = sourceView.model,
                targetUnit = targetView.model,
                team = this.model.instances,
                collection = sourceUnit.collection,
                i = team.indexOf(targetUnit),
                j = collection.indexOf(sourceUnit);
            if (team === collection) {
                team.models[i] = sourceUnit;
                team.models[j] = targetUnit;
                team.trigger("update", team);
            } else {
                team.remove(targetUnit);
                collection.remove(sourceUnit);
                team.add(sourceUnit, {at: i});
                collection.add(targetUnit, {at: j});
            }
            sourceView.model = targetUnit;
            targetView.model = sourceUnit;
            return this;
        },

        highlightParty: function (active) {
            var i = 0, len = this.teamPortraits.length;
            for (; i < len; i++) {
                this.teamPortraits[i].highlight(active);
            }
            return this;
        },

        updateCollectionPortraits: function () {
            var i = 0, len = this.collectionPortraits.length,
                offset = this.pageOffset * len;
            for (; i < len; ++i) {
                this.collectionPortraits[i].model = this.model.playerCollection.at(offset + i);
            }
            return this;
        },

        clearHighlights: function () {
            if (this.selected != null) {
                this.selected.select(false);
                this.highlightParty(false);
                this.selected = null;
                this.infoPanel.model = null;
                this.infoPanel.render();
            }
        },

        _initPortraits: function () {
            var i, len, p, $icons;
            this.teamPortraits = [];
            this.collectionPortraits = [];
            $icons = this.$("#team-player-panel .portrait");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i), teamPortrait: true});
                this.teamPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
            $icons = this.$("#team-player-panel .icon-unit");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i), teamPortrait: true});
                this.teamPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
            $icons = this.$("#team-collection-viewer .icon-unit");
            for (i = 0, len = $icons.length; i < len; ++i) {
                p = new Portrait({el: $icons.eq(i), teamPortrait: false});
                this.collectionPortraits.push(p);
                this.listenTo(p, "select", this.onSelect);
            }
        }
    });


    Portrait = Backbone.View.extend({
        events: {
            "click": "onClick"
        },

        initialize: function (options) {
            this.teamPortrait = options.teamPortrait;
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

        onClick: function () {
            if (this.model != null) {
                this.trigger("select", this);
            }
        },

        highlight: function (active) {
            if (active) {
                this.$el.addClass("highlight");
            } else {
                this.$el.removeClass("highlight");
            }
        },

        select: function (active) {
            this.$el.removeClass("highlight");
            if (active) {
                this.selected = true;
                this.$el.addClass("selected");
            } else {
                this.selected = false;
                this.$el.removeClass("selected");
            }
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
