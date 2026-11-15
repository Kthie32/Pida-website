# PIDA Website

Website for **Pearl Integrated Development Agency (PIDA)**, a women-led, community-based organisation in Busia District, Eastern Uganda.
Built with **React** and **Vite**, with its own **local server and SQL database** (SQLite). Supabase is no longer used.

---

## Quick start: local server and database

Needs Node.js **22.13 or newer** (SQLite is built into Node, so there is nothing else to install).

| What | Command | Then open |
|---|---|---|
| Run the finished website + dashboard | `npm start` | <http://localhost:3000> and <http://localhost:3000/admin> |
| Edit the site with live reload | `npm run server` in one terminal, `npm run dev` in another | <http://localhost:5173> |
| Create / reset a super administrator | `npm run create-admin -- you@example.com "Password" "Full Name"` | |

- **Database:** `server/data/pida.db` (one file). **Uploaded images:** `server/data/uploads/`. Back up the whole `server/data` folder.
- **Server code:** `server/index.js` (website, API and all permission rules), `server/db.js` (tables).
- Other accounts are created by a super administrator in the dashboard under **Users & roles**.
- `npm run import-supabase` copied the published content from the old Supabase project (already done; safe to re-run).
- The `supabase/` folder and the sections below about Supabase are kept only for reference.

---

## 1. What you need first (one time only)

Install **Node.js (LTS version)** from <https://nodejs.org>. Accept the default options in the installer, then restart VS Code.

To check it worked, open a terminal in VS Code and type:

```
node -v
```

You should see a version number such as `v20.x.x` or `v22.x.x` (version 18 or newer is fine).

---

## 2. Run the website on your Windows computer

