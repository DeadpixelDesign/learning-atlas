# Learning Atlas

A responsive course and certification tracker built with Svelte and Vite. GitHub Pages hosts the static app; Firebase Authentication and Cloud Firestore provide real sign-in and account-scoped progress sync. The catalog includes the user's November 2026 resource guide, Canonical Academy, and the original Microsoft, AWS, Google Cloud, Linux, container, and web infrastructure resources.

## What the checks mean

- **Learning resources** are courses, learning portals, or documentation. Their completion percentage advances when you check **Training complete**.
- **Credential goals** are official certification or credential pages. Their completion percentage advances only when you manually check **Credential awarded**. **Exam / assessment passed**, **Badge claimed**, and **Added to LinkedIn** are separate personal records. Checking a box does not verify an award with the issuer.
- **Added to LinkedIn** appears for every credential, whether or not it has a digital badge. **Badge claimed** appears only where an issuer badge program was identified. Availability can depend on the exact exam or program. Mirantis DCA omits the badge check because this catalog does not assert a specific badge issuance method. SUSE training is included, while SUSE certifications are excluded as requested in the supplied guide.
- The catalog links to provider-owned pages. Prices, prerequisites, names, and course availability can change; check the official page before enrolling.

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

## Set up Firebase (free Spark plan)

1. The dashboard is connected to the `cert-tracker-dashboard` Firebase Web app. Its public Web app configuration is in `src/firebase.ts`. **Do not put a password in GitHub or source files.**
2. In **Authentication → Sign-in method**, enable **Email/Password**. In **Authentication → Users**, add the single email account requested for this dashboard and set its password there. Because a password was shared in this chat, consider using a new password before publishing.
3. In **Authentication → Settings → Authorized domains**, add your GitHub Pages domain (`USERNAME.github.io`) and `localhost` for local testing if they are not already present.
4. Create a **Cloud Firestore** database. In **Firestore Database → Rules**, replace the rules with the contents of `firestore.rules` and publish them. These rules allow only the requested email account to access its own progress document. Other paths remain denied.
5. Sign in locally and confirm that a checkbox persists after refresh. Sign in on a second device to confirm sync. The last successful cloud save is authoritative when signing in.

The app does not create accounts or store passwords itself. Firebase handles password checking. The static JavaScript and catalog remain publicly downloadable on GitHub Pages; the rules protect the personal progress data, not the website code.

## Deploy to GitHub Pages

1. Create a GitHub repository. Put the **contents of this `course-dashboard` folder at the repository root**, including `.github/workflows/deploy.yml` and `package-lock.json`.
2. Commit the files and push them to a branch named `main`.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to succeed. The deployment job displays your site URL. Usually it is `https://USERNAME.github.io/REPOSITORY/`.
5. Later pushes to `main` redeploy the site automatically. You can also run the workflow manually from the Actions tab.

If your default branch has another name, change `branches: [main]` in `.github/workflows/deploy.yml`.

## Your data and backups

Progress is saved to Firestore under the signed-in Firebase user ID and cached in this browser's `localStorage` under `learning-atlas-progress-v2-USER_ID`. It syncs on sign-in and after changes when online. The browser cache is a fallback if cloud loading fails; it is not encrypted and is removed when you sign out after a successful cloud save. GitHub Pages does not store your progress.

Use **Export backup** to download a JSON file. Use **Import backup** to restore it; import validates the file and asks before replacing current progress. Keep the backup somewhere safe. Imports sync to Firestore after confirmation.

## Update the catalog

Edit `src/catalog.ts` for hand-curated entries and `src/guide-catalog.json` for entries imported from the supplied guide. Each entry has a stable `id`, provider, title, category, kind, summary, and URL. Keep IDs stable after publishing, because they are the keys used for saved progress. Set `badge: true` only when the specific credential has an issuer-backed badge program. The guide import script can regenerate the JSON from a Markdown checklist: `python3 scripts/import-guide.py /path/to/guide.txt`.

The guide entries retain their P1/P2/P3 priorities and COURSE/DOCS/RESOURCE/CERT labels. The original guide is user supplied; review its links with providers before buying a course or scheduling an exam. The core provider pages below were checked against provider sites during development.

Official starting points include [Microsoft Learn](https://learn.microsoft.com/training/), [AWS Skill Builder](https://skillbuilder.aws/), [Google Cloud training](https://cloud.google.com/learn/training), [Linux Foundation learning paths](https://training.linuxfoundation.org/learning-paths/), [Red Hat training](https://www.redhat.com/en/services/training/all-courses-exams), [LPI Learning](https://learning.lpi.org/), [CompTIA training](https://www.comptia.org/en-us/training/), [SUSE training](https://www.suse.com/training/), [Apache HTTP Server docs](https://httpd.apache.org/docs/), [NGINX docs](https://nginx.org/en/docs/), [Mirantis DCA](https://training.mirantis.com/certification/dca-certification-exam/), [CNCF CKA](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/), [Vercel Academy](https://vercel.com/academy), [Netlify Developer Guides](https://developers.netlify.com/guides/), and [Cloudflare resources](https://developers.cloudflare.com/resources/).
