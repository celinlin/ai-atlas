-- AI Atlas — core news schema (PostgreSQL 15+ / Supabase)
-- Reference data (countries, industries, topics) is upserted by `npm run db:migrate`.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Immutable wrapper so unaccent can be used in generated columns / indexes.
create or replace function public.atlas_unaccent(text) returns text
  language sql immutable parallel safe strict as $$ select public.unaccent('public.unaccent', $1) $$;

create table if not exists countries (
  code        char(2) primary key,
  name_en     text not null,
  name_fr     text not null,
  region      text not null,
  subregion   text,
  lat         double precision,
  lng         double precision
);

create table if not exists industries (
  slug    text primary key,
  name_en text not null,
  name_fr text not null
);

create table if not exists topics (
  slug    text primary key,
  name_en text not null,
  name_fr text not null
);

create table if not exists sources (
  id           text primary key,
  name         text not null,
  url          text not null,
  -- Where the PUBLISHER is based. Never used as the location of a development.
  country_code char(2) references countries(code),
  kind         text not null check (kind in ('rss','gdelt','eventregistry','newsapi','official','demo')),
  reliability  real not null default 0.6 check (reliability between 0 and 1),
  license_note text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists organizations (
  id         bigserial primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists articles (
  id                text primary key,
  slug              text not null unique,
  title             text not null,
  summary           text not null default '',
  summary_source    text not null default 'extractive' check (summary_source in ('llm','extractive','curated')),
  url               text not null,
  canonical_url     text not null unique,
  title_fingerprint text not null default '',
  image_url         text,
  language          text not null default 'en',
  published_at      timestamptz not null,
  ingested_at       timestamptz not null default now(),
  source_id         text not null references sources(id),
  content_type      text not null check (content_type in ('innovation','deployment','research','startups','investment','products','regulation','partnership','infrastructure')),
  quality           real not null default 0.5 check (quality between 0 and 1),
  coverage          integer not null default 1,
  status            text not null default 'classified' check (status in ('raw','classified','summarized','rejected')),
  trace             jsonb not null default '{}'::jsonb,
  is_demo           boolean not null default false,
  search            tsvector generated always as (
                      setweight(to_tsvector('simple', public.atlas_unaccent(coalesce(title, ''))), 'A') ||
                      setweight(to_tsvector('simple', public.atlas_unaccent(coalesce(summary, ''))), 'B')
                    ) stored,
  updated_at        timestamptz not null default now()
);
create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_search_idx on articles using gin (search);
create index if not exists articles_fingerprint_idx on articles using gin (title_fingerprint gin_trgm_ops);
create index if not exists articles_type_idx on articles (content_type);

-- An article can concern several countries. `role` separates where the event
-- happens ('event') from countries merely referenced ('mentioned').
create table if not exists article_countries (
  article_id   text not null references articles(id) on delete cascade,
  country_code char(2) not null references countries(code),
  role         text not null check (role in ('event','mentioned')),
  confidence   real not null default 0.5,
  primary key (article_id, country_code)
);
create index if not exists article_countries_country_idx on article_countries (country_code, role);

create table if not exists article_industries (
  article_id    text not null references articles(id) on delete cascade,
  industry_slug text not null references industries(slug),
  primary key (article_id, industry_slug)
);
create index if not exists article_industries_slug_idx on article_industries (industry_slug);

create table if not exists article_topics (
  article_id text not null references articles(id) on delete cascade,
  topic_slug text not null references topics(slug),
  primary key (article_id, topic_slug)
);
create index if not exists article_topics_slug_idx on article_topics (topic_slug);

create table if not exists article_organizations (
  article_id      text not null references articles(id) on delete cascade,
  organization_id bigint not null references organizations(id) on delete cascade,
  primary key (article_id, organization_id)
);

create table if not exists ingestion_jobs (
  id          text primary key,
  provider    text not null,
  started_at  timestamptz not null,
  finished_at timestamptz,
  status      text not null check (status in ('running','success','partial','failed')),
  fetched     integer not null default 0,
  inserted    integer not null default 0,
  duplicates  integer not null default 0,
  rejected    integer not null default 0,
  errors      jsonb not null default '[]'::jsonb
);
create index if not exists ingestion_jobs_started_idx on ingestion_jobs (started_at desc);

-- Denormalized read model used by the API (one row per article, JSON relations).
create or replace view article_full as
select
  a.*,
  jsonb_build_object('id', s.id, 'name', s.name, 'url', s.url, 'country', s.country_code, 'kind', s.kind, 'reliability', s.reliability) as source_json,
  coalesce((select jsonb_agg(jsonb_build_object('code', ac.country_code, 'role', ac.role, 'confidence', ac.confidence) order by ac.role, ac.confidence desc)
            from article_countries ac where ac.article_id = a.id), '[]'::jsonb) as countries_json,
  coalesce((select array_agg(ai.industry_slug) from article_industries ai where ai.article_id = a.id), '{}') as industry_slugs,
  coalesce((select array_agg(at.topic_slug) from article_topics at where at.article_id = a.id), '{}') as topic_slugs,
  coalesce((select array_agg(o.name) from article_organizations ao join organizations o on o.id = ao.organization_id where ao.article_id = a.id), '{}') as organization_names
from articles a
join sources s on s.id = a.source_id;

-- Public read access when exposed through Supabase PostgREST.
alter table articles enable row level security;
alter table article_countries enable row level security;
alter table article_industries enable row level security;
alter table article_topics enable row level security;
alter table article_organizations enable row level security;
alter table sources enable row level security;
alter table organizations enable row level security;
alter table countries enable row level security;
alter table industries enable row level security;
alter table topics enable row level security;
alter table ingestion_jobs enable row level security; -- no public policy: admin/service only

do $$
declare t text;
begin
  foreach t in array array['articles','article_countries','article_industries','article_topics','article_organizations','sources','organizations','countries','industries','topics'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'public read') then
      execute format('create policy "public read" on %I for select using (true)', t);
    end if;
  end loop;
end $$;
