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
    },

    //adds new mongo models to a collection. If a model already exists, it overwrites the attributes.
    addTo: function(col, models) {
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
    
  });
  return DataStore;
});



