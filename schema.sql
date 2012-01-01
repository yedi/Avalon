drop table if exists items;
create table items (
  id integer primary key autoincrement,
  title string not null,
  body string not null,
  user_id integer not null,
  time_submitted datetime not null,
  upvotes integer DEFAULT (0) not null,
  downvotes integer DEFAULT (0) not null,
  foreign key(user_id) references users(id)
);

insert into items (id, title, body, user_id, time_submitted) values (0, "_root_title_", "_root_body_", 0, "now");

drop table if exists relations;
create table relations (
  parent integer not null,
  child integer not null,
  foreign key(parent) references users(id),
  foreign key(child) references users(id)
);

drop table if exists tags;
create table tags (
  id integer primary key autoincrement,
  name string not null
);

drop table if exists tag_relations;
create table tag_relations (
  item integer not null,
  tag integer not null,
  foreign key(item) references item(id),
  foreign key(tag) references tags(id)
);

drop table if exists users;
create table users (
  id integer primary key autoincrement,
  username string not null,
  email string not null,
  password string not null,
  date_registered datetime DEFAULT (DATETIME('now')) not null,
  email_activated integer DEFAULT (0) not null
);

insert into users (id, username, email, password, email_activated) values (0, "admin", "yedispaghetti@gmail.com", 0, "now");

drop table if exists votes;
create table votes (
  item_id integer not null,
  user_id integer not null,
  vote_type integer not null,
  foreign key(item_id) references items(id),
  foreign key(user_id) references users(id)
);