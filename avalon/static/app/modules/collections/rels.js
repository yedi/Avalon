define([
  'underscore', 
  'backbone', 
  'libs/backbone/localstorage', 
  'models/relation'
  ], function(_, Backbone, Store, Rel){
	  
	var RelsCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Rel

/*
    // Save all of the rels under the `"rels"` namespace.
    localStorage: new Store("rels-backbone-require"),
*/
  });
  return new RelsCollection;
});
