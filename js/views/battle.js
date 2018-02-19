(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false, $:false */

    var views = window.Game.Views;

    views.BattleActionBar = Backbone.View.extend({
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
            this._renderActiveUnit();
            this._renderTeamUnits();
            return this;
        },


        _renderActiveUnit: function () {
            var h, mh, m = this.collection.getActive();
            if (m != null) {
                h = m.get("health");
                mh = m.get("maxHealth");
                this.$name.text(m._template.get("name"));
                this.$hp.text("" + h + "/" + mh);
                this.$hpBar.width("" + ((h * 100 / mh) | 0) + "%");
                this.$level.text("" + m._instance.get("level"));
                this.$type.addClass("icon-unit-0");
                //this.$type.addClass("icon-type-" + m.get("type").toLowerCase());
                this.portraits[0].show().attr("src", "assets/sprites/" + m._template.get("portrait") + ".png");
            } else {
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
            return this;
            this.trigger("animation:enqueue", {
                type: "ability",
                run: this.animateAbility,
                ctx: this,
                parameters: [this.collection.indexOf(args.emitter)]
            });
        },

        onRotation: function () {
            console.log("onRotation", this.collection.id);
            this.trigger("animation:enqueue", {
                type: "rotation",
                run: this.animateRotationOut,
                ctx: this
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
                parameters: [options.index]
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
            var f = this.animationCallback,
                $el = i > 0 ? this.$team.eq(i - 1) : this.$active;
            this.animating++;
            $el.addClass("animate-ability");
            this.animationCallback = this.cleanAbility;
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

        animateRotationOut: function () {
            console.log("animateRotationOut");
            var i = this.portraits.length;
            this.animating = 0;
            while (i--) {
                if (this.collection.at(i) != null) ++this.animating;
                this.portraits[i].addClass("invisible transition-opacity");
            }
            this.animationCallback = this.animateFadeIn;
        },

        animateDeath: function (i) {
            console.log("animateDeath", i);
            var _this = this;
            ++this.animating;
            this.portraits[i].addClass("animate-death");
            this.animationCallback = function () {
                console.log("cleanDeath");
                _this.portraits[i].removeClass("animate-death");
                _this.animateRotationOut();
                if (this.animating === 0) {
                    // special case when the team was just defeated
                    this.animating = 1;
                    window.setTimeout(this.onAnimationEnd);
                }
            };
        },

        animateFadeIn: function () {
            console.log("animateFadeIn");
            var i = this.portraits.length;
            this.animating = 0;
            while (i--) {
                if (this.collection.at(i) != null) ++this.animating;
                this.portraits[i].removeClass("invisible");
            }
            this._renderActiveUnit();
            this._renderTeamUnits();
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
            this.actionBar = new views.BattleActionBar({el: "#battle-action-bar"});
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