(function () {
    "use strict";
    /* globals window:false, _:false, Backbone:false */

    var BattleEngine, BattleMechanics, EffectHandler,
        models = window.Game.Models;


    BattleMechanics = function () {
        this.data = {
            species: null,
            instances: null,
            abilities: null,
            effects: null
        };
        this._teams = [];
        this._turn  = 0;
        this._opposite = 1;
        this._round = 0;
        this._attack_enabled = true;
    };

    BattleMechanics.prototype = Object.create(null);
    _.extend(BattleMechanics.prototype, Backbone.Events);

    BattleMechanics.prototype.team = function (i, team) {
        if (arguments.length < 2) { return this._teams[i]; }
        if (this._teams[i] != null) {
            this.stopListening(this._teams[i]);
        }
        this._teams[i] = team;
        team._teamId = i;
        this.listenTo(team, "remove", this.onUnitRemove);
        this.listenTo(team, "battle:rotate_right", this.onRotateRight);
        this.listenTo(team, "battle:rotate_left", this.onRotateLeft);
        this.listenTo(team, "change:maxHealth", this.onUnitChangeHealth);
        this.listenTo(team, "change:power", this.onUnitChangePower);
        this.listenTo(team, "change:speed", this.onUnitChangeSpeed);
        this.listenTo(team, "change:template", this.onUnitChangeTemplate);
        this.listenTo(team, "change:type", this.onUnitChangeType);
        // this.trigger("team:set", i, team);
        return this;
    };

    BattleMechanics.prototype.activeTeam = function (i) {
        if (!arguments.length) { return this._teams[this._turn]; }
        this._turn = i;
        this._opposite = (i + 1) % 2;
        // this.trigger("team:active", i);
        return this;
    };

    BattleMechanics.prototype.activeUnit = function (i) {
        if (!arguments.length) { return this.activeTeam().getActive(); }
        return this._teams[i].getActive();
    };

    BattleMechanics.prototype.attacker = function () {
        return this._teams[this._turn].getActive();
    };

    BattleMechanics.prototype.defender = function () {
        return this._teams[this._opposite].getActive();
    };

    BattleMechanics.prototype.reset = function () {
        this._teams = [];
        this._turn  = 0;
        this._opposite = 1;
        this._round = 0;
        this._attack_enabled = true;
        this.trigger("reset", this);
        return this;
    };

    BattleMechanics.prototype.flipTurn = function () {
        var prev = this._turn;
        this._turn = this._opposite;
        this._opposite = prev;
        // this.trigger("turn:flip", this._turn, this._opposite);
        return this;
    };

    BattleMechanics.prototype.nextRound = function () {
        this.trigger("round_end", this._round);
        ++this._round;
        this.trigger("round_start", this._round);
        return this;
    };

    BattleMechanics.prototype.turn = function () {
        return this._turn;
    };

    BattleMechanics.prototype.otherTurn = function () {
        return this._opposite;
    };

    BattleMechanics.prototype.round = function () {
        return this._round;
    };

    BattleMechanics.prototype.calculateTurn = function () {
        var i = this._teams.length, t = 0, ms = 0, s;
        while (i--) {
            s = this._teams[i].getActive().get("speed");
            if (s > ms) {
                ms = s;
                t = i;
            } else if (s == ms) {
                t = Math.random() < 0.5 ? i : t;
            }
        }
        this._turn = t;
        this._opposite = (t + 1) % 2;
        // this.trigger("turn:set", t);
        return this;
    };

    BattleMechanics.prototype.rotate = function (teamIndex, clockwise) {
        var team = this._teams[teamIndex];
        if (team.canRotate()) {
            if (clockwise) team.rotateRight();
            else team.rotateLeft();
        }
    };

    BattleMechanics.prototype.attack = function (teamIndex) {
        var u, t, damage, type, atkArgs, defArgs;
        if (!arguments.length) { teamIndex = this._turn; }
        u = this._teams[teamIndex].getActive();
        damage = u.get("power");
        type = u.get("type");
        t = this._teams[(teamIndex + 1) % 2].getActive();
        atkArgs = {emitter: u, target: t, damage: damage, type: type};
        defArgs = {emitter: t, attacker: u, damage: damage, type: type};
        u.trigger("battle:attack", atkArgs);
        t.trigger("battle:defend", defArgs);
        this.trigger("attack", u, t);
        damage = this.damage(t, damage, type);
        atkArgs.damage = damage;
        defArgs.damage = damage;
        u.trigger("battle:post_attack", atkArgs);
        t.trigger("battle:post_defend", defArgs);
        return this;
    };

    BattleMechanics.prototype.damage = function (unit, amount, type) {
        var m1 = unit._maxHealth.actual(),
            rh1 = unit.get("health") / m1,
            damage = unit.damage(amount, type), // <-- things happen here
            m2 = unit._maxHealth.actual(),
            rh2 = unit.get("health") / m2;
        this.trigger("damage", unit, damage, type);
        if (rh1 > 0.5) {
            if (rh2 <= 0.5) {
                unit.trigger("battle:health_low", {emitter: unit});
            }
        }
        else {
            if (rh2 > 0.5) {
                unit.trigger("battle:health_high", {emitter: unit});
            }
        }
        return damage;
    };

    BattleMechanics.prototype.heal = function (unit, amount, type) {
        var m1 = unit._maxHealth.actual(),
            rh1 = unit.get("health") / m1,
            damage = unit.heal(amount, type), // <-- things happen here
            m2 = unit._maxHealth.actual(),
            rh2 = unit.get("health") / m2;
        this.trigger("heal", unit, damage, type);
        if (rh1 > 0.5) {
            if (rh2 <= 0.5) {
                unit.trigger("battle:health_low", {emitter: unit});
            }
        }
        else {
            if (rh2 > 0.5) {
                unit.trigger("battle:health_high", {emitter: unit});
            }
        }
        return damage;
    };

    BattleMechanics.prototype.cleanup = function () {
        var p, u, i = this._teams.length;
        while (i--) {
            p = this._teams[i].getActive();
            this._teams[i].cleanup();
            u = this._teams[i].getActive();
            if (u != null && p.id !== u.id) {
                u.trigger("battle:active", {emitter: u, previous: p});
            }
        }
        return this;
    };

    BattleMechanics.prototype.onUnitRemove = function (unit, team, options) {
        var hs = unit._handlers;
        while (hs.length > 0) {
            hs[hs.length - 1].onReset();
        }
        this.trigger("death", unit, team, options.index);
    };

    BattleMechanics.prototype.onRotateRight = function (args) {
        this.trigger("rotation:right", args.emitter);
    };

    BattleMechanics.prototype.onRotateLeft = function (args) {
        this.trigger("rotation:left", args.emitter);
    };

    BattleMechanics.prototype.onUnitChangeHealth = function (unit) {
        this.trigger("change", unit, unit.collection, unit.collection.indexOf(unit), {
            health: unit.get("health"), maxHealth: unit.get("maxHealth")
        });
    };

    BattleMechanics.prototype.onUnitChangePower = function (unit) {
        this.trigger("change", unit, unit.collection, unit.collection.indexOf(unit), {
            power: unit.get("power")
        });
    };

    BattleMechanics.prototype.onUnitChangeSpeed = function (unit) {
        this.trigger("change", unit, unit.collection, unit.collection.indexOf(unit), {
            speed: unit.get("speed")
        });
    };

    BattleMechanics.prototype.onUnitChangeTemplate = function (unit) {
        this.trigger("change", unit, unit.collection, unit.collection.indexOf(unit), {
            template: unit.get("template")
        });
    };

    BattleMechanics.prototype.onUnitChangeType = function (unit) {
        this.trigger("change", unit, unit.collection, unit.collection.indexOf(unit), {
            type: unit.get("type")
        });
    };

    BattleMechanics.prototype._opposing = function (unit) {
        return this._teams[(unit.collection._teamId + 1) % 2];
    };

    ////////////////////////////////////////////////////////////////////////////

    BattleMechanics.prototype.target = function (unit, type) {
        return this._targets[type].call(this, unit);
    };

    BattleMechanics.prototype._targets = {
        all: function () {
            return _.bind(function () {
                return this._teams[0].toArray().concat(this._teams[1].toArray());
            }, this);
        },
        self: function (unit) {
            return function () { return [unit]; };
        },
        self_left: function (unit) {
            return function () {
                var u = unit.collection.getAtLeft(unit);
                return u != null ? [u] : [];
            };
        },
        self_right: function (unit) {
            return function () {
                var u = unit.collection.getAtRight(unit);
                return u != null ? [u] : [];
            };
        },
        self_adjacent: function (unit) {
            return function () {
                var c = unit.collection;
                if (c.length > 2)
                    return [c.getAtLeft(unit), c.getAtRight(unit)];
                if (c.length > 1)
                    return [c.getAtRight(unit)];
                return [];
            };
        },
        friend_team: function (unit) {
            return function () { return unit.collection; };
        },
        friend_active: function (unit) {
            return function () { return [unit.collection.getActive()]; }
        },
        friend_all: function (unit) {
            return function () { return unit.collection.toArray(); };
        },
        friend_left: function (unit) {
            return function () {
                var u = unit.collection.getAtLeft();
                return u != null ? [u] : [];
            };
        },
        friend_right: function (unit) {
            return function () {
                var u = unit.collection.getAtRight();
                return u != null ? [u] : [];
            };
        },
        friend_adjacent: function (unit) {
            return function () {
                var c = unit.collection;
                if (c.length > 2)
                    return [c.getAtLeft(), c.getAtRight()];
                if (c.length > 1)
                    return [c.getAtRight()];
                return [];
            };
        },
        friend_front: function (unit) {
            return function () {
                var c = unit.collection;
                switch (c.length) {
                    case 0:     return [];
                    case 1:     return [c.getActive()];
                    case 2:     return [c.getActive(), c.getAtRight()];
                    default:    return [c.getActive(), c.getAtRight(), c.getAtLeft()];
                }
            };
        },
        friend_others: function (unit) {
            return function () { return unit.collection.without(unit); };
        },
        friend_standby: function (unit) {
            return function () { return unit.collection.without(unit.collection.getActive()); };
        },
        opponent: function (unit) {
            var c = this._opposing(unit);
            return function () { return [c.getActive()]; };
        },
        opponent_team: function (unit) {
            var c = this._opposing(unit);
            return function () { return c; };
        },
        opponent_all: function (unit) {
            var c = this._opposing(unit);
            return function () { return c.toArray(); };
        },
        opponent_left: function (unit) {
            var c = this._opposing(unit);
            return function () {
                var u = c.getAtLeft();
                return u != null ? [u] : [];
            };
        },
        opponent_right: function (unit) {
            var c = this._opposing(unit);
            return function () {
                var u = c.getAtRight();
                return u != null ? [u] : [];
            }
        },
        opponent_adjacent: function (unit) {
            var c = this._opposing(unit);
            return function () {
                if (c.length > 2)
                    return [c.getAtLeft(), c.getAtRight()];
                if (c.length > 1)
                    return [c.getAtRight()];
                return [];
            };
        },
        opponent_front: function (unit) {
            var c = this._opposing(unit);
            return function () {
                switch (c.length) {
                    case 0:     return [];
                    case 1:     return [c.getActive()];
                    case 2:     return [c.getActive(), c.getAtRight()];
                    default:    return [c.getActive(), c.getAtRight(), c.getAtLeft()];
                }
            };
        },
        opponent_standby: function (unit) {
            var c = this._opposing(unit);
            return function () { return c.without(c.getActive()); }
        },
        all_adjacent: function (unit) {
            var c1 = unit.collection, c2 = this._opposing(unit);
            return function () {
                var targets = [];
                if (c1.length > 2) targets.push(c1.getAtLeft());
                if (c1.length > 1) targets.push(c1.getAtRight());
                if (c2.length > 2) targets.push(c2.getAtLeft());
                if (c2.length > 1) targets.push(c2.getAtRight());
                return targets;
            };
        }
    };


    ////////////////////////////////////////////////////////////////////////////

    BattleMechanics.prototype.createAbilityHandlers = function () {
        var i = this._teams.length;
        while (i--) {
            this._teams[i].each(this._createUnitAbilities, this);
        }
    };

    BattleMechanics.prototype._createUnitAbilities = function (unit) {
        if (!unit._ability) return;
        var e, i, len, aes = unit._ability.get("effects");
        for (i = 0, len = aes.length; i < len; ++i) {
            e = new EffectHandler(this, unit, unit, unit._ability, "ability", aes[i]);
            e.rebindToEvents();
            unit._handlers.push(e);
        }
    };



    ////////////////////////////////////////////////////////////////////////////

    EffectHandler = function (mechanics, source, unit, ability, channel, effect) {
        this.mechanics = mechanics;
        this.source = source;
        this.unit = unit;
        this.ability = ability;
        this.channel = channel;
        this.target = mechanics.target(unit, effect.target);
        this.parameters = effect.parameters;
        this.group = effect.group || null;
        this.duration = effect.duration != null ? effect.duration : null;
        this.events = [];
        for (var i = 0; i < effect.events.length; ++i) {
            this.events.push(effect.events[i].split(" "));
        }
        this.mechanic = this._effectHandlers[effect.mechanic];
    };


    EffectHandler.prototype = Object.create(null);
    _.extend(EffectHandler.prototype, Backbone.Events);

    EffectHandler.prototype.rebindToEvents = function () {
        var e, t, j, i = this.events.length;
        this.stopListening();
        while (i--) {
            e = this.events[i];
            switch (e[0]) {
                case "on":
                    this.listenTo(this.unit, "battle:" + this.channel + "_apply",
                                  this.triggerEffectForThisAbility);
                    break;
                case "off":
                    this.listenTo(this.unit, "battle:" + this.channel + "_remove",
                                  this.triggerEffectForThisAbility);
                    break;
                case "mechanics":
                    this.listenTo(this.mechanics, e[1], this.triggerEffect);
                    break;
                case "source":
                    this.listenTo(this.source, e[1], this.triggerEffect);
                    break;
                default:
                    t = this.mechanics.target(this.unit, e[0])();
                    for (j = t.length; j--;) {
                        this.listenTo(t[j], "battle:" + e[1], this.triggerEffect);
                    }
                    break;
            }
        }
        this.listenTo(this.unit, "battle:" + this.channel + "_remove", this.onRemoveThisAbility);
        this.listenTo(this.mechanics, "round_end", this.tick);
        this.listenTo(this.mechanics, "reset", this.onReset);
    };

    EffectHandler.prototype.expireOn = function (events) {
        var e, t, j, i = events.length;
        while (i--) {
            e = events[i].split(" ");
            switch (e[0]) {
                case "mechanics":
                    this.listenTo(this.mechanics, e[1], this.expire);
                    break;
                case "source":
                    this.listenTo(this.source, "battle:" + e[1], this.expire);
                    break;
                default:
                    t = this.mechanics.target(this.unit, e[0])();
                    for (j = t.length; j--;) {
                        this.listenTo(t[j], "battle:" + e[1], this.expire);
                    }
                    break;
            }
        }
    };

    EffectHandler.prototype.triggerEffect = function (args) {
        this.unit.trigger("battle:" + this.channel, {
            emitter: this.unit,
            ability: this.ability,
            effect: this
        });
        this.mechanics.trigger(this.channel, this.unit, this.ability);
        this.mechanic(args);
    };

    EffectHandler.prototype.triggerEffectForThisAbility = function (args) {
        if (args.ability.id === this.ability.id) {
            this.triggerEffect(args);
        }
    };

    EffectHandler.prototype.onRemoveThisAbility = function (args) {
        if (args.ability.id === this.ability.id) {
            this.onReset();
        }
    };

    EffectHandler.prototype.onReset = function () {
        this.stopListening();
        var i = this.unit._handlers.indexOf(this);
        this.unit._handlers.splice(i, 1);
        this.unit = null;
        this.source = null;
        this.mechanics = null;
        this.ability = null;
    };

    EffectHandler.prototype.tick = function () {
        if (this.duration != null) {
            --this.duration;
            if (this.duration <= 0) {
                var effect = this.unit.get("effects")[this.group];
                --effect.counter;
                if (effect.counter <= 0) {
                    this.unit.removeEffect(this.group);
                }
            }
        }
    };

    EffectHandler.prototype.expire = function () {
        if (this.unit != null) {
            // this guard is needed due to an interaction with `onRemoveThisAbility`
            // and having multiple `expire` waiting to be called for the same ability
            this.unit.removeEffect(this.group);
        }
    };

    EffectHandler.prototype.mechanic = function () {};

    EffectHandler.prototype._effectHandlers = {
        log: function () {
            //this.parameters
            //this.mechanics
            //this.unit
            console.log("<ABILITY> The ability has been triggered!");
        },
        damage: function (args) {
            var amount, p = this.parameters,
                type = p.type,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else if (p.from == null) amount = (p.relative * args[p.reference]) | 0;
            else {
                var u = this.mechanics.target(this.unit, p.from)()[0];
                amount = (p.relative * u.get(p.reference)) | 0;
            }
            while (i--) {
                this.mechanics.damage(targets[i], amount, type);
            }
        },
        heal: function (args) {
            var amount, p = this.parameters,
                type = p.type,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else if (p.from == null) amount = (p.relative * args[p.reference]) | 0;
            else {
                var u = this.mechanics.target(this.unit, p.from)()[0];
                amount = (p.relative * u.get(p.reference)) | 0;
            }
            while (i--) {
                this.mechanics.heal(targets[i], amount, type);
            }
        },
        apply: function () {
            var j, h, t, c, d,
                p = this.parameters,
                targets = this.target(),
                i = targets.length,
                effect = this.mechanics.data.effects.get(p.effect),
                aes = effect.get("effects"),
                len = aes.length,
                exp = effect.get("expire") || [];
            while (i--) {
                t = targets[i];
                c = _.clone(effect.attributes);
                c.counter = len;
                if (t.get("effects")[c.group] == null) {
                    for (j = 0; j < len; ++j) {
                        d = _.clone(aes[j]);
                        d.group = c.group;
                        h = new EffectHandler(this.mechanics, this.source, t, effect, "effect", d);
                        h.rebindToEvents();
                        h.expireOn(exp);
                        t._handlers.push(h);
                    }
                }
                t.addEffect(c);
            }
        },
        stat_bonus: function (args) {
            var u, health, power, speed,
                p = this.parameters,
                ph = p.health,
                pp = p.power,
                ps = p.speed,
                targets = this.target(),
                i = targets.length;
            if (ph == null) health = 0;
            else if (ph.amount != null) health = ph.amount;
            else if (ph.from == null) health = (ph.relative * args[ph.reference]) | 0;
            else {
                u = this.mechanics.target(this.unit, ph.from)()[0];
                health = (ph.relative * u.get(ph.reference)) | 0;
            }
            if (pp == null) power = 0;
            else if (pp.amount != null) power = pp.amount;
            else if (pp.from == null) power = (pp.relative * args[pp.reference]) | 0;
            else {
                u = this.mechanics.target(this.unit, pp.from)()[0];
                power = (pp.relative * u.get(pp.reference)) | 0;
            }
            if (ps == null) speed = 0;
            else if (ps.amount != null) speed = ps.amount;
            else if (ps.from == null) speed = (ps.relative * args[ps.reference]) | 0;
            else {
                u = this.mechanics.target(this.unit, ps.from)()[0];
                speed = (ps.relative * u.get(ps.reference)) | 0;
            }
            while (i--) {
                if (health > 0) targets[i].plusHealth(health);
                else if (health < 0) targets[i].minusHealth(-health);
                if (power > 0) targets[i].plusPower(power);
                else if (power < 0) targets[i].minusPower(-power);
                if (speed > 0) targets[i].plusSpeed(speed);
                else if (speed < 0) targets[i].minusSpeed(-speed);
            }
        },
        enable_rotate: function () {
            var targets = this.target(), i = targets.length;
            while (i--) {
                targets[i].enableRotate();
            }
        },
        disable_rotate: function () {
            var targets = this.target(), i = targets.length;
            while (i--) {
                targets[i].disableRotate();
            }
        },
        enable_attack: function () {
            var targets = this.target(), i = targets.length;
            while (i--) {
                targets[i].enableAttack();
            }
        },
        disable_attack: function () {
            var targets = this.target(), i = targets.length;
            while (i--) {
                targets[i].disableAttack();
            }
        }
    };



    ////////////////////////////////////////////////////////////////////////////


    BattleEngine = Backbone.Model.extend({
        initialize: function () {
            this._mechanics = new BattleMechanics();
            this._stateMachine = new window.Game.StateMachine();
            this._stateMachine.state("battle:start", this._state_initial);
            this._stateMachine.state("battle:select_action", this._state_select_action);
            this._stateMachine.state("battle:attack", this._state_attack);
            this._stateMachine.state("battle:between_rounds", this._state_between_rounds);
            this._stateMachine.state("battle:victory", this._state_victory);
            this._stateMachine.state("battle:defeat", this._state_defeat);
            this.listenTo(this._mechanics, "rotation:right", this._onRotateRight);
            this.listenTo(this._mechanics, "rotation:left", this._onRotateLeft);
            this.listenTo(this._mechanics, "attack", this._onAttack);
            this.listenTo(this._mechanics, "ability", this._onAbility);
            this.listenTo(this._mechanics, "effect", this._onEffect);
            this.listenTo(this._mechanics, "death", this._onDeath);
            this.listenTo(this._mechanics, "change", this._onChange);
            this.listenTo(this._mechanics, "damage", this._onDamage);
            this.listenTo(this._mechanics, "heal", this._onHeal);
        },

        isBattling: function () {
            var s = this._stateMachine.state();
            return s != "battle:victory" && s != "battle:defeat";
        },

        setData: function (species, instances, abilities, effects) {
            this._mechanics.data.species = species;
            this._mechanics.data.instances = instances;
            this._mechanics.data.abilities = abilities;
            this._mechanics.data.effects = effects;
            return this;
        },

        createBattle: function (player, opponent) {
            var sm = this._stateMachine;
            this._mechanics.reset();
            this._mechanics.team(0, player);
            this._mechanics.team(1, opponent);
            this.set("teams", [player, opponent]);
            sm.state("battle:start");
            // while (!!sm.compute(this));
            return this;
        },

        computeStep: function () {
            this._stateMachine.compute(this);
            return this;
        },

        selectAction: function (action) {
            switch (action) {
                case "SURRENDER":
                    this._stateMachine.state("battle:defeat");
                    this.trigger("battle:end_phase", this);
                    return this;
                case "ROTATE_COUNTER":
                    this._mechanics.rotate(0, false);
                    break;
                case "ROTATE_CLOCK":
                    this._mechanics.rotate(0, true);
                    break;
                case "ATTACK":
//                    console.log("No rotation.");
                    break;
                default:
                    console.log("Invalid action:", action);
                    return this;
            }
            this._stateMachine.state("battle:attack");
            this.trigger("battle:end_phase", this);
            return this;
        },


        /*_iterate: function (state) {
            var sm = this._stateMachine;
            sm.state(state || "battle:attack");
            while (!!sm.compute(this));
        },*/

        _state_initial: function () {
//            console.log("Starting battle.");
            this.trigger("battle:start", this,
                         this._mechanics.team(0).toSimplifiedJSON(),
                         this._mechanics.team(1).toSimplifiedJSON());
            this.set("state", "battle:start");
            this._mechanics.createAbilityHandlers();
            this.trigger("battle:end_phase", this);
            return "battle:select_action";
        },

        _state_select_action: function () {
//            console.log("Selecting action.");
            this.trigger("battle:select_action", this);
            this.set("state", "battle:select_action");
            this.trigger("request:action", this);
        },

        _state_attack: function () {
//            console.log("Attacking.");
            this.trigger("battle:attack", this);
            this.set("state", "battle:attack");
            this._mechanics.calculateTurn().attack();
            //this.trigger("attack", this, this._mechanics.attacker(), this._mechanics.defender());
//            console.log("Player  ", "" + this._mechanics.activeUnit(0).get("health") +
//                        "/" + this._mechanics.activeUnit(0).get("maxHealth"), "HP");
//            console.log("Opponent", "" + this._mechanics.activeUnit(1).get("health") +
//                        "/" + this._mechanics.activeUnit(1).get("maxHealth"), "HP");
            this._mechanics.cleanup();
            if (!this._mechanics.team(0).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:defeat";
            }
            if (!this._mechanics.team(1).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:victory";
            }
            // If the defender dies here, the guy that steps in automatically attacks.
            // cleanup() places another guy into position, if there's one available.
            // Revenge!
            this._mechanics.flipTurn().attack();
            //this.trigger("attack", this, this._mechanics.attacker(), this._mechanics.defender());
//            console.log("Player  ", "" + this._mechanics.activeUnit(0).get("health") +
//                        "/" + this._mechanics.activeUnit(0).get("maxHealth"), "HP");
//            console.log("Opponent", "" + this._mechanics.activeUnit(1).get("health") +
//                        "/" + this._mechanics.activeUnit(1).get("maxHealth"), "HP");
            this._mechanics.cleanup();
            if (!this._mechanics.team(0).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:defeat";
            }
            if (!this._mechanics.team(1).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:victory";
            }
            this.trigger("battle:end_phase", this);
            return "battle:between_rounds";
        },

        _state_between_rounds: function () {
//            console.log("Between rounds.");
            this.trigger("battle:between_rounds", this);
            this.set("state", "battle:between_rounds");
            this._mechanics.nextRound();
//            console.log("Player", "" + this._mechanics.activeUnit(0).get("health") +
//                        "/" + this._mechanics.activeUnit(0).get("maxHealth"), "HP");
//            console.log("Opponent", "" + this._mechanics.activeUnit(1).get("health") +
//                        "/" + this._mechanics.activeUnit(1).get("maxHealth"), "HP");
            this._mechanics.cleanup();
            if (!this._mechanics.team(0).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:defeat";
            }
            if (!this._mechanics.team(1).isAlive()) {
                this.trigger("battle:end_phase", this);
                return "battle:victory";
            }
            this.trigger("battle:end_phase", this);
            return "battle:select_action";
        },

        _state_victory: function () {
//            console.log("Victory.");
            this.trigger("battle:victory", this);
            this.set("state", "battle:victory");
            //this.trigger("battle:end_phase", this);
        },

        _state_defeat: function () {
//            console.log("Defeat.");
            this.trigger("battle:defeat", this);
            this.set("state", "battle:defeat");
            //this.trigger("battle:end_phase", this);
        },

        _onRotateRight: function (team) {
            this.trigger("rotation:right", team._teamId);
        },

        _onRotateLeft: function (team) {
            this.trigger("rotation:left", team._teamId);
        },

        _onAttack: function (attacker, defender) {
            this.trigger("attack", attacker.collection._teamId, defender.collection._teamId);
        },

        _onAbility: function (unit, ability) {
            this.trigger("ability", unit.collection._teamId, unit.collection.indexOf(unit),
                         ability.get("name"));
        },

        _onEffect: function (unit, effect) {
            this.trigger("effect", unit.collection._teamId, unit.collection.indexOf(unit),
                         effect.get("name"));
        },

        _onDeath: function (unit, team, index) {
            this.trigger("death", team._teamId, index);
        },

        _onChange: function (unit, team, index, attr) {
            this.trigger("update", team._teamId, index, attr);
        },

        _onDamage: function (unit, amount, type) {
            this.trigger("damage", unit.collection._teamId, unit.collection.indexOf(unit),
                         amount, type);
        },

        _onHeal: function (unit, amount, type) {
            this.trigger("heal", unit.collection._teamId, unit.collection.indexOf(unit),
                         amount, type);
        },

        toJSON: function () {
            var json = Backbone.Model.prototype.toJSON.call(this);
            json.teams = _.map(json.teams, Backbone.Collection.prototype.toJSON);
            return json;
        }
    });


    window.Game.BattleEngine = new BattleEngine();
})();