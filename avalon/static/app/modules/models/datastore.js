/**
 * I have a global datastore that holds models for the entire app. The datastore gets models from the server. Other independent views/collections
 * sd publishes an event for clicks on child_models. main.js binds a function to that event, the function checks the main datastore 
 * if the model exists, if so, it adds the model to sd.collection. If it doesn't it adds an empty model to the sd, which is binded
 * binded to the datastore. The datastore than requests the model from the server, and when the changes get updated, that change
 * is reflected in sd. 
 *
 * How do I bind models in different collections? So that all the models in my app, are bound to the corresponding datastore model.
 **/
define([
  'namespace',

  'use!underscore', 
  'use!backbone',

  "modules/collections/items",
  "modules/collections/rels"
], 
function(namespace, _, Backbone, Items, Rels) {
  var DataStore = Backbone.RelationalModel.extend({

    // Default attributes for this datastore are a collection of items and rels.
    // defaults: {
    //   rels: new Rels([]),
    //   items: new Items([])
    // },

    initialize: function() {
      this.rels = new Rels();
      this.items = new Items();
      this.clist = {}; //children list

      //events that change state
      namespace.app.on('postReply', this.postReply, this);
      namespace.app.on('postLink', this.postLink, this);
      namespace.app.on('deleteRel', this.deleteRel, this);
      namespace.app.on('editItem', this.editItem, this);
      namespace.app.on('subscribeToItem', this.subscribeToItem, this);

      //events for getting data
      namespace.app.on('submitVote', this.submitVote, this);
      namespace.app.on('needCompleteRel', this.getCompleteRel, this);
      namespace.app.on('needChildren', this.getItemChildren, this);
      namespace.app.on('needParents', this.getItemParents, this);
    },

    //adds new mongo models to a collection. If a model already exists, it overwrites the attributes.
    addTo: function(col, models) {
      if (col === 'items') col = this.items;
      else if (col === 'rels') col = this.rels;

      models = _.isArray(models) ? models.slice() : [models];

      _.each(models, function(model) {
        model.id = model._id;
      });

      existing_models = _.filter(models, function(model) {
        return col.indexOf(model) !== -1
      });

      _.each(existing_models, function(model) {
        col_model = col.get(model.get('id'));
        col_model.attributes = model.attributes;
        col_model.set('loaded', true);
      });

      col.add(models);
    },

    getRelFromServer: function(rel_id) {
      var self = this;
      $.post('/grabRel', {rel_id: rel_id}, 
      function (data)
      {
        self.addTo(self.rels, data.rel);
        self.addTo(self.rels, data.child_rels);
        self.addTo(self.items, data.item);
        self.addTo(self.items, data.child_items);
        self.addTo(self.items, data.parent_items);
      });
    },

    getItemFromServer: function(item_id) {
      var self = this;
      $.post('/grabItem', {item_id: item_id}, 
      function (data)
      {
        self.addTo(self.rels, data.child_rels);
        self.addTo(self.items, data.item);
        self.addTo(self.items, data.child_items);
        self.addTo(self.items, data.parent_items);
      });
    },

    getItemsFromServer: function(item_ids) {
      var self = this;
      _.each(item_ids, function(item_id) {
        self.getItemFromServer(item_id);
      });
    },

    getCompleteRel: function(rel_id, rel_model) {
      var rel = this.rels.get(rel_id);

      if (rel === undefined) {
        this.rels.add(rel_model);
        this.getRelFromServer(rel_id);
        return;
      }
      
      if (rel.get('parent') === undefined || rel.get('child') === undefined) {
        var needed_items = [];

        if (rel.get('parent') === undefined) {
          needed_items.push(rel.getRelation('parent').keyContents);
        }
        if (rel.get('child') === undefined) {
          needed_items.push(rel.getRelation('child').keyContents);
        }

        this.getItemsFromServer(needed_items);
        return;
      }

      rel_model.attributes = rel.attributes;
      rel_model.set('loaded', true);
    },

    getItemChildren: function(item) {
      var self = this;
      $.get('/api/children/' + item.id, 
      function (data)
      {
        self.addTo(self.rels, data.child_rels);
        self.addTo(self.items, data.child_items);
        item.set('children_loaded', true);
      });
    },

    getItemParents: function(item) {
      var self = this;
      $.get('/api/parents/' + item.id, 
      function (data)
      {
        self.addTo(self.rels, data.parent_rels);
        self.addTo(self.items, data.parent_items);
        item.set({'parents_loaded': true}, {silent: true});
        namespace.app.trigger('newParents', item.id);
      });
    },

    submitVote: function(rel_id, vote_type) {
      // alert('rel_id: ' + rel_id + ' -- vote type: ' + vote_type);
      var self = this;
      $.post('/api/vote' ,{rel_id: rel_id, username: session.username, vote_type: vote_type}, 
      function (data)
      {
        var rel_to_change = self.rels.get(rel_id);
        rel_to_change.set({ upvotes: rel_to_change.get('upvotes') + data.uv_c, 
                            downvotes: rel_to_change.get('downvotes') + data.dv_c });
        namespace.app.trigger('voteChange', rel_id);
      });
    },

    editItem: function(item_id, reply_data) {
      var self = this;
      $.post('/api/editItem' ,{ username: session.username, 
                            tldr: reply_data.tldr, 
                            body: reply_data.body, 
                            item_id: item_id, 
                            tags: ""}, 
      function (data)
      {
        self.addTo(self.items, data.item);
        namespace.app.trigger('editedItem', data.item._id);
        self.items.get(item_id).trigger('updateTldr');
      });
    },

    postReply: function(item_id, reply_data) {
      //alert(item_id + "\ntldr:" + reply_data.tldr + "\nbody:" + reply_data.body)
      var self = this;
      $.post('/api/add' ,{  username: session.username, 
                        tldr: reply_data.tldr, 
                        body: reply_data.body, 
                        parent: item_id, 
                        tags: ""}, 
      function (data)
      {
        self.addTo(self.rels, data.rel);
        self.addTo(self.items, data.item);
        namespace.app.trigger('postedReply', data.rel._id);
      });
    },

    postLink: function(item_id, link_id) {
      //alert('Linking ' + link_id + ' to ' + item_id);
      //homeless: 4f387a9a93e9ce7288001078
      var self = this;
      $.post("/api/addLink", {parent: item_id, username: session.username, link_item: link_id}, 
        function (data)
        {
          self.addTo(self.rels, data.new_rel);
          self.addTo(self.items, data.rel_child);
          namespace.app.trigger('postedLink', data.new_rel._id);
        });
    },

    subscribeToItem: function(item_id) {
      var self = this;
      $.post("/api/subscribeToItem", {username: session.username, item_id: item_id}, 
        function (data)
        {
          namespace.app.trigger('subscribed', item_id);
        });
    },

    deleteRel: function(rel) {
      $.post('/api/deleteRel', {username: session.username, rel_id: rel.id}, 
      function (data)
      {
        namespace.app.trigger('relDeleted', rel.id);
        rel.trigger('destroy', rel, rel.collection);
      });
    }
  });
  return DataStore;
});



