define([
  'use!underscore', 
  'use!backbone',

  'static/app/modules/models/item.js'
], 
function(_, Backbone, Item){
	var ItemsCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Item,

/*
    // Save all of the item items under the `"items"` namespace.
    localStorage: new Store("items-backbone-require"),
*/
    initialize: function() {
      //breakpoint
      var two = 1 + 1;
      //this.model === function() {...}
    }
  });

  return ItemsCollection;
});
