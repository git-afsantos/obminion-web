(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false */

    var models = window.Game.Models;


    models.GameState = Backbone.Model.extend({
        initialize: function () {
            this.species = new models.SpeciesCollection();
            this.instances = new models.UnitTeam();
            this.playerCollection = new models.UnitTeam();
            this.abilities = new models.AbilityCollection();
            this.zones = new models.ZoneCollection();
            this.playerTeam = new models.BattleTeam(null, {id: "player"});
            this.opponentTeam = new models.BattleTeam(null, {id: "opponent"});
        },

        options: function () {
            return {
                _species: this.species,
                _instances: this.instances,
                _abilities: this.abilities
            };
        },

        createCollection: function () {
            this.instances = models.UnitTeam.fromTemplates([
                this.species.get(2),
                this.species.get(3),
                this.species.get(4),
                this.species.get(5)
            ]);
            this.playerCollection.addFromTemplate(this.species.get(1));
            this.playerCollection.addFromTemplate(this.species.get(2));
            this.playerCollection.addFromTemplate(this.species.get(3));
            this.playerCollection.addFromTemplate(this.species.get(3));
            this.playerCollection.addFromTemplate(this.species.get(1));
        },

        createBattle: function () {
            this.playerTeam = models.BattleTeam.fromUnitTeam(this.instances, this.abilities);
            this.playerTeam.id = "player";
            var instances = models.UnitTeam.fromTemplates([
                this.species.get(1),
                this.species.get(1),
                this.species.get(1)
            ]);
            this.opponentTeam = models.BattleTeam.fromUnitTeam(instances, this.abilities);
            this.opponentTeam.id = "opponent";
        }
    });


    /*{
        id,
        name,
        missions
    }*/
    models.Zone = Backbone.Model.extend({});

    models.ZoneCollection = Backbone.Collection.extend({
        model: models.Zone,

        url: "data/zones.json"
    });


    /*{
        id,
        portrait,
        name,
        type,
        health,
        power,
        speed,
        abilities
    }*/
    models.UnitTemplate = Backbone.Model.extend({});

    models.SpeciesCollection = Backbone.Collection.extend({
        model: models.UnitTemplate,

        url: "data/species.json"
    });


    /*{
        id,
        template,
        level,
        experience,
        health,     // actual values
        power,
        speed,
        ability
    }*/
    models.UnitInstance = Backbone.Model.extend({
        defaults: {
            template: 0,
            level: 1,
            experience: 0
        },

        initialize: function (attr, options) {
            this._template = options.UnitTemplate;
            this.set({
                id:         "UI" + this.cid,
                health:     this.health(),
                power:      this.power(),
                speed:      this.speed(),
                ability:    "ability" in attr ? attr.ability : _.sample(this._template.get("abilities"))
            }, {silent: true});
        },

        health: function () {
            return this._template.get("health") + ((this.get("level") + 1) / 3 | 0);
        },

        power: function () {
            return this._template.get("power") + (this.get("level") / 3 | 0);
        },

        speed: function () {
            return this._template.get("speed") + ((this.get("level") - 1) / 3 | 0);
        },

        maxExperience: function () {
            return this.get("level") * 12.5 | 0;
        },

        grantExperience: function (amount) {
            var level = this.get("level"),
                xp = this.get("experience") + amount,
                maxXp = this.maxExperience();
            while (xp >= maxXp) {
                xp -= maxXp;
                ++level;
                maxXp = this.maxExperience();
            }
            this.set("level", level);
        }
    }, {
        fromUnitTemplate: function (template) {
            var unit = new models.UnitInstance({
                template:   template.id,
                health:     template.get("health"),
                power:      template.get("power"),
                speed:      template.get("speed"),
                ability:    _.sample(template.get("abilities"))
            }, {
                UnitTemplate: template
            });
            return unit;
        }
    });

    models.UnitTeam = Backbone.Collection.extend({
        model: models.UnitInstance,

        addFromTemplate: function (template) {
            return this.add(models.UnitInstance.fromUnitTemplate(template));
        },

        listIds: function () {
            return this.map(this._model_to_object);
        },

        _model_to_object: function (model) {
            return {
                instance: model.id,
                template: model.get("template")
            };
        }
    }, {
        fromTemplates: function (templates) {
            var i = 0, len = templates.length,
                units = new models.UnitTeam();
            for (; i < len; ++i) {
                units.add(models.UnitInstance.fromUnitTemplate(templates[i]));
            }
            return units;
        }
    });


    /*{
        id,
        instance,
        template,
        type,
        health,
        maxHealth,
        power,
        speed,
        ability,
        effects
    }*/
    models.BattleUnit = Backbone.Model.extend({
        initialize: function (attr, options) {
            this._instance = options.UnitInstance;
            this._template  = options.UnitTemplate;
            this._ability   = options.AbilityTemplate;
            this._maxHealth = new models.Attribute({value: attr.maxHealth || this._instance.get("health")});
            this._power     = new models.Attribute({value: attr.power || this._instance.get("power")});
            this._speed     = new models.Attribute({value: attr.speed || this._instance.get("speed")});
            this._handlers  = [];
            this.set({
                template:   this._instance.get("template"),
                type:       this._template.get("type"),
                health:     attr.health || this._instance.get("health"),
                maxHealth:  this._maxHealth.actual(),
                power:      this._power.actual(),
                speed:      this._speed.actual(),
                ability:    this._instance.get("ability"),
                effects:    {}
            }, {silent: true});
            this.listenTo(this._maxHealth, "change", this.onMaxHealthChange);
            this.listenTo(this._power, "change", this.onPowerChange);
            this.listenTo(this._speed, "change", this.onSpeedChange);
        },


        plusHealth: function (amount) {
            var hp = this.get("health");
            this._maxHealth.plus(amount);
            if (hp > 0) {
                this.set("health", Math.min(hp + amount, this._maxHealth.actual()));
            }
            return this;
        },

        minusHealth: function (amount) {
            this._maxHealth.minus(amount);
            this.set("health", Math.min(this._maxHealth.actual(), this.get("health")));
            return this;
        },

        plusPower: function (amount) {
            this._power.plus(amount);
            return this;
        },

        minusPower: function (amount) {
            this._power.minus(amount);
            return this;
        },

        plusSpeed: function (amount) {
            this._speed.plus(amount);
            return this;
        },

        minusSpeed: function (amount) {
            this._speed.minus(amount);
            return this;
        },


        damage: function (amount, type) {
            type = type || "?";
            amount = ((models.UnitType[this.get("type")])(type))(amount);
            this.set("health", Math.max(0, this.get("health") - amount));
            this.trigger("battleunit:damage", this, amount, type);
            return amount;
        },

        heal: function (amount) {
            this.set("health", Math.min(this._maxHealth.actual(), this.get("health") + amount));
            this.trigger("battleunit:heal", this, amount);
            return amount;
        },

        kill: function () {
            this.set("health", 0);
            this.trigger("battleunit:death", this);
        },


        /*addEffect = function (effect) {
            var prev = this._effects[effect.group];
            if (prev) {
                return false;
            }
            this._effects[effect.group] = effect;
            return true;
        },

        removeEffect = function (effect) {
            var prev = this._effects[effect.group];
            delete this._effects[effect.group];
            return !!prev;
        },*/

        isAlive: function () {
            return this.get("health") > 0;
        },


        onMaxHealthChange: function (attr, options) {
            this.set("maxHealth", options.actual);
        },

        onPowerChange: function (attr, options) {
            this.set("power", options.actual);
        },

        onSpeedChange: function (attr, options) {
            this.set("speed", options.actual);
        },

        toJSON: function () {
            var json = Backbone.Model.prototype.toJSON.apply(this);
            json.maxHealth = this._maxHealth.toJSON();
            json.power = this._power.toJSON();
            json.speed = this._speed.toJSON();
            return json;
        }
    }, {
        fromUnitInstance: function (unit, abilities) {
            var battleUnit = new models.BattleUnit({
                id:         "BU" + unit.cid,
                instance:   unit.id,
                template:   unit.get("template"),
                type:       unit._template.get("type"),
                health:     unit.get("health"),
                maxHealth:  unit.get("health"),
                power:      unit.get("power"),
                speed:      unit.get("speed"),
                ability:    unit.get("ability"),
                effects:    {}
            }, {
                UnitTemplate: unit._template,
                UnitInstance: unit,
                AbilityTemplate: abilities.get(unit.get("ability")) || null
            });
            return battleUnit;
        }
    });


    /*
    active unit is always at index 0
    */

    models.BattleTeam = Backbone.Collection.extend({
        model: models.BattleUnit,

        initialize: function () {
            this._dead = [];
        },


        getActive: function () {
            return this.at(0);
        },

        getAtLeft: function (unit) {
            if (!unit) return this.last();
            var i = this.indexOf(unit);
            return i < 0 ? null : this.at((i - 1 + this.length) % this.length);
        },

        getAtRight: function (unit) {
            if (!unit) return this.at(1);
            var i = this.indexOf(unit);
            return i < 0 ? null : this.at((i + 1) % this.length);
        },

        canRotate: function () {
            return this.length > 1;
        },

        rotateLeft: function () {
            var a = this.models,
                m = a.shift();
            a.push(m);
            this.trigger("battleteam:rotate", this, this.at(0), m);
            this.trigger("battleteam:rotate:left", this, this.at(0), m);
            return this;
        },

        rotateRight: function () {
            var a = this.models,
                m = a.pop();
            a.unshift(m);
            this.trigger("battleteam:rotate", this, m, this.at(1));
            this.trigger("battleteam:rotate:right", this, m, this.at(1));
            return this;
        },

        isAlive: function () {
            return this.length > 0;
        },

        kill: function (i) {
            var m = this.remove(this.at(i));
            this._dead.push(m);
            m.kill();
            return this;
        },

        cleanup: function () {
            var dead = this.filter(this._predicate_isDead),
                i = dead.length;
            while (i--) this._dead.push(dead[i]);
            this.remove(dead);
            return this;
        },

        _predicate_isDead: function (m) {
            return !m.isAlive();
        }
    }, {
        fromUnitTeam: function (team, abilities) {
            var i = 0, len = team.length,
                battleTeam = new models.BattleTeam();
            for (; i < len; ++i) {
                battleTeam.add(models.BattleUnit.fromUnitInstance(team.at(i), abilities));
            }
            return battleTeam;
        }
    });


    ////////////////////////////////////////////////////////////////////////////

    /*{
        id,
        name,
        description,
        effects: [{
            mechanic,
            events,
            targets,
            parameters
        }]
    }*/
    models.AbilityTemplate = Backbone.Model.extend({});

    models.AbilityCollection = Backbone.Collection.extend({
        model: models.AbilityTemplate,

        url: "data/abilities.json"
    });



    ////////////////////////////////////////////////////////////////////////////

    models.Attribute = function (params) {
        params = params || {};
        // Unmodified value
        this._value = params.value || 0;
        // Attribute bonus
        this._bonus = params.bonus || 0;
        // Actual value: value + bonus
        this._actual = Math.max((this._value + this._bonus) | 0, 0);
    };

    models.Attribute.prototype = Object.create(null);
    _.extend(models.Attribute.prototype, Backbone.Events);

    models.Attribute.prototype.value = function (value) {
        if (!arguments.length) { return this._value; }
        this._value = value;
        return this._update();
    };

    models.Attribute.prototype.bonus = function (bonus) {
        if (!arguments.length) { return this._bonus; }
        this._bonus = bonus;
        return this._update();
    };

    models.Attribute.prototype.actual = function () {
        return this._actual;
    };

    models.Attribute.prototype.plus = function (amount) {
        this._bonus += amount;
        return this._update();
    };

    models.Attribute.prototype.minus = function (amount) {
        this._bonus -= amount;
        return this._update();
    };

    models.Attribute.prototype._update = function () {
        var previous = this._actual;
        this._actual = Math.max((this._value + this._bonus) | 0, 0);
        this.trigger("change", this, {actual: this._actual, previous: previous});
        return this;
    };

    models.Attribute.prototype.toJSON = function () {
        return {
            value: this._value,
            bonus: this._bonus
        };
    };


    ////////////////////////////////////////////////////////////////////////////

    models.UnitType = {
        BEAST: function (attackingType) {
            switch (attackingType) {
                case "MECHANICAL": return models.Multiplier.PLUS;
                case "HUMANOID": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        CRITTER: function (attackingType) {
            switch (attackingType) {
                case "BEAST": return models.Multiplier.PLUS;
                case "ELEMENTAL": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        MECHANICAL: function (attackingType) {
            switch (attackingType) {
                case "ELEMENTAL": return models.Multiplier.PLUS;
                case "MAGIC": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        HUMANOID: function (attackingType) {
            switch (attackingType) {
                case "UNDEAD": return models.Multiplier.PLUS;
                case "CRITTER": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        DRAGONKIN: function (attackingType) {
            switch (attackingType) {
                case "HUMANOID": return models.Multiplier.PLUS;
                case "FLYING": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        MAGIC: function (attackingType) {
            switch (attackingType) {
                case "DRAGONKIN": return models.Multiplier.PLUS;
                case "AQUATIC": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        ELEMENTAL: function (attackingType) {
            switch (attackingType) {
                case "AQUATIC": return models.Multiplier.PLUS;
                case "MECHANICAL": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        AQUATIC: function (attackingType) {
            switch (attackingType) {
                case "FLYING": return models.Multiplier.PLUS;
                case "UNDEAD": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        FLYING: function (attackingType) {
            switch (attackingType) {
                case "MAGIC": return models.Multiplier.PLUS;
                case "BEAST": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        UNDEAD: function (attackingType) {
            switch (attackingType) {
                case "CRITTER": return models.Multiplier.PLUS;
                case "DRAGONKIN": return models.Multiplier.MINUS;
                default: return models.Multiplier.NORMAL;
            }
        },
        GRASS: function (attackingType) {
            return models.Multiplier.NORMAL;
        },
        NORMAL: function (attackingType) {
            return models.Multiplier.NORMAL;
        }
    };


    models.Multiplier = {
        // x1
        NORMAL: function (damage) { return damage; },
        // -33%
        MINUS:  function (damage) { return (damage - (damage / 3)) | 0; },
        // +50%
        PLUS:   function (damage) { return (damage + (damage / 2)) | 0; }
    };


    window.Game.state = new models.GameState();
})();