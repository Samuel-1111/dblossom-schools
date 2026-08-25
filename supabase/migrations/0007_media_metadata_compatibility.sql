-- Add Admin media metadata without deleting or rewriting existing media rows.
alter table public.events
  add column if not exists category text not null default 'Other',
  add column if not exists status text not null default 'Published';

alter table public.gallery_images
  add column if not exists category text not null default 'Other';

create index if not exists events_status_category_idx
  on public.events(status, category);

create index if not exists gallery_images_category_idx
  on public.gallery_images(category);
