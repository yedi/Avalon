from avalon import app
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify
import db_operations as db
from bson import ObjectId

@app.route('/api/item/<item_id>', methods=['GET'])
def retrieveItem(item_id):
    item_id = ObjectId(item_id)
    item = db.getItem(item_id, in_json=True)
    if item is None:
        return 'This item does not exist'
    session['current_item'] = item_id
    return jsonify({'item': item})


@app.route('/api/rel/<rel_id>', methods=['GET'])
def retrieveRel(rel_id):
    rel_id = ObjectId(rel_id)
    rel = db.getrel(rel_id)
    if rel is None:
        return 'This rel does not exist'
    rel_dict = {'rel': rel}
    if request.args['parent']:
        rel_dict['parent'] = db.getItem(rel.parent)
    if request.args['child']:
        rel_dict['child'] = db.getItem(rel.child)

    #session['current_rel'] = rel_id
    return jsonify(db.prepareForClient(rel_dict))


@app.route('/api/children/<item_id>', methods=['GET'])
def retrieveChildren(item_id):
    item_id = ObjectId(item_id)
    need = {
        "child_items": True,
        "child_rels": True
    }
    children = db.getItemInfo(item_id, need, True)
    if children is None:
        return 'This item does not exist'
    return jsonify(children)


@app.route('/api/parents/<item_id>', methods=['GET'])
def retrieveParents(item_id):
    item_id = ObjectId(item_id)
    need = {
        "parent_items": True,
        "parent_rels": True
    }
    parents = db.getItemInfo(item_id, need, True)
    if parents is None:
        return 'This item does not exist'
    return jsonify(parents)


@app.route('/api/add', methods=['POST'])
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


@app.route('/api/addLink', methods=['POST'])
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


@app.route('/api/register', methods=['POST'])
def register():
    error = None
    if request.form['password'] != request.form['password_rt']:
        return render_template('register.html', error="Password doesn't match", tab='profile-tab')

    user, error = db.addUser(request.form['username'], request.form['email'], request.form['password'])
    if user:
        session['logged_in'] = True
        session['username'] = user.name

        flash('You were now registered')
        return redirect(url_for('item_page', item_id=session['current_item']))


@app.route('/api/login', methods=['POST'])
def login():
    error = None
    user, error = db.authenticateUser(request.form['username'], request.form['password'])
    if user:
        session['logged_in'] = True
        session['user_id'] = user._id
        session['username'] = user.name

        flash('You were logged in')
        # return redirect(url_for('item_page', item_id=session['current_item']))
        return redirect(url_for('myProfilePage'))
    else:
        return render_template('login.html', error=error, tab='profile-tab')


@app.route('/api/vote', methods=['POST'])
def vote():
    uv_c, dv_c = db.processVote(ObjectId(request.form['rel_id']), request.form['username'], request.form['vote_type'])
    return jsonify(uv_c=uv_c, dv_c=dv_c)


@app.route('/api/postComment', methods=['POST'])
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


@app.route('/api/deleteItem', methods=['POST'])
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


@app.route('/api/deleteRel', methods=['POST'])
def deleteRel():
    rel_id = ObjectId(request.form['rel_id'])
    username = request.form['username']

    if db.getRel(rel_id).linked_by != unicode(username):
        return "Not deleted"

    db.deleteRel(rel_id)
    return "delete successful"


@app.route('/api/subscribeToItem', methods=['POST'])
def subscribeToItem():
    item_id = ObjectId(request.form['item_id'])
    username = request.form['username']

    db.subscribe(username, item_id)
    return "subscribe successful"


@app.route('/api/editItem', methods=['POST'])
def editItem():
    item_id = ObjectId(request.form['item_id'])
    username = request.form['username']

    if db.getItem(item_id).user != unicode(username):
        return "Not edited"
    new_item = db.editItem(item_id, request.form['body'], request.form['tldr'])

    ret_dict = {
        "item": db.prepareForClient([new_item])[0]
    }
    return jsonify(ret_dict)