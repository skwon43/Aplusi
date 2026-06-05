create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values
  ('thumbnails', 'thumbnails', true),
  ('project-files', 'project-files', true),
  ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  builder_name text not null default 'A&I Builder',
  category text not null default 'Web',
  thumbnail_url text,
  demo_url text default '',
  github_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects add column if not exists title text;
alter table public.projects add column if not exists description text default '';
alter table public.projects add column if not exists builder_name text not null default 'A&I Builder';
alter table public.projects add column if not exists category text not null default 'Web';
alter table public.projects add column if not exists thumbnail_url text;
alter table public.projects add column if not exists demo_url text default '';
alter table public.projects add column if not exists github_url text default '';
alter table public.projects add column if not exists created_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_label text not null,
  change_summary text default '',
  created_at timestamptz default now()
);

alter table public.project_versions add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.project_versions add column if not exists version_label text;
alter table public.project_versions add column if not exists change_summary text default '';
alter table public.project_versions add column if not exists created_at timestamptz default now();

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.project_versions(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size bigint default 0,
  created_at timestamptz default now()
);

alter table public.project_files add column if not exists version_id uuid references public.project_versions(id) on delete cascade;
alter table public.project_files add column if not exists file_name text;
alter table public.project_files add column if not exists file_url text;
alter table public.project_files add column if not exists file_size bigint default 0;
alter table public.project_files add column if not exists created_at timestamptz default now();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('project', 'idea', 'insight', 'announcement', 'community')),
  target_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  depth integer not null default 0 check (depth between 0 and 2),
  author_name text not null default 'A&I Builder',
  body text not null,
  feedback_type text,
  created_at timestamptz default now()
);

alter table public.comments add column if not exists target_type text;
alter table public.comments add column if not exists target_id uuid;
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists depth integer default 0;
alter table public.comments add column if not exists author_name text default 'A&I Builder';
alter table public.comments add column if not exists body text;
alter table public.comments add column if not exists feedback_type text;
alter table public.comments add column if not exists created_at timestamptz default now();

alter table public.comments drop constraint if exists comments_target_type_check;
alter table public.comments add constraint comments_target_type_check
check (target_type in ('project', 'idea', 'insight', 'announcement', 'community'));

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_name text not null,
  category text default '자유',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.community_posts add column if not exists title text;
alter table public.community_posts add column if not exists body text;
alter table public.community_posts add column if not exists author_name text;
alter table public.community_posts add column if not exists category text default '자유';
alter table public.community_posts add column if not exists created_at timestamptz default now();
alter table public.community_posts add column if not exists updated_at timestamptz default now();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages add column if not exists author_name text;
alter table public.chat_messages add column if not exists body text;
alter table public.chat_messages add column if not exists created_at timestamptz default now();

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text default '',
  author_name text not null default 'A&I Builder',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ideas add column if not exists title text;
alter table public.ideas add column if not exists body text default '';
alter table public.ideas add column if not exists author_name text default 'A&I Builder';
alter table public.ideas add column if not exists created_at timestamptz default now();
alter table public.ideas add column if not exists updated_at timestamptz default now();

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text default '',
  author_name text not null default 'A&I Builder',
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.insights add column if not exists title text;
alter table public.insights add column if not exists body text default '';
alter table public.insights add column if not exists author_name text default 'A&I Builder';
alter table public.insights add column if not exists source_url text;
alter table public.insights add column if not exists created_at timestamptz default now();
alter table public.insights add column if not exists updated_at timestamptz default now();

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text default '',
  author_name text not null default 'A&I Team',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.announcements add column if not exists title text;
alter table public.announcements add column if not exists body text default '';
alter table public.announcements add column if not exists author_name text default 'A&I Team';
alter table public.announcements add column if not exists created_at timestamptz default now();
alter table public.announcements add column if not exists updated_at timestamptz default now();

create index if not exists project_versions_project_id_created_at_idx
on public.project_versions(project_id, created_at desc);

create index if not exists project_files_version_id_created_at_idx
on public.project_files(version_id, created_at desc);

create index if not exists comments_target_idx
on public.comments(target_type, target_id, created_at desc);

create index if not exists community_posts_created_at_idx
on public.community_posts(created_at desc);

create index if not exists chat_messages_created_at_idx
on public.chat_messages(created_at desc);

create index if not exists ideas_created_at_idx
on public.ideas(created_at desc);

create index if not exists insights_created_at_idx
on public.insights(created_at desc);

create index if not exists announcements_created_at_idx
on public.announcements(created_at desc);

alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_files enable row level security;
alter table public.comments enable row level security;
alter table public.community_posts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ideas enable row level security;
alter table public.insights enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "public read projects" on public.projects;
drop policy if exists "public insert projects" on public.projects;
drop policy if exists "public update projects" on public.projects;
drop policy if exists "public delete projects" on public.projects;
create policy "public read projects" on public.projects for select using (true);
create policy "public insert projects" on public.projects for insert with check (true);
create policy "public update projects" on public.projects for update using (true) with check (true);
create policy "public delete projects" on public.projects for delete using (true);

