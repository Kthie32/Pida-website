# PIDA backend setup (Supabase)

This folder contains the database for the PIDA website: tables, security rules, file storage and functions.
The website and the admin dashboard (at `/admin`) both use it.

```
supabase/
├── migrations/                      Run these 5 files, in this order
│   ├── 20261028100000_core_schema.sql      tables, roles, constraints, indexes, triggers
│   ├── 20261028100100_rls_policies.sql     who can read / write what (Row Level Security)
│   ├── 20261028100200_storage.sql          the "media" file bucket and its rules
│   ├── 20261028100300_functions.sql        submit_enquiry(), dashboard_stats(), enquiries_by_day()
│   └── 20261028100400_admin_users.sql      admin_add_profile() used by the dashboard's "Add administrator"
└── seed/
    ├── first_admin.sql                     creates the first super administrator (run by hand, once)
    └── initial_content_from_current_site.sql   OPTIONAL: copies the website's current programmes and contact details in
```

## 1. Create your Supabase project (about 5 minutes)

1. Go to <https://supabase.com>, sign up, and click **New project**.
2. Name it `pida-website`. Choose a region close to your visitors (for Uganda, a European region such as Frankfurt or London is usually fastest).
3. Create a **long database password** and store it in a password manager. You will rarely need it. **Never put it in this project or in Git.**
4. Wait until the project finishes setting up.

## 2. Run the migrations

1. In Supabase, open **SQL Editor > New query**.
2. Open `supabase/migrations/20261028100000_core_schema.sql` in VS Code, copy everything, paste it into the editor and click **Run**.
   You should see **Success. No rows returned.**
3. Repeat for the other four migration files, **in filename order**.
4. If a script reports an error, copy the exact message and send it to me. Do not skip it. (All four scripts are safe to run again.)

**Recommended:** run `seed/initial_content_from_current_site.sql` the same way. It copies the six programme cards and the
contact details that the website already shows, so you can edit them from the dashboard straight away.

## 3. Switch off public sign-up

There must be no way for a stranger to create an account.

Supabase > **Authentication > Sign In / Providers** (the wording may differ slightly) > turn **off** "Allow new users to sign up".

Even if someone did create an auth user, the database would give that person **no** access, because access requires an
active row in `profiles`, which only a super administrator can create.

## 4. Create the first administrator (securely)

1. Supabase > **Authentication > Users > Add user > Create new user**. Use the real email address, a long unique password, and tick **Auto Confirm User**.
2. Open `supabase/seed/first_admin.sql`, replace the two values marked `CHANGE ME`, paste it into the SQL Editor and **Run**.
   It will say `Super administrator ready` if it worked.
3. Do not save that file with real details into Git (or discard the change afterwards).

To add more people later: create their login the same way (step 1), then in the dashboard open **Users & roles > Add administrator**
and enter the same email. The dashboard never holds a secret key, which is why the login itself is created in Supabase.

## 5. Connect the website to your project

1. Supabase > **Project Settings > API** (or "API Keys"). Copy the **Project URL** and the **anon / public** key.
   Do **not** use the `service_role` key anywhere in this project.
2. In the VS Code terminal (project folder), run:
   ```
   Copy-Item .env.example .env.local
   ```
3. Open `.env.local` and replace the two placeholder values. This file is ignored by Git.
4. Install the new dependency and restart:
   ```
   npm.cmd install
   npm.cmd run dev
   ```
   (Stop the old `npm.cmd run dev` first with `Ctrl` + `C`.)

## 6. Test that the security rules really work

Run these in PowerShell. They act as an ordinary **visitor** (using only the public key).
Replace the two values at the top. Every line marked "must be blocked" must print `BLOCKED/ERROR`.

```powershell
$url = "https://YOUR-PROJECT-REF.supabase.co"
$key = "YOUR-PUBLIC-ANON-KEY"
$h = @{ apikey = $key; Authorization = "Bearer $key" }
function Call($path, $method = "Get", $body = $null) {
  try {
    if ($body) { Invoke-RestMethod "$url$path" -Method $method -Headers $h -ContentType "application/json" -Body $body }
    else       { Invoke-RestMethod "$url$path" -Method $method -Headers $h }
  } catch { "BLOCKED/ERROR -> " + $_.ErrorDetails.Message }
}

Call "/rest/v1/enquiries?select=*"                        # 1. must be blocked (private enquiries)
Call "/rest/v1/profiles?select=*"                         # 2. must be blocked (administrator details)
Call "/rest/v1/programmes?select=title,status"            # 3. works: only PUBLISHED programmes appear
Call "/rest/v1/programmes" "Post" '{"slug":"x","title":"Hack","points":["x"],"status":"published"}'   # 4. must be blocked
Call "/rest/v1/rpc/dashboard_stats" "Post" '{}'           # 5. must be blocked
Call "/rest/v1/rpc/submit_enquiry" "Post" '{"p_name":"Test Person","p_email":"not-an-email","p_message":"Testing the form"}'   # 6. must be rejected: invalid_email
Call "/rest/v1/rpc/submit_enquiry" "Post" '{"p_name":"Test Person","p_email":"test@example.com","p_interest":"Something else","p_message":"This is a test enquiry."}'   # 7. works: returns an id
```

Test 7 stores one real test enquiry. You can delete it later from the dashboard (or Supabase > Table Editor > enquiries).
Send me the output of all seven lines and I will check them with you.

## 7. Who can do what

| | Visitor | Editor | Admin | Super admin |
| --- | :-: | :-: | :-: | :-: |
| Read published programmes, news, content, public settings | yes | yes | yes | yes |
| Read drafts | no | yes | yes | yes |
| Create and edit programmes, news, content, media | no | yes | yes | yes |
| Publish, unpublish, archive | no | no | yes | yes |
| Delete content and media | no | no | yes | yes |
| Read and manage enquiries | no | no | yes | yes |
| Change website settings | no | no | yes | yes |
| Manage administrator accounts and roles | no | no | no | yes |
| Send an enquiry (only through `submit_enquiry`) | yes | yes | yes | yes |

These rules are enforced **inside the database** (Row Level Security, database triggers and function checks), not just by hiding buttons.
The database also refuses to leave the site without an active super administrator.

## 8. Check it works with the dashboard (about 10 minutes)

Do this once on your real project. It confirms the security rules behave as designed.

1. Open `http://localhost:5173/admin`, sign in with the super administrator account.
2. **Dashboard**: the numbers are real (all zero on a new project).
3. **Settings**: save the contact details, then open the public site and check the top bar, contact section and footer changed.
4. **Programmes**: if you ran the optional seed, six programmes are listed. Unpublish one, refresh the public site (it disappears), publish it again.
5. **News**: write and publish a story. It appears on the public site; "Read more" opens it.
6. **Media**: upload a small photo, then choose it as a programme picture.
7. **Contact form**: send a message on the public site. It should appear in **Enquiries**. Mark it resolved.
8. **Editor test**: add a second person with the role **Editor** (Users & roles), sign in as them in a private browser window. They should see no Enquiries, Users or Settings pages, and every programme or story they save should be a draft.
9. Run the PowerShell visitor tests in section 6 again. The same lines must still be blocked.

If any step behaves differently, send me exactly what you did and what you saw.

## What was tested, and what was not

- The dashboard and the public website were tested in an automated browser test against a **simulated** database (42 checks: login and logout, redirects, role-based menus, creating, publishing and unpublishing content, enquiries, uploads, settings, mobile layout, and the public site showing the changes).
- The **SQL files and the real security rules were not executed** against a real Supabase project by the author. Section 6 and section 8 are how you confirm them on your own project.
