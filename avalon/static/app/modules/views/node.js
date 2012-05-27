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
  'text!templates/node.html',
  "modules/views/child",
  ], 
  function($, _, Backbone, nodeTemplate, ChildView){
  var NodeView = Backbone.View.extend({

    tagName:  "span",
    className: "node",
    id: -1,

    // Cache the template function for a single item.
    template: _.template(nodeTemplate),

    // The DOM events specific to an item.
    events: {
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render');
      this.model.on('change', this.render);
      this.model.on('update:child', this.render);

      this.id = "n_" + this.model.id;
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).attr('id', this.id);
      if (this.model.get('loaded') === false || !this.model.get('child')) {
        // this.model.set('loaded', false);
        $(this.el).html('Loading...');
        this.trigger('needCompleteRel', this.model.id, this.model);
        return this;
      }
      $(this.el).html(this.template(this.model.toJSON()));
      

      this.model.get('child').on('change', this.render);
      //cl is the children list for an item
      var $cl = $("<ul />")
          .addClass('children')
          .attr("id", "cl_" + this.model.id);

      //if the rel hasn't been loaded yet, don't try to render the branches
      if (!this.model.get('child').get('children_loaded')) {
        $cl.html('Loading...');
        $(this.el).append($cl); 
        this.trigger('needChildren', this.model.get('child'));
        return this;
      }

      this.model.get('child').get("child_rels").each(function(rel, index) {
        var child = new ChildView({ model: rel});
        //child.on('needCompleteRel', self.needCompleteRel, self);
        $cl.append(child.render().el);
      });

      $(this.el).append($cl);

      return this;
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return NodeView;
});
