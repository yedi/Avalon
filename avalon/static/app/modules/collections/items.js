define([
  'use!underscore', 
  'use!backbone', 
  'modules/models/item'
  ], function(_, Backbone, Store, Item){
	  
	var ItemsCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Item

/*
    // Save all of the item items under the `"items"` namespace.
    localStorage: new Store("items-backbone-require"),
*/
  });
  return new ItemsCollection;
});