1. Right-click `pida-website.zip` and choose **Extract All...**
2. Open **Visual Studio Code**.
3. Choose **File > Open Folder...** and select the extracted **`pida-website`** folder.
4. Open the terminal inside VS Code: **Terminal > New Terminal** (or press `Ctrl` + `` ` ``).
5. Type these two commands, one at a time, pressing `Enter` after each:

```
npm.cmd install
npm.cmd run dev
```

6. The terminal will show a line like `Local:   http://localhost:5173/`.
   Hold `Ctrl` and click it, or copy it into your browser. Your website appears.
7. To stop the website, click in the terminal and press `Ctrl` + `C`.

> **Why `npm.cmd` and not `npm`?** On many Windows computers PowerShell blocks `npm` scripts with a red "running scripts is disabled" message. `npm.cmd` avoids that problem.

The first `npm.cmd install` needs an internet connection and takes a minute or two. It creates a `node_modules` folder (do not edit or share it).

---

## 3. Prepare the website for deployment

```
npm.cmd run build
```

This creates a **`dist`** folder containing the finished, optimised website. Upload the **contents of `dist`** to your web host (for example Netlify, Vercel, GitHub Pages, cPanel or any static hosting).

To look at the finished build on your own computer before uploading:

```
npm.cmd run preview
```

Then open the address it prints (usually `http://localhost:4173/`).

| Command | What it does |
| --- | --- |
| `npm.cmd install` | Downloads the tools the project needs (once) |
| `npm.cmd run dev` | Starts the website for editing; updates as you save |
| `npm.cmd run build` | Creates the `dist` folder for deployment |
| `npm.cmd run preview` | Shows the built `dist` site locally |

---

## 4. What is in the project

```
pida-website/
├── index.html            The page shell (also loads the Google Fonts)
├── package.json          Project settings and the commands above
├── vite.config.js        Vite settings (no changes needed)
├── public/
│   └── favicon.png       The small icon in the browser tab (PIDA logo)
└── src/
    ├── main.jsx          Starts the app
    ├── App.jsx           The page = these sections, one after another
    ├── styles/index.css  All colours, spacing and animations
    ├── data/
    │   ├── content.js    ALL the website text and lists (edit words here)
    │   └── images.js     Which picture is used where
    ├── assets/           The logo and photos
    ├── hooks/            Small helpers for the animated counters
    ├── components/       One file per section: Header, Hero, About, Impact,
    │                     Programmes, Vision, News, Involved, Contact, Footer
    └── admin/            The administrator dashboard (see section 8)
```

---

## 5. How to make common changes

- **Change wording** (hero messages, programme cards, figures, news stories, partner/volunteer cards): edit `src/data/content.js`.
- **Change contact details**: they are in `src/components/Contact.jsx`, `src/components/Header.jsx` and `src/components/Footer.jsx`.
- **Change colours**: at the top of `src/styles/index.css`, `--brand` (main red), `--brand-d` (darker red), `--rose` (light pink) and `--tint` (pale pink).
- **Replace photos**: put your new photo in `src/assets/` and either keep the same file name, or change the file names in `src/data/images.js`. Use photos taken with the consent of the people in them (and of a parent or guardian for anyone under 18).
- **Change the counter hold time**: `HOLD_MS` in `src/hooks/useLoopCount.js` (30000 = 30 seconds).

---

## 6. Important things to do before the site goes public

1. **Replace the temporary photos.** The three photos in `src/assets/` (`photo-children.webp`, `photo-girls.webp`, `photo-celebration.webp`) were provided for the demo and come from another organisation's work (some show its logo). They must be replaced with PIDA's own photos, or with photos you have written permission to use, before the site is published.
2. **Check the impact figures.** The four figures in "Local action, real community value" (80+ women-led businesses, 80 out-of-school girls, 4 schools, 2 spring wells) are taken from PIDA's own website and organisational profile. Confirm they are current, and keep or remove the note under the heading, before using them in grant applications.
3. **The contact form needs the backend.** Once Supabase is set up (section 8), messages are stored in the database and shown in the dashboard under Enquiries. Without it, the form says it is not connected and sends nothing. Email alerts for new enquiries are not included: check the dashboard (the bell shows the count).
4. **The three sample stories only show when no backend is connected.** With the backend on, the website shows only stories you publish in the dashboard.
5. **Draft wording.** The "Our values" text and the four small statements in each programme and "Get involved" card are written from PIDA's website; please read them and correct anything that is not accurate. Donation options are not shown because none have been confirmed.
6. **Fonts.** The site uses the Google Fonts "Fraunces" and "Inter", loaded in `index.html`. Without an internet connection it falls back to Georgia and the system font, so the look differs slightly.

---

## 7. Troubleshooting

- **Red text saying "running scripts is disabled"**: use `npm.cmd` instead of `npm`, as shown above.
- **`'node' is not recognized`**: install Node.js (step 1), then close and reopen VS Code.
- **`npm.cmd install` fails or is very slow**: check your internet connection and try again. If you see errors about an old Node version, install the latest LTS Node.js.
- **Port already in use**: Vite will pick the next free port and print it. Use the address it shows.
- **A blank white page**: press `F12`, open the **Console** tab and read the first red message; send it to whoever is helping you.

---

## 8. Backend and admin dashboard

The project includes a Supabase database and a secure administrator dashboard.

| Address | What it is |
| --- | --- |
| `http://localhost:5173/` | The public website |
| `http://localhost:5173/admin` | The administrator dashboard (login required, no public sign-up) |

**Without a backend** (no `.env.local`), the public website works exactly as before and shows its built-in content. The contact form says it is not connected and never claims a message was sent. `/admin` explains that the backend is not set up yet.

**With a backend**, set it up once by following **`supabase/README.md`** (create the free Supabase project, run the 5 SQL files, switch off public sign-up, create the first administrator, copy `.env.example` to `.env.local` and fill in the two public values), then run `npm.cmd install` and `npm.cmd run dev`.

What the dashboard manages, and what then changes on the public site:

| Dashboard page | Public website |
| --- | --- |
| Programmes | The "Our work" cards (published ones; the built-in six show if none are published) |
| News | The "Latest news and updates" cards and the Read more pop-up |
| Pages & content | Hero messages and photos, four-ideas strip, Who we are, impact figures, mission and values, Get involved, section headings |
| Media library | Photos for the above (upload, describe, pick) |
| Settings | Phone, email, address and organisation name in the top bar, contact section and footer |
| Enquiries | Messages sent through the contact form (administrators only) |
| Users & roles | Who can sign in, and their role (super administrators only) |

Roles: **editor** (writes drafts, uploads media), **administrator** (also publishes, deletes, reads enquiries, edits settings), **super administrator** (also manages accounts). These limits are enforced inside the database, not only in the screens.

### Project structure (new parts)

```
src/
├── Root.jsx               Routes: "/" = website, "/admin/*" = dashboard (loaded only when opened)
├── content/SiteContent.jsx   Gives the public sections their content (database, or built-in fallback)
├── lib/                   supabase.js (connection) and publicApi.js (what visitors may call)
├── data/blocks.js         The editable sections of the home page: form definition + built-in wording
└── admin/                 The dashboard: pages/, api.js (every backend call), AuthContext.jsx, ui.jsx, admin.css
supabase/                  SQL migrations, seed scripts and setup guide
public/_redirects, vercel.json, public/.htaccess   Make /admin work when refreshed on a live host
```

## 9. Deploying online

1. Push the project to GitHub (the `.gitignore` already keeps `.env.local` and `node_modules` out).
2. Use a host that serves single-page apps, such as **Netlify** or **Vercel** (both are free to start): import the repository, build command `npm run build`, publish folder `dist`.
3. In the host's settings add the two environment variables from `.env.example` (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) with your real values, then deploy. **Never** add the `service_role` key or the database password.
4. In Supabase > Authentication > URL Configuration set **Site URL** to your live address.
5. Open `https://your-address/admin` and sign in.
6. Cheap shared hosting (cPanel): run `npm.cmd run build`, upload everything inside `dist` to `public_html`. The included `.htaccess` makes `/admin` work.

Before going public: replace the temporary photos (section 6 above), check the figures, and test the contact form with a real message.
