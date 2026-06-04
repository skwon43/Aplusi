create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  status text default '기획 중',
  updates integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  provider text default 'ChatGPT',
  title text not null,
  prompt text default '',
  output text default '',
  created_at timestamptz default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '창업',
  body text default '',
  upvotes integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '시장 조사',
  content text default '',
  rating numeric default 5,
  created_at timestamptz default now()
);

create table if not exists public.build_logs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text default '',
  log_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  demo_url text default '',
  likes integer default 0,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ideas enable row level security;
alter table public.prompts enable row level security;
alter table public.build_logs enable row level security;
alter table public.showcases enable row level security;

create policy "public read projects" on public.projects for select using (true);
create policy "public insert projects" on public.projects for insert with check (true);
create policy "public update projects" on public.projects for update using (true);
create policy "public delete projects" on public.projects for delete using (true);

create policy "public read ai conversations" on public.ai_conversations for select using (true);
create policy "public insert ai conversations" on public.ai_conversations for insert with check (true);
create policy "public update ai conversations" on public.ai_conversations for update using (true);
create policy "public delete ai conversations" on public.ai_conversations for delete using (true);

create policy "public read ideas" on public.ideas for select using (true);
create policy "public insert ideas" on public.ideas for insert with check (true);
create policy "public update ideas" on public.ideas for update using (true);
create policy "public delete ideas" on public.ideas for delete using (true);

create policy "public read prompts" on public.prompts for select using (true);
create policy "public insert prompts" on public.prompts for insert with check (true);
create policy "public update prompts" on public.prompts for update using (true);
create policy "public delete prompts" on public.prompts for delete using (true);

create policy "public read build logs" on public.build_logs for select using (true);
create policy "public insert build logs" on public.build_logs for insert with check (true);
create policy "public update build logs" on public.build_logs for update using (true);
create policy "public delete build logs" on public.build_logs for delete using (true);

create policy "public read showcases" on public.showcases for select using (true);
create policy "public insert showcases" on public.showcases for insert with check (true);
create policy "public update showcases" on public.showcases for update using (true);
create policy "public delete showcases" on public.showcases for delete using (true);
