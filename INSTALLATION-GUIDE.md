# Installation Guide — MCHFMS

This guide gets the project running on your computer from scratch. It assumes **nothing is installed yet**. Written for Windows (with macOS notes where it differs). Total time: **±20 minutes**, mostly waiting for downloads.

> **Already have Node.js 18+?** Skip straight to [Step 3](#step-3--open-the-project-in-vs-code).

---

## What you're installing and why

| Tool | Why it's needed | Size |
| --- | --- | --- |
| **Node.js (LTS)** | Runs the build tools and local dev server. Includes **npm**, which installs everything else. | ~30 MB |
| Project packages (`npm install`) | React, Vite, Tailwind, the Supabase client, etc. — downloaded automatically into the project folder. | ~300 MB |

You do **not** need a database server, .NET, Python, or anything else — the database lives in Supabase (cloud).

---

## Step 1 · Install Node.js

### Windows

1. Go to [nodejs.org](https://nodejs.org).
2. Click the big green **LTS** (Long Term Support) button to download the installer (`.msi`).
3. Run the installer. Keep clicking **Next** — the defaults are all correct.
   - Leave **"Add to PATH"** checked (it is by default — this is important).
   - You do **not** need the optional "Tools for Native Modules" (Chocolatey) checkbox.
4. Finish the installer.

### macOS

Easiest is the installer from [nodejs.org](https://nodejs.org) (the `.pkg`, same idea), or with Homebrew: `brew install node`.

### Verify it worked

Open a **new** terminal (Windows: press `Win + R`, type `cmd`, Enter — or use the VS Code terminal from Step 3):

```
node -v
npm -v
```

Both should print a version number (e.g. `v22.11.0` and `10.9.0`). Any Node **v18 or newer** works.

> **"node is not recognized"** → the terminal was open before installation. Close it and open a new one. Still failing? Re-run the installer and make sure "Add to PATH" is ticked.

---

## Step 2 · Get the project onto your computer

1. Unzip `MCHFMS-munsieville-heritage-app.zip` — e.g. right-click → **Extract All…** → choose `Documents`.
2. You now have a folder like `Documents\app`. Everything below happens **inside this folder**.

---

## Step 3 · Open the project in VS Code

1. Install [Visual Studio Code](https://code.visualstudio.com) if you don't have it (free, defaults are fine).
2. In VS Code: **File → Open Folder…** → select the `app` folder.
3. Open VS Code's built-in terminal: **Terminal → New Terminal** (or `` Ctrl + ` ``).
   The terminal opens already inside the project folder — you'll see something like
   `PS C:\Users\you\Documents\app>`.

---

## Step 4 · Install the project packages

In that terminal, run:

```
npm install
```

- This reads `package.json` and downloads all ±40 libraries the app uses into a new `node_modules/` folder.
- Expect **1–3 minutes** and a wall of text. Warnings in yellow are normal.
- Success looks like: `added 380 packages, and audited 381 packages in 2m`.

> **`npm : File ... cannot be loaded because running scripts is disabled`** (PowerShell):
> run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, then retry `npm install`.
>
> **Very slow / network errors:** check your internet, or retry — npm resumes where it stopped.

---

## Step 5 · Add your database credentials

1. In VS Code, right-click `.env.example` → **Copy**, then **Paste** → rename the copy to `.env`.
2. Open `.env` and paste in your Supabase values (from the
   [SUPABASE-SETUP-GUIDE.md](SUPABASE-SETUP-GUIDE.md), Step 3):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…your-anon-key…
```

3. Save the file. (`.env` is git-ignored — it will never be committed or uploaded.)

---

## Step 6 · Run the app

```
npm run dev
```

- You'll see: `Local: http://localhost:3000/`
- Hold **Ctrl** and click that link (or copy it into your browser).
- The Munsieville Heritage site loads. Any file you edit in `src/` reloads the browser instantly.
- To **stop** the server: click the terminal and press **Ctrl + C**.

### Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (you'll use this 99% of the time) |
| `npm run build` | Build the production version into `dist/` |
| `npm run preview` | Serve the production build locally to test it |
| `npm run lint` | Check the code for problems |

---

## Done checklist

- [ ] `node -v` prints v18 or newer
- [ ] `npm install` completed without red errors
- [ ] `.env` exists and contains your two Supabase values
- [ ] `npm run dev` starts and http://localhost:3000 shows real events and stories
- [ ] You can register an account and sign in

All ticked? Head to [SUPABASE-SETUP-GUIDE.md](SUPABASE-SETUP-GUIDE.md) Step 6 to make yourself an admin.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node` / `npm` "is not recognized" | Open a **new** terminal; if still broken, reinstall Node.js with "Add to PATH" ticked |
| PowerShell "running scripts is disabled" | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` then retry |
| `npm install` fails with red errors | Delete the `node_modules` folder and `package-lock.json`, run `npm install` again |
| Port 3000 already in use | Another dev server is running — stop it (Ctrl+C in its terminal) or use `npm run dev -- --port 3001` |
| Site loads but shows "database is not connected" | `.env` is missing/has wrong values, or you edited it while the server was running — save the file and restart `npm run dev` |
| Blank page in an old browser | Use a current Chrome, Edge or Firefox |
