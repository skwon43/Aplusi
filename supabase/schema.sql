create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('showcase-screenshots', 'showcase-screenshots', true)
on conflict (id) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text default 'web',
  owner_name text default 'anonymous',
  collaborators text[] default '{}',
  tags text[] default '{}',
  visibility text default 'public',
  status text default 'in_progress',
  likes integer default 0,
  download_count integer default 0,
  fork_count integer default 0,
  original_project_id uuid references public.projects(id) on delete set null,
  fork_author text,
  forked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects add column if not exists description text default '';
alter table public.projects add column if not exists category text default 'web';
alter table public.projects add column if not exists owner_name text default 'anonymous';
alter table public.projects add column if not exists collaborators text[] default '{}';
alter table public.projects add column if not exists tags text[] default '{}';
alter table public.projects add column if not exists visibility text default 'public';
alter table public.projects add column if not exists status text default 'in_progress';
alter table public.projects add column if not exists likes integer default 0;
alter table public.projects add column if not exists download_count integer default 0;
alter table public.projects add column if not exists fork_count integer default 0;
alter table public.projects add column if not exists original_project_id uuid references public.projects(id) on delete set null;
alter table public.projects add column if not exists fork_author text;
alter table public.projects add column if not exists forked_at timestamptz;
alter table public.projects add column if not exists created_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();

create table if not exists public.project_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  folder_path text default '',
  created_by text default 'anonymous',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_folders add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.project_folders add column if not exists name text;
alter table public.project_folders add column if not exists folder_path text default '';
alter table public.project_folders add column if not exists created_by text default 'anonymous';
alter table public.project_folders add column if not exists created_at timestamptz default now();
alter table public.project_folders add column if not exists updated_at timestamptz default now();

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  folder_path text default '',
  resource_type text default 'file',
  original_name text not null,
  file_name text not null,
  mime_type text default '',
  size_bytes bigint default 0,
  storage_path text,
  public_url text,
  external_url text,
  relative_path text,
  content text default '',
  version_group text not null,
  version_number integer default 1,
  created_by text default 'anonymous',
  download_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_files add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.project_files add column if not exists folder_path text default '';
alter table public.project_files add column if not exists resource_type text default 'file';
alter table public.project_files add column if not exists original_name text;
alter table public.project_files add column if not exists file_name text;
alter table public.project_files add column if not exists mime_type text default '';
alter table public.project_files add column if not exists size_bytes bigint default 0;
alter table public.project_files add column if not exists storage_path text;
alter table public.project_files add column if not exists public_url text;
alter table public.project_files add column if not exists external_url text;
alter table public.project_files add column if not exists relative_path text;
alter table public.project_files add column if not exists content text default '';
alter table public.project_files add column if not exists version_group text;
alter table public.project_files add column if not exists version_number integer default 1;
alter table public.project_files add column if not exists created_by text default 'anonymous';
alter table public.project_files add column if not exists download_count integer default 0;
alter table public.project_files add column if not exists created_at timestamptz default now();
alter table public.project_files add column if not exists updated_at timestamptz default now();

create table if not exists public.project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default 'anonymous',
  feedback_type text default 'suggestion',
  body text not null,
  parent_feedback_id uuid references public.project_feedback(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_feedback add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.project_feedback add column if not exists author_name text default 'anonymous';
alter table public.project_feedback add column if not exists feedback_type text default 'suggestion';
alter table public.project_feedback add column if not exists body text;
alter table public.project_feedback add column if not exists parent_feedback_id uuid references public.project_feedback(id) on delete cascade;
alter table public.project_feedback add column if not exists created_at timestamptz default now();
alter table public.project_feedback add column if not exists updated_at timestamptz default now();

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default 'anonymous',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.file_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_id uuid references public.project_files(id) on delete cascade,
  author_name text default 'anonymous',
  body text not null,
  line_number integer,
  parent_comment_id uuid references public.file_comments(id) on delete cascade,
  resolved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.file_comments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.file_comments add column if not exists file_id uuid references public.project_files(id) on delete cascade;
alter table public.file_comments add column if not exists author_name text default 'anonymous';
alter table public.file_comments add column if not exists body text;
alter table public.file_comments add column if not exists line_number integer;
alter table public.file_comments add column if not exists parent_comment_id uuid references public.file_comments(id) on delete cascade;
alter table public.file_comments add column if not exists resolved boolean default false;
alter table public.file_comments add column if not exists created_at timestamptz default now();
alter table public.file_comments add column if not exists updated_at timestamptz default now();

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default 'anonymous',
  title text not null,
  body text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_updates add column if not exists updated_at timestamptz default now();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default 'anonymous',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  actor_name text default 'anonymous',
  action_type text default 'activity',
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'idea',
  author_name text default 'anonymous',
  body text default '',
  upvotes integer default 0,
  created_at timestamptz default now()
);

