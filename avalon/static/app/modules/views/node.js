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
  'namespace',
  'jquery', 
  'use!underscore', 
  'use!backbone',
  'text!templates/node.html',
  'text!templates/node_reply.html',
  "modules/views/child",
  ], 
  function(namespace, $, _, Backbone, nodeTemplate, nrTemplate, ChildView){
  var NodeView = Backbone.View.extend({

    tagName:  "span",
    className: "node",
    id: -1,

    // Cache the template function for a single item.
    template: _.template(nodeTemplate),

    nrTemplate: _.template(nrTemplate),

    // The DOM events specific to an item.
    events: {
      'click .post-button': 'toggleReplyDiv',
      'click .pr-button': 'submitPost',
      'click .mi-button': 'toggleMoreDiv'
    },

    // The NodeView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Node** and a **NodeView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render');
      this.model.on('change', this.render);
      this.model.on('update:child', this.render);
      namespace.app.on('postedReply', this.render, this);
      namespace.app.on('redelegateEvents', this.delegateEvents, this);

      this.id = "n_" + this.model.id;
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).attr('id', this.id);
      if (this.model.get('loaded') === false || !this.model.get('child')) {
        // this.model.set('loaded', false);
        $(this.el).html('Loading...');
        namespace.app.trigger('needCompleteRel', this.model.id, this.model);
        return this;
      }
      $(this.el).html(this.template(this.model.toJSON()));
      //$(this.el).parent().find('.children').remove();

      this.model.get('child').on('change', this.render);
      //cl is the children list for an item
      var $cl = $("<ul />")
          .addClass('children')
          .attr("id", "cl_" + this.model.id);

      //if the rel hasn't been loaded yet, don't try to render the branches
      if (!this.model.get('child').get('children_loaded')) {
        $cl.html('Loading...');
        $(this.el).append($cl); 
        namespace.app.trigger('needChildren', this.model.get('child'));
        return this;
      }

      this.model.get('child').get("child_rels").each(function(rel, index) {
        var child = new ChildView({ model: rel});
        //child.on('needCompleteRel', self.needCompleteRel, self);
        $cl.append(child.render().el);
      });

      $(this.el).append($cl);

      //show more-info button when hovering over the footer
      $(document).on("mouseenter", ".node-footer", function() {
        $(this).find('.mi-button').show();
      })
      .on("mouseleave", ".node-footer", function() {
        $(this).find('.mi-button').hide();
      });

      return this;
    },

    createPostDiv: function() {
        $(this.el).find('.children').before(this.nrTemplate());
    },

    createMoreDiv: function () {
      var slide_id = this.model.id;
      var m_item = this.model.get('child');

      // var moreBtnHandler = function() {
      //   var md = $(this).parent();
      //   var buttons = ['parents-btn', 'link-btn', 'del-btn', 'edit-btn', 'copy-id-btn', 'subscribe-btn'];
      //   var divs = ['.parents-div', '.link-div', '.del-div', '.edit-div', '.copy-id-div', 'subscribe-div'];
      //   var funcs = [createParentsDiv, createLinkDiv, createDeleteDiv, createEditDiv, createCIDiv, createSubDiv];

      //   var idof = buttons.indexOf($(this).attr('class'));
      //   if (idof === -1) return;

      //   if (md.find(divs[idof]).length === 0) {
      //     md.find('.opt-div').hide();
      //     md.append(funcs[idof](from));
      //     return;
      //   }

      //   md.find('.opt-div').hide();
      //   md.find(divs[idof]).show('fast');
      // }

      var parents_btn = $('<a />')
          .addClass('parents-btn')
          .attr('href', '#')
          .attr('onclick', 'return false;')
          .text('View Parents')

      var link_btn = $('<a />')
          .addClass('link-btn')
          .attr('href', '#')
          .attr('onclick', 'return false;')
          .text('Link an item')

      var copy_id_btn = $('<a />')
          .addClass('copy-id-btn')
          .attr('href', '#')
          .attr('onclick', 'return false;')
          .text('Get link ID')

      var subscribe_btn = $('<a />')
          .addClass('subscribe-btn')
          .attr('href', '#')
          .attr('onclick', 'return false;')
          .text('Subscribe')

      if (m_item.get('user') === session.username || this.model.get('linked_by') === session.username) {
        var del_btn = $('<a />')
            .addClass('del-btn')
            .attr('href', '#')
            .attr('onclick', 'return false;')
            .text('Delete')

        if (m_item.get('user') === session.username) {
          var edit_btn = $('<a />')
              .addClass('edit-btn')
              .attr('href', '#')
              .attr('onclick', 'return false;')
              .text('Edit')
        }
      }
      else {
        var del_btn = "",
            edit_btn = "";
      }

      close_btn = $('<a />')
          .addClass('more-close')
          .attr('data-bypass', 'data-bypass')
          .attr('href', '#')
          .attr('onclick', 'return false;')
          .text('Close')
          .click(function() {
            $(this).parent().hide('fast');
          });

      $more_div = $('<div />')
          .addClass('span7 more-div')
          .css('display', 'none')
          .append(parents_btn, link_btn, del_btn, edit_btn, copy_id_btn, subscribe_btn, close_btn);

      $(this.el).find('.node-footer').after($more_div);
    },

    toggleReplyDiv: function() {
      if ($(this.el).find('.post-div').length === 0) {
        this.createPostDiv();
        // $(this.el).find('.post-button').text('Hide');
        // return;
      }

      $(this.el).find('.post-div').slideToggle('fast');

      var $post_button = $(this.el).find('.post-button');
      if ('Reply' === $post_button.text()) {
        $post_button.text('Hide')
      }
      else {
        $post_button.text('Reply')
      }
    },

    toggleMoreDiv: function() {
      if ($(this.el).find('.more-div').length === 0) {
        this.createMoreDiv();
        // $(this.el).find('.post-button').text('Hide');
        // return;
      }

      $(this.el).find('.more-div').slideToggle('fast');
    },

    submitPost: function() {
      var $post_div = $(this.el).find('.post-div');
      reply_data = {
        tldr: $post_div.find('input[name="tldr"]').val(),
        body: $post_div.find('textarea[name="body"]').val()
      }

      namespace.app.trigger('postReply', this.model.get('child').get('id'), reply_data);
      $post_div.html('Posting...');
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });
  return NodeView;
});
