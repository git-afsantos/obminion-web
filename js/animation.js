(function () {
    "use strict";

    function AnimationManager(battleView) {
        this.queue = [];
        this.battle = battleView;
        battleView.on("ui:animation:end", this.animate, this);
    }

    AnimationManager.prototype = Object.create(null);
    _.extend(AnimationManager.prototype, Backbone.Events);
    window.Game.AnimationManager = AnimationManager;


    AnimationManager.prototype.onBattleStart = function (teams) {
        this.queue.push({ animation: "animateIntro", teams: teams });
        //updateTeam(0, teams[0]);
        //updateTeam(1, teams[1]);
    }

    AnimationManager.prototype.onBattleAttack = function (sourceTeam, targetTeam) {
        this.queue.push({
            animation: "animateAttack",
            source: sourceTeam,
            target: targetTeam
        });
    };

    AnimationManager.prototype.onBattleHealthChange = function (teamIndex, unitIndex, amount, type) {
        this.queue.push({
            animation: "animateDamage",
            amount: amount,
            team: teamIndex,
            unit: unitIndex,
            type: type
        });
    };

    AnimationManager.prototype.onBattleRotation = function (teamIndex, clockwise, unitIndex) {
        this.queue.push({
            animation: "animateRotation",
            team: teamIndex,
            clockwise: clockwise,
            index: unitIndex
        });
    };

    AnimationManager.prototype.onBattleDeath = function (teamIndex, unitIndex) {
        this.queue.push({
            animation: "animateDeath",
            team: teamIndex,
            unit: unitIndex
        });
    };

    AnimationManager.prototype.onBattleTeamUpdate = function (teamIndex, team) {
        this.queue.push({
            animation: "animateUpdate",
            team: teamIndex,
            data: team
        });
    };


    AnimationManager.prototype.animate = function () {
        var a;
        if (this.queue.length == 0) {
            this.trigger("ui:animation:end");
        } else {
            a = this.queue.shift();
            if (a.animation in this) {
                this[a.animation](a);
            }
        }
    };

    AnimationManager.prototype.animateIntro = function (data) {
        this.battle.setTeams(data.teams[0], data.teams[1]);
        this.battle.trigger("ui:animation:end");
    };

    AnimationManager.prototype.animateAttack = function (data) {
        this.battle.attack(data.source, data.target);
        
        //$scope.status = data.source == 0 ? "Your " : "Enemy ";
        //$scope.status += $scope.players[data.source].battle.active.name;
        //$scope.status += " attacks ";
        //$scope.status += data.target == data.source ? "itself." : "its opponent.";
        //$timeout(animate, 1500);
    };

    AnimationManager.prototype.animateDamage = function (data) {
        this.battle.damage(data.team, data.unit, data.amount);
        //$scope.players[data.team].battle.units[data.unit].health += data.amount;
        //$scope.status = data.team == 0 ? "Your " : "Enemy ";
        //$scope.status += $scope.players[data.team].battle.units[data.unit].name;
        //if (data.amount > 0) {
            //$scope.status += " recovers " + data.amount + " damage.";
        //} else {
            //$scope.status += " takes " + (-data.amount) + " damage.";
        //}
        //$timeout(animate, 1500);
    };

    AnimationManager.prototype.animateRotation = function (data) {
        this.battle.rotate(data.team, data.clockwise);
        //var team = $scope.players[data.team].battle;
        //$scope.status = data.team == 0 ? "Your team rotates " : "The enemy team rotates ";
        //$scope.status += data.rotation == "right" ? "clockwise." : "counter-clockwise.";
        //team.index = data.index;
        //updateTeam(data.team, team);
        //$timeout(animate, 1500);
    };

    AnimationManager.prototype.animateDeath = function (data) {
        this.battle.death(data.team, data.unit);
        /*
        var team = $scope.players[data.team].battle;
        $scope.status = data.team == 0 ? "Your " : "Enemy ";
        $scope.status += $scope.players[data.team].battle.units[data.unit].name;
        $scope.status += " dies.";
        if (team.index == data.unit) {
            team.active = emptyUnitData;
        } else if (team.leftIndex == data.unit) {
            team.left = emptyUnitData;
        } else if (team.rightIndex == data.unit) {
            team. right = emptyUnitData;
        }
        $timeout(animate, 1500);
        */
    };

    AnimationManager.prototype.animateUpdate = function (data) {
        this.battle.update(data.team, data.data);
        /*
        if (data.team == 0) {
            $scope.status = "Your team steps into position.";
        } else {
            $scope.status = "The enemy team steps into position.";
        }
        updateTeam(data.team, data.data);
        $timeout(animate, 1500);
        */
    };
})();