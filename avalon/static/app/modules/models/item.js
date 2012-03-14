define(['underscore', 'backbone'], function(_, Backbone) {
  var ItemModel = Backbone.Model.extend({

    // Default attributes for the todo.
    defaults: {
      body: "empty item...",
      user: "undefined user",
      /* For future implementations
      upvotes: 0,
      downvotes: 0,
      */
      tags: ["empty item"]
    }
  });
  return ItemModel;
});
