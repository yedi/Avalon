define([
  'use!underscore', 
  'use!backbone',

  'static/app/modules/models/rel.js'
], 
function(_, Backbone, Rel){
	var RelsCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Rel,

/*
    // Save all of the rels under the `"rels"` namespace.
    localStorage: new Store("rels-backbone-require"),
*/
    initialize: function() {
      //breakpoint
      var two = 1 + 1;
      //this.model === undefined
    }
  });

  return RelsCollection;
});
