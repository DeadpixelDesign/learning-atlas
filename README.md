# Learning Atlas

A responsive course and certification tracker built with Svelte and Vite. GitHub Pages hosts the static app; Firebase Authentication and Cloud Firestore provide real sign-in and account-scoped progress sync. The catalog includes the user's November 2026 resource guide, Canonical Academy, Ahrefs' AEO course, and the original Microsoft, AWS, Google Cloud, Linux, container, and web infrastructure resources.

**Live site:** https://deadpixeldesign.github.io/learning-atlas/  
**Source repository:** https://github.com/DeadpixelDesign/learning-atlas

## What the checks mean

- **Learning resources** are courses, learning portals, or documentation. Their completion percentage advances when you check **Training complete**.
- **Credential goals** are official certification or credential pages. Their completion percentage advances only when you manually check **Credential awarded**. **Exam / assessment passed**, **Badge claimed**, and **Added to LinkedIn** are separate personal records. Checking a box does not verify an award with the issuer.
- **Added to LinkedIn** appears for every credential, whether or not it has a digital badge. **Badge claimed** appears only where an issuer badge program was identified. Availability can depend on the exact exam or program. Mirantis DCA omits the badge check because this catalog does not assert a specific badge issuance method. SUSE training is included, while SUSE certifications are excluded as requested in the supplied guide.
- The included catalog links to provider-owned pages. Your own entries can link to other sites. Prices, prerequisites, names, and course availability can change; check the provider page before enrolling.

## Manage your library

Open **Manage library** from the dashboard or sidebar. Add, edit, or delete Resources, Career Paths, Courses, and Certificates. Choose a category, including **AEO / SEO / SMO**. The included [Ahrefs Answer Engine Optimization course](https://ahrefs.com/academy/aeo-course) appears there as a **Course** learning resource; its training checkbox is separate from Ahrefs' optional exam.

The **Categories** area on Manage library lets you add topics such as Photography, Typography, Graphic Design, or Illustration, and rename any category. The new names appear in dashboard filters, progress summaries, notes, and entry forms. Category IDs remain stable, so renaming does not change an entry's progress or notes. You can delete a category you added after moving or deleting its entries; included categories can be renamed but remain available for catalog entries.

Edits to included entries are personal to your account; **Reset** returns an edited entry to its included version. **Delete** hides an entry from the dashboard and completion totals; turn on **Show deleted** to restore it later. Its progress flags remain available when restored. New and edited entries sync through the same Firestore progress document, so no additional database or paid service is required.

## Tasks and notes

Open **Tasks** to quickly save a course title, link, or both. Add optional details, mark tasks done, edit or delete them, or use **Add to library** when ready to fill out a full entry. Deleted tasks can be restored from the **Deleted** filter. The dashboard shows the five newest open tasks with a link to the full Tasks page.

Every dashboard entry has a **Notes** button. Notes use a visual editor with a Markdown source mode; the stored value is Markdown text. **Import .md** replaces the open draft with a local Markdown file, and **Save notes** syncs it to your account. The editor is loaded only when you open Notes. For safety and database size, a single note is limited to 100,000 characters and all notes together to 300,000 characters. The editor is built with [Tiptap](https://tiptap.dev/docs/editor/markdown), which currently marks its Markdown extension as beta.

The **Notes** tab collects entries with saved notes. Select one to read its note below the course title, description, and read-only progress status (**Not started**, **Started**, or **Complete**). **Edit note** opens the same visual and Markdown editor. Notes on deleted library entries stay visible here and are labeled accordingly.

## Run locally

Requires Node.js 22 or newer. The supplied Firebase Web app configuration is already in `src/firebase.ts`.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm run check
npm run build
```

The deployable site is generated in `dist/`. Vite uses a relative base path, so the same build works at a GitHub Pages project URL such as `https://USERNAME.github.io/REPOSITORY/`.

## Firebase configuration (free Spark plan)

1. The dashboard is connected to the `cert-tracker-dashboard` Firebase Web app. Its public Web app configuration is in `src/firebase.ts`. **Do not put a password in GitHub or source files.**
2. **Email/Password** authentication is enabled and the requested user account has been created in Firebase. Firebase handles password storage and checking.
3. The default **Cloud Firestore** database is provisioned in `nam5 (United States)`. Its published rules match `firestore.rules`: only the requested account can read and write its own progress, library, tasks, and notes document. All other paths remain denied.
4. Sign in and confirm that a checkbox persists after refresh. Sign in on a second device to confirm sync. The last successful cloud save is authoritative when signing in.

The app does not create accounts or store passwords itself. Firebase handles password checking. The static JavaScript and catalog remain publicly downloadable on GitHub Pages; the rules protect the personal progress data, not the website code.

## Deploy to GitHub Pages

The repository is configured with **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and deploys the site on pushes to `main`. You can also run it manually from the Actions tab. For a new repository, put the contents of this folder at its root and choose GitHub Actions as the Pages source.

If your default branch has another name, change `branches: [main]` in `.github/workflows/deploy.yml`.

## Your data and backups

Progress, personal library edits and categories, tasks, and Markdown notes are saved to Firestore under the signed-in Firebase user ID and cached in this browser's `localStorage` under account-specific keys (`learning-atlas-progress-v2`, `learning-atlas-library-v1`, `learning-atlas-tasks-v1`, and `learning-atlas-notes-v1`). They sync on sign-in and after changes when online. The browser cache is a fallback if cloud loading fails; it is not encrypted and is removed when you sign out after a successful cloud save. GitHub Pages does not store your personal data.

Use **Export backup** to download a JSON file containing progress, library edits, tasks, and notes (version 3). Use **Import backup** to restore it; import validates the file and asks before replacing current data. Older version 1 and 2 backups remain importable. Version 1 replaces progress only; version 2 replaces progress and library edits while preserving tasks and notes that still match an entry. Keep the backup somewhere safe. Imports sync to Firestore after confirmation.

## Update the catalog

Use **Manage library** for personal changes. Edit `src/catalog.ts` for hand-curated entries shared by all deployments and `src/guide-catalog.json` for entries imported from the supplied guide. Each entry has a stable `id`, provider, title, category, kind, summary, and URL. Keep IDs stable after publishing, because they are the keys used for saved progress. Set `badge: true` only when the specific credential has an issuer-backed badge program. The guide import script can regenerate the JSON from a Markdown checklist: `python3 scripts/import-guide.py /path/to/guide.txt`.

The guide entries retain their P1/P2/P3 priorities and COURSE/DOCS/RESOURCE/CERT labels. The original guide is user supplied; review its links with providers before buying a course or scheduling an exam. The core provider pages below were checked against provider sites during development.

Official starting points include [Microsoft Learn](https://learn.microsoft.com/training/), [AWS Skill Builder](https://skillbuilder.aws/), [Google Cloud training](https://cloud.google.com/learn/training), [Linux Foundation learning paths](https://training.linuxfoundation.org/learning-paths/), [Red Hat training](https://www.redhat.com/en/services/training/all-courses-exams), [LPI Learning](https://learning.lpi.org/), [CompTIA training](https://www.comptia.org/en-us/training/), [SUSE training](https://www.suse.com/training/), [Apache HTTP Server docs](https://httpd.apache.org/docs/), [NGINX docs](https://nginx.org/en/docs/), [Mirantis DCA](https://training.mirantis.com/certification/dca-certification-exam/), [CNCF CKA](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/), [Vercel Academy](https://vercel.com/academy), [Netlify Developer Guides](https://developers.netlify.com/guides/), and [Cloudflare resources](https://developers.cloudflare.com/resources/).
