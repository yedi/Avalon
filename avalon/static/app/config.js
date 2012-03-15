// Set the require.js configuration for your application.
require.config({
  // Initialize the application with the main application file
  deps: ["main"],

  paths: {
    // JavaScript folders
    libs: "../assets/js/libs",
    plugins: "../assets/js/plugins",

    // Libraries
    jquery: "../assets/js/libs/jquery",
    underscore: "../assets/js/libs/underscore",
    backbone: "../assets/js/libs/backbone",
    backbone_relational: "../assets/js/libs/backbone-relational",
    backbone_localstorage: "../assets/js/libs/backbone-localstorage",

    // Shim Plugins
    use: "../assets/js/plugins/use",
    text: "../assets/js/plugins/text"
  },

  use: {
    backbone: {
      deps: ["use!underscore", "jquery", "use!backbone_relational"],
      attach: "Backbone"
    },

    backbone_relational: {
      deps: ["use!backbone"]
    },

    underscore: {
      attach: "_"
    }
  }
});
