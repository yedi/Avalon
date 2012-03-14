/* ************** QUESTIONS *********************
  1)
  So the template() function takes a json file and returns the html for template with the json file. If I wanted to have
  elements from 2 different kinds of models, would I have to create a json object that combined to the two model objects json? 
  Or would it be better to create a model that got it's information from models from two different collections?

  I'm sure I can do it either way, but which is simpler/better? Merging to json objects seem like the simplest thing to do, 
  however what abouts like both item and rel having an id field? I can merge the json by appending each attribute with it's type,
  i.e. item-id an rel-id. More code but would make this idea work. If i'm already doing that tho, i might as well make a new model? idk

  2)
  Can I make the template() function just return the compiled html without specifiying a tagname or element?

  3) 
  so my view has attributes rel_model and item_model. I want to be able to give my view those models on creation. 
  How do i do this? I think I need to give the view an initialize method, but I'm not sure where to go from there 
*/

/*
 * In order to define a node view, you must give it an item-model and a rel-model,
 *
 */
define([
  'jquery', 
  'underscore', 
  'backbone',=
  'text!templates/node.html'
  ], function($, _, Backbone, nodeTemplate){
  var NodeView = Backbone.View.extend({

    tagName:  "span",
    className: "node",
    root: false,
    /*
      rel_model;
      item_model;
    */

    // Cache the template function for a single item.
    template: _.template(todosTemplate),

    // The DOM events specific to an item.
    events: {
      "click .check"              : "toggleDone",
      "dblclick div.todo-content" : "edit",
      "click span.todo-destroy"   : "clear",
      "keypress .todo-input"      : "updateOnEnter",
      "blur .todo-input"          : "close"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Todo** and a **TodoView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render');
      this.rel_model.bind('change', this.render);
      this.item_model.bind('change', this.render);
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.input = this.$('.todo-input');
      return this;
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      this.model.save({content: this.input.val()});
      $(this.el).removeClass("editing");
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return TodoView;
});
