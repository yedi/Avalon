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


def show_item(item_id, render = True):
    if not isinstance(item_id, (int, long)):
        item_id = 0
    """
    Item and the children of the parent it just came from in one column
        The body of the item.
        The number of parents the item has. (if it has any)
            Allow the user to view the ideas the item was reposted for.
            Good because the users can see how widespread this solution/idea is.
    The children of the selected item in a column to the right of it
    """
    session['current_item'] = item_id
    fields = ('id', 'title', 'body', 'user_id', 'upvotes', 'downvotes')
    flash('item id is {0}'.format(item_id))
    #item
    #cur = g.db.execute('SELECT id, title, body, user_id, upvotes, downvotes FROM items WHERE id={0} order by id desc'.format(item_id))
    #item = [dict(id=row[0] title=row[1], body=row[2] user_id=row[3] upvotes=row[4] downvotes=row[5]) for row in cur.fetchall()]

    item = query_db('SELECT * FROM items WHERE id = ?', [item_id], one=True)
    if item is None:
        flash('No such item')
        return render_template('page.html')

    #children
    #cur = g.db.execute('SELECT id, title, body, user_id, upvotes, downvotes FROM items WHERE id in (SELECT child FROM tags WHERE parent = {0}) order by id desc'.format(item_id))
    #children = [dict(id=row[0] title=row[1], body=row[2] user_id=row[3] upvotes=row[4] downvotes=row[5]) for row in cur.fetchall()]

    children = []
    #children = None;

    for child in query_db('SELECT * FROM items WHERE id in (SELECT child FROM relations WHERE parent = ?) order by id desc', [item_id]):
        #print user['username'], 'has the id', user['user_id']
        children.append(child)
        #dict(id=child['id'], title=child['title'], body=child['body'], user_id=child['user_id'], upvotes=chhild['upvotes'])

    if render: 
        return render_template('page.html', item=item, children=children)
    else:
        return item, children


def get_item(item_id):
    fields = ('id', 'title', 'body', 'user_id', 'upvotes', 'downvotes')
    item = query_db('SELECT * FROM items WHERE id = ?', [item_id], one=True)
    if item is None:
        flash('No such item')
        return render_template('page.html')

    children = []
    for child in query_db('SELECT * FROM items WHERE id in (SELECT child FROM relations WHERE parent = ?) order by id desc', [item_id]):
        children.append(child)
    return item, children


@app.route('/')
def index():
    return show_item(0)
    #show_item(0)


@app.route('/<int:item_id>')
def item_page(item_id):
    return show_item(item_id)


@app.route('/add', methods=['POST'])
def add_entry():
    cur = g.db.cursor()
    cur.execute('insert into items (title, body, user_id, time_submitted) values (?, ?, ?, ?)',
                 [request.form['title'], request.form['body'], request.form['user_id'], datetime.now()])
    insert_id = cur.lastrowid
    parent_id = request.form['parent']
    cur.execute('insert into relations (parent, child) values(?, ?)',
                 [parent_id, insert_id])
    g.db.commit()
    process_vote(insert_id, request.form['user_id'], 'up')
    flash('New entry was successfully posted')
    return redirect(url_for('item_page', item_id=parent_id))


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        if request.form['password'] != request.form['password_rt']:
            return render_template('register.html', error="Password doesn't match")

        a_user = query_db('SELECT * FROM users WHERE username = ?', [request.form['username']], one=True)
        if a_user != None:
            return render_template('register.html', error="Username already exists")

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
    return render_template('register.html', error=error)


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
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You were logged out')
    return redirect(url_for('item_page', item_id=0))


def process_vote(item_id, user_id, vote_type):
    if vote_type == 'up':
        is_upvote = True
    else:
        is_upvote = False

    upvote_count, downvote_count = 0, 0

    a_vote = query_db('SELECT * FROM votes WHERE item_id = ? AND user_id = ?', [item_id, user_id], one=True)
    if a_vote is None:
        query_db('INSERT INTO votes (item_id, user_id, vote_type) VALUES (?, ?, ?)', [item_id, user_id, vote_type])
        if is_upvote:
            upvote_count = 1
        else:
            downvote_count = 1
    else:
        if a_vote['vote_type'] == vote_type:
            query_db('DELETE FROM votes WHERE item_id = ? AND user_id = ?', [item_id, user_id])
            if is_upvote:
                upvote_count = -1
            else:
                downvote_count = -1
        else:
            query_db('UPDATE votes SET vote_type = ? WHERE item_id = ? AND user_id = ?', [vote_type, item_id, user_id])
            if is_upvote:
                upvote_count, downvote_count = 1, -1
            else:
                downvote_count, upvote_count = 1, -1

    #query_db('UPDATE items SET ? = ?+1 WHERE id=?', [column, column, item_id])
    #query_db('UPDATE items SET {0} = {0}+1 WHERE id={1}'.format(column, item_id))
    query_db('UPDATE items SET upvotes = upvotes+?, downvotes = downvotes+? WHERE id=?',
            [upvote_count, downvote_count, item_id])

    g.db.commit()


@app.route('/vote', methods=['POST'])
def vote():
    process_vote(request.form['item_id'], request.form['user_id'], request.form['vote_type'])
    return redirect(url_for('item_page', item_id=session['current_item']))

@app.route('/displayChild', methods=['POST'])
def displayChild():
    child, children = get_item(request.form['item_id'])
    child_dict = {"child": child, "c_children": children, 'id': request.form['item_id']}
    return jsonify(child_dict)

if __name__ == '__main__':
    app.run()
