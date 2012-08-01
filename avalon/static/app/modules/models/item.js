define([
  'namespace',

  'use!underscore', 
  'use!backbone'
], 
function(namespace, _, Backbone) {
  var ItemModel = Backbone.RelationalModel.extend({

    // Default attributes for the todo.
    defaults: {
      body: "empty item...",
      user: "undefined user",
      tags: ["empty item"],
      display_tldr: "",
      children_loaded: false
      //tldr: "A TLDR" doesn't need to be defined
      /* these are relational RelModels defined in models/rel.js
      child_rels;
      parent_rels;
      */

      /* For future implementations
      upvotes: 0,
      downvotes: 0,
      */
    },

    set_display_tldr: function(len) {
      if (this.get('tldr')) {
        this.set('display_tldr', this.get('tldr'));
        return;
      }
      this.set('display_tldr', this.get('body').substr(0, len));
    },

    checkIfRoot: function() {
      //check for root node
      if (this.get('tldr') === '_root_title_') {
        this.set('tldr', 'Welcome to Avalon');
        this.set('body', "Avalon is a place for collaborating with each other to solve our world's problems. Browse through the discussion and feel free to contribute.");
      }
    },

    initialize: function() {
      this.checkIfRoot();
      this.set_display_tldr(48);
      this.on('updateTldr', this.set_display_tldr, this);
      this.on('change', this.checkIfRoot, this);
    }
  });
  return ItemModel;
});
