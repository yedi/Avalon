define([
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/child.html'
  ], function($, _, Backbone, childTemplate){
  var ChildView = Backbone.View.extend({

    tagName:  "li",
    className: "child",

    // Cache the template function for a single item.
    template: _.template(childTemplate),

    // The DOM events specific to an item.
    events: {
    },

    // takes a rel for a model
    initialize: function() {
      this.id = "c_" + this.model.id;
      _.bindAll(this, 'render');
      this.model.bind('change', this.render);
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return ChildView;
});
