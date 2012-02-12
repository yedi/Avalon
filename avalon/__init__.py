from __future__ import with_statement
from contextlib import closing
from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, jsonify

# configuration
DATABASE = 'avalon/tmp/avalon.db'
DEBUG = True
SECRET_KEY = "avalon's key"
MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017

app = Flask(__name__)
app.config.from_object(__name__)

import avalon.views

if __name__ == '__main__':
    app.run()