alter table public.ideas add column if not exists category text default 'idea';
alter table public.ideas add column if not exists author_name text default 'anonymous';
alter table public.ideas add column if not exists body text default '';
alter table public.ideas add column if not exists upvotes integer default 0;
alter table public.ideas add column if not exists created_at timestamptz default now();

create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade,
  author_name text default 'anonymous',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text default '',
  demo_url text default '',
  screenshot_path text,
  screenshot_url text,
  likes integer default 0,
  created_at timestamptz default now()
);

alter table public.showcases add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.showcases add column if not exists description text default '';
alter table public.showcases add column if not exists demo_url text default '';
alter table public.showcases add column if not exists screenshot_path text;
alter table public.showcases add column if not exists screenshot_url text;
alter table public.showcases add column if not exists likes integer default 0;
alter table public.showcases add column if not exists created_at timestamptz default now();

create table if not exists public.showcase_feedback (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid references public.showcases(id) on delete cascade,
  author_name text default 'anonymous',
  body text not null,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;
alter table public.project_folders enable row level security;
alter table public.project_files enable row level security;
alter table public.project_feedback enable row level security;
alter table public.project_comments enable row level security;
alter table public.file_comments enable row level security;
alter table public.project_updates enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;
alter table public.showcases enable row level security;
alter table public.showcase_feedback enable row level security;

drop policy if exists "public read projects" on public.projects;
drop policy if exists "public insert projects" on public.projects;
drop policy if exists "public update projects" on public.projects;
drop policy if exists "public delete projects" on public.projects;
create policy "public read projects" on public.projects for select using (true);
create policy "public insert projects" on public.projects for insert with check (true);
create policy "public update projects" on public.projects for update using (true) with check (true);
create policy "public delete projects" on public.projects for delete using (true);

drop policy if exists "public read project folders" on public.project_folders;
drop policy if exists "public insert project folders" on public.project_folders;
drop policy if exists "public update project folders" on public.project_folders;
drop policy if exists "public delete project folders" on public.project_folders;
create policy "public read project folders" on public.project_folders for select using (true);
create policy "public insert project folders" on public.project_folders for insert with check (true);
create policy "public update project folders" on public.project_folders for update using (true) with check (true);
create policy "public delete project folders" on public.project_folders for delete using (true);

drop policy if exists "public read project files" on public.project_files;
drop policy if exists "public insert project files" on public.project_files;
drop policy if exists "public update project files" on public.project_files;
drop policy if exists "public delete project files" on public.project_files;
create policy "public read project files" on public.project_files for select using (true);
create policy "public insert project files" on public.project_files for insert with check (true);
create policy "public update project files" on public.project_files for update using (true) with check (true);
create policy "public delete project files" on public.project_files for delete using (true);

drop policy if exists "public read project feedback" on public.project_feedback;
drop policy if exists "public insert project feedback" on public.project_feedback;
drop policy if exists "public update project feedback" on public.project_feedback;
drop policy if exists "public delete project feedback" on public.project_feedback;
create policy "public read project feedback" on public.project_feedback for select using (true);
create policy "public insert project feedback" on public.project_feedback for insert with check (true);
create policy "public update project feedback" on public.project_feedback for update using (true) with check (true);
create policy "public delete project feedback" on public.project_feedback for delete using (true);

drop policy if exists "public read project comments" on public.project_comments;
drop policy if exists "public insert project comments" on public.project_comments;
drop policy if exists "public delete project comments" on public.project_comments;
create policy "public read project comments" on public.project_comments for select using (true);
create policy "public insert project comments" on public.project_comments for insert with check (true);
create policy "public delete project comments" on public.project_comments for delete using (true);

drop policy if exists "public read file comments" on public.file_comments;
drop policy if exists "public insert file comments" on public.file_comments;
drop policy if exists "public update file comments" on public.file_comments;
drop policy if exists "public delete file comments" on public.file_comments;
create policy "public read file comments" on public.file_comments for select using (true);
create policy "public insert file comments" on public.file_comments for insert with check (true);
create policy "public update file comments" on public.file_comments for update using (true) with check (true);
create policy "public delete file comments" on public.file_comments for delete using (true);

drop policy if exists "public read project updates" on public.project_updates;
drop policy if exists "public insert project updates" on public.project_updates;
drop policy if exists "public update project updates" on public.project_updates;
drop policy if exists "public delete project updates" on public.project_updates;
create policy "public read project updates" on public.project_updates for select using (true);
create policy "public insert project updates" on public.project_updates for insert with check (true);
create policy "public update project updates" on public.project_updates for update using (true) with check (true);
create policy "public delete project updates" on public.project_updates for delete using (true);

drop policy if exists "public read chat messages" on public.chat_messages;
drop policy if exists "public insert chat messages" on public.chat_messages;
drop policy if exists "public delete chat messages" on public.chat_messages;
create policy "public read chat messages" on public.chat_messages for select using (true);
create policy "public insert chat messages" on public.chat_messages for insert with check (true);
create policy "public delete chat messages" on public.chat_messages for delete using (true);

drop policy if exists "public read activity logs" on public.activity_logs;
drop policy if exists "public insert activity logs" on public.activity_logs;
create policy "public read activity logs" on public.activity_logs for select using (true);
create policy "public insert activity logs" on public.activity_logs for insert with check (true);

drop policy if exists "public read ideas" on public.ideas;
drop policy if exists "public insert ideas" on public.ideas;
drop policy if exists "public update ideas" on public.ideas;
drop policy if exists "public delete ideas" on public.ideas;
create policy "public read ideas" on public.ideas for select using (true);
create policy "public insert ideas" on public.ideas for insert with check (true);
create policy "public update ideas" on public.ideas for update using (true) with check (true);
create policy "public delete ideas" on public.ideas for delete using (true);

drop policy if exists "public read idea comments" on public.idea_comments;
drop policy if exists "public insert idea comments" on public.idea_comments;
drop policy if exists "public delete idea comments" on public.idea_comments;
create policy "public read idea comments" on public.idea_comments for select using (true);
create policy "public insert idea comments" on public.idea_comments for insert with check (true);
create policy "public delete idea comments" on public.idea_comments for delete using (true);

drop policy if exists "public read showcases" on public.showcases;
drop policy if exists "public insert showcases" on public.showcases;
drop policy if exists "public update showcases" on public.showcases;
drop policy if exists "public delete showcases" on public.showcases;
create policy "public read showcases" on public.showcases for select using (true);
create policy "public insert showcases" on public.showcases for insert with check (true);
create policy "public update showcases" on public.showcases for update using (true) with check (true);
create policy "public delete showcases" on public.showcases for delete using (true);

drop policy if exists "public read showcase feedback" on public.showcase_feedback;
drop policy if exists "public insert showcase feedback" on public.showcase_feedback;
drop policy if exists "public delete showcase feedback" on public.showcase_feedback;
create policy "public read showcase feedback" on public.showcase_feedback for select using (true);
create policy "public insert showcase feedback" on public.showcase_feedback for insert with check (true);
create policy "public delete showcase feedback" on public.showcase_feedback for delete using (true);

drop policy if exists "public read project file objects" on storage.objects;
drop policy if exists "public insert project file objects" on storage.objects;
drop policy if exists "public update project file objects" on storage.objects;
drop policy if exists "public delete project file objects" on storage.objects;

create policy "public read project file objects"
on storage.objects for select
using (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public insert project file objects"
on storage.objects for insert
with check (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public update project file objects"
on storage.objects for update
using (bucket_id in ('project-files', 'showcase-screenshots'))
with check (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public delete project file objects"
on storage.objects for delete
using (bucket_id in ('project-files', 'showcase-screenshots'));
