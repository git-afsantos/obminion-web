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
    /* global window:false, Backbone:false, $:false, document:false */
    var Game;

    window.Game = {
        data: {
            species: null,
            instances: null,
            abilities: null
        },
        Models: {},
        Views: {},
        state: null,
        view: null,
        startView: null,
        mainView: null,
        battleView: null,
        teamView: null,
        researchView: null
    };
    Game = window.Game;

    $(document).ready(function () {
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

        //Game.state = new Game.Models.GameState();
        //Game.data.species = new Game.Models.SpeciesCollection();
        //Game.data.instances = new Game.Models.UnitTeam();
        //Game.data.abilities = new Game.Models.AbilityCollection();

        bootstrapViews();

        // $(window).resize(_.debounce(onResize, 100));
        Backbone.history.start();
        //BattleEngine.trigger("request", BattleEngine);
        Game.state.species.fetch();
        Game.state.abilities.fetch();
        //BattleEngine.trigger("sync", BattleEngine);

        $("#start-button").on("click", function () {
            Game.state.createCollection();
            Game.state.set("status", "idle");
            Game.router.navigate("home", { trigger: true, replace: true });
        });
    });


    function bootstrapViews() {
        Game.preloader = new Game.Views.Preloader({
            el: $("#preloader"),
            model: Game.BattleEngine,
            species: Game.state.species,
            abilities: Game.state.abilities
        });
        Game.startView = new Game.Views.BaseView({
            el: $("#start-screen")
        });
        Game.mainView = new Game.Views.HomeView({
            el: $("#main-menu"),
            model: Game.state,
            router: Game.router
        });
        Game.battleView = new Game.Views.BattleView({
            el: $("#battle-scene"),
            model: Game.BattleEngine,
            state: Game.state
        });
        Game.teamView = new Game.Views.TeamView({
            el: $("#team-menu"),
            model: Game.state,
            router: Game.router
        });
        Game.researchView = new Game.Views.BaseView({
            el: $("#research-menu")
        });
        Game.mainView.hide();
        Game.battleView.hide();
        Game.teamView.hide();
        Game.researchView.hide();
    }
}());


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
}());
