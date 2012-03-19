define([
  'namespace',

  'use!underscore', 
  'use!backbone',

  //modules
  "modules/models/item",
  "modules/collections/rels"
], 

function(namespace, _, Backbone, Item, Rels) {
  var RelModel = Backbone.RelationalModel.extend({

    // Default attributes for the todo.
    defaults: {
      /**
       * child and parent are references to item models
       * children and parents are stored as references to items in the mongo db clientside. 
       * So their values are simple item-ids (which are strings). 
       */
      parent: null,
      child: null,
      linked_by: "undefined user",
      upvotes: 0,
      downvotes: 0,
      is_root: false
    },

    relations: [{ 
      //this.parent
      type: Backbone.HasOne,
      key: 'parent',
      relatedModel: Item,
      includeInJSON: true,
      reverseRelation: { 
        //each item has a collection of child_rels (this.child_rels)
        type: Backbone.HasMany,
        key: 'child_rels',
        collectionType: Backbone.RelsCollection,
        includeInJSON: false
      }
    }, { 
      //this.child
      type: Backbone.HasOne,
      key: 'child',
      relatedModel: Item,
      includeInJSON: true,
      reverseRelation: { 
        //each item has a collection of parent_rels (this.parent_rels)
        type: Backbone.HasMany,
        key: 'parent_rels',
        collectionType: Backbone.RelsCollection,
        includeInJSON: false
      }
    }]
  });
  return RelModel;
});
