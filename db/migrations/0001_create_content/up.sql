create table site (
  id integer primary key not null check (id = 1),
  data text not null
);

create table projects (
  id text primary key not null,
  slug text not null unique,
  title text not null,
  published integer not null default 0,
  position integer not null default 0,
  data text not null
);

create table experience (
  id text primary key not null,
  position integer not null default 0,
  data text not null
);

create table skill_groups (
  id text primary key not null,
  position integer not null default 0,
  data text not null
);

create table media (
  id text primary key not null,
  created_at text not null,
  data text not null
);
