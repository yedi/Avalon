define([
  'use!underscore', 
  'use!backbone', 
  'modules/models/rel'
], 
function(_, Backbone, Rel){
	var RelsCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Rel

/*
    // Save all of the rels under the `"rels"` namespace.
    localStorage: new Store("rels-backbone-require"),
*/
  });
  return RelsCollection;
});
