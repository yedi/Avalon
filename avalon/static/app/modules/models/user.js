define(['underscore', 'backbone'], function(_, Backbone) {
  var UserModel = Backbone.Model.extend({

    // Default attributes for the todo.
    defaults: {
      name: "undefined user",
      email: "empty email"
    }
  });
  return UserModel;
});
