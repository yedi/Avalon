define(['underscore', 'backbone'], function(_, Backbone) {
  var RelationModel = Backbone.Model.extend({

    // Default attributes for the todo.
    defaults: {
      //child and parent are references to item models
      parent: null,
      child: null,
      linked_by: "undefined user"
      upvotes: 0,
      downvotes: 0
    }
  });
  return RelationModel;
});
