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
  category text default '웹앱',
  owner_name text default '익명',
  status text default '진행 중',
  created_at timestamptz default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  resource_type text default 'file' check (resource_type in ('file', 'image', 'link')),
  original_name text not null,
  file_name text not null,
  mime_type text default '',
  size_bytes bigint default 0,
  storage_path text,
  public_url text,
  external_url text,
  version_group text not null,
  version_number integer default 1,
  created_by text default '익명',
  created_at timestamptz default now()
);

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default '익명',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.file_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_id uuid references public.project_files(id) on delete cascade,
  author_name text default '익명',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default '익명',
  title text not null,
  body text default '',
  created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_name text default '익명',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  actor_name text default '익명',
  action_type text default 'activity',
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '아이디어',
  author_name text default '익명',
  body text default '',
  upvotes integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade,
  author_name text default '익명',
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

create table if not exists public.showcase_feedback (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid references public.showcases(id) on delete cascade,
  author_name text default '익명',
  body text not null,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.project_comments enable row level security;
alter table public.file_comments enable row level security;
alter table public.project_updates enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;
alter table public.showcases enable row level security;
alter table public.showcase_feedback enable row level security;

create policy "public read projects" on public.projects for select using (true);
create policy "public insert projects" on public.projects for insert with check (true);
create policy "public update projects" on public.projects for update using (true);
create policy "public delete projects" on public.projects for delete using (true);

create policy "public read project files" on public.project_files for select using (true);
create policy "public insert project files" on public.project_files for insert with check (true);
create policy "public update project files" on public.project_files for update using (true);
create policy "public delete project files" on public.project_files for delete using (true);

create policy "public read project comments" on public.project_comments for select using (true);
create policy "public insert project comments" on public.project_comments for insert with check (true);
create policy "public delete project comments" on public.project_comments for delete using (true);

create policy "public read file comments" on public.file_comments for select using (true);
create policy "public insert file comments" on public.file_comments for insert with check (true);
create policy "public delete file comments" on public.file_comments for delete using (true);

create policy "public read project updates" on public.project_updates for select using (true);
create policy "public insert project updates" on public.project_updates for insert with check (true);
create policy "public delete project updates" on public.project_updates for delete using (true);

create policy "public read chat messages" on public.chat_messages for select using (true);
create policy "public insert chat messages" on public.chat_messages for insert with check (true);
create policy "public delete chat messages" on public.chat_messages for delete using (true);

create policy "public read activity logs" on public.activity_logs for select using (true);
create policy "public insert activity logs" on public.activity_logs for insert with check (true);

create policy "public read ideas" on public.ideas for select using (true);
create policy "public insert ideas" on public.ideas for insert with check (true);
create policy "public update ideas" on public.ideas for update using (true);
create policy "public delete ideas" on public.ideas for delete using (true);

create policy "public read idea comments" on public.idea_comments for select using (true);
create policy "public insert idea comments" on public.idea_comments for insert with check (true);
create policy "public delete idea comments" on public.idea_comments for delete using (true);

create policy "public read showcases" on public.showcases for select using (true);
create policy "public insert showcases" on public.showcases for insert with check (true);
create policy "public update showcases" on public.showcases for update using (true);
create policy "public delete showcases" on public.showcases for delete using (true);

create policy "public read showcase feedback" on public.showcase_feedback for select using (true);
create policy "public insert showcase feedback" on public.showcase_feedback for insert with check (true);
create policy "public delete showcase feedback" on public.showcase_feedback for delete using (true);

create policy "public read project file objects"
on storage.objects for select
using (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public insert project file objects"
on storage.objects for insert
with check (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public update project file objects"
on storage.objects for update
using (bucket_id in ('project-files', 'showcase-screenshots'));

create policy "public delete project file objects"
on storage.objects for delete
using (bucket_id in ('project-files', 'showcase-screenshots'));
