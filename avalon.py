from __future__ import with_statement
from sqlite3 import dbapi2 as sqlite3
from contextlib import closing
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify
from datetime import datetime

# configuration
DATABASE = 'tmp/avalon.db'
DEBUG = True
SECRET_KEY = "avalon's key"

app = Flask(__name__)
app.config.from_object(__name__)


def connect_db():
    """Returns a new connection to the database."""
    return sqlite3.connect(app.config['DATABASE'])


def init_db():
    """Creates the database tables."""
    with closing(connect_db()) as db:
        with app.open_resource('schema.sql') as f:
            db.cursor().executescript(f.read())
        db.commit()


@app.before_request
def before_request():
    """Make sure we are connected to the database each request."""
    g.db = connect_db()


@app.teardown_request
def teardown_request(exception):
    """Closes the database again at the end of the request."""
    if hasattr(g, 'db'):
        g.db.close()


def query_db(query, args=(), one=False):
    cur = g.db.execute(query, args)
    rv = [dict((cur.description[idx][0], value)
               for idx, value in enumerate(row)) for row in cur.fetchall()]
    return (rv[0] if rv else None) if one else rv


def getRel(rel_id=None, parent_id=None, child_id=None):
    rel = None

    if isinstance(rel_id, (int, long)):
        rel = query_db('SELECT * FROM relations WHERE id = ?', [rel_id], one=True)

    elif isinstance(parent_id, (int, long)) & isinstance(child_id, (int, long)):
        rel = query_db('SELECT * FROM relations WHERE parent = ? AND child = ?', [parent_id, child_id], one=True)

    return rel


def getItem(item_id):
    item = query_db('SELECT * FROM items WHERE id = ?', [item_id], one=True)
    return item


def getItemInfo(item_id, given_needs={}):
    """
    """
    needs = {
        "parent_items": False,
        "child_items": False,
        "parent_rels": False,
        "child_rels": False,
        'users': False
    }

    needs.update(given_needs)

    parent_ids = child_ids = parent_items = child_items = parent_rels = child_rels = users = []
    user_ids = set()

    item = getItem(item_id)
    item['tags'] = getItemTags(item['id'], True)
    if item is None:
        #return {"error": 'No such item'}
        return None

    if needs["parent_items"] | needs["parent_rels"]:
        parent_rels = query_db('SELECT * FROM relations WHERE child = ?', [item_id])

    if needs["parent_items"]:
        parent_ids = set([rel['parent'] for rel in parent_rels])
        parent_id_string = '(' + ','.join([str(i) for i in parent_ids]) + ')'
        parent_items = query_db('SELECT * FROM items WHERE id in ' + parent_id_string)
        for it in parent_items:
            it['tags'] = getItemTags(it['id'], True)

    if needs["child_items"] | needs["child_rels"]:
        child_rels = query_db('SELECT * FROM relations WHERE parent = ?', [item_id])

    if needs["child_items"]:
        child_ids = set([rel['child'] for rel in child_rels])
        child_id_string = '(' + ','.join([str(i) for i in child_ids]) + ')'
        child_items = query_db('SELECT * FROM items WHERE id in ' + child_id_string)
        for it in child_items:
            it['tags'] = getItemTags(it['id'], True)

    if needs["users"]:
        #get the user_ids for any linked relations
        for rel in parent_rels + child_rels:
            if rel["linked_by"]:
                user_ids.add(rel["linked_by"])

        user_ids.update(set([item['user_id'] for item in parent_items + child_items + [item]]))
        user_id_string = '(' + ','.join([str(i) for i in user_ids]) + ')'
        users = query_db('SELECT * FROM users WHERE id in ' + user_id_string)

    ret_dict = {
        "item": item,
        "parent_items": parent_items,
        "child_items": child_items,
        "parent_rels": parent_rels,
        "child_rels": child_rels,
        "users": users
    }
    return ret_dict


def getUser(user_id):
    user = query_db('SELECT * FROM users WHERE id = ?', [user_id], one=True)
    return user


def getTag(tag_name=None, tag_id=None):
    if tag_name is not None:
        tag = query_db('SELECT * FROM tags WHERE name = ?', [tag_name], one=True)
        return tag
    elif tag_id is not None:
        tag = query_db('SELECT * FROM tags WHERE id = ?', [tag_id], one=True)
        return tag
    else:
        return None


def getItemTags(item_id, name_only=False):
    tags = query_db('SELECT * FROM tags where id in (SELECT tag FROM tag_relations where item = ?)', [item_id])
    if name_only:
        return [tag['name'] for tag in tags]
    return tags


