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
    currentPosition: 0,
    slideWidth: 480,

    // Cache the template function for a single item.
    template: _.template(sdTemplate),

    // The DOM events specific to an item.
    events: {
      'click .history-link': 'moveToH'
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      $(this.el).css('overflow', 'hidden');

      this.collection = new Rels();
      $(this.el).html(this.template());
      this.ren_num = 0;

      _.bindAll(this, 'addOne', 'render');

      this.collection.bind('add',     this.addOne);
      this.collection.bind('all',     this.render);
    },

    // Re-rendering only updates the browse history
    render: function() {
      this.ren_num += 1;
      el = this.el;
      $(el).find('#browse-history').html('');
      this.collection.each(function(rel, pos) {
        var history_link = $('<a />')
            .addClass('history-link')
            .attr('href', '#')
            .attr('onClick', 'return false;')
            .attr('id', 'hl-' + pos)
            .text(rel.get('child').get('tldr'));

        if (pos === this.currentPosition) {
          history_link.css('font-weight', 'bold');
        }

        $(el).find('#browse-history').append(' ', history_link, ' |');
        history_link.bind
      });
      // $(this.el).find('#browse-history').html('rendered+' + this.ren_num);
      return this;
    },

    addOne: function(rel) {
      if (this.collection.length == 1) {
        new_node_el = this.createNodeEl($('#parent-node'), rel);
        return;
      }
      else if (this.collection.length == 2) {
        new_node_el = this.createNodeEl($('#child-node'), rel);
        return;
      }

      $(this.el).find('#slideInner').css('width', this.slideWidth * this.collection.length + 1);
        
      new_node_el = $('<span />').addClass('span8 node-slide');
      new_node_el = this.createNodeEl(new_node_el, rel);
      $(this.el).find('#slideInner').append(new_node_el);

      /*
      var history_link
      $(this.el).find('#browse-history').append(' | <a>' + rel.child.tldr);
      */

      this.currentPosition += 1;
      this.moveTo();
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
      return ele;
    },

    moveTo: function(pos) {
      if (arguments.length < 1) pos = this.currentPosition;
      if (pos >= this.collection.length) pos = this.collection.length -1;

      $(this.el).find('#slideInner').animate({'marginLeft' : -20 + this.slideWidth*(-pos)});
      this.render();
    },

    moveToH: function (e) {
      var num = parseInt($(e.currentTarget).attr('id').split('-')[1], 10)
      this.moveTo(num);
    },

    pop: function(index) {
      var col = this.collection;
      if (arguments.length < 1) index = col.length - 1;
      rest = col.rest(index);
      _.each(rest, function(rel) {
        $(this.el).find('#n_' + rel.get('id')).parent().remove();
      });
      col.remove(rest);
      if (this.currentPosition >= rest.length) this.currentPosition = this.collection.length - 2;
      this.moveTo();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return SlideDisplay;
});
