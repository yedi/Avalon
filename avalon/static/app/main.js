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
  // "modules/models/item",
  // "modules/models/rel",
  'modules/models/item',
  'modules/models/rel',

  "modules/collections/rels",
  "modules/views/slide-display",
  "modules/models/datastore"
],

function(namespace, jQuery, Backbone, ItemModel, RelModel, Rels, slideDisplay, DataStore) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index",
      "i/:item_id": "index",
      "r/:rel_ids": "index",
      "i/:item_id/r/:rel_ids": "index",
      "*hash": "catchAll"
      //":hash": "index"
    },

    sd: new slideDisplay(),
    datastore: new DataStore(),

    addRootRel: function(item_id) {

    },

    catchAll: function(hash) {
      window.location = document.location.origin + "/" + hash;
    },

    index: function(item_id, rel_ids) {
      if (item_id === undefined) {
        item_id = 'root'; //change this to the root item
      }

      if (rel_ids !== undefined) {
        rel_ids = rel_ids.split('-');
      }

      var sd = this.sd;
      var datastore = this.datastore;
      sd.on('needCompleteRel', datastore.getCompleteRel, datastore);
      sd.on('needChildren', datastore.getItemChildren, datastore);

      var route = this;
      // var tutorial = new Example.Views.Tutorial();

      datastore.addTo('items', root_node_info.item);
      datastore.addTo('items', initial_items);
      datastore.addTo('rels', root_node_info.rel);
      datastore.addTo('rels', initial_rels);
      sd.addSlide(root_node_info.rel);

      //add rel branches to the slide_display
      if (rel_ids !== undefined) {
        for (var i = 0; i < rel_ids.length; i++) {
          if (rel_ids[i] !== sd.collection.at(i)) {
            sd.pop(i);
            sd.collection.add(rel_ids.slice(i, rel_ids.length));
            break;
          }
        }
      }

      $("#main").html(sd.render().el);

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
    Backbone.history.start({ pushState: true, root: "" });
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
