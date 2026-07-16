-- 家用補貨提醒：Supabase 一次性設定
-- 在 Supabase Dashboard > SQL Editor 新增查詢、貼上整份內容並按 Run。

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.restock_accounts (
  account_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint restock_account_id_length check (char_length(account_id) between 1 and 30),
  constraint restock_payload_is_object check (jsonb_typeof(payload) = 'object')
);

revoke all on table private.restock_accounts from public, anon, authenticated;

-- 只允許用「完整 ID」讀取一筆，不能透過 REST 列出所有 ID。
create or replace function public.get_restock_data(p_account_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_id text := btrim(coalesce(p_account_id, ''));
begin
  if char_length(normalized_id) < 1 or char_length(normalized_id) > 30 then
    raise exception 'ID 長度必須為 1 到 30 個字元' using errcode = '22023';
  end if;

  return (
    select account.payload
    from private.restock_accounts as account
    where account.account_id = normalized_id
  );
end;
$$;

create or replace function public.save_restock_data(p_account_id text, p_payload jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_id text := btrim(coalesce(p_account_id, ''));
  saved_at timestamptz := now();
begin
  if char_length(normalized_id) < 1 or char_length(normalized_id) > 30 then
    raise exception 'ID 長度必須為 1 到 30 個字元' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception '資料格式必須是 JSON 物件' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload -> 'items') <> 'array' or jsonb_typeof(p_payload -> 'categories') <> 'array' then
    raise exception '資料必須包含 items 與 categories 陣列' using errcode = '22023';
  end if;
  if octet_length(p_payload::text) > 1000000 then
    raise exception '單一 ID 的資料不可超過 1 MB' using errcode = '22023';
  end if;

  insert into private.restock_accounts (account_id, payload, updated_at)
  values (normalized_id, p_payload, saved_at)
  on conflict (account_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  return saved_at;
end;
$$;

create or replace function public.delete_restock_data(p_account_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_id text := btrim(coalesce(p_account_id, ''));
  deleted_count integer;
begin
  if char_length(normalized_id) < 1 or char_length(normalized_id) > 30 then
    raise exception 'ID 長度必須為 1 到 30 個字元' using errcode = '22023';
  end if;

  delete from private.restock_accounts
  where account_id = normalized_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.get_restock_data(text) from public;
revoke all on function public.save_restock_data(text, jsonb) from public;
revoke all on function public.delete_restock_data(text) from public;
grant execute on function public.get_restock_data(text) to anon, authenticated;
grant execute on function public.save_restock_data(text, jsonb) to anon, authenticated;
grant execute on function public.delete_restock_data(text) to anon, authenticated;
