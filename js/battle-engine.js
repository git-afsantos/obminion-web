(function () {
    "use strict";
    /* globals window:false, _:false, Backbone:false */

    var BattleEngine, BattleMechanics, EffectHandler,
        data = window.Game.data,
        models = window.Game.Models;


    BattleMechanics = function () {
        this._teams = [];
        this._turn  = 0;
        this._opposite = 1;
        this._round = 0;
        this._abilities = [];
        this._effects = {};
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

    BattleMechanics.prototype.flipTurn = function () {
        var prev = this._turn;
        this._turn = this._opposite;
        this._opposite = prev;
        // this.trigger("turn:flip", this._turn, this._opposite);
        return this;
    };

    BattleMechanics.prototype.nextRound = function () {
        // this.trigger("round:end", this._round);
        ++this._round;
        // this.trigger("round:begin", this._round);
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
        this.trigger("damage", unit, damage, type);
        return damage;
    };

    BattleMechanics.prototype.heal = function (unit, amount, type) {
        var m1 = unit._maxHealth.actual(),
            rh1 = unit.get("health") / m1,
            damage = unit.heal(amount, type), // <-- things happen here
            m2 = unit._maxHealth.actual(),
            rh2 = unit.get("health") / m2;
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
        this.trigger("heal", unit, damage, type);
        return damage;
    };

    BattleMechanics.prototype.cleanup = function () {
        var i = this._teams.length;
        while (i--) this._teams[i].cleanup();
        return this;
    };

    BattleMechanics.prototype.tick = function () {
        var i = this._teams.length;
        //this.trigger("tick:pre", this._round);
        while (i--) {
            this._teams[i].forEach(this._tickUnit, this);
        }
        //this.trigger("tick:post", this._round);
        return this;
    };

    BattleMechanics.prototype._tickUnit = function (unit, i) {
        var effects, group, e;
        effects = unit.get("effects");
        for (group in effects) if (effects.hasOwnProperty(group)) {
            e = effects[group];
            // Effect.tick() calls Effect._tick().
            if (!e.tick()) {
                unit.removeEffect(e);
                e._off();
                //this.trigger("battleunit:effect:remove", unit, e);
            }
        }
    };

    BattleMechanics.prototype.onUnitRemove = function (unit, team, options) {
        var hs = unit._handlers, i = hs.length, j;
        while (i--) {
            hs[i].stopListening();
            j = this._abilities.indexOf(hs[i]);
            if (j > -1) {
                this._abilities.splice(j, 1);
            }
        }
        this.trigger("death", unit, team, options.index);
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
            e = new EffectHandler(this, unit, aes[i].events, aes[i].target,
                                  aes[i].parameters, i, "ability");
            e.mechanic = e._effectHandlers[aes[i].mechanic];
            e.rebindToEvents();
            unit._handlers.push(e);
            this._abilities.push(e);
        }
    };



    ////////////////////////////////////////////////////////////////////////////

    EffectHandler = function (mechanics, unit, events, target, parameters, index, channel) {
        this.mechanics = mechanics;
        this.unit = unit;
        this.events = [];
        this.target = mechanics.target(unit, target);
        this.parameters = parameters;
        this.index = index;
        this.channel = channel;
        for (var i = 0; i < events.length; ++i) {
            this.events.push(events[i].split(" "));
        }
    };


    EffectHandler.prototype = Object.create(null);
    _.extend(EffectHandler.prototype, Backbone.Events);

    EffectHandler.prototype.rebindToEvents = function () {
        var e, t, j, i = this.events.length;
        this.stopListening();
        while (i--) {
            e = this.events[i];
            t = this.mechanics.target(this.unit, e[0])();
            for (j = t.length; j--;)
                this.listenTo(t[j], "battle:" + e[1], this.triggerEffect);
        }
    };

    EffectHandler.prototype.triggerEffect = function (args) {
        this.unit.trigger("battle:" + this.channel, {
            emitter: this.unit,
            ability: this.unit._ability,
            effect: this.index
        });
        this.mechanics.trigger(this.channel, this.unit, this.unit._ability);
        this.mechanic(args);
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
            var amount, damage, p = this.parameters,
                type = p.type,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) {
                this.mechanics.damage(targets[i], amount, type);
            }
        },
        heal: function (args) {
            var amount, damage, p = this.parameters,
                type = p.type,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) {
                this.mechanics.heal(targets[i], amount, type);
            }
        },
        buff_health: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].plusHealth(amount); }
        },
        debuff_health: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].minusHealth(amount); }
        },
        buff_power: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].plusPower(amount); }
        },
        debuff_power: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].minusPower(amount); }
        },
        buff_speed: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].plusSpeed(amount); }
        },
        debuff_speed: function (args) {
            var amount, p = this.parameters,
                targets = this.target(),
                i = targets.length;
            if (p.amount != null) amount = p.amount;
            else amount = (p.relative * args[p.reference]) | 0;
            while (i--) { targets[i].minusSpeed(amount); }
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
            this.listenTo(this._mechanics, "attack", this._onAttack);
            this.listenTo(this._mechanics, "ability", this._onAbility);
            this.listenTo(this._mechanics, "death", this._onDeath);
            this.listenTo(this._mechanics, "damage", this._onDamage);
            this.listenTo(this._mechanics, "heal", this._onHeal);
        },

        isBattling: function () {
            var s = this._stateMachine.state();
            return s != "battle:victory" && s != "battle:defeat";
        },

        createBattle: function (player, opponent) {
            var sm = this._stateMachine;
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
            var team = this._mechanics.team(0);
            switch (action) {
                case "SURRENDER":
                    this._stateMachine.state("battle:defeat");
                    this.trigger("battle:end_phase", this);
                    return this;
                case "ROTATE_COUNTER":
                    if (team.canRotate()) {
//                        console.log("Rotating left.");
                        team.rotateLeft();
                        this.trigger("rotation:left", 0);
                    }
                    break;
                case "ROTATE_CLOCK":
                    if (team.canRotate()) {
//                        console.log("Rotating right.");
                        team.rotateRight();
                        this.trigger("rotation:right", 0);
                    }
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
            this._mechanics.tick();
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
            this._mechanics.nextRound();
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

        _onAttack: function (attacker, defender) {
            this.trigger("attack", attacker.collection._teamId, defender.collection._teamId);
        },

        _onAbility: function (unit, ability) {
            this.trigger("ability", unit.collection._teamId, unit.collection.indexOf(unit),
                         ability.get("name"));
        },

        _onDeath: function (unit, team, index) {
            this.trigger("death", team._teamId, index);
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