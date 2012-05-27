from mongokit import Connection
from bson import ObjectId
import db_models as models
from datetime import datetime

connection = Connection()
initialized = False
cur_db = ''
root = None
dbcon = None


def init(host, port, db='test'):
    global connection
    global initialized
    global cur_db
    global root
    global dbcon
    connection = Connection(host, port)
    initialized = True
    cur_db = db
    dbcon = connection[cur_db]

    # register the User document with our current connection
    connection.register([models.Item, models.Relation, models.User])

    root = getRootItem()


def makeJson(alist):
    retlist = []
    for l in alist:
        retlist.append(l.to_json())
    return retlist


def prepareForClient(alist):
    #deleteList = ['password', 'acc_activated', 'votes']
    retlist = []
    for l in alist:
        if not isinstance(l, dict):
            continue
        newl = dict(l)
        for key in newl.keys():
            if isinstance(newl[key], datetime):
                newl[key] = str(newl[key]).split('.')[0]
            if isinstance(newl[key], ObjectId):
                newl[key] = str(newl[key])
            if isinstance(newl[key], list):
                newl[key] = prepareForClient(newl[key])
        retlist.append(newl)
    return retlist


def getRootItem():
    return connection[cur_db].items.Item.find_one({
        'body': u'_root_body_',
        'tldr': u'_root_title_',
        'user': u'admin'
    })


def getItem(item_id, in_json=False):
    item = connection[cur_db].items.Item.find_one({'_id': item_id})
    if (item is not None) & in_json:
        item = prepareForClient([item])[0]
    return item


def deleteItem(item_id):
    dbcon.items.remove({'_id': item_id})


def getItems(q_dict):
    return list(connection[cur_db].items.Item.find(q_dict))


def getItemInfo(item_id, given_needs={}, in_json=False):
    needs = {
        "parent_items": False,
        "child_items": False,
        "parent_rels": False,
        "child_rels": False,
        'users': False,
        "comments": False
    }
    needs.update(given_needs)

    parent_ids = []
    child_ids = []
    parent_items = []
    child_items = []
    parent_rels = []
    child_rels = []
    users = []
    user_names = set()

    item = getItem(item_id)
    if item is None:
        return None

    if needs["parent_items"] | needs["parent_rels"]:
        parent_rels = getParentRels(item._id)

    if needs["parent_items"]:
        parent_ids = set([rel['parent'] for rel in parent_rels])
        for pid in parent_ids:
            parent_items.append(getItem(pid))

    if needs["child_items"] | needs["child_rels"]:
        child_rels = getChildRels(item._id)

    if needs["comments"] == False:
        child_rels[:] = [rel for rel in child_rels if rel.comment_parent is None]

    if needs["child_items"]:
        child_ids = set([rel['child'] for rel in child_rels])
        for pid in child_ids:
            child_items.append(getItem(pid))

    if needs["users"]:
        #get the user_ids for any linked relations
        for rel in parent_rels + child_rels:
            if rel["linked_by"]:
                user_names.add(rel["linked_by"])

        user_names.update(set([item['user'] for item in parent_items + child_items + [item]]))
        for username in user_names:
            users.append(getUser(username))

    if in_json:
        item = prepareForClient([item])[0]
        parent_items = prepareForClient(parent_items)
        child_items = prepareForClient(child_items)
        parent_rels = prepareForClient(parent_rels)
        child_rels = prepareForClient(child_rels)
        users = prepareForClient(users)

    ret_dict = {
        "item": item,
        "parent_items": parent_items,
        "child_items": child_items,
        "parent_rels": parent_rels,
        "child_rels": child_rels,
        "users": users
    }
    return ret_dict


def editItem(item_id, body, tldr):
    item = getItem(item_id)
    item.body, item.tldr = body, tldr
    item.save()
    return item


def getRel(rel_id, in_json=False):
    rel = connection[cur_db].relations.Relation.find_one({'_id': rel_id})
    if rel & in_json:
        rel = prepareForClient([rel])[0]
    return rel


def deleteRel(rel_id):
    dbcon.relations.remove({'_id': rel_id})


def getChildRels(parent_id, q_dict=None):
    query = {'parent': parent_id}
    if q_dict:
        query.update(q_dict)
    return list(connection[cur_db].relations.Relation.find(query))


def getParentRels(child_id, q_dict=None):
    query = {'child': child_id}
    if q_dict:
        query.update(q_dict)
    return list(connection[cur_db].relations.Relation.find(query))


def getCommentRels(item_id, q_dict=None):
    query = {'comment_parent': item_id}
    if q_dict:
        query.update(q_dict)
    return list(connection[cur_db].relations.Relation.find(query))


