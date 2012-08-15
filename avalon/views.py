from avalon import app
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify
import db_operations as db
import api
from bson import ObjectId


@app.before_request
def before_request():
    """Make sure we are connected to the database each request."""
    db.init(app.config['MONGODB_HOST'], app.config['MONGODB_PORT'], 'conversion')
    try:
        session['logged_in']
    except(KeyError):
        session['logged_in'] = False


@app.teardown_request
def teardown_request(exception):
    """Closes the database again at the end of the request."""


@app.route('/')
def index():
    return item_page(db.root._id)


@app.route('/printRoot')
def printRoot():
    return str(db.root._id)


@app.route('/i/<item_id>')
def item_page(item_id, initial_items=[], initial_rels=[]):
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
    node_dict.update({
        "initial_items": initial_items,
        "initial_rels": initial_rels
    })
    # node_dict['users'][:] = [d['name'] for d in node_dict['users']]

    if session['logged_in']:
        db.markSeen(session['username'], item_id)

    # return render_template('page.html', nd=node_dict, tab='browse-tab')
    return render_template('page-bb.html', nd=node_dict, tab='browse-tab')


@app.route('/i/<item_id>/r/<rel_ids>')
def item_page_with_rels(item_id, rel_ids):
    rel_ids = rel_ids.split('-')
    rel_ids = [ObjectId(rel_id) for rel_id in rel_ids]
    rels = [db.getRel(rel_id, True) for rel_id in rel_ids]
    items = set([ObjectId(rel["child"]) for rel in rels] + [ObjectId(rel["parent"]) for rel in rels])
    items = [db.getItem(item, True) for item in items]
    return item_page(item_id, items, rels)


@app.route('/r/<rel_ids>')
def index_page_with_rels(rel_ids):
    return item_page_with_rels(db.root._id, rel_ids)


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

    if session['logged_in']:
        db.markSeen(session['username'], item_id, True)

    return render_template('view.html', ii=item_info, tab='view-tab')


@app.route('/discover')
def discoverPage():
    new_rels = list(db.dbcon.relations.Relation.find({
            'comment_parent': None
        }).sort('time_linked', -1).limit(10))

    new_com_rels = list(db.dbcon.relations.Relation.find({
            'comment_parent': {"$ne": None}
        }).sort('time_linked', -1).limit(10))

    items = set([db.getItem(rel.parent) for rel in new_rels])
    items.update([db.getItem(rel.comment_parent) for rel in new_com_rels])
    new_dict = {
        'new_rels': db.prepareForClient(new_rels),
        'new_com_rels': db.prepareForClient(new_com_rels),
        'items': db.prepareForClient(items)
    }
    return render_template('discover.html', nd=new_dict, tab='view-tab')


@app.route('/profile')
def myProfilePage():
    if not session['logged_in']:
        return 'You are not logged in'
    subscriptions = db.getSubscriptions(session['username'])
    if subscriptions is None:
        return 'You have no subscriptions'

    s_rels, s_com_rels = [], []
    s_item_ids, s_com_item_ids = [], []

    for s in subscriptions:
        s_item_ids.append(s['item'])
        s_rels.extend(db.getChildRels(s['item'], {
            'comment_parent': None,
            'time_linked': {'$gte': s['seen']},
        }))
        if s['comments']:
            s_com_item_ids.append(s['item'])
            s_com_rels.extend(db.getCommentRels(s['item'], {
                'time_linked': {'$gte': s['comment_seen']}
            }))

    new_rels = list(db.dbcon.relations.Relation.find({
            'parent': {'$in': s_item_ids},
            'comment_parent': None,
        }).sort('time_linked', -1).limit(10))

    new_com_rels = list(db.dbcon.relations.Relation.find({
            'comment_parent': {'$in': s_com_item_ids}
        }).sort('time_linked', -1).limit(10))

    items = set([db.getItem(rel.parent) for rel in new_rels + s_rels])
    items.update([db.getItem(rel.comment_parent) for rel in new_com_rels + s_com_rels])
    new_dict = {
        's_rels': db.prepareForClient(s_rels),
        's_com_rels': db.prepareForClient(s_com_rels),
        'new_rels': db.prepareForClient(new_rels),
        'new_com_rels': db.prepareForClient(new_com_rels),
        'items': db.prepareForClient(items)
    }
    return render_template('profile.html', nd=new_dict, tab='view-tab')


@app.route('/register', methods=['GET'])
def registrationPage():
    return render_template('register.html', tab='profile-tab')


@app.route('/login', methods=['GET', 'POST'])
def loginPage():
    return render_template('login.html', tab='profile-tab')


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You were logged out')
    return redirect(url_for('item_page', item_id=session['current_item']))


@app.route('/u/<username>/item')
def userItemPage(username):
    user = db.getUser(username)
    if user is None:
        return "This user doesn't exist"

    return redirect(url_for('item_page', item_id=user.item))


@app.route('/about')
def aboutPage():
    """
    return render_template('about.html', tab='about-tab')
    """




"""
To remove: grabItem and grabRel

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

    if session['logged_in']:
        db.markSeen(session['username'], rel['child'], True)

    return jsonify(child_dict)


@app.route('/grabItem', methods=['POST'])
def grabItem():
    item_id = ObjectId(request.form['item_id'])
    if db.getItem(item_id) is None:
        return 'This item does not exist'
    session['current_item'] = item_id
    need = {
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    item_dict = db.getItemInfo(item_id, need, True)
    return jsonify(item_dict)

"""