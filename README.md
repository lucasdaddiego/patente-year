# patente-year

Year of an Argentine car from its licence plate. Data from iProfesional
([2018](https://www.iprofesional.com/autos/376250-como-saber-el-ano-de-un-auto-por-la-patente-en-argentina),
[2025](https://www.iprofesional.com/actualidad/437781-como-saber-el-ano-de-un-auto-por-la-patente-en-septiembre-2025),
[2026](https://www.iprofesional.com/impuestos/450913-como-saber-el-ano-de-un-auto-por-la-patente-en-argentina-en-2026)).
It is an estimate by registration range, not an official lookup. Cars only: motorcycles use other formats.

Supported formats:

- Mercosur `AA 000 AA` (April 2016 onward), resolved by the first two letters + digits.
- Old `AAA 000` (1995–2016), resolved by the first two letters (the third is the registry office).
- Pre-1995 `A 000000` / `A 0000000`: returns "before 1995" and the province the letter stands for.

The Mercosur table in `patente.js` lists the sources per row; `npm test` fails once its last row is
more than 12 months old, so the table cannot go stale unnoticed.

## CLI

```sh
node cli.js "AF 123 CD"          # 2021
node cli.js abc123               # 1995
node cli.js C123456              # before 1995
node cli.js --json "AF 123 CD"   # {"plate":"AF123CD","format":"mercosur","year":2021,"from":"agosto 2021"}
```

Prints the year on stdout; extra details (month range, province, notes) go to stderr. `--json` prints the
whole result on stdout instead. Exit 1 on an unrecognised plate.

## Web

`public/index.html` is a static page using the same `patente.js`. Add `?p=AF123CD` to prefill.

Unknown paths answer 404 with `public/404.html`. That file turns off the Pages SPA fallback, so
`functions/[plate].mjs` handles a single path segment that reads as a plate (`/AF123CD`, `/af-123-cd`)
with a 302 to `/?p=AF123CD`. `_redirects` cannot do this: it has no regex, and a `/:plate` rule matches
any segment. `public/_routes.json` keeps the static files off the Function.

`public/_headers` sends the security headers, including a CSP that allows the page's inline script and
styles by hash only; the test suite recomputes the hashes, so an edit to either block fails `npm test`
until `_headers` is updated.

```sh
npm test          # node --test
npm run dev       # wrangler pages dev
npm run deploy    # wrangler pages deploy public
```

## Deploy

Every push to `master` runs the tests and deploys to Cloudflare Pages (https://patentes.daddiego.com.ar, also https://patente-year.pages.dev)
via `.github/workflows/deploy.yml`, using the `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets.
Pull requests run the tests only. `npm run deploy` does the same from a local checkout.

## License

[MIT](LICENSE)
