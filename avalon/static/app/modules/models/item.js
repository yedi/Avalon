define(['underscore', 'backbone'], function(_, Backbone) {
  var ItemModel = Backbone.Model.extend({

    // Default attributes for the todo.
    defaults: {
      body: "empty item...",
      user: "undefined user",
      tags: ["empty item"]
      //tldr: "A TLDR" doesn't need to be defined

      /* For future implementations
      upvotes: 0,
      downvotes: 0,
      */
    }
  });
  return ItemModel;
});
