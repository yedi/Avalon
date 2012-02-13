from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify
from datetime import datetime
import db_operations as mon
from bson import ObjectId
import mongokit
from sqlite3 import dbapi2 as sqlite3
from contextlib import closing

config = {}
config['DATABASE'] = 'tmp/avserver.db'

db = None


def connect_db():
    """Returns a new connection to the database."""
    return sqlite3.connect(config['DATABASE'])


def query_db(query, args=(), one=False):
    cur = db.execute(query, args)
    rv = [dict((cur.description[idx][0], value)
               for idx, value in enumerate(row)) for row in cur.fetchall()]
    return (rv[0] if rv else None) if one else rv


def transfer():
    user_lookup = {}
    item_lookup = {}
    rel_lookup = {}
    global db
    db = connect_db()
    mon.init('localhost', 27017, 'conversion')
    dd = mon.createInitialDb()
    user_lookup[0] = mon.getUser(dd['admin'])

    lite_items = query_db('SELECT * FROM items')
    lite_rels = query_db('SELECT * FROM relations')
    lite_comments = query_db('SELECT * FROM comments')
    lite_users = query_db('SELECT * FROM users')
    lite_votes = query_db('SELECT * FROM votes')

    for lu in lite_users:
        print lu['username']
        if lu['username'] == 'NKessel':
            user_lookup[3] = user_lookup[1]
        # print lu['date_registered']
        dr = datetime.strptime(lu['date_registered'], '%Y-%m-%d %H:%M:%S')
        # print str(dr)
        u, error = mon.addUser(unicode(lu['username']), unicode(lu['email']), unicode(lu['password']), dr)
        print 'inserted users: ' + str(u)
        if u:
            user_lookup[lu['id']] = u

    for li in lite_items:
        # print 'uid lookup: ' + str(li['user_id'])+ ' -- ' + str(user_lookup[li['user_id']]) 

        #print li['time_submitted']
        ts = datetime.strptime(li['time_submitted'].split('.')[0], '%Y-%m-%d %H:%M:%S')
        if not li['body']:
            li['body'] = li['title']
            li['title'] = ""
        i = mon.addItem({
            'body': unicode(li['body']),
            'tldr': unicode(li['title']),
            'user': user_lookup[li['user_id']].name,
            "time_submitted": ts,
            "upvotes": li['upvotes'],
            "downvotes": li['downvotes']
        })
        print 'inserted items: ' + str(li['id']) + ' -- ' + str(i)
        item_lookup[li['id']] = i

    for lr in lite_rels:
        if lr['parent'] == 0:
            rp = mon.root._id
        else:
            rp = item_lookup[lr['parent']]._id

        if lr['child'] == 0:
            rc = mon.root._id
        else:
            rc = item_lookup[lr['child']]._id

        lb = user_lookup.get(lr['linked_by'], None)
        if lb:
            lb = lb.name
        else:
            lb = mon.getUser(item_lookup[lr['child']].user).name

        r = mon.addRel(rp, rc, lb)
        r.upvotes = lr['upvotes']
        r.downvotes = lr['downvotes']
        r.save()
        print 'inserted rels: ' + str(lr['id']) + ' -- ' + str(r)
        rel_lookup[lr['id']] = r

    for lc in lite_comments:
        rel = rel_lookup.get(lc['rel_id'], None)
        if rel is None:
            continue
        rel = mon.getRel(rel._id)
        if lc['head_item'] == 0:
            cp = mon.root._id
        else:
            cp = item_lookup[lc['head_item']]._id
        rel.comment_parent = cp
        rel.save()

        item = mon.getItem(rel.child)
        item.tags.append(u'comment')
        item.save()

    for lv in lite_votes:
        user = mon.getUser(user_lookup[lv['user_id']].name)
        rel = rel_lookup.get(lv['rel_id'], None)
        if rel is None:
            continue
        rel_id = rel._id

        if lv['vote_type'] == 'up':
            is_upvote = True
        else:
            is_upvote = False

        user.votes.append({
            'rel': rel_id,
            'is_upvote': is_upvote
        })
        user.save()

    db.close()