@app.route('/')
def index():
    session['current_item'] = 0
    need = {
        "users": True,
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    node_dict = getItemInfo(0, need)
    return render_template('page.html', nd=node_dict, tab='browse-tab')


@app.route('/<int:item_id>')
def item_page(item_id):
    session['current_item'] = item_id
    need = {
        "users": True,
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    node_dict = getItemInfo(item_id, need)
    #lol = breakme
    return render_template('page.html', nd=node_dict, tab='browse-tab')


@app.route('/add', methods=['POST'])
def add_entry():
    if len(request.form['title']) < 1:
        flash('Please give a title to your post.')
        return redirect(url_for('item_page', item_id=session['current_item']))

    if getUser(request.form['user_id']) is None:
        flash('You must have a valid user account to post')
        return redirect(url_for('item_page', item_id=session['current_item']))

    cur = g.db.cursor()

    #insert item into item table
    cur.execute('insert into items (title, body, user_id, time_submitted) values (?, ?, ?, ?)',
                 [request.form['title'], request.form['body'], request.form['user_id'], datetime.now()])
    new_item_id = cur.lastrowid

    #insert the relation into the relations tables
    parent_id = request.form['parent']
    cur.execute('insert into relations (parent, child) values(?, ?)',
                 [parent_id, new_item_id])
    new_rel_id = cur.lastrowid

    # insert each tag into the tag table if the tag is valid
    tags = request.form['tags']
    if len(tags) > 0:
        for tag_name in tags.split():
            tag = getTag(tag_name)
            if tag is None:
                continue
            cur.execute('insert into tag_relations (item, tag) values (?, ?)', [new_item_id, tag['id']])

    g.db.commit()

    #automatically upvote for the user
    process_vote(new_rel_id, request.form['user_id'], 'up')

    flash('New entry was successfully posted')

    return redirect(url_for('item_page', item_id=parent_id))


@app.route('/addLink', methods=['POST'])
def addLink():
    item_id, parent_id, user_id = request.form['item'], request.form['parent'], request.form['user_id']
    if (not getItem(item_id)) | (not getItem(parent_id)) | (not getUser(user_id)):
        return "Link error"

    cur = g.db.cursor()
    cur.execute('insert into relations (parent, child, linked_by, time_linked) values (?, ?, ?, ?)',
                 [parent_id, item_id, user_id, datetime.now()])
    new_rel_id = cur.lastrowid
    g.db.commit()

    process_vote(new_rel_id, user_id, 'up')

    flash('Item (' + str(item_id) + ') was successfully linked')

    return redirect(url_for('item_page', item_id=parent_id))


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        if request.form['password'] != request.form['password_rt']:
            return render_template('register.html', error="Password doesn't match", tab='profile-tab')

        a_user = query_db('SELECT * FROM users WHERE username = ?', [request.form['username']], one=True)
        if a_user != None:
            return render_template('register.html', error="Username already exists", tab='profile-tab')

        a_email = query_db('SELECT * FROM users where email = ?', [request.form['email']], one=True)
        if a_user != None:
            return render_template('register.html', error="Email already exists")

        cur = g.db.cursor()
        cur.execute('insert into users (username, email, password) values (?, ?, ?)',
                     [request.form['username'], request.form['email'], request.form['password']])
        insert_id = cur.lastrowid
        g.db.commit()

        session['logged_in'] = True
        session['user_id'] = insert_id
        session['username'] = request.form['username']

        flash('You were now registered')
        return redirect(url_for('item_page', item_id=0))
    return render_template('register.html', error=error, tab='profile-tab')


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        a_user = query_db('SELECT * FROM users WHERE username = ? OR email = ?', [request.form['username'], request.form['username']], one=True)
        if a_user is None:
            error = "User doesn't exist in the system"
        elif request.form['password'] != a_user['password']:
            error = "Incorrect password: {0}, {1}".format(a_user['password'], request.form['password'])
        else:
            session['logged_in'] = True
            session['user_id'] = a_user['id']
            session['username'] = a_user['username']

            flash('You were logged in')
            return redirect(url_for('item_page', item_id=session['current_item']))
    return render_template('login.html', error=error, tab='profile-tab')


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You were logged out')
    return redirect(url_for('item_page', item_id=0))


def process_vote(rel_id, user_id, vote_type):
    if not getUser(user_id):
        return
    if vote_type == 'up':
        is_upvote = True
    else:
        is_upvote = False

    upvote_count, downvote_count = 0, 0

    a_vote = query_db('SELECT * FROM votes WHERE rel_id = ? AND user_id = ?', [rel_id, user_id], one=True)
    if a_vote is None:
        query_db('INSERT INTO votes (rel_id, user_id, vote_type) VALUES (?, ?, ?)', [rel_id, user_id, vote_type])
        if is_upvote:
            upvote_count = 1
        else:
            downvote_count = 1
    else:
        if a_vote['vote_type'] == vote_type:
            query_db('DELETE FROM votes WHERE rel_id = ? AND user_id = ?', [rel_id, user_id])
            if is_upvote:
                upvote_count = -1
            else:
                downvote_count = -1
        else:
            query_db('UPDATE votes SET vote_type = ? WHERE rel_id = ? AND user_id = ?', [vote_type, rel_id, user_id])
            if is_upvote:
                upvote_count, downvote_count = 1, -1
            else:
                downvote_count, upvote_count = 1, -1

    #query_db('UPDATE relations SET ? = ?+1 WHERE id=?', [column, column, rel_id])
    #query_db('UPDATE relations SET {0} = {0}+1 WHERE id={1}'.format(column, rel_id))
    query_db('UPDATE relations SET upvotes = upvotes+?, downvotes = downvotes+? WHERE id=?',
            [upvote_count, downvote_count, rel_id])

    g.db.commit()
    return upvote_count, downvote_count


@app.route('/vote', methods=['POST'])
def vote():
    uv_c, dv_c = process_vote(request.form['rel_id'], request.form['user_id'], request.form['vote_type'])
    # return redirect(url_for('item_page', item_id=session['current_item']))
    return jsonify(uv_c=uv_c, dv_c=dv_c)


@app.route('/grabRel', methods=['POST'])
def grabRel():
    rel_id = int(request.form['rel_id'])
    #parent_id = request.form['parent_id']
    #child_id = request.form['child_id']

    rel = getRel(rel_id=rel_id)

    need = {
        "users": True,
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }
    rel['child']
    child_dict = getItemInfo(rel['child'], need)
    child_dict['rel'] = rel
    return jsonify(child_dict)


@app.route('/grabItem', methods=['POST'])
def grabItem():
    need = {
        "users": True,
        "parent_items": True,
        "child_items": True,
        "child_rels": True
    }

    item_dict = getItemInfo(request.form['item_id'], need)
    return jsonify(item_dict)


@app.route('/about')
def aboutPage():
    return render_template('about.html', tab='about-tab')


if __name__ == '__main__':
    app.run()
