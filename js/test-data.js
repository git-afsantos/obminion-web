(function () {
    "use strict";

    window.Game.data.species = new window.Game.Models.SpeciesCollection([
        {
            id:         1,
            portrait:   "000",
            name:       "Test 0",
            type:       "BEAST",
            health:     20,
            power:      10,
            speed:      10,
            abilities:  [1]
        },
        {
            id:         2,
            portrait:   "001",
            name:       "Test 1",
            type:       "BEAST",
            health:     50,
            power:      8,
            speed:      10,
            abilities:  []
        },
        {
            id:         3,
            portrait:   "004",
            name:       "Test 2",
            type:       "BEAST",
            health:     36,
            power:      12,
            speed:      12,
            abilities:  []
        },
        {
            id:         4,
            portrait:   "007",
            name:       "Test 3",
            type:       "BEAST",
            health:     50,
            power:      10,
            speed:      8,
            abilities:  []
        },
        {
            id:         5,
            portrait:   "025",
            name:       "Test 3",
            type:       "BEAST",
            health:     32,
            power:      12,
            speed:      16,
            abilities:  []
        }
    ]);



    window.Game.data.abilities = new window.Game.Models.AbilityCollection([
        {
            id: 1,
            name: "Test Ability",
            description: "Does nothing special.",
            effects: [{
                mechanic: "log",
                events: ["friend:others battleunit:defend"],
                targets: [],
                parameters: {}
            }]
        }
    ]);
})();
