# dapplebyte.com

Source of the DappleByte studio website: a static, multilingual (19 languages) Astro site deployed to GitHub Pages on every push to `main`.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # output in dist/, then checks internal links, hreflang and JSON-LD
npm run check:i18n # every locale has the same UI string keys as English
```

## How content gets here

- `src/content/products/*.json` — one file per app: links, versions, accent colours. Hand-written.
- `src/content/product-copy`, `faq`, `changelog`, `privacy` — generated from each app's own repository (store listing, in-app FAQ strings, release notes, privacy policy) by `npm run extract`. Do not edit by hand; fix the source and re-run.
- `src/content/features`, `videos`, `compare` — hand-written structure; text comes from the generated copy or `src/i18n`.
- `src/i18n/<locale>.json` — the website's own words. English is the source; the other 18 files mirror its keys.
- `products.local.json` (gitignored) tells the extract scripts where each app's repository lives on this machine. See `products.local.example.json`.

English pages live at the root, other languages under a prefix (`/ja/`, `/zh-tw/`, …). Every page links its translations with `hreflang`, and `/llms.txt` lists the site for language models.
