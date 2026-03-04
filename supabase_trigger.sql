-- Run this SQL in your Supabase SQL Editor to automatically create a Profile when a user signs up.

-- 1. Create a trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public."Profile" (id, name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'sales') -- Default role: sales
  );
  return new;
end;
$$;

-- 2. Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
