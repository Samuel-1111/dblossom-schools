# Administrator bootstrap

Administrator authentication is handled by Supabase Auth. There is intentionally no hardcoded school administrator password in this repository.

## First administrator

1. In Supabase Dashboard → Authentication → Users, create the administrator email/password account and confirm the email.
2. Copy the Auth user UUID.
3. Run:

```sql
insert into public.profiles (id, full_name, role)
values ('AUTH_USER_UUID', 'School Administrator', 'admin')
on conflict (id) do update
set full_name = excluded.full_name,
    role = excluded.role;
```

4. Sign in at `/admin-login` using the Auth email/password.
5. Verify the account can open `/admin-dashboard` and that accounts with role `student`, `teacher`, or `parent` are rejected.

For a second high-privilege administrator, use `super_admin`. Do not create administrator credentials in source code or school tables.
