-- Jalankan di Supabase > SQL Editor
create table if not exists yearbook_pages (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  kind text not null default 'text',   -- cover | text | photo | quote
  title text default '',
  body text default '',
  image_url text default '',
  created_at timestamptz default now()
);
alter table yearbook_pages enable row level security;
create policy "publik boleh baca" on yearbook_pages for select using (true);
create policy "admin boleh ubah" on yearbook_pages for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('yearbook', 'yearbook', true) on conflict do nothing;
create policy "publik baca gambar" on storage.objects for select using (bucket_id = 'yearbook');
create policy "admin upload gambar" on storage.objects for all to authenticated using (bucket_id = 'yearbook') with check (bucket_id = 'yearbook');
-- Lalu buat user admin: Authentication > Users > Add user (email + password)