drop policy if exists "public read project versions" on public.project_versions;
drop policy if exists "public insert project versions" on public.project_versions;
drop policy if exists "public update project versions" on public.project_versions;
drop policy if exists "public delete project versions" on public.project_versions;
create policy "public read project versions" on public.project_versions for select using (true);
create policy "public insert project versions" on public.project_versions for insert with check (true);
create policy "public update project versions" on public.project_versions for update using (true) with check (true);
create policy "public delete project versions" on public.project_versions for delete using (true);

drop policy if exists "public read project files" on public.project_files;
drop policy if exists "public insert project files" on public.project_files;
drop policy if exists "public update project files" on public.project_files;
drop policy if exists "public delete project files" on public.project_files;
create policy "public read project files" on public.project_files for select using (true);
create policy "public insert project files" on public.project_files for insert with check (true);
create policy "public update project files" on public.project_files for update using (true) with check (true);
create policy "public delete project files" on public.project_files for delete using (true);

drop policy if exists "public read comments" on public.comments;
drop policy if exists "public insert comments" on public.comments;
drop policy if exists "public update comments" on public.comments;
drop policy if exists "public delete comments" on public.comments;
create policy "public read comments" on public.comments for select using (true);
create policy "public insert comments" on public.comments for insert with check (true);
create policy "public update comments" on public.comments for update using (true) with check (true);
create policy "public delete comments" on public.comments for delete using (true);

drop policy if exists "public read community posts" on public.community_posts;
drop policy if exists "public insert community posts" on public.community_posts;
drop policy if exists "public update community posts" on public.community_posts;
drop policy if exists "public delete community posts" on public.community_posts;
create policy "public read community posts" on public.community_posts for select using (true);
create policy "public insert community posts" on public.community_posts for insert with check (true);
create policy "public update community posts" on public.community_posts for update using (true) with check (true);
create policy "public delete community posts" on public.community_posts for delete using (true);

drop policy if exists "public read chat messages" on public.chat_messages;
drop policy if exists "public insert chat messages" on public.chat_messages;
drop policy if exists "public update chat messages" on public.chat_messages;
drop policy if exists "public delete chat messages" on public.chat_messages;
create policy "public read chat messages" on public.chat_messages for select using (true);
create policy "public insert chat messages" on public.chat_messages for insert with check (true);
create policy "public update chat messages" on public.chat_messages for update using (true) with check (true);
create policy "public delete chat messages" on public.chat_messages for delete using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chat_messages'
    )
  then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;

drop policy if exists "public read ideas" on public.ideas;
drop policy if exists "public insert ideas" on public.ideas;
drop policy if exists "public update ideas" on public.ideas;
drop policy if exists "public delete ideas" on public.ideas;
create policy "public read ideas" on public.ideas for select using (true);
create policy "public insert ideas" on public.ideas for insert with check (true);
create policy "public update ideas" on public.ideas for update using (true) with check (true);
create policy "public delete ideas" on public.ideas for delete using (true);

drop policy if exists "public read insights" on public.insights;
drop policy if exists "public insert insights" on public.insights;
drop policy if exists "public update insights" on public.insights;
drop policy if exists "public delete insights" on public.insights;
create policy "public read insights" on public.insights for select using (true);
create policy "public insert insights" on public.insights for insert with check (true);
create policy "public update insights" on public.insights for update using (true) with check (true);
create policy "public delete insights" on public.insights for delete using (true);

drop policy if exists "public read announcements" on public.announcements;
drop policy if exists "public insert announcements" on public.announcements;
drop policy if exists "public update announcements" on public.announcements;
drop policy if exists "public delete announcements" on public.announcements;
create policy "public read announcements" on public.announcements for select using (true);
create policy "public insert announcements" on public.announcements for insert with check (true);
create policy "public update announcements" on public.announcements for update using (true) with check (true);
create policy "public delete announcements" on public.announcements for delete using (true);

drop policy if exists "public read a-and-i storage objects" on storage.objects;
drop policy if exists "public insert a-and-i storage objects" on storage.objects;
drop policy if exists "public update a-and-i storage objects" on storage.objects;
drop policy if exists "public delete a-and-i storage objects" on storage.objects;

create policy "public read a-and-i storage objects"
on storage.objects for select
using (bucket_id in ('thumbnails', 'project-files', 'brand-assets'));

create policy "public insert a-and-i storage objects"
on storage.objects for insert
with check (bucket_id in ('thumbnails', 'project-files', 'brand-assets'));

create policy "public update a-and-i storage objects"
on storage.objects for update
using (bucket_id in ('thumbnails', 'project-files', 'brand-assets'))
with check (bucket_id in ('thumbnails', 'project-files', 'brand-assets'));

create policy "public delete a-and-i storage objects"
on storage.objects for delete
using (bucket_id in ('thumbnails', 'project-files', 'brand-assets'));
