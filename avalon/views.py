from avalon import app
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify
from datetime import datetime
import db_operations as db
from bson import ObjectId
import mongokit


@app.before_request
def before_request():
    """Make sure we are connected to the database each request."""
    db.init(app.config['MONGODB_HOST'], app.config['MONGODB_PORT'], 'conversion')


@app.teardown_request
def teardown_request(exception):
    """Closes the database again at the end of the request."""


@app.route('/')
def index():
    session['current_item'] = db.root._id
    need = {
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    node_dict = db.getItemInfo(db.root._id, need, in_json=True)
    # node_dict['users'][:] = [d['name'] for d in node_dict['users']]
    return render_template('page.html', nd=node_dict, tab='browse-tab')


@app.route('/i/<item_id>')
def item_page(item_id):
    item_id = ObjectId(item_id)
    if db.getItem(item_id) is None:
        return 'This item does not exist'
    session['current_item'] = item_id
    need = {
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    node_dict = db.getItemInfo(item_id, need, True)
    # node_dict['users'][:] = [d['name'] for d in node_dict['users']]
    return render_template('page.html', nd=node_dict, tab='browse-tab')


@app.route('/view/<item_id>')
def viewItem(item_id):
    item_id = ObjectId(item_id)
    if db.getItem(item_id) is None:
        return 'This item does not exist'
    session['current_item'] = item_id
    need = {
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    item_info = db.getItemInfo(item_id, need, True)
    item_info['comment_rels'] = db.getCommentRels(item_id)
    item_info['comment_items'] = db.prepareForClient([db.getItem(rel['child']) for rel in item_info['comment_rels']])
    item_info['comment_rels'] = db.prepareForClient(item_info['comment_rels'])

    return render_template('view.html', ii=item_info, tab='view-tab')


@app.route('/discover')
def discoverPage():
    new_rels = list(db.dbcon.relations.Relation.find({
            'comment_parent': None
        }).sort('time_linked', -1).limit(10))

    new_com_rels = list(db.dbcon.relations.Relation.find({
            'comment_parent': {"$ne": None}
        }).sort('time_linked', -1).limit(10))

    new_dict = {
        'new_rels': db.prepareForClient(new_rels),
        'new_com_rels': db.prepareForClient(new_com_rels)
    }
    return render_template('discover.html', nd=new_dict, tab='view-tab')


@app.route('/add', methods=['POST'])
def add_entry():
    if len(request.form['body']) < 1:
        return

    if db.getUser(request.form['username']) is None:
        return

    body = request.form['body']
    username = request.form['username']
    parent_id = ObjectId(request.form['parent'])

    #insert item
    item_dict = {
        'body': unicode(body),
        'user': unicode(username),
    }
    if request.form['tldr']:
        item_dict['tldr'] = unicode(request.form['tldr'])
    new_item = db.addItem(item_dict)

    #insert the new rel
    new_rel = db.addRel(parent_id, new_item._id, username)

    """
    # insert each tag into the tag table if the tag is valid
    tags = request.form['tags']
    if len(tags) > 0:
        for tag_name in tags.split():
            tag = getTag(tag_name)
            if tag is None:
                continue
            cur.execute('insert into tag_relations (item, tag) values (?, ?)', [new_item_id, tag['id']])
    """

    #automatically upvote for the user
    db.processVote(new_rel._id, request.form['username'], 'up')

    #flash('New entry was successfully posted')

    ret_dict = {
        "item": db.prepareForClient([new_item])[0],
        "rel": db.prepareForClient([db.getRel(new_rel._id)])[0]
    }
    return jsonify(ret_dict)


@app.route('/addLink', methods=['POST'])
def addLink():
    l_item_id, parent_id, username = ObjectId(request.form['link_item']), ObjectId(request.form['parent']), request.form['username']
    user, l_item, parent = db.getUser(username), db.getItem(l_item_id), db.getItem(parent_id)
    if user is None:
        return "Not a user"
    if l_item is None or parent is None:
        return "invalid ids"

    new_rel = db.addRel(parent._id, l_item._id, username)
    db.processVote(new_rel._id, request.form['username'], 'up')

    rel_child = db.getItem(new_rel['child'])
    # child_user = db.getUser(rel_child['user'])

    ret_dict = {
        "new_rel": db.prepareForClient([db.getRel(new_rel._id)])[0],
        "rel_child": db.prepareForClient([rel_child])[0]
    }
    return jsonify(ret_dict)


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        if request.form['password'] != request.form['password_rt']:
            return render_template('register.html', error="Password doesn't match", tab='profile-tab')

        user, error = db.addUser(request.form['username'], request.form['email'], request.form['password'])
        if user:
            session['logged_in'] = True
            session['username'] = user.name

            flash('You were now registered')
            return redirect(url_for('item_page', item_id=session['current_item']))
    return render_template('register.html', error=error, tab='profile-tab')


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        user, error = db.authenticateUser(request.form['username'], request.form['password'])
        if user:
            session['logged_in'] = True
            session['user_id'] = user._id
            session['username'] = user.name

            flash('You were logged in')
            return redirect(url_for('item_page', item_id=session['current_item']))
    return render_template('login.html', error=error, tab='profile-tab')


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You were logged out')
    return redirect(url_for('item_page', item_id=session['current_item']))


@app.route('/vote', methods=['POST'])
def vote():
    uv_c, dv_c = db.processVote(ObjectId(request.form['rel_id']), request.form['username'], request.form['vote_type'])
    return jsonify(uv_c=uv_c, dv_c=dv_c)


@app.route('/grabRel', methods=['POST'])
def grabRel():
    rel_id = ObjectId(request.form['rel_id'])
    #parent_id = request.form['parent_id']
    #child_id = request.form['child_id']

    rel = db.getRel(rel_id=rel_id)

    need = {
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    child_dict = db.getItemInfo(rel['child'], need, True)
    child_dict['rel'] = db.prepareForClient([rel])[0]
    #child_dict['users'][:] = [d['name'] for d in child_dict['users']]
    return jsonify(child_dict)


@app.route('/grabItem', methods=['POST'])
def grabItem():
    """
    need = {
        "users": True,
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }

    item_dict = getItemInfo(request.form['item_id'], need)
    return jsonify(item_dict)
    """


@app.route('/u/<username>/item')
def userItemPage(username):
    user = db.getUser(username)
    if user is None:
        return "This user doesn't exist"

    return redirect(url_for('item_page', item_id=user.item))


@app.route('/postComment', methods=['POST'])
def postComment():
    username = request.form['username']
    body = request.form['body']
    parent_id = ObjectId(request.form['parent'])
    cp_id = ObjectId(request.form['comment_parent'])

    if db.getUser(username) is None:
        return 'You must have a valid user account to post'

    if len(request.form['body']) < 1:
        return

    if db.getItem(parent_id) is None or db.getItem(cp_id) is None:
        return 'Reply error'

    #insert item
    item_dict = {
        'body': unicode(body),
        'user': unicode(username),
        'tags': [u'comment']
    }
    new_item = db.addItem(item_dict)

    #insert the new rel
    new_rel = db.addRel(parent_id, new_item._id, username, cp_id)

    #automatically upvote for the user
    db.processVote(new_rel._id, request.form['username'], 'up')

    ret_dict = {
        "item": db.prepareForClient([new_item])[0],
        "rel": db.prepareForClient([db.getRel(new_rel._id)])[0]
    }
    return jsonify(ret_dict)


@app.route('/deleteItem', methods=['POST'])
def deleteItem():
    """
    item = getItems([request.form['item_id']])[0]
    user = getUser(request.form['user_id'])

    if item['user_id'] != user['id']:
        return "Not deleted"

    cur = g.db.cursor()
    cur.execute('delete from items where id = ?', [item['id']])
    cur.execute('delete from relations where child = ? or parent = ?', [item['id'], item['id']])
    cur.execute('delete from tag_relations where item = ?', [item['id']])
    g.db.commit()
    return "delete successful"
    """


@app.route('/deleteRel', methods=['POST'])
def deleteRel():
    rel_id = ObjectId(request.form['rel_id'])
    username = request.form['username']

    if db.getRel(rel_id).linked_by != unicode(username):
        return "Not deleted"

    db.deleteRel(rel_id)
    return "delete successful"


@app.route('/editItem', methods=['POST'])
def editItem():
    item_id = ObjectId(request.form['item_id'])
    username = request.form['username']

    if db.getItem(item_id).user != unicode(username):
        return "Not edited"
    new_item = db.editItem(item_id, request.form['body'], request.form['tldr'])

    return jsonify(db.prepareForClient([new_item])[0])


@app.route('/about')
def aboutPage():
    """
    return render_template('about.html', tab='about-tab')
    """