def getUser(username):
    username = unicode(username)
    return connection[cur_db].users.User.find_one({'name': username})


def authenticateUser(username, password):
    user = getUser(username)
    if user is None:
        return None, "User doesn't exist in system"
    if password != user.password:
        return None, "Incorrect password"
    return user, 'Success'


def addItem(item_dict):
    item = connection[cur_db].items.Item()
    item.update(item_dict)
    item.save()
    # user = getUser(item.user)
    # addRel(user.item, item._id)
    return item


def addRel(parent, child, linked_by, comment_parent=None):
    rel = connection[cur_db].relations.Relation()
    linked_by = unicode(linked_by)
    rel.update({
        'parent': parent,
        'child': child,
        'linked_by': linked_by
    })
    if comment_parent:
        rel.comment_parent = comment_parent
    rel.save()
    subscribe(rel.linked_by, rel.child)
    return rel


def addUser(username, email, password, dr=None):
    if getUser(username):
        return None, 'This username is taken, please try another.'
    if dbcon.users.User.find_one({'email': unicode(email)}):
        return None, 'This email is taken, please try another.'

    username = unicode(username)
    email = unicode(email)
    password = unicode(password)

    user_item = addUserItem(username)._id
    user = connection[cur_db].users.User()
    user.update({
        'name': username,
        'email': email,
        'password': password,
        'item': user_item
    })
    if dr:
        user.date_registered = dr
    user.save()
    return user, 'Success'


def addUserItem(username):
    username = unicode(username)
    user_item = addItem({
        'body': username + u"'s Item",
        'user': username,
        'tags': [u'user_item']
    })
    return user_item


def getVote(rel_id, username):
    username = unicode(username)
    user = dbcon.users.User.find_one({'name': username, 'votes.rel': rel_id})
    if user:
        for vote in user.votes:
            if vote.rel == rel_id:
                return vote
    return None


def processVote(rel_id, username, vote_type):
    user = getUser(username)
    if user is None:
        return
    if vote_type == 'up':
        is_upvote = True
    else:
        is_upvote = False

    upvote_count, downvote_count = 0, 0

    vote = None
    for i, v in enumerate(user.votes):
        if v['rel'] == rel_id:
            vote = v
            v_index = i

    if vote is None:
        user.votes.append({'rel': rel_id, 'is_upvote': is_upvote})
        if is_upvote:
            upvote_count = 1
        else:
            downvote_count = 1
    else:
        if vote['is_upvote'] == is_upvote:
            user.votes.pop(v_index)
            if is_upvote:
                upvote_count = -1
            else:
                downvote_count = -1
        else:
            user.votes[v_index]['is_upvote'] = is_upvote
            if is_upvote:
                upvote_count, downvote_count = 1, -1
            else:
                downvote_count, upvote_count = 1, -1

    user.save()

    rel = getRel(rel_id)
    rel.upvotes += upvote_count
    rel.downvotes += downvote_count
    rel.save()

    return upvote_count, downvote_count


def subscribe(username, item_id, comments=True):
    if isSubscribed(username, item_id):
        return
    user = getUser(username)
    user.subscriptions.append({
        'item': item_id,
        'comments': comments,
        'seen': datetime.now(),
        'comment_seen': datetime.now()
    })
    user.save()


def getSubscriptions(username):
    user = getUser(username)
    if not hasattr(user, 'subscriptions'):
        return None
    return [s for s in user.subscriptions]


def isSubscribed(username, item_id):
    user = getUser(username)
    if hasattr(user, 'subscriptions'):
        for s in user.subscriptions:
            if s['item'] == item_id:
                return True
    return False


def markSeen(username, item_id, comment=False):
    if not isSubscribed(username, item_id):
        return
    seen = 'seen'
    if comment:
        seen = 'comment_seen'
    user = getUser(username)
    for i, s in enumerate(user.subscriptions):
        if s['item'] == item_id:
            user.subscriptions[i][seen] = datetime.now()
    user.save()


def test(usr='nkessel'):
    usr = getUser(usr)
    for i, s in enumerate(usr.subscriptions):
        print i
        print s
        if s['item '] == 0:
            usr.subscriptions[i]['seen'] = datetime.now()


def createInitialDb():
    connection.drop_database(cur_db)
    #create admin user
    admin, error = addUser('admin', 'yedispaghetti@gmail.com', 'change_this')

    if admin is None:
        return

    #create root item
    root_item = addItem({
        'tldr': u'_root_title_',
        'body': u'_root_body_',
        'user': u'admin'
    })
    global root
    root = root_item

    ret_dict = {
        'root_id': root_item._id,
        'admin': admin.name,
    }
    return ret_dict
