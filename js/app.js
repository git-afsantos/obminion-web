/*
README TODO

The idea is to have modular components, and this script will be the glue between them.

This script should be included first, to define window.Game.
Other modules register themselves on window.Game.
When the document is ready, grab window.Game and delete the global.

Other modules will essentially use Backbone.Events to communicate.

The views will be hierarchical: BattleView -> (BattlePanel, BattleCircle, ActionBar)

This script creates the views with the document nodes, and 
the models from the battle engine.
Then, it creates the animation manager, passing it the views to manage.

When the battle starts, the engine will fire events, which will be bound
to functions of the animation manager, by this script.
*/

(function () {
    "use strict";
    var idGen = 1, Game;

    window.Game = {
        data: {
            species: null,
            instances: null,
            abilities: null
        },
        Models: {},
        Views: {}
    };
    Game = window.Game;

    $(document).ready(function () {
        var view,
            BattleEngine = Game.BattleEngine,
            Views = Game.Views;

        delete window.Game;
        
        /*
        var $nots = $("#battle-notifications");
        $("#battle-button-attack").click(function (e) {
            var $li = $("<li class=\"notification\">Something happened.</li>");
            $nots.append($li);
            window.setTimeout(function () {
                $li.addClass("show");
                window.setTimeout(function () {
                    $li.removeClass("show");
                    window.setTimeout(function () {
                        $li.remove();
                    }, 1000);
                }, 5000);
            }, 10);
            //$("#battle-action-bar").addClass("invisible");
        });
        */



        /*
        - create units and teams (normal and battle)
        - battle engine is already created
        - create views
        - assign battle engine to battle view
        - when battle starts, assign each team to each team view
        */


        //Game.data.species = new Game.Models.SpeciesCollection();
        Game.data.instances = new Game.Models.UnitTeam();
        //Game.data.abilities = new Game.Models.AbilityCollection();
        view = new Views.BattleArea({model: BattleEngine});
        window.setTimeout(function () {
            createBattle(BattleEngine);
        }, 500);
    });


    function createBattle(engine) {
        engine.createBattle(new Game.Models.BattleTeam(newPlayer().listIds(), {id: "player"}),
                           new Game.Models.BattleTeam(newOpponent().listIds(), {id: "opponent"}));
        engine.computeStep();
    }


    function newPlayer() {
        return new Game.Models.UnitTeam([
            {
                id: idGen++,
                template: 2,
                level: 1
            },
            {
                id: idGen++,
                template: 3,
                level: 1
            },
            {
                id: idGen++,
                template: 4,
                level: 1
            },
            {
                id: idGen++,
                template: 5,
                level: 1
            }
        ]);
    }

    function newOpponent() {
        return new Game.Models.UnitTeam([
            {
                id: idGen++,
                template: 1,
                level: 1
            },
            {
                id: idGen++,
                template: 1,
                level: 1
            }
        ]);
    }
})();


(function () {
    "use strict";

    /* Sample usage:
    var sm = new StateMachine();
    sm.state(0, function () { return 1; }).
        state(1, function () { return 2; }).
        state(2, function () { return 0; }).
        state(0);

    do {
        console.log(sm.compute());
    } while (sm.state());
    */

    function StateMachine () {
        this.current = null;
        this.states = {};
    }

    StateMachine.prototype = {
        // f performs the state's actions and returns the next state
        state: function (state, f) {
            if (!arguments.length) return this.current;
            if (!f) this.current = state;
            else this.states[state] = f;
            return this;
        },

        remove: function (state) {
            delete this.states[state];
            return this;
        },

        compute: function (context) {
            return this.current = this.states[this.current].apply(context,
                Array.prototype.slice.call(arguments, 1));
        }
    };

    window.Game.StateMachine = StateMachine;
})();
