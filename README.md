# Joel Dyter Cabinet Maker: website

A fast static website built with [Eleventy](https://www.11ty.dev/). Joel can add projects, reviews and prices himself through a simple editor at `/admin/`.

- **Preview:** GitHub Pages (`https://<github-user>.github.io/joel-dyter/`)
- **Live:** Armour Hosting (cPanel / Apache / PHP), `https://www.joeldyter.co.uk`

## Run it locally

```bash
npm install
npm start        # http://localhost:8080, rebuilds as you edit
npm run build    # outputs the finished site to _site/
```

The first build takes about 90 seconds because every photo is resized into WebP and JPEG at four sizes. Later builds reuse those files.

## Where things live

| What | File |
|---|---|
| Phone, WhatsApp, email, address, social links, booking note | `src/_data/site.json` |
| Reviews / testimonials | `src/_data/testimonials.json` |
| Guide prices | `src/_data/pricing.json` |
| Projects (one file each) | `src/projects/*.md` |
| Service pages (Kitchens, Staircases…) | `src/services/*.md` |
| Home, About, Contact, Prices, Reviews | `src/*.njk` |
| Styles / scripts | `src/assets/css/main.css`, `src/assets/js/main.js` |
| Project photos | `src/images/projects/<project>/` |
| Photos uploaded through the editor | `src/uploads/` |
| Enquiry form handler (PHP, live site only) | `src/enquiry.php`, `src/enquiry-config.php` |
| Redirects, caching, HTTPS (live site only) | `src/.htaccess` |
| Editor (CMS) setup | `src/admin/config.yml` |

### Project stages

Each project has one or more **stages** (Design, Making, Finishing, Fitted, Installed…), each with its own caption and photos.
- **One stage:** the project page shows a plain gallery.
- **Two or more stages:** it shows "The journey": a timeline on desktop, swipeable cards on phones.
- **Optional `compare`:** adds a drag slider between a drawing and the finished room.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, including every time Joel publishes from the editor.

1. **Preview on GitHub Pages:** in the repo, go to **Settings → Pages → Source: GitHub Actions**. The workflow builds with the right path prefix automatically.
2. **Live on Armour:** add these in **Settings → Secrets and variables → Actions**:
   - Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (from cPanel → FTP Accounts)
   - Variable (optional): `FTP_SERVER_DIR` if the site doesn't live in `./public_html/`

   Until those secrets exist, the live job is skipped.

On the preview site the enquiry form is switched off (it shows a notice and points people to WhatsApp or email), because GitHub Pages can't run PHP.

## Joel's editor (`/admin/`)

The editor is [Sveltia CMS](https://github.com/sveltia/sveltia-cms). It saves straight to this GitHub repository, and the site rebuilds itself in a couple of minutes.

**One-off setup**
1. Check `repo:` in `src/admin/config.yml` matches the real `owner/repository`.
2. Give Joel access: either add his GitHub account as a collaborator on the repo, or sign in with a fine-grained personal access token (Contents: read & write on this repo only).
3. Joel opens `https://www.joeldyter.co.uk/admin/`, chooses **Sign in with token** (or GitHub), and saves the login on his phone.

**Adding a project (for Joel)**
1. Open **Projects → New Project**.
2. Fill in the title, category and location, then upload a **main photo** and describe it in a sentence.
3. Under **Photo stages**, add a stage (for example *Design*), write a line about it, and add photos. Repeat for *Making* and *Installed*.
4. Tick **Show on the home page** for your best work.
5. Press **Publish**. The site updates in about two minutes.

Big phone photos are shrunk automatically when uploaded.

## Before launch: checklist for Joel

- [ ] **Prices:** confirm or replace every figure in `pricing.json` (currently *example figures*), then set `"confirmed": true` to remove the notice. This can be done in the editor under **Reviews & prices → Prices**.
- [ ] **Copy check:** read the service pages, the five-step process and the FAQs, and correct anything that isn't how Joel works (e.g. sending progress photos, managing other trades, fixed quotes).
- [ ] **Booking note:** set `bookingNote` in `site.json` (e.g. "Currently booking work from March").
- [ ] **Project details:** add locations and timber species where known; several projects currently have no location.
- [ ] **Office furniture project:** check the client is happy for its logo to appear.
- [ ] **Email:** create a `website@joeldyter.co.uk` mailbox (or forwarder) in cPanel to match `enquiry-config.php`, then send a test enquiry with a photo.
- [ ] **Upload limits:** in cPanel → MultiPHP INI Editor, set `upload_max_filesize` to 20M and `post_max_size` to 24M if the `.htaccess` values are ignored.
- [ ] **DNS:** point `joeldyter.co.uk` and `www` at Armour, and enable AutoSSL. Cancel the Wix plan only after the new site is confirmed live.
- [ ] **Google:** add the site to Search Console, submit `/sitemap.xml`, and add a GA4 ID to `googleAnalyticsId` (a consent banner then appears automatically).
- [ ] **Google reviews:** once the Business Profile is claimed, paste its review link into `googleReviewUrl` and copy the best 5-star reviews into the reviews list (Source: Google).
- [ ] **Pinterest:** add the URL to `site.json` once the boards have pins; it's hidden until then.
- [ ] **Logo:** the wordmark is set in text; swap in a vector version of the engraved workshop sign if one is made.
