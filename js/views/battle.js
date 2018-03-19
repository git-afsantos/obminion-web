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


    var BattleUnitView = views.AnimatedView.extend({
        initialize: function (options) {
            this.id = options.id;
            views.AnimatedView.prototype.initialize.call(this);
            this.$img = this.$("img");
            this.$type = this.$(".indicator-type");
            this.$level = this.$(".indicator-level");
            this.animations.fadeOut = this.animateFadeOut;
            this.animations.fadeIn = this.animateFadeIn;
            this.animations.death = this.animateDeath;
            this.animations.attack = this.animateAttack;
            this.animations.defend = this.animateDefend;
            this.animations.ability = this.animateAbility;
            this.animations.spawn = this.animateSpawn;
            this.animations.reposition = this.animateReposition;
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
            this.pushAnimation("spawn");
            return this;
        },

        animateSpawn: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateSpawn;
            this.$img.show();
            this.$img.addClass("animate-spawn");
        },

        endAnimateSpawn: function () {
            this.$img.removeClass("animate-spawn");
        },

        switchUnit: function (model) {
            this.stopListening(this.model);
            this.model = model;
            this.listenTo(model, "change:level", this.renderLevel);
            this.listenTo(model, "change:type", this.renderType);
            this.listenTo(model, "change:template", this.renderPortrait);
            this.pushAnimation("fadeOut");
            this.pushAnimation("fadeIn");
            return this;
        },

        animateFadeOut: function () {
            this.currentAnimation.counter = 1;
            this.$img.addClass("invisible transition-opacity");
        },

        animateFadeIn: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.removeOpacityTransition;
            this.$img.removeClass("invisible");
            this.renderPortrait();
        },

        removeOpacityTransition: function () {
            this.$img.removeClass("transition-opacity");
        },

        killUnit: function () {
            this.pushAnimation("death");
            return this;
        },

        animateDeath: function () {
            this.currentAnimation.counter = 1;
            this.$img.addClass("animate-death");
        },

        attack: function () {
            this.pushAnimation("attack");
            return this;
        },

        animateAttack: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateAttack;
            this.$el.addClass("animate-attack");
        },

        endAnimateAttack: function () {
            this.$el.removeClass("animate-attack");
        },

        defend: function () {
            this.pushAnimation("defend");
            return this;
        },

        animateDefend: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateDefend;
            this.$el.addClass("animate-defend");
        },

        endAnimateDefend: function () {
            this.$el.removeClass("animate-defend");
        },

        triggerAbility: function () {
            this.pushAnimation("ability");
            return this;
        },

        animateAbility: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateAbility;
            this.$el.addClass("animate-ability");
        },

        endAnimateAbility: function () {
            this.$el.removeClass("animate-ability");
        },

        reposition: function () {
            this.pushAnimation("reposition");
            return this;
        },

        animateReposition: function () {
            //this.currentAnimation.counter = 1;
            //this.currentAnimation.callback = this.endAnimateReposition;
            //this.$el.addClass("invisible transition-opacity");
        },

        endAnimateReposition: function () {
            //this.$el.removeClass("invisible transition-opacity");
        }
    });



    var NameplateView = views.AnimatedView.extend({
        initialize: function () {
            this.id = "nameplate";
            views.AnimatedView.prototype.initialize.call(this);
            this.$name = this.$(".unit-name");
            this.$hpBar = this.$(".progress");
            this.$label = this.$(".progress-label");
            this.animations.health = this.animateHealthBar;
        },

        setModel: function (model) {
            if (this.model != null) {
                this.stopListening(this.model);
            }
            this.model = model;
            if (model != null) {
                this.listenTo(model, "change:name", this.render);
                this.listenTo(model, "change:health", this.onChangeHealth);
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
        },

        onChangeHealth: function () {
            this.pushAnimation("health");
        },

        animateHealthBar: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateHealthBar;
            this.$hpBar.addClass("transition");
            this.render();
        },

        endAnimateHealthBar: function () {
            this.$hpBar.removeClass("transition");
        }
    });



    var BattleTeamView = views.AnimatedView.extend({
        initialize: function (options) {
            this.id = options.id;
            views.AnimatedView.prototype.initialize.call(this);
            this.portraits = [];
            this.$portraitWrapper = this.$(".portrait-wrapper");
            this.portraitHtml = $("#battle-unit-portrait").html().trim();
            this.nameplate = new NameplateView({ el: this.$(".nameplate") });
            this.listenTo(this.nameplate, "animation:start", this.onChildAnimation);
            this.listenTo(this.nameplate, "animation:end", this.onAnimationEnd);
            this.animations.waitForChildren = this.waitForChildren;
            this.animations.spawn = this.animateSpawn;
            this.animations.death = this.animateKillUnit;
            this.animations.reposition = this.animateReposition;
            this.animations.rotation = this.animateRotation;
            this.animations.health = this.animateHealth;
        },

        render: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.portraits[i].render();
            }
            this.nameplate.render();
            return this;
        },

        /*animate: function () {
            // first start its own animation: trigger start and push sub-animations
            views.AnimatedView.prototype.animate.call(this);
            // then animate the children: increments own animation counter
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.portraits[i].animate();
            }
            this.nameplate.animate();
            // if no children is animating, skip the animation
            if (this.currentAnimation.counter === 0) {
                this.fakeAnimation();
            }
            return this;
        },*/

        reset: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.stopListening(this.portraits[i]);
                this.portraits[i].remove();
            }
            this.portraits = [];
        },

        onChildAnimation: function () {
            ++this.currentAnimation.counter;
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
            this.listenTo(view, "animation:start", this.onChildAnimation);
            this.listenTo(view, "animation:end", this.onAnimationEnd);
            view.render();
            this.pushAnimation("spawn", view);
            return this;
        },

        animateSpawn: function (portrait) {
            portrait.spawn().animate();
        },

        killUnit: function (index) {
            this.pushAnimation("death", index);
            //this.pushAnimation("reposition", index);
            return this;
        },

        animateKillUnit: function (index) {
            this.currentAnimation.callback = this.endAnimateKillUnit;
            this.portraits[index].killUnit().animate();
        },

        endAnimateKillUnit: function () {
            var i = this.currentAnimation.arguments[0];
            this.stopListening(this.portraits[i]);
            this.portraits[i].remove();
            this.portraits.splice(i, 1);
            if (this.portraits.length > 0) {
                this.nameplate.setModel(this.portraits[0].model);
            } else {
                this.nameplate.setModel(null);
            }
        },

        animateReposition: function (index) {
            for (var i = 0; i < this.portraits.length; ++i) {
                if (i !== index) {
                    this.portraits[i].reposition().animate();
                }
            }
        },

        attack: function () {
            this.portraits[0].attack();
            this.pushAnimation("waitForChildren", [this.portraits[0]]);
            return this;
        },

        defend: function () {
            this.portraits[0].defend();
            this.pushAnimation("waitForChildren", [this.portraits[0]]);
            return this;
        },

        triggerAbility: function (i) {
            this.portraits[i].triggerAbility();
            this.pushAnimation("waitForChildren", [this.portraits[i]]);
            return this;
        },

        damage: function (i, amount) {
            if (i === 0) {
                this.pushAnimation("health", -amount);
            } else {
                var u = this.portraits[i].model, h = u.get("health");
                u.set("health", Math.max(0, h - amount));
            }
            return this;
        },

        heal: function (i, amount) {
            if (i === 0) {
                this.pushAnimation("health", amount);
            } else {
                var u = this.portraits[i].model,
                    m = u.get("maxHealth"),
                    h = u.get("health");
                u.set("health", Math.min(m, h + amount));
            }
            return this;
        },

        animateHealth: function (amount) {
            var u = this.nameplate.model,
                m = u.get("maxHealth"),
                h = u.get("health");
            u.set("health", Math.max(0, Math.min(m, h + amount)));
            this.nameplate.animate();
        },

        rotateClockwise: function () {
            var m, i = 0, len = this.portraits.length,
                previous = this.portraits[len - 1].model;
            for (; i < len; ++i) {
                m = this.portraits[i].model;
                this.portraits[i].switchUnit(previous);
                previous = m;
            }
            this.pushAnimation("rotation");
            return this;
        },

        rotateCounterClockwise: function () {
            var m, i = this.portraits.length - 1,
                previous = this.portraits[0].model;
            for (; i >= 0; --i) {
                m = this.portraits[i].model;
                this.portraits[i].switchUnit(previous);
                previous = m;
            }
            this.pushAnimation("rotation");
            return this;
        },

        animateRotation: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.portraits[i].animate();
            }
            this.nameplate.setModel(this.portraits[0].model);
        },

        waitForChildren: function (children) {
            // Counter is incremented by the child animation starting.
            // There is no callback, just wait for child animation to end.
            for (var i = 0, len = children.length; i < len; ++i) {
                children[i].animate();
            }
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
            this.animating = 0;
            this.currentEvent = null;
            this.eventQueue = [];
            this.teams = [
                new BattleTeamView({ el: this.$("#player-battle-panel"), id: "team-1" }),
                new BattleTeamView({ el: this.$("#opponent-battle-panel"), id: "team-2" })
            ];
            this.actionBar = new BattleActionBar({ el: this.$("#battle-action-bar") });
            this.notifications = new BattleNotifications({ el: this.$("#battle-notification-panel") });
            this.listenTo(this.teams[0], "animation:start", this.onAnimation);
            this.listenTo(this.teams[0], "animation:end", this.onAnimationEnd);
            this.listenTo(this.teams[1], "animation:start", this.onAnimation);
            this.listenTo(this.teams[1], "animation:end", this.onAnimationEnd);
            this.listenTo(this.actionBar, "animation:start", this.onAnimation);
            this.listenTo(this.actionBar, "animation:end", this.onAnimationEnd);
            this.listenTo(this.actionBar, "select:action", this.onSelectAction);
            this.listenTo(this.notifications, "animation:start", this.onAnimation);
            this.listenTo(this.notifications, "animation:end", this.onAnimationEnd);
            this.listenTo(this.model, "battle:start", this.onBattleStart);
            this.listenTo(this.model, "battle:attack", this.onBattleAttack);
            this.listenTo(this.model, "battle:between_rounds", this.onBattleBetweenRounds);
            this.listenTo(this.model, "battle:victory", this.onBattleEnd);
            this.listenTo(this.model, "battle:defeat", this.onBattleEnd);
            this.listenTo(this.model, "request:action", this.onRequestAction);
            this.listenTo(this.model, "battle:end_phase", this.onBattleEndPhase);
            this.listenTo(this.model, "attack", this.onAttack);
            this.listenTo(this.model, "ability", this.onAbility);
            this.listenTo(this.model, "death", this.onDeath);
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
                    this.currentEvent.animationFunction.call(this);
                    if (this.animating === 0) {
                        this.currentEvent = null;
                        window.setTimeout(this.animate, 0);
                    }
                }
            }
            return this;
        },

        onAnimation: function () {
            ++this.animating;
        },

        onAnimationEnd: function () {
            --this.animating;
            if (this.animating === 0) {
                this.currentEvent = null;
                window.setTimeout(this.animate, 0);
            }
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
                this.teams[i].setTeam(this.currentEvent.teams[i])
                    .render()
                    .animate();
            }
        },

        onBattleAttack: function () {},

        onBattleBetweenRounds: function () {},

        onBattleEnd: function () {
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
            this.teams[this.currentEvent.attacker].attack().animate();
            this.teams[this.currentEvent.defender].defend().animate();
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
            this.teams[team].triggerAbility(unit, ability).animate();
            this.notifications.notifyAbility(team, model, ability).animate();
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
            this.teams[team].killUnit(unit).animate();
            this.notifications.notifyDeath(team, model).animate();
        },

        onRotateClockwise: function (teamIndex) {
            this.eventQueue.push({
                animationFunction: this.animateRotateClockwise,
                team: teamIndex
            });
        },

        animateRotateClockwise: function () {
            this.teams[this.currentEvent.team].rotateClockwise().animate();
            this.notifications.notifyRotation(this.currentEvent.team, true).animate();
        },

        onRotateCounterClockwise: function (teamIndex) {
            this.eventQueue.push({
                animationFunction: this.animateRotateCounterClockwise,
                team: teamIndex
            });
        },

        animateRotateCounterClockwise: function () {
            this.teams[this.currentEvent.team].rotateCounterClockwise().animate();
            this.notifications.notifyRotation(this.currentEvent.team, false).animate();
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
            this.teams[team].damage(unit, amount, type).animate();
            this.notifications.notifyDamage(team, model, amount, type).animate();
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
            this.teams[team].heal(unit, amount, type).animate();
            this.notifications.notifyHeal(team, model, amount, type).animate();
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


    var BattleNotifications = views.AnimatedView.extend({
        initialize: function () {
            this.id = "notifications";
            views.AnimatedView.prototype.initialize.call(this);
            this.msgs = [];
            this.animations.show = this.animateShowNotification;
            this.animations.showAll = this.animateShowNotifications;
        },

        showNotification: function (msg) {
            this.msgs.push(msg);
            this.pushAnimation("show");
            return this;
        },

        notifyAbility: function (teamIndex, model, abilityName) {
            return this.showNotification((teamIndex === 0 ? "" : "Enemy ")
                                         + model.get("name") + " activates "
                                         + abilityName + ".");
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
        },

        animateShowNotification: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateShowNotifications;
            this.$el.append($('<p class="notification animate-floating-text">'
                              + this.msgs.shift() + "</p>"));
        },

        animateShowNotifications: function () {
            var i = 0, len = this.msgs.length;
            this.currentAnimation.counter = len;
            this.currentAnimation.callback = this.endAnimateShowNotifications;
            for (; i < len; ++i) {
                this.$el.append($('<p class="notification animate-floating-text">'
                                  + this.msgs[i] + "</p>"));
            }
            this.msgs = [];
        },

        endAnimateShowNotifications: function () {
            this.$el.empty();
        }
    });
})();