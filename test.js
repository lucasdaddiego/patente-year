'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { yearFromPlate } = require('./patente.js');

const cases = [
  ['AA 000 AA', 2016], ['aa123zz', 2016], ['AA 899 ZZ', 2016], ['AA 900 AA', 2017],
  ['AB 000 AA', 2017], ['AC 199 ZZ', 2017], ['AC 200 AA', 2018], ['AD 400 AA', 2019],
  ['AE 099 ZZ', 2019], ['AE 100 AA', 2020], ['AE 600 AA', 2021], ['AF 599 ZZ', 2021],
  ['AF 600 AA', 2022], ['AF 770 AA', 2023], ['AG 300 AA', 2023], ['AG 450 AA', 2024], ['AH 000 AA', 2024],
  ['AAA 000', 1995], ['AOZ 999', 1995], ['APA 000', 1996], ['DCX 123', 2000], ['DBZ 999', 1999],
  ['ONA 000', 2015], ['PLZ 999', 2015], ['PMA 000', 2016], ['PZZ 999', 2016],
];
for (const [plate, year] of cases) {
  test(`${plate} -> ${year}`, () => assert.equal(yearFromPlate(plate).year, year));
}
test('pre-1995 plate', () => {
  const r = yearFromPlate('C 123456');
  assert.equal(r.year, null); assert.equal(r.province, 'Capital Federal');
  assert.equal(yearFromPlate('B1234567').province, 'Buenos Aires');
});
test('rejects garbage', () => {
  for (const bad of ['', 'ABCD', '1234567', 'AA 12 AA', 'O 123456']) assert.throws(() => yearFromPlate(bad));
});
test('page loads patente.js from the site root', () => {
  // functions/[plate].mjs serves index.html at a plate path such as /AF123CD/,
  // so the page must not resolve the script relative to that path.
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, 'public/index.html'), 'utf8');
  assert.match(html, /<script src="\/patente\.js"><\/script>/);
});

// Unknown paths answer 404 from public/404.html. A top-level 404.html turns off
// the Pages SPA fallback, so functions/[plate].mjs keeps plate deep links alive.
const read = f => require('node:fs').readFileSync(require('node:path').join(__dirname, f), 'utf8');
test('404 page exists, links home and declares no canonical', () => {
  const html = read('public/404.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<a href="\/">/);
  assert.doesNotMatch(html, /rel="canonical"/);
});
test('plate-shaped single path segments serve the page, anything else falls through', async () => {
  const { onRequest } = await import('./functions/[plate].mjs');
  const call = (p, plate) => {
    const seen = [];
    const env = { ASSETS: { fetch: req => (seen.push(new URL(req.url).pathname + new URL(req.url).search), 'page') } };
    const out = onRequest({ request: new Request('https://patentes.daddiego.com.ar' + p), env, params: { plate }, next: () => 'next' });
    return { out, seen };
  };
  for (const [p, plate] of [['/AF123CD', 'AF123CD'], ['/AF123CD/?p=AF123CD', 'AF123CD'], ['/abc123', 'abc123'], ['/C1234567', 'C1234567'], ['/AF%20123%20CD', 'AF%20123%20CD']]) {
    assert.deepEqual(call(p, plate), { out: 'page', seen: ['/'] }, p);
  }
  for (const [p, plate] of [['/nope-xyz', 'nope-xyz'], ['/patente.js', 'patente.js'], ['/robots.txt', 'robots.txt'], ['/O123456', 'O123456'], ['/%E0%A4%A', '%E0%A4%A']]) {
    assert.deepEqual(call(p, plate), { out: 'next', seen: [] }, p);
  }
});
test('static files skip the Function', () => {
  const routes = JSON.parse(read('public/_routes.json'));
  assert.deepEqual(routes.include, ['/*']);
  for (const f of ['/', '/patente.js', '/robots.txt', '/404.html']) assert.ok(routes.exclude.includes(f), f);
});
