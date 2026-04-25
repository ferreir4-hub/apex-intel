-- Corre isto no SQL Editor do Supabase

create table if not exists ratings (
  ticker        text primary key,
  rating        text not null check (rating in ('Strong Buy','Buy','Hold','Sell','Strong Sell')),
  confidence    text,
  analysis_text text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger ratings_updated_at before update on ratings
  for each row execute function update_updated_at();

create table if not exists portfolio (
  id serial primary key, ticker text not null unique, name text, value numeric, pnl numeric,
  pnl_pct numeric, weight numeric, sector text, buy_price numeric, created_at timestamptz default now()
);

alter table ratings   enable row level security;
alter table portfolio enable row level security;
create policy "allow all ratings"   on ratings   for all using (true) with check (true);
create policy "allow all portfolio" on portfolio for all using (true) with check (true);
