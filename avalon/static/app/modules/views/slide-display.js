define([
  'namespace',
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/slideDisplay.html',
  "modules/views/node",
  "modules/views/child",
  // "modules/models/rel"
  'modules/models/rel',
  "modules/collections/rels"
], 
function(namespace, $, _, Backbone, sdTemplate, NodeView, ChildView, RelModel, Rels){
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
      'click .child-link': 'clickBranch'
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      $(this.el).css('overflow', 'hidden');

      this.collection = new Rels();
      $(this.el).html(this.template());
      this.ren_num = 0;

      _.bindAll(this, 'render');

      this.collection.bind('add',     this.addOne);
      this.collection.bind('all',     this.render);
      namespace.app.on('redelegateEvents', this.delegateEvents, this);
      namespace.app.on('relDeleted', this.handleRelDeleted, this);
      namespace.app.on('editedItem', this.render);
    },

    // Re-rendering only updates the browse history
    render: function() {
      this.ren_num += 1;
      el = this.el;
      //$(el).find('#browse-history').html('curpos: ' + this.currentPosition);
      $(el).find('#browse-history').html('');
      this.collection.each(function(rel, pos) {
        if (rel.get('loaded') === false || !rel.get('child')) {
          var disp_text = "Loading...";
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

        $(el).find('#browse-history').append(' ', history_link, ' >');
        history_link.bind
      });
      // $(this.el).find('#browse-history').html('rendered+' + this.ren_num);
      return this;
    },

    addSlides: function(rels) {
      rels = _.isArray(rels) ? rels.slice() : [rels];
      self = this;
      _.each(rels, function(rel) { self.addSlide(rel, false); })
    },

    addSlide: function(rel, animate) {
      if (arguments < 2) {
        animate = true;
      }
      this.collection.add(rel);
      rel = this.collection.get(rel.id);
      $(this.el).find('#slideInner').css('width', this.slideWidth * this.collection.length + 1);
        
      var new_node_el = $('<span />').addClass('span8 node-slide');
      new_node_el = this.createNodeEl(new_node_el, rel);
      $(this.el).find('#slideInner').append(new_node_el);

      if(animate) {
        if (this.collection.length > 1) this.currentPosition = this.collection.length-2;
        else this.currentPosition = 0;
        this.moveTo();
      }
    },

    createNodeEl: function(ele, rel) {
      var node = new NodeView({ model: rel });
      ele.html( node.render().el );
      return ele;
    },

    needCompleteRel: function(model_id, model) {
      this.trigger('needCompleteRel', model_id, model);
    },

    needChildren: function(item) {
      this.trigger('needChildren', item);
    },

    postReply: function(item_id, reply_data) {
      this.trigger('postReply', item_id, reply_data);
    },

    moveTo: function(pos) {
      if (arguments.length < 1) pos = this.currentPosition;
      if (pos < 0) pos = 0;
      if (pos >= this.collection.length) pos = this.collection.length -1;

      $(this.el).find('#slideInner').animate({'marginLeft' : -20 + this.slideWidth*(-pos)});
      this.currentPosition = pos;
      this.render();
    },

    moveToH: function (e) {
      var num = parseInt($(e.currentTarget).attr('id').split('-')[1], 10);
      this.moveTo(num);
      return false;
    },

    clickBranch: function(e) {
      var $ele = $(e.currentTarget);
      var branch_id = $ele.attr('id').split('_')[1];
      var parent_rel_id = $ele.parents('.children').attr('id').split('_')[1];
      var col = this.collection;
      var pos = col.indexOf(col.get(parent_rel_id));
      this.displayBranch(branch_id, pos);

      //make the new url for pushstate
      var oldpath = document.location.pathname;
      if (oldpath.indexOf('/r/') === -1) {
        if (oldpath.charAt(oldpath.length-1) !== '/') oldpath += '/';
        oldpath += 'r/';
      }
      else oldpath = oldpath.substring(0, oldpath.lastIndexOf('/') + 1);

      var newpath = this.collection.reduce(function (pathstring, rel) {
        if (rel.id === 'root') return pathstring;
        if (pathstring === oldpath) return pathstring + rel.id;
        return pathstring + '-' +  rel.id
      }, oldpath);
      
      history.pushState({}, "", newpath);
      return false;
    },

    displayBranch: function(branch_id, pos) {
      if (arguments.length < 2) {
        pos = this.collection.length - 1;
      }

      var col = this.collection;
      //if this rel exists on the branch history, just move the current view to the position of that rel.
      var branch_rel = col.get(branch_id)
      if (branch_rel !== undefined) {
        var pos = col.indexOf(branch_rel);
        this.moveTo(pos-1);
        //alert('on branch history');
        return;
      }
      
      this.currentPosition = pos;
      this.pop(pos + 1);

      empty_model = new RelModel({id: branch_id})
      this.addSlide(empty_model);
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

    handleRelDeleted: function(rel_id) {
      var col = this.collection;
      var branch_rel = col.get(rel_id)
      if (branch_rel === undefined) return;

      var pos = col.indexOf(branch_rel);
      this.pop(pos);
      return;
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return SlideDisplay;
});
