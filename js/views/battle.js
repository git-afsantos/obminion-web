(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false, $:false */

    var views = window.Game.Views;




    // NOTE: due to having animations we need to store additional data.
    // The animation engine and the battle engine operate at different
    // rates, and thus the models operated on by the engine will be in
    // a different state than the one required by the animations.
    // Having two sets of models, one for the engine and one for the
    // client is an option, but it does not seem to alleviate much
    // of the complexity regarding asynchronous event management.
    // I think it suffices to have more ellaborate views, that keep
    // their own variables (health, etc.).
    // When the animation manager receives an event from the engine,
    // it appends an animation event to the queue with all required
    // information.
    // When the time comes for the view to update itself, it resorts to
    // its internal data and to the event data.


    var BattleUnitView = Backbone.View.extend({
        initialize: function (options) {
            this.id = options.id;
            this.$img = this.$("img");
            this.$type = this.$(".indicator-type");
            this.$level = this.$(".indicator-level");
            this.listenTo(this.model, "change:level", this.renderLevel);
            this.listenTo(this.model, "change:type", this.renderType);
            this.listenTo(this.model, "change:portrait", this.renderPortrait);
        },

        render: function () {
            return (this.renderLevel()
                        .renderType()
                        .renderPortrait());
        },

        renderLevel: function () {
            this.$level.text("" + this.model.get("level"));
            return this;
        },

        renderType: function () {
            this.$type.addClass("icon-unit-0");
            //this.$type.addClass("icon-type-" + m.get("type").toLowerCase());
            return this;
        },

        renderPortrait: function () {
            this.$img.attr("src", "assets/sprites/" + this.model.get("portrait") + ".png");
            return this;
        },

        spawn: function () {
            this.$img.show();
            return this;
        },

        switchUnit: function (model) {
            this.stopListening(this.model);
            this.model = model;
            this.listenTo(model, "change:level", this.renderLevel);
            this.listenTo(model, "change:type", this.renderType);
            this.listenTo(model, "change:template", this.renderPortrait);
            this.renderPortrait();
            return this;
        },

        killUnit: function () {
            this.$img.addClass("invisible");
            return this;
        },

        attack: function () {
            return this;
        },

        defend: function () {
            return this;
        },

        triggerAbility: function () {
            return this;
        },

        reposition: function () {
            return this;
        }
    });



    var NameplateView = Backbone.View.extend({
        initialize: function () {
            this.id = "nameplate";
            this.$name = this.$(".unit-name");
            this.$hpBar = this.$(".progress");
            this.$label = this.$(".progress-label");
        },

        setModel: function (model) {
            if (this.model != null) {
                this.stopListening(this.model);
            }
            this.model = model;
            if (model != null) {
                this.listenTo(model, "change:name", this.render);
                this.listenTo(model, "change:health", this.render);
                this.listenTo(model, "change:maxHealth", this.render);
            }
            this.render();
        },

        render: function() {
            if (this.model != null) {
                var h = this.model.get("health"),
                    mh = this.model.get("maxHealth");
                this.$name.text(this.model.get("name"));
                this.$label.text("" + h + "/" + mh);
                this.$hpBar.width("" + ((h * 100 / mh) | 0) + "%");
            } else {
                this.$name.text("");
                this.$label.text("");
                this.$hpBar.width("0");
            }
            return this;
        }
    });



    var BattleTeamView = Backbone.View.extend({
        initialize: function (options) {
            this.id = options.id;
            this.portraits = [];
            this.$portraitWrapper = this.$(".portrait-wrapper");
            this.portraitHtml = $("#battle-unit-portrait").html().trim();
            this.nameplate = new NameplateView({ el: this.$(".nameplate") });
        },

        render: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.portraits[i].render();
            }
            this.nameplate.render();
            return this;
        },

        reset: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.stopListening(this.portraits[i]);
                this.portraits[i].remove();
            }
            this.portraits = [];
        },

        getModel: function (index) {
            return this.portraits[index].model;
        },

        setTeam: function (team) {
            for (var i = 0, len = team.length; i < len; ++i) {
                this.spawnUnit(team[i]);
            }
            this.nameplate.setModel(team[0]);
            return this;
        },

        spawnUnit: function (model) {
            var view, $portrait = $(this.portraitHtml);
            this.$portraitWrapper.append($portrait);
            view = new BattleUnitView({ el: $portrait, model: model, id: this.id + "-" + this.portraits.length });
            this.portraits.push(view);
            view.spawn().render();
            return this;
        },

        killUnit: function (index) {
            this.portraits[index].killUnit();
            this.stopListening(this.portraits[index]);
            this.portraits[index].remove();
            this.portraits.splice(index, 1);
            if (this.portraits.length > 0) {
                this.nameplate.setModel(this.portraits[0].model);
            } else {
                this.nameplate.setModel(null);
            }
            return this;
        },

        attack: function () {
            this.portraits[0].attack();
            return this;
        },

        defend: function () {
            this.portraits[0].defend();
            return this;
        },

        triggerAbility: function (i) {
            this.portraits[i].triggerAbility();
            return this;
        },

        damage: function (i, amount) {
            var u = this.portraits[i].model,
                h = u.get("health");
            u.set("health", Math.max(0, h - amount));
            return this;
        },

        heal: function (i, amount) {
            var u = this.portraits[i].model,
                m = u.get("maxHealth"),
                h = u.get("health");
            u.set("health", Math.min(m, h + amount));
            return this;
        },

        rotateClockwise: function () {
            var m, i = 0, len = this.portraits.length,
                previous = this.portraits[len - 1].model;
            for (; i < len; ++i) {
                m = this.portraits[i].model;
                this.portraits[i].switchUnit(previous).render();
                previous = m;
            }
            this.nameplate.setModel(this.portraits[0].model);
            return this;
        },

        rotateCounterClockwise: function () {
            var m, i = this.portraits.length - 1,
                previous = this.portraits[0].model;
            for (; i >= 0; --i) {
                m = this.portraits[i].model;
                this.portraits[i].switchUnit(previous).render();
                previous = m;
            }
            this.nameplate.setModel(this.portraits[0].model);
            return this;
        }
    });



    views.BattleView = views.BaseView.extend({
        // This top-level view gets a list of events from the engine.
        // Each battle event corresponds to a number of animations on the teams.
        // The best way to go is to do one event at a time.
        // Only when all animations from an event end will the event queue proceed.

        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            _.bindAll(this, "animate", "nextStep", "leave");
            this.router = options.router;
            this.state = options.state;
            this.currentEvent = null;
            this.eventQueue = [];
            this.teams = [
                new BattleTeamView({ el: this.$("#player-battle-panel"), id: "team-1" }),
                new BattleTeamView({ el: this.$("#opponent-battle-panel"), id: "team-2" })
            ];
            this.actionBar = new BattleActionBar({ el: this.$("#battle-action-bar") });
            this.notifications = new BattleNotifications({ el: this.$("#battle-notification-panel") });
            this.listenTo(this.actionBar, "select:action", this.onSelectAction);
            this.listenTo(this.model, "battle:start", this.onBattleStart);
            this.listenTo(this.model, "battle:attack", this.onBattleAttack);
            this.listenTo(this.model, "battle:between_rounds", this.onBattleBetweenRounds);
            this.listenTo(this.model, "battle:victory", this.onBattleVictory);
            this.listenTo(this.model, "battle:defeat", this.onBattleDefeat);
            this.listenTo(this.model, "request:action", this.onRequestAction);
            this.listenTo(this.model, "battle:end_phase", this.onBattleEndPhase);
            this.listenTo(this.model, "attack", this.onAttack);
            this.listenTo(this.model, "ability", this.onAbility);
            this.listenTo(this.model, "effect", this.onEffect);
            this.listenTo(this.model, "death", this.onDeath);
            this.listenTo(this.model, "update", this.onUnitUpdate);
            this.listenTo(this.model, "rotation:left", this.onRotateCounterClockwise);
            this.listenTo(this.model, "rotation:right", this.onRotateClockwise);
            this.listenTo(this.model, "damage", this.onDamage);
            this.listenTo(this.model, "heal", this.onHeal);
        },

        build: function () {
            for (var i = 0, len = this.teams.length; i < len; ++i) {
                this.teams[0].reset();
                this.teams[1].reset();
            }
            return this;
        },

        leave: function () {
            this.state.set("status", "idle");
            this.router.navigate("home", this.navOptions);
        },

        render: function () {
            for (var i = 0, len = this.teams.length; i < len; ++i) {
                this.teams[i].render();
            }
            this.actionBar.render();
            return this;
        },

        animate: function () {
            if (this.currentEvent == null) {
                this.currentEvent = this.eventQueue.shift();
                if (this.currentEvent != null) {
                    //this.notifications.clearNotifications();
                    this.currentEvent.animationFunction.call(this);
                    this.currentEvent = null;
                    window.setTimeout(this.animate, 2000);
                }
            }
            return this;
        },

        onSelectAction: function () {
            this.model.selectAction(this.actionBar.action);
            //this.model.computeStep();
        },

        onBattleStart: function (engine, playerTeam, opponentTeam) {
            var i, len, teams = [[], []];
            for (i = 0, len = playerTeam.length; i < len; ++i) {
                teams[0].push(new Backbone.Model(playerTeam[i]));
            }
            for (i = 0, len = opponentTeam.length; i < len; ++i) {
                teams[1].push(new Backbone.Model(opponentTeam[i]));
            }
            this.eventQueue.push({
                animationFunction: this.animateBattleStart,
                teams: teams
            });
        },

        animateBattleStart: function () {
            for (var i = 0, len = this.teams.length; i < len; ++i) {
                this.teams[i]
                    .setTeam(this.currentEvent.teams[i])
                    .render();
            }
        },

        onBattleAttack: function () {},

        onBattleBetweenRounds: function () {},

        onBattleVictory: function () {
            this.state.setMissionCompleted(this.state.currentMission.id, true);
            this.eventQueue.push({
                animationFunction: this.deferLeave
            });
            this.animate();
        },

        onBattleDefeat: function () {
            this.eventQueue.push({
                animationFunction: this.deferLeave
            });
            this.animate();
        },

        deferLeave: function () {
            window.setTimeout(this.leave, 1000);
        },

        onBattleEndPhase: function () {
            window.setTimeout(this.nextStep, 0);
        },

        onAttack: function (attackTeamIndex, defendTeamIndex) {
            this.eventQueue.push({
                animationFunction: this.animateAttack,
                attacker: attackTeamIndex,
                defender: defendTeamIndex
                
            });
        },

        animateAttack: function () {
            var team = this.currentEvent.attacker,
                model = this.teams[team].getModel(0);
            this.teams[this.currentEvent.attacker].attack();
            this.teams[this.currentEvent.defender].defend();
            this.notifications.notifyAttack(team, model);
        },

        onAbility: function (teamIndex, unitIndex, abilityName) {
            this.eventQueue.push({
                animationFunction: this.animateAbility,
                team: teamIndex,
                unit: unitIndex,
                ability: abilityName
            });
        },

        animateAbility: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit),
                ability = this.currentEvent.ability;
            this.teams[team].triggerAbility(unit, ability);
            this.notifications.notifyAbility(team, model, ability);
        },

        onEffect: function (teamIndex, unitIndex, effectName) {
            this.eventQueue.push({
                animationFunction: this.animateEffect,
                team: teamIndex,
                unit: unitIndex,
                effect: effectName
            });
        },

        animateEffect: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit),
                effect = this.currentEvent.effect;
            this.teams[team].triggerAbility(unit, effect);
            this.notifications.notifyEffect(team, model, effect);
        },

        onDeath: function (teamIndex, unitIndex) {
            this.eventQueue.push({
                animationFunction: this.animateDeath,
                team: teamIndex,
                unit: unitIndex
            });
        },

        animateDeath: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit);
            this.teams[team].killUnit(unit);
            this.notifications.notifyDeath(team, model);
        },

        onUnitUpdate: function (teamIndex, unitIndex, attributes) {
            this.eventQueue.push({
                animationFunction: this.animateUnitUpdate,
                team: teamIndex,
                unit: unitIndex,
                attributes: attributes
            });
        },

        animateUnitUpdate: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit),
                attr = this.currentEvent.attributes;
            model.set(this.currentEvent.attributes);
        },

        onRotateClockwise: function (teamIndex) {
            this.eventQueue.push({
                animationFunction: this.animateRotateClockwise,
                team: teamIndex
            });
        },

        animateRotateClockwise: function () {
            this.teams[this.currentEvent.team].rotateClockwise();
            this.notifications.notifyRotation(this.currentEvent.team, true);
        },

        onRotateCounterClockwise: function (teamIndex) {
            this.eventQueue.push({
                animationFunction: this.animateRotateCounterClockwise,
                team: teamIndex
            });
        },

        animateRotateCounterClockwise: function () {
            this.teams[this.currentEvent.team].rotateCounterClockwise();
            this.notifications.notifyRotation(this.currentEvent.team, false);
        },

        onDamage: function (teamIndex, unitIndex, amount, type) {
            this.eventQueue.push({
                animationFunction: this.animateDamage,
                team: teamIndex,
                unit: unitIndex,
                amount: amount,
                type: type
            });
        },

        animateDamage: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit),
                amount = this.currentEvent.amount,
                type = this.currentEvent.type;
            this.teams[team].damage(unit, amount, type);
            this.notifications.notifyDamage(team, model, amount, type);
        },

        onHeal: function (teamIndex, unitIndex, amount, type) {
            this.eventQueue.push({
                animationFunction: this.animateHeal,
                team: teamIndex,
                unit: unitIndex,
                amount: amount,
                type: type
            });
        },

        animateHeal: function () {
            var team = this.currentEvent.team,
                unit = this.currentEvent.unit,
                model = this.teams[team].getModel(unit),
                amount = this.currentEvent.amount,
                type = this.currentEvent.type;
            this.teams[team].heal(unit, amount, type);
            this.notifications.notifyHeal(team, model, amount, type);
        },

        onRequestAction: function () {
            this.eventQueue.push({
                animationFunction: this.showActionBar
            });
            this.animate();
        },

        showActionBar: function () {
            this.actionBar.show();
        },

        nextStep: function () {
            this.model.computeStep();
        }
    });

















    var BattleActionBar = Backbone.View.extend({
        id:         "battle-action-bar",
        className:  "action-bar",

        events: {
            "click #battle-button-attack":      "onAttack",
            "click #battle-button-rotate-cw":   "onRotateClockwise",
            "click #battle-button-rotate-ccw":  "onRotateCounter",
            "click #battle-button-surrender":   "onSurrender",
            "transitionend":                    "onTransitionEnd"
        },

        initialize: function () {
            this.visible = false;
            this.enabled = false;
            this.action = null;
        },

        render: function () {
            if (this.visible) {
                this.$el.show();
            } else {
                this.$el.hide();
            }
            return this;
        },

        onAttack: function () {
            if (this.enabled) {
                this.enabled = false;
                this.updateDisplay(false);
                this.action = "ATTACK";
            }
        },

        onRotateClockwise: function () {
            if (this.enabled) {
                this.enabled = false;
                this.updateDisplay(false);
                this.action = "ROTATE_CLOCK";
            }
        },

        onRotateCounter: function () {
            if (this.enabled) {
                this.enabled = false;
                this.updateDisplay(false);
                this.action = "ROTATE_COUNTER";
            }
        },

        onSurrender: function () {
            if (this.enabled) {
                this.enabled = false;
                this.updateDisplay(false);
                this.action = "SURRENDER";
            }
        },

        onTransitionEnd: function () {
            if (!this.enabled) {
                this.trigger("select:action", this.action);
            }
            this.render();
        },

        // callback for engine's "request:action"
        show: function () {
            this.action = null;
            this.enabled = true;
            this.updateDisplay(true);
            this.render();
        },

        updateDisplay: function (visible) {
            this.visible = visible;
            if (visible) {
                this.$el.removeClass("invisible");
            } else {
                this.$el.addClass("invisible");
            }
        }
    });


    var BattleNotifications = Backbone.View.extend({
        events: {
            "animationend": "onAnimationEnd"
        },

        initialize: function () {
            this.id = "notifications";
            this.msgs = [];
        },

        onAnimationEnd: function() {
            this.$el.children().first().remove();
        },

        showNotification: function (msg) {
            this.$el.append($('<p class="notification animate-floating-text"><span>'
                              + msg + "</span></p>"));
            return this;
        },

        showAllNotifications: function () {
            var i = 0, len = this.msgs.length;
            for (; i < len; ++i) {
                this.$el.append($('<p class="notification animate-floating-text"><span>'
                                  + this.msgs[i] + "</span></p>"));
            }
            this.msgs = [];
            return this;
        },

        clearNotifications: function () {
            this.$el.empty();
            return this;
        },

        notifyAttack: function (teamIndex, model) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " attacks!");
        },

        notifyAbility: function (teamIndex, model, abilityName) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " activates "
                                         + abilityName + ".");
        },

        notifyEffect: function (teamIndex, model, effectName) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " is affected by "
                                         + effectName + ".");
        },

        notifyDeath: function (teamIndex, model) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " was defeated!");
        },

        notifyRotation: function (teamIndex, clockwise) {
            return this.showNotification((teamIndex === 0 ? "Your team" : "The enemy team")
                                         + " rotates "
                                         + (clockwise ? "clockwise." : "counter-clockwise."));
        },

        notifyDamage: function (teamIndex, model, amount, type) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " takes "
                                         + amount + " "
                                         + (type == null || type === "?" ? "" : type + " ")
                                         + "damage.");
        },

        notifyHeal: function (teamIndex, model, amount) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " recovers "
                                         + amount + " health.");
        }
    });
})();