define([
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/slideDisplay.html',
  "modules/views/node",
  "modules/views/child",
  "modules/collections/rels"
  ], 
  function($, _, Backbone, sdTemplate, NodeView, ChildView, Rels){
  var SlideDisplay = Backbone.View.extend({

    tagName:  "div",
    id: "slides-container",

    // Cache the template function for a single item.
    template: _.template(sdTemplate),

    // The DOM events specific to an item.
    events: {
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      $(this.el).html(this.template());
      this.ren_num = 0;

      _.bindAll(this, 'addOne', 'render');

      this.collection.bind('add',     this.addOne);
      this.collection.bind('all',     this.render);
    },

    // Re-rendering only updates the browse history
    render: function() {
      this.ren_num += 1;
      $(this.el).find('#browse-history').html('rendered+' + this.ren_num);
      return this;
    },

    addOne: function(rel) {
      if (this.collection.length == 0) {
        new_node_el = $('#parent-node');
      }
      else if (this.collection.length == 1) {
        new_node_el = $('#child-node');
      }
      else {
        new_node_el = $('<span />').addClass('span8 node-slide');
      }
      new_node_el = createNodeEl(new_node_el, rel);
    },

    createNodeEl: function(ele, rel) {
      var node = new NodeView({ model: rel });      
      ele.html( node.render().el );

      var rel_child = rel.get("child");

      var cl = $("<ul />")
          .attr("id", "cl_" + rel.id);

      rel_child.get("child_rels").each(function(rel, index) {
        var child = new ChildView({ model: rel});
        cl.append(child.render().el);
      });

      var children_el = $("<span />")
          .addClass("children")
          .append(cl);

      ele.append(children_el);
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return NodeView;
});
