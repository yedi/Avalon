define([
  'use!underscore', 
  'use!backbone',

  'static/app/modules/models/rel.js'
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
