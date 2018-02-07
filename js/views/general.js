(function () {
    "use strict";
    /* global window:false, Backbone:false */

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
})();
