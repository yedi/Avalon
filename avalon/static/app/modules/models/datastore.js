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

    // Default attributes for the todo.
    defaults: {
      items: new Items(),
      rels: new Rels(),
    },

    getCompleteRel: function(rel_id) {
      
    },
    
  });
  return DataStore;
});



