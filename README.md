# Roberto Isaac Consulting AB — Site

Company & portfolio site for **Roberto Isaac Consulting AB** (RIConsulting) — the
independent Platform Engineering & IT consultancy of Roberto Isaac.

Built as a plain static site (HTML/CSS/JS — no build step) so it deploys directly on **GitHub Pages**.

Contact: **contact@RIConsulting.se**

## Structure

```
.
├── index.html        # the page
├── assets/
│   ├── style.css     # all styling (dark + light theme)
│   └── main.js       # theme toggle + scroll reveal
├── .nojekyll         # tell Pages to serve files as-is
└── README.md
```

## Local preview

Just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Select branch `main`, folder `/ (root)`, then **Save**.
4. The site goes live at `https://<username>.github.io/<repo>/` in ~1 minute.

For a root site at `https://<username>.github.io`, name the repo `<username>.github.io`.

## Custom domain (RIConsulting.se)

To serve the site at your own domain:

1. Add a `CNAME` file to this repo containing `riconsulting.se` (or `www.riconsulting.se`).
2. At your DNS provider, point the domain at GitHub Pages:
   - apex `riconsulting.se` → four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - or `www` → `CNAME` to `<username>.github.io`
3. **Settings → Pages → Custom domain**, enter the domain, and enable **Enforce HTTPS**.
