(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false, $:false */

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
            this.missions = [];
            this.$missionPanel = this.$("#home-mission-panel");
            this.missionTemplate = _.template($("#home-mission-launcher").html(), {variable: "data"});
            this.listenTo(this.model.missions, "sync", this.onMissionSync);
        },

        onMissionSync: function () {
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
                this.listenTo(v, "launch", this.gotoBattle);
                this.missions.push(v);
            }
        },

        gotoTeam: function () {
            this.router.navigate("team", this.navOptions);
        },

        gotoBattle: function (missionId) {
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
            "click button": "launch"
        },

        launch: function () {
            this.trigger("launch", this.model.id);
        }
    });
}());
