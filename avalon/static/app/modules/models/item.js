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

    initialize: function() {
      this.set_display_tldr(48);
    }
  });
  return ItemModel;
});
