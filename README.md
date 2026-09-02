# patente-year

Year of an Argentine car from its licence plate. Data from
[iProfesional](https://www.iprofesional.com/autos/376250-como-saber-el-ano-de-un-auto-por-la-patente-en-argentina).
It is an estimate by registration range, not an official lookup.

Supported formats:

- Mercosur `AA 000 AA` (April 2016 onward), resolved by the first two letters + digits.
- Old `AAA 000` (1995–2016), resolved by the first two letters (the third is the registry office).
- Pre-1995 `A 000000` / `A 0000000`: returns "before 1995" and the province the letter stands for.

## CLI

```sh
node cli.js "AF 123 CD"   # 2021
node cli.js abc123        # 1995
node cli.js C123456       # before 1995
```

Prints the year on stdout; extra details (month range, province, notes) go to stderr. Exit 1 on an unrecognised plate.

## Web

`public/index.html` is a static page using the same `patente.js`. Add `?p=AF123CD` to prefill.

```sh
npm test          # node --test
npm run dev       # wrangler pages dev
npm run deploy    # wrangler pages deploy public
```
