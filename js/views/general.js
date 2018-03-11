(function () {
    "use strict";
    /* global window:false, Backbone:false, _:false */

    var views = window.Game.Views;

    views.BaseView = Backbone.View.extend({
        visible: false,

        build: function () {
            return this;
        },

        show: function () {
            this.$el.show();
            this.visible = true;
            return this;
        },

        hide: function () {
            this.$el.hide();
            this.visible = false;
            return this;
        },

        onResize: function () {}
    });


    views.Preloader = Backbone.View.extend({
        id: "preloader",

        initialize: function (options) {
            this.loading = 0;
            this.listenTo(this.model, "request", this.onRequest);
            this.listenTo(this.model, "sync", this.onSync);
            this.listenTo(options.species, "request", this.onRequest);
            this.listenTo(options.species, "sync", this.onSync);
            this.listenTo(options.abilities, "request", this.onRequest);
            this.listenTo(options.abilities, "sync", this.onSync);
        },

        onRequest: function () {
            ++this.loading;
            if (this.loading === 1) this.$el.show();
        },

        onSync: function () {
            --this.loading;
            if (this.loading === 0) this.$el.hide();
        }
    });


    views.Modal = Backbone.View.extend({
        events: {
            "click .button-close":  "hide"
        },

        show: function () {
            this.$el.show();
            this.trigger("show", this);
            this.render();
            return this;
        },

        hide: function () {
            this.$el.hide();
            this.trigger("hide", this);
            return this;
        }
    });


    views.AnimatedView = Backbone.View.extend({
        events: {
            "animationend": "onAnimationEnd",
            "transitionend": "onAnimationEnd"
        },

        initialize: function () {
            _.bindAll(this, "animate", "endAnimation");
            this.animations = {/* name -> function */};
            this.animationQueue = [];
            this.currentAnimation = null;
            // all animations in the queue are supposed to be steps of an animation primitive
        },

        pushAnimation: function (animation) {
            var args = Array.prototype.slice.call(arguments, 1),
                fun = this.animations[animation];
            this.animationQueue.push(new Animation(animation, fun, args));
            return this;
        },

        unshiftAnimation: function (animation) {
            var args = Array.prototype.slice.call(arguments, 1),
                fun = this.animations[animation];
            this.animationQueue.unshift(new Animation(animation, fun, args));
            return this;
        },

        animate: function () {
            if (this.currentAnimation == null) {
                this.currentAnimation = this.animationQueue.shift();
                if (this.currentAnimation != null) {
                    this.currentAnimation.start(this);
                    this.trigger("animation:start", this);
                }
            }
            return this;
        },

        onAnimationEnd: function () {
            --this.currentAnimation.counter;
            if (this.currentAnimation.counter === 0) {
                this.endAnimation();
            }
            return false;
        },

        endAnimation: function () {
            this.currentAnimation.end(this);
            // proceed to the next animation step
            this.currentAnimation = this.animationQueue.shift();
            if (this.currentAnimation != null) {
                this.trigger("animation:step", this);
                this.currentAnimation.start(this);
            } else {
                this.trigger("animation:end", this);
            }
            /*
            this.currentAnimation = null;
            if (this.animationQueue.length > 0) {
                // Not sure if this stays here or moves up to the caller.
                window.setTimeout(this.animate, 0);
            }*/
        },

        fakeAnimation: function () {
            window.setTimeout(this.endAnimation, 0);
        }
    });


    function Animation(name, fn, args) {
        this.animation = name;
        this.animationFunction = fn;
        this.arguments = args;
        this.started = false;
        this.counter = 0;
        this.callback = null;
        this.done = false;
    }

    Animation.prototype = Object.create(null);

    Animation.prototype.start = function (ctx) {
        this.started = true;
        return this.animationFunction.apply(ctx, this.arguments);
    };

    Animation.prototype.end = function (ctx) {
        this.done = true;
        if (this.callback != null) {
            return this.callback.call(ctx);
        }
    };
})();
