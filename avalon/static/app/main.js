/*
so I have a global collection of items that I want to treat as a service, 
so that whenever any part of my app needs an item, it'll query the collection. 
If the collection doesn't have the item, it needs to get it from the server.
*/
require([
  "namespace",

  // Libs
  "jquery",
  "use!backbone",

  // Modules
  "modules/models/item",
  "modules/models/rel",
  "modules/collections/rels",
  "modules/views/slide-display"
],

function(namespace, jQuery, Backbone, ItemModel, RelModel, Rels, slideDisplay) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index",
      "i/:item_id": "index",
      "i/:item_id/r/:rel_ids": "index",
      "*hash": "catchAll"
      //":hash": "index"
    },

    sd: new slideDisplay(),
    //global_items: new Items(),

    addRootRel: function(item_id) {

    },

    index: function(item_id, rel_ids) {
      if (item_id === undefined) {
        item_id = 'root'; //change this to the root item
      }

      if (rel_ids !== undefined) {
        rel_ids = rel_ids.split('-');
      }

      var sd = this.sd;
      sd.bind()

      var route = this;
      // var tutorial = new Example.Views.Tutorial();
      var empty = new ItemModel({
        id: "empty",
        body: "nada",
        tldr: "nada",
        user: "admin"
      });
      var item_1 = new ItemModel({
        id: "itemid-1-1",
        body: "Item 1's body",
        tldr: "Item 1",
        user: "yedi"
      });
      var item_2 = new ItemModel({
        id: "itemid-2-2",
        body: "Item 2's body",
        tldr: "Item 2",
        user: "nkessel"
      });
      var item_3 = new ItemModel({
        id: "itemid-3-3",
        body: "Item 3's body",
        tldr: "Item 3",
        user: "nkessel"
      });
      var item_4 = new ItemModel({
        id: "itemid-4-4",
        body: "Item 4's body",
        tldr: "Item 4",
        user: "nkessel"
      });
      var item_5 = new ItemModel({
        id: "itemid-5-5",
        body: "Item 5's body",
        tldr: "Item 5",
        user: "nkessel"
      });
      var rel_1 = new RelModel({
        id: "arel-1",
        linked_by: "yedi",
        parent: "itemid-1-1",
        child: "itemid-2-2",
        upvotes: 80,
        downvotes: 11
      });
      var rel_2 = new RelModel({
        id: "arel-2",
        linked_by: "yedi",
        parent: "itemid-2-2",
        child: "itemid-1-1",
        upvotes: 80,
        downvotes: 64
      });
      var rel_3 = new RelModel({
        id: "arel-3",
        linked_by: "yedi",
        parent: "itemid-2-2",
        child: "itemid-3-3",
        upvotes: 80,
        downvotes: 22
      });
      var rel_4 = new RelModel({
        id: "arel-4",
        linked_by: "yedi",
        parent: "itemid-2-2",
        child: "itemid-4-4",
        upvotes: 80,
        downvotes: 22
      });
      var rel_5 = new RelModel({
        id: "arel-5",
        linked_by: "yedi",
        parent: "itemid-2-2",
        child: "itemid-5-5",
        upvotes: 80,
        downvotes: 22
      });
      var rel_6 = new RelModel({
        id: "arel-6",
        linked_by: "yedi",
        parent: "itemid-1-1",
        child: "itemid-4-4",
        upvotes: 80,
        downvotes: 22
      });

      $("#main").html(sd.render().el);
      
      // if (sd.collection.length === 0) {
      //   addRootRel(item_id);
      // }
      
      sd.collection.add([rel_1]);
      sd.collection.add([rel_2]);
      sd.collection.add([rel_3]);
      sd.collection.add([rel_4]);
      sd.collection.add([rel_5]);
      //setTimeout(function() { sd.pop(2); }, 3000);
      

      /*
      var node = new NodeView({ model: rel_1 });      
      $("#parent-node").html( node.render().el );

      var rel_child = rel_1.get("child");

      var cl = $("<ul />")
          .attr("id", "cl_" + rel_1.id);

      rel_child.get("child_rels").each(function(rel, index) {
        var child = new ChildView({ model: rel});
        cl.append(child.render().el);
      });

      var children_el = $("<span />")
          .addClass("children")
          .append(cl);

      $("#parent-node").append(children_el);
      */

      // Attach the tutorial to the DOM
      /*
      node.render(function(el) {
        $("#main").html(el);

        // Fix for hashes in pushState and hash fragment
        if (hash && !route._alreadyTriggered) {
          // Reset to home, pushState support automatically converts hashes
          Backbone.history.navigate("", false);

          // Trigger the default browser behavior
          location.hash = hash;

          // Set an internal flag to stop recursive looping
          route._alreadyTriggered = true;
        }
      });
      */
    }
  });

  // Shorthand the application namespace
  var app = namespace.app;

  // Treat the jQuery ready function as the entry point to the application.
  // Inside this function, kick-off all initialization, everything up to this
  // point should be definitions.
  jQuery(function($) {
    // Define your master router on the application namespace and trigger all
    // navigation from this instance.
    app.router = new Router();

    // Trigger the initial route and enable HTML5 History API support
    Backbone.history.start({ pushState: true });
  });

  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
  $(document).on("click", "a:not([data-bypass])", function(evt) {
    // Get the anchor href and protcol
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Ensure the protocol is not part of URL, meaning its relative.
    if (href && href.slice(0, protocol.length) !== protocol &&
        href.indexOf("javascript:") !== 0) {
      // Stop the default event to ensure the link will not cause a page
      // refresh.
      evt.preventDefault();

      // This uses the default router defined above, and not any routers
      // that may be placed in modules.  To have this work globally (at the
      // cost of losing all route events) you can change the following line
      // to: Backbone.history.navigate(href, true);
      app.router.navigate(href, true);
    }
  });

});
