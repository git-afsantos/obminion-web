(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false, $:false */

    var views = window.Game.Views;

    views.HomeView = views.BaseView.extend({
        events: {
            "click #home-button-team": "gotoTeam",
            "click #home-button-research": "gotoResearch"
        },

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            this.router = options.router;
            this.missions = [];
            this.$header = this.$("#home-header");
            this.$missionPanel = this.$("#home-mission-panel");
            this.missionTemplate = _.template($("#home-mission-launcher").html(), {variable: "data"});
            this.missionDialog = new MissionModal({ el: this.$("#home-mission-modal") });
            this.listenTo(this.model.missions, "sync", this.renderMissions);
            this.listenTo(this.model, "change:completedMissions", this.renderMissions);
            this.listenTo(this.missionDialog, "launch", this.gotoMission);
        },

        build: function () {
            this.$header.text("Player - " + this.model.getZoneName());
            this.missionDialog.hide();
            return this;
        },

        render: function () {
            this.$header.text("Player - " + this.model.getZoneName());
            this.renderMissions();
            return this;
        },

        renderMissions: function () {
            var i, len, $m, v,
                missions = this.model.getAvailableMissions();
            for (i = 0, len = this.missions.length; i < len; ++i) {
                this.stopListening(this.missions[i]);
                this.missions[i].remove();
            }
            this.missions = [];
            for (i = 0, len = missions.length; i < len; ++i) {
                $m = $(this.missionTemplate(missions[i].attributes));
                this.$missionPanel.append($m);
                v = new MissionView({ el: $m, model: missions[i] });
                this.listenTo(v, "open", this.openMission);
                this.missions.push(v);
            }
            return this;
        },

        openMission: function (mission) {
            this.missionDialog.model = mission;
            this.missionDialog.show().render();
        },

        gotoTeam: function () {
            this.router.navigate("team", this.navOptions);
        },

        gotoMission: function (missionId) {
            this.model.setMission(missionId).createMissionBattle();
            this.model.set("status", "battle");
            this.router.navigate("battle", this.navOptions);
        },

        gotoResearch: function () {
            this.router.navigate("research", this.navOptions);
        }
    });


    var MissionView = Backbone.View.extend({
        events: {
            "click button": "open"
        },

        open: function () {
            this.trigger("open", this.model);
        }
    });


    var MissionModal = views.Modal.extend({
        events: {
            "click .button-close":  "hide",
            "click .button-confirm": "launchMission"
        },

        initialize: function () {
            this.$content = this.$(".dialog-content");
            this.template = _.template($("#home-mission-dialog-content").html(), {variable: "data"});
        },

        render: function () {
            this.$content.html(this.template(this.model.attributes));
            return this;
        },

        launchMission: function () {
            this.trigger("launch", this.model.id);
        }
    });
}());
