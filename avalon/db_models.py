from mongokit import Document, DocumentMigration
from bson import ObjectId
from datetime import datetime


def max_length(length):
    def validate(value):
        if len(value) <= length:
            return True
        raise Exception('%s must be at most %s characters long' % length)
    return validate

"""
class db(Document):
    __collection__ = 'blog_posts'
    structure = {
    }
    validators = {
    }
    use_dot_notation = True

    def __repr__(self):
        return '<db %r>' % (self.item)
"""


class Item(Document):
    __collection__ = 'items'

    structure = {
        "tldr": unicode,
        "body": unicode,
        "user": unicode,
        "time_submitted": datetime,
        "upvotes": int,
        "downvotes": int,
        "tags": [unicode]
    }

    validators = {
    }

    indexes = [
        {'fields':['user']},
        {'fields':['tags']}
    ]

    use_dot_notation = True

    required_fields = ['body', 'user', 'time_submitted']
    default_values = {'time_submitted': datetime.now}

    def __repr__(self):
        return '<item %r>' % (self._id)


class Relation(Document):
    __collection__ = 'relations'
    structure = {
        "parent": ObjectId,
        "child": ObjectId,
        "time_linked": datetime,
        "linked_by": unicode,
        "upvotes": int,
        "downvotes": int,
        "comment_parent": ObjectId
    }

    validators = {
    }
    indexes = [
        {'fields':['parent', 'child']},
        {'fields':['linked_by']},
        {'fields':['comment_parent']}
    ]

    use_dot_notation = True

    required_fields = ['parent', 'child', 'time_linked', 'linked_by', 'upvotes', 'downvotes']
    default_values = {'time_linked': datetime.now,
                      'upvotes': 0, 'downvotes': 0}

    def __repr__(self):
        return '<rel %r>' % (self._id)


class UserMigration(DocumentMigration):
    def migration01__add_links_field(self):
        self.target = {'links': {'$exists': False}}
        self.update = {'$set': {'links': []}}

    def migration01__add_subscriptions_field(self):
        self.target = {'subscriptions': {'$exists': False}}
        self.update = {'$set': {'subscriptions': []}}


class User(Document):
    __collection__ = 'users'
    structure = {
        'name': unicode,
        'email': unicode,
        'password': unicode,
        'date_registered': datetime,
        'acc_activated': bool,
        'votes': [{
            "rel": ObjectId,
            "is_upvote": bool
        }],
        'item': ObjectId,
        'links': [{
            'name': unicode,
            'url': unicode
        }],
        'subscriptions': [{
            'item': ObjectId,
            'comments': bool,
            'seen': datetime,
            'comment_seen': datetime
        }]
    }
    validators = {
    }
    indexes = [
        {
            'fields':['name'],
            'unique':True
        },
        {
            'fields':['email'],
            'unique':True
        },
        {
            'fields':['item'],
            'unique':True
        }
    ]
    use_dot_notation = True
    required_fields = ['name', 'email', 'password', 'date_registered', 'acc_activated', 'item']
    default_values = {'date_registered': datetime.now, 'acc_activated': False}
    migration_handler = UserMigration

    def __repr__(self):
        return '<User %r>' % (self.name)
