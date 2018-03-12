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
        initialize: function () {
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
            this.listenTo(this.model, "change:level", this.renderLevel);
            this.listenTo(this.model, "change:type", this.renderType);
            this.listenTo(this.model, "change:template", this.renderPortrait);
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
            this.$img.attr("src", "assets/sprites/" + this.model.get("template") + ".png");
            return this;
        },

        spawn: function () {
            this.pushAnimation("spawn");
            return this;
        },

        animateSpawn: function () {
            this.currentAnimation.counter = 1;
            this.currentAnimation.callback = this.endAnimateSpawn;
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
        }
    });



    var NameplateView = views.AnimatedView.extend({
        initialize: function () {
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
        initialize: function () {
            views.AnimatedView.prototype.initialize.call(this);
            this.portraits = [];
            this.$portraitWrapper = this.$(".portrait-wrapper");
            this.portraitHtml = $("#battle-unit-portrait").html().trim();
            this.nameplate = new NameplateView({ el: this.$(".nameplate") });
            this.listenTo(this.nameplate, "animation:start", this.onChildAnimation);
            this.listenTo(this.nameplate, "animation:end", this.onAnimationEnd);
            this.animations.waitForChildren = this.waitForChildren;
            this.animations.death = this.animateKillUnit;
            this.animations.rotation = this.animateRotation;
        },

        render: function () {
            for (var i = 0, len = this.portraits.length; i < len; ++i) {
                this.portraits[i].render();
            }
            this.nameplate.render();
            return this;
        },

        animate: function () {
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
        },

        onChildAnimation: function () {
            ++this.currentAnimation.counter;
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
            view = new BattleUnitView({ el: $portrait, model: model });
            this.portraits.push(view);
            this.listenTo(view, "animation:start", this.onChildAnimation);
            this.listenTo(view, "animation:end", this.onAnimationEnd);
            view.render().spawn();
            this.pushAnimation("waitForChildren");
            return this;
        },

        killUnit: function (i) {
            this.portraits[i].killUnit();
            this.pushAnimation("death", i);
            return this;
        },

        animateKillUnit: function () {
            this.currentAnimation.callback = this.endAnimateKillUnit;
        },

        endAnimateKillUnit: function () {
            var i = this.currentAnimation.arguments[0];
            this.stopListening(this.portraits[i]);
            this.portraits[i].remove();
            this.portraits.splice(i, 1);
            if (this.portraits.length > 0) {
                this.nameplate.setModel(this.portraits[0]);
            } else {
                this.nameplate.setModel(null);
            }
        },

        attack: function () {
            this.portraits[0].attack();
            this.pushAnimation("waitForChildren");
            return this;
        },

        defend: function () {
            this.portraits[0].defend();
            this.pushAnimation("waitForChildren");
            return this;
        },

        triggerAbility: function (i) {
            this.portraits[i].triggerAbility();
            this.pushAnimation("waitForChildren");
            return this;
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
            this.currentAnimation.callback = this.endAnimateRotation;
        },

        endAnimateRotation: function () {
            this.nameplate.setModel(this.portraits[0].model);
        },

        waitForChildren: function () {
            // Counter is incremented by the child animation starting.
            // There is no callback, just wait for child animation to end.
        }
    });



    views.BattleView = views.BaseView.extend({
        // This top-level view gets a list of events from the engine.
        // Each battle event corresponds to a number of animations on the teams.
        // The best way to go is to do one event at a time.
        // Only when all animations from an event end will the event queue proceed.

        initialize: function () {
            _.bindAll(this, "animate");
            this.animating = 0;
            this.currentEvent = null;
            this.eventQueue = [];
            this.teams = [
                new BattleTeamView({ el: this.$("#player-battle-panel") }),
                new BattleTeamView({ el: this.$("#opponent-battle-panel") })
            ];
            this.actionBar = new BattleActionBar({ el: this.$("#battle-action-bar") });
            this.listenTo(this.teams[0], "animation:start", this.onAnimation);
            this.listenTo(this.teams[0], "animation:end", this.onAnimationEnd);
            this.listenTo(this.teams[1], "animation:start", this.onAnimation);
            this.listenTo(this.teams[1], "animation:end", this.onAnimationEnd);
            this.listenTo(this.actionBar, "animation:start", this.onAnimation);
            this.listenTo(this.actionBar, "animation:end", this.onAnimationEnd);
            this.listenTo(this.actionBar, "select:action", this.onSelectAction);
            this.listenTo(this.model, "battle:start", this.onBattleStart);
            this.listenTo(this.model, "battle:attack", this.onBattleAttack);
            this.listenTo(this.model, "battle:between_rounds", this.onBattleBetweenRounds);
            this.listenTo(this.model, "battle:victory", this.onBattleEnd);
            this.listenTo(this.model, "battle:defeat", this.onBattleEnd);
            this.listenTo(this.model, "request:action", this.onRequestAction);
            this.listenTo(this.model, "battle:end_phase", this.onBattleEndPhase);
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
            // this.model.selectAction(this.actionBar.action);
            // this.model.computeStep();
        },

        onBattleStart: function (playerTeam, opponentTeam) {
            var i, len, teams = [[], []];
            for (i = 0, len = playerTeam.length; i < len; ++i) {
                teams[0].push(new Backbone.Model(playerTeam[i]));
            }
            for (i = 0, len = opponentTeam.length; i < len; ++i) {
                teams[1].push(new Backbone.Model(opponentTeam[i]));
            }
            this.eventQueue.push({
                animateFunction: this.animateBattleStart,
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

        onBattleAttack: function () {
            
        },

        onBattleBetweenRounds: function () {
            
        },

        onBattleEnd: function () {
            
        },

        onBattleEndPhase: function () {
            
        },

        onRequestAction: function () {
            this.eventQueue.push({
                animationFunction: this.showActionBar
            });
            this.animate();
        },

        showActionBar: function () {
            this.actionBar.show();
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


    views.BattleNotifications = Backbone.View.extend({
        initialize: function () {
            _.bindAll(this, "showNotification", "hideNotification", "removeNotification");
            this.unseen = [];
            this.seen = [];
        },

        addNotification: function (message) {
            var $li = $("<li class=\"notification\">" + message + "</li>");
            this.$el.append($li);
            this.unseen.push($li);
            window.setTimeout(this.showNotification);
        },

        showNotification: function () {
            var i = this.unseen.shift();
            i.addClass("show");
            this.seen.push(i);
            window.setTimeout(this.hideNotification, 5000);
        },

        hideNotification: function () {
            this.seen.shift().removeClass("show");
            window.setTimeout(this.removeNotification, 1000);
        },

        removeNotification: function () {
            this.$el.children().first().remove();
        }
    });


    ////////////////////////////////////////////////////////////////////////////

    // the collection is the battle team
    views.BattleCircle = Backbone.View.extend({
        className: "circle",

        events: {
            "animationend": "onAnimationEnd",
            "transitionend": "onAnimationEnd"
        },

        initialize: function () {
            var i, len;
            _.bindAll(this, "onAnimationEnd");
            this.animationCallback = null;
            this.animating = 0;
            this.activeCid = null;
            this.$name = this.$el.find(".unit-name");
            this.$hp = this.$el.find(".progress-label");
            this.$hpBar = this.$el.find(".progress");
            this.$active = this.$el.find(".portrait").first();
            this.$team = this.$el.find(".icon-unit");
            this.$type = this.$active.children(".indicator-type");
            this.$level = this.$active.children(".indicator-level");
            this.portraits = [this.$active.children("img")];
            for (i = 0, len = this.$team.length; i < len; ++i) {
                this.portraits.push(this.$team.eq(i).children("img"));
            }
        },


        setTeam: function (team) {
            if (this.collection) this.stopListening(this.collection);
            this.collection = team;
            this.listenTo(this.collection, "change:health", this.onHealthChange);
            this.listenTo(this.collection, "reset", this.delayRender);
            this.listenTo(this.collection, "update", this.delayRender);
            this.listenTo(this.collection, "remove", this.onRemove);
            this.listenTo(this.collection, "battle:rotate", this.onRotation);
            this.listenTo(this.collection, "battle:attack", this.onAttack);
            this.listenTo(this.collection, "battle:defend", this.onDefend);
            this.listenTo(this.collection, "battle:ability", this.onAbility);
            this.render();
        },


        render: function () {
            if (!this.collection) return this;
            this._renderActiveUnit(this.collection.getActive());
            this._renderTeamUnits();
            return this;
        },


        _renderActiveUnit: function (m) {
            var h, mh;
            if (m != null) {
                h = m.get("health");
                mh = m.get("maxHealth");
                this.activeCid = m.cid;
                this.$name.text(m._template.get("name"));
                this.$hp.text("" + h + "/" + mh);
                this.$hpBar.width("" + ((h * 100 / mh) | 0) + "%");
                this.$level.text("" + m._instance.get("level"));
                this.$type.addClass("icon-unit-0");
                //this.$type.addClass("icon-type-" + m.get("type").toLowerCase());
                this.portraits[0].show().attr("src", "assets/sprites/" + m._template.get("portrait") + ".png");
            } else {
                this.activeCid = null;
                this.$name.text("");
                this.$hp.text("");
                this.$hpBar.width("0");
                this.$level.text("");
                this.$type.removeClass("icon-unit-0");
                this.portraits[0].attr("src", "").hide();
            }
            return this;
        },

        _renderTeamUnits: function () {
            var m, el, i = 1, len = this.portraits.length;
            for (; i < len; ++i) {
                el = this.portraits[i];
                m = this.collection.at(i);
                if (m != null) {
                    el.show().attr("src", "assets/sprites/" + m._template.get("portrait") + ".png");
                    this.$team.eq(i - 1).removeClass("disabled");
                } else {
                    el.attr("src", "").hide();
                    this.$team.eq(i - 1).addClass("disabled");
                }
            }
            return this;
        },


        delayRender: function () {
            console.log("delayRender", this.collection.id);
            var _this = this;
            this.trigger("animation:enqueue", {
                type: "generic",
                run: function () {
                    _this.animating = 1;
                    _this.render();
                    window.setTimeout(_this.onAnimationEnd, 1000);
                },
                ctx: this
            });
        },


        onAttack: function () {
            console.log("onAttack", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "attack",
                run: this.animateAttack,
                ctx: this
            });
        },

        onDefend: function () {
            console.log("onDefend", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "attack",
                run: this.animateDefend,
                ctx: this
            });
        },

        onAbility: function (args) {
            console.log("onAbility", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "ability",
                run: this.animateAbility,
                ctx: this,
                parameters: [this.collection.indexOf(args.emitter)]
            });
        },

        onRotation: function (args) {
            console.log("onRotation", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "rotation",
                run: this.animateRotationOut,
                ctx: this,
                parameters: [args.active, args.active.get("health")]
            });
        },

        onHealthChange: function (model, value) {
            console.log("onDamage", this.collection.id);
            if (model === this.collection.getActive()) {
                this.trigger("animation:enqueue", {
                    type: "damage",
                    run: this.animateDamage,
                    ctx: this,
                    parameters: [model.get("maxHealth"), value, model.previous("health")]
                });
            } else {
                // TODO
            }
        },

        onRemove: function (model, collection, options) {
            console.log("onRemove", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "death",
                run: this.animateDeath,
                ctx: this,
                parameters: [options.index, collection.getActive(),
                             collection.isAlive() ? collection.getActive().get("health"): null]
            });
        },


        onAnimationEnd: function () {
            var f;
            --this.animating;
            console.log("onAnimationEnd", this.animating);
            if (this.animating === 0) {
                f = this.animationCallback;
                if (f != null) {
                    console.log("  > calling callback");
                    f.call(this);
                    if (this.animationCallback === f) this.animationCallback = null;
                } else {
                    this.trigger("animation:end");
                }
            }
        },

        animateAttack: function () {
            console.log("animateAttack");
            this.animating = 1;
            this.$active.addClass("animate-attack");
            this.animationCallback = this.cleanAttack;
        },

        cleanAttack: function () {
            console.log("cleanAttack");
            this.animating = 1;
            this.$active.removeClass("animate-attack");
            window.setTimeout(this.onAnimationEnd);
        },

        animateDefend: function () {
            console.log("animateDefend");
            this.animating = 1;
            this.$active.addClass("animate-defend");
            this.animationCallback = this.cleanDefend;
        },

        cleanDefend: function () {
            console.log("cleanDefend");
            this.animating = 1;
            this.$active.removeClass("animate-defend");
            window.setTimeout(this.onAnimationEnd);
        },

        animateAbility: function (i) {
            console.log("animateAbility");
            this.animating++;
            var n = this.animating, $el = i > 0 ? this.$team.eq(i - 1) : this.$active;
            $el.addClass("animate-ability");
            this.animationCallback = function () {
                var _this = this;
                console.log("cleanAbility");
                this.animating = 1;
                this.$active.removeClass("animate-ability");
                this.$team.removeClass("animate-ability");
                window.setTimeout(function () {
                    var i = 1;
                    _this.onAnimationEnd();
                    for (; i < n; ++i) {
                        _this.trigger("animation:end");
                    }
                });
            };
        },

        cleanAbility: function () {
            console.log("cleanAbility");
            this.animating = 1;
            this.$active.removeClass("animate-ability");
            this.$team.removeClass("animate-ability");
            window.setTimeout(this.onAnimationEnd);
        },

        animateDamage: function (maxHealth, currentHealth, previousHealth) {
            console.log("animateDamage", maxHealth, currentHealth, previousHealth);
            this.animating = 1;
            this.$hp.text("" + currentHealth + "/" + maxHealth);
            currentHealth = (currentHealth * 100 / maxHealth) | 0;
            previousHealth = (previousHealth * 100 / maxHealth) | 0;
            // there is no transition event if the width remains the same
            if (previousHealth !== currentHealth) {
                this.$hpBar.width("" + previousHealth + "%");
                this.$hpBar.addClass("transition");
                this.$hpBar.width("" + currentHealth + "%");
                this.animationCallback = this.cleanDamage;
            } else {
                window.setTimeout(this.onAnimationEnd);
            }
        },

        cleanDamage: function () {
            console.log("cleanDamage");
            this.animating = 1;
            this.$hpBar.removeClass("transition");
            window.setTimeout(this.onAnimationEnd);
        },

        animateRotationOut: function (active, newHealth) {
            console.log("animateRotationOut");
            var i = this.portraits.length;
            this.animating = 0;
            while (i--) {
                if (this.collection.at(i) != null) ++this.animating;
                this.portraits[i].addClass("invisible transition-opacity");
            }
            this.animationCallback = function () {
                this.animateFadeIn(active, newHealth);
            };
        },

        animateDeath: function (i, active, newHealth) {
            console.log("animateDeath", i);
            ++this.animating;
            this.portraits[i].addClass("animate-death");
            this.animationCallback = function () {
                console.log("cleanDeath");
                this.portraits[i].removeClass("animate-death");
                this.animateRotationOut(active, newHealth);
                if (this.animating === 0) {
                    // special case when the team was just defeated
                    this.animating = 1;
                    window.setTimeout(this.onAnimationEnd);
                }
            };
        },

        animateFadeIn: function (active, newHealth) {
            console.log("animateFadeIn");
            var mh, i = this.portraits.length;
            this.animating = 0;
            while (i--) {
                if (this.collection.at(i) != null) ++this.animating;
                this.portraits[i].removeClass("invisible");
            }
            this.activeCid = active.cid;
            this._renderActiveUnit(active);
            this._renderTeamUnits();
            if (active != null) {
                mh = active.get("maxHealth");
                this.$hp.text("" + newHealth + "/" + mh);
                this.$hpBar.width("" + ((newHealth * 100 / mh) | 0) + "%");
            } else {
                this.$hp.text("");
                this.$hpBar.width("0");
            }
            this.animationCallback = this.cleanRotation;
            if (this.animating === 0) {
                // special case when the team was just defeated
                this.animating = 1;
                window.setTimeout(this.onAnimationEnd);
            }
        },

        cleanRotation: function () {
            console.log("cleanRotation");
            var i = this.portraits.length;
            this.animating = 1;
            while (i--) {
                this.portraits[i].removeClass("transition-opacity");
            }
            window.setTimeout(this.onAnimationEnd);
        }
    });


    ////////////////////////////////////////////////////////////////////////////

    // the model is the battle engine
    views.BattleArea = views.BaseView.extend({
        el: "#battle-scene",
        navOptions: { trigger: true, replace: true },

        initialize: function (options) {
            _.bindAll(this, "_nextStep", "_setAction", "leave");
            this.router = options.router;
            this.state = options.state;
            this.animationQueue = [];
            this.animating = 0;
            this.animationCallback = null;
            this.circles = [
                new views.BattleCircle({el: "#player-battle-panel"}),
                new views.BattleCircle({el: "#opponent-battle-panel"})
            ];
            this.actionBar = new BattleActionBar({el: "#battle-action-bar"});
            this.listenTo(this.circles[0], "animation:enqueue", this.onAnimationEnqueue);
            this.listenTo(this.circles[0], "animation:end", this.onChildAnimationEnd);
            this.listenTo(this.circles[1], "animation:enqueue", this.onAnimationEnqueue);
            this.listenTo(this.circles[1], "animation:end", this.onChildAnimationEnd);
            this.listenTo(this.actionBar, "select:action", this.onSelectAction);
            this.listenTo(this.model, "battle:start", this.onBattleStart);
            this.listenTo(this.model, "battle:attack", this.onBattleAttack);
            this.listenTo(this.model, "battle:between_rounds", this.onBattleBetweenRounds);
            this.listenTo(this.model, "battle:victory", this.onBattleEnd);
            this.listenTo(this.model, "battle:defeat", this.onBattleEnd);
            this.listenTo(this.model, "request:action", this.onRequestAction);
            this.listenTo(this.model, "battle:end_phase", this.animate);
        },

        build: function (teams) {
            this.model.createBattle(teams[0], teams[1]);
            this.model.computeStep();
            return this;
        },

        onBattleStart: function () {
            var teams = this.model.get("teams");
            this.circles[0].setTeam(teams[0]);
            this.circles[1].setTeam(teams[1]);
            this.animationCallback = this._delayNextStep;
        },

        onBattleAttack: function () {
            this.animationCallback = this._delayNextStep;
        },

        onBattleBetweenRounds: function () {
            this.animationCallback = this._delayNextStep;
        },

        onBattleEnd: function () {
            this.animationCallback = this.dismiss;
        },

        onRequestAction: function () {
            this.animationCallback = this._showActionBar;
            this.animate();
        },

        onSelectAction: function (action) {
            console.log("onSelectAction", action);
            window.setTimeout(this._setAction);
        },

        onAnimationEnqueue: function (animation) {
            console.log("enqueue animation", animation.type);
            var a, q = this.animationQueue;
            if (q.length > 0 && !animation.sequential) {
                a = q[q.length - 1];
                if (a instanceof Array) {
                    if (a[0].type === animation.type) {
                        a.push(animation);
                    } else {
                        q.push(animation);
                    }
                } else if (a.type === animation.type) {
                    q[q.length - 1] = [a, animation];
                } else {
                    q.push(animation);
                }
            } else {
                q.push(animation);
            }
        },

        onChildAnimationEnd: function () {
            --this.animating;
            console.log("onChildAnimationEnd", this.animating);
            if (this.animating === 0) this.animate();
        },

        animate: function () {
            console.log("+ animate", this.animationQueue.length);
            var a;
            if (this.animationQueue.length > 0) {
                a = this.animationQueue.shift();
                if (a instanceof Array) {
                    _.each(a, this._runAnimation, this);
                } else {
                    this._runAnimation(a);
                }
            } else if (this.animationCallback != null) {
                this.animationCallback.call(this);
                this.animationCallback = null;
            }
            console.log("- animate", this.animationQueue.length);
        },

        _runAnimation: function (animation) {
            this.animating++;
            if (animation.parameters != null) {
                animation.run.apply(animation.ctx, animation.parameters);
            } else {
                animation.run.call(animation.ctx);
            }
        },

        dismiss: function () {
            window.setTimeout(this.leave);
        },

        leave: function () {
            this.state.set("status", "idle");
            this.router.navigate("home", this.navOptions);
        },


        _setAction: function () {
            this.animationCallback = this._delayNextStep;
            this.model.selectAction(this.actionBar.action);
        },

        _delayNextStep: function () {
            window.setTimeout(this._nextStep);
        },

        _nextStep: function () {
            this.model.computeStep();
        },

        _showActionBar: function () {
            this.actionBar.show();
        }
    });
})();