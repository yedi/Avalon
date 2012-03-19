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
 *
 */
define([
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/node.html'
  ], 
  function($, _, Backbone, nodeTemplate){
  var NodeView = Backbone.View.extend({

    tagName:  "span",
    className: "node",

    // Cache the template function for a single item.
    template: _.template(nodeTemplate),

    // The DOM events specific to an item.
    events: {
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      this.id = "n_" + this.model.id;

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
  return NodeView;
});
