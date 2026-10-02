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

// Runs the page's inline script against a tiny fake DOM: enough for the input,
// the form and the output box, so the typing behaviour is testable without a browser.
function page(search = '') {
  const src = read('public/index.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const node = () => ({ value: '', on: {}, addEventListener(t, f) { (this.on[t] ||= []).push(f); }, fire(t) { for (const f of this.on[t] || []) f({ preventDefault() {} }); } });
  const out = { kids: [], text: '' };
  Object.defineProperties(out, {
    textContent: { get() { return this.kids.length ? this.kids.map(k => k.textContent).join(' ') : this.text; }, set(v) { this.kids = []; this.text = v; } },
    innerHTML: { set(h) { this.text = ''; this.kids = (h.match(/<div/g) || []).map(() => ({ textContent: '' })); } },
    firstChild: { get() { return this.kids[0]; } },
    lastChild: { get() { return this.kids[this.kids.length - 1]; } },
  });
  const els = { f: node(), plate: node(), out };
  require('node:vm').runInNewContext(src, { document: { getElementById: id => els[id] }, location: { search }, URLSearchParams, patente: require('./patente.js') });
  return {
    type(v) { els.plate.value = v; els.plate.fire('input'); return out.textContent; },
    blur() { els.plate.fire('blur'); return out.textContent; },
    submit() { els.f.fire('submit'); return out.textContent; },
    out,
  };
}
const ERR = 'No reconozco ese formato de patente.';
test('page shows no error while a plate is still being typed', () => {
  const p = page();
  for (const v of ['A', 'AF', 'AF 1', 'AF 12', 'AF 123', 'AF 123 C', 'C 12345', 'ABCD']) assert.equal(p.type(v), '', v);
  assert.equal(p.type('ABC 123'), '1995 ');
  assert.equal(p.type('AF 123 CD'), '2021 desde agosto 2021');
  assert.equal(p.type('ABCD 123'), ERR);
  assert.equal(p.type('AF 123 CDE'), ERR);
});
test('page shows the error once the field loses focus or the form is sent', () => {
  let p = page();
  p.type('AF 12');
  assert.equal(p.blur(), ERR);
  p = page();
  p.type('AF 12');
  assert.equal(p.submit(), ERR);
  assert.equal(page('?p=AF12').out.textContent, ERR);
  assert.equal(page('?p=AF123CD').out.textContent, '2021 desde agosto 2021');
});
