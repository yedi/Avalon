define([
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/slideDisplay.html',
  "modules/views/node",
  "modules/views/child",
  // "modules/models/rel"
  'static/app/modules/models/rel.js',
  "modules/collections/rels"
], 
function($, _, Backbone, sdTemplate, NodeView, ChildView, RelModel, Rels){
  var SlideDisplay = Backbone.View.extend({

    tagName:  "div",
    id: "slides-container",
    currentPosition: 0,
    slideWidth: 480,

    // Cache the template function for a single item.
    template: _.template(sdTemplate),

    // The DOM events specific to an item.
    events: {
      'click .history-link': 'moveToH',
      'click .child-link': 'displayBranch'
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
      $(el).find('#browse-history').html('curpos: ' + this.currentPosition);
      this.collection.each(function(rel, pos) {
        if (rel.get('loaded') === false || !rel.get('child')) {
          var disp_text = "Loading..."
        }
        else {
          var disp_text = rel.get('child').get('display_tldr');
        }
        var history_link = $('<a />')
            .addClass('history-link')
            .attr('href', '#')
            .attr('onClick', 'return false;')
            .attr('id', 'hl-' + pos)
            .text(disp_text);

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
      $(this.el).find('#slideInner').css('width', this.slideWidth * this.collection.length + 1);
        
      new_node_el = $('<span />').addClass('span8 node-slide');
      new_node_el = this.createNodeEl(new_node_el, rel);
      $(this.el).find('#slideInner').append(new_node_el);

      if (this.collection.length > 1) this.currentPosition = this.collection.length-2;
      else this.currentPosition = 0;
      this.moveTo();
    },

    createNodeEl: function(ele, rel) {
      var node = new NodeView({ model: rel });
      node.on('needCompleteRel', this.needCompleteRel, this);
      node.on('needChildren', this.needChildren, this);

      ele.html( node.render().el );
      return ele;
    },

    needCompleteRel: function(model_id, model) {
      this.trigger('needCompleteRel', model_id, model);
    },

    needChildren: function(item) {
      this.trigger('needChildren', item);
    },

    moveTo: function(pos) {
      if (arguments.length < 1) pos = this.currentPosition;
      if (pos < 0) pos = 0;
      if (pos >= this.collection.length) pos = this.collection.length -1;

      $(this.el).find('#slideInner').animate({'marginLeft' : -20 + this.slideWidth*(-pos)});
      this.render();
    },

    moveToH: function (e) {
      var num = parseInt($(e.currentTarget).attr('id').split('-')[1], 10);
      this.moveTo(num);
    },

    displayBranch: function(e) {
      var $ele = $(e.currentTarget);
      var col = this.collection;
      var branch_id = $ele.attr('id').split('_')[1];

      //if this rel exists on the branch history, just move the current view to the position of that rel.
      var branch_rel = col.get(branch_id)
      if (branch_rel !== undefined) {
        var pos = col.indexOf(branch_rel);
        this.moveTo(pos-1);
        //alert('on branch history');
        return;
      }
      
      var parent_rel_id = $ele.parents('.children').attr('id').split('_')[1];
      var pos = col.indexOf(col.get(parent_rel_id));
      this.currentPosition = pos;
      this.pop(pos + 1);

      empty_model = new RelModel({id: branch_id})
      col.add(empty_model);
      // col.add({loaded: false, id: branch_id, parent: 'empty', child: 'empty'});
      // this.trigger('needCompleteRel', branch_id, empty_model);
    },

    /**
     * Removes all the rels at the index and to the end of the list from the dom and the collection 
     */
    pop: function(index) {
      var col = this.collection;
      if (arguments.length < 1) index = col.length - 1;
      rest = col.rest(index);
      _.each(rest, function(rel) {
        $(this.el).find('#n_' + rel.get('id')).parent().remove();
      });
      col.remove(rest);
      if (this.currentPosition >= this.collection.length) this.currentPosition = this.collection.length - 2;
      this.moveTo();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return SlideDisplay;
});
