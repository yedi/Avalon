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
      tags: ["empty item"]
      //tldr: "A TLDR" doesn't need to be defined
      /* these are relational RelModels defined in models/rel.js
      child_rels;
      parent_rels;
      */

      /* For future implementations
      upvotes: 0,
      downvotes: 0,
      */
    }
  });
  return ItemModel;
});
