define([
  // Libs
  "jquery",
  "use!underscore",
  "use!backbone",

  //plugins
  "use!plugins/backbone-relational",
  "use!plugins/backbone-localstorage"
],

function($, _, Backbone) {
  // Put application wide code here

  return {
    // This is useful when developing if you don't want to use a
    // build process every time you change a template.
    //
    // Delete if you are using a different template loading method.
    fetchTemplate: function(path, done) {
      var JST = window.JST = window.JST || {};

      // Should be an instant synchronous way of getting the template, if it
      // exists in the JST object.
      if (JST[path]) {
        return done(JST[path]);
      }

      // Fetch it asynchronously if not available from JST 
      return $.get(path, function(contents) {
        var tmpl = _.template(contents);

        // Set the global JST cache and return the template
        done(JST[path] = tmpl);
      }, "text");
    },

    // Create a custom object with a nested Views object
    module: function(additionalProps) {
      return _.extend({ Views: {} }, additionalProps);
    },

    // Some global dom helpers
    dom_helpers: {
      //input div
      ID: function() {
        return $('<div />').addClass('input');
      },
      //clear fix
      CF: function() {
          return $('<div />').addClass('clearfix');
      }
    },

    // Keep active application instances namespaced under an app object.
    app: _.extend({}, Backbone.Events)
  };
});
