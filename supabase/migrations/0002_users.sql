-- AI Atlas — users, personalization and gamification.
-- On Supabase, `auth.users` and `auth.uid()` exist. On plain PostgreSQL (local
-- development / CI) we create a minimal shim so the schema still applies.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    create table auth.users (id uuid primary key, email text);
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'uid') then
    execute 'create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid $f$';
  end if;
end $$;

create table if not exists profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  locale     text not null default 'en' check (locale in ('en','fr')),
  -- weights for the explainable recommender, user-tunable later
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Countries, industries, topics or organizations a user follows.
create table if not exists followed_entities (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('country','industry','topic','organization')),
  entity_id   text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table if not exists saved_articles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  article_id text not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table if not exists user_interactions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('view_article','open_source','view_country','view_industry','search','save','unsave')),
  article_id  text references articles(id) on delete set null,
  entity_id   text,
  created_at  timestamptz not null default now()
);
create index if not exists user_interactions_user_idx on user_interactions (user_id, created_at desc);

create table if not exists achievements (
  slug           text primary key,
  name_en        text not null,
  name_fr        text not null,
  description_en text not null,
  description_fr text not null
);

create table if not exists user_achievements (
  user_id          uuid not null references auth.users(id) on delete cascade,
  achievement_slug text not null references achievements(slug),
  unlocked_at      timestamptz not null default now(),
  primary key (user_id, achievement_slug)
);

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table followed_entities enable row level security;
alter table saved_articles enable row level security;
alter table user_interactions enable row level security;
alter table user_achievements enable row level security;
alter table achievements enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','followed_entities','saved_articles','user_interactions','user_achievements'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'own rows') then
      execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    end if;
  end loop;
  if not exists (select 1 from pg_policies where tablename = 'achievements' and policyname = 'public read') then
    create policy "public read" on achievements for select using (true);
  end if;
end $$;
