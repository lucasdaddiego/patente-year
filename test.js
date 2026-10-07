'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { yearFromPlate } = require('./patente.js');

const cases = [
  ['AA 000 AA', 2016], ['aa123zz', 2016], ['AA 899 ZZ', 2016], ['AA 900 AA', 2017],
  ['AB 000 AA', 2017], ['AC 199 ZZ', 2017], ['AC 200 AA', 2018], ['AD 400 AA', 2019],
  ['AE 099 ZZ', 2019], ['AE 100 AA', 2020], ['AE 600 AA', 2021], ['AF 599 ZZ', 2021],
  ['AF 600 AA', 2022], ['AF 770 AA', 2023], ['AG 300 AA', 2023], ['AG 450 AA', 2024], ['AG 649 ZZ', 2024],
  ['AG 650 AA', 2024], ['AH 000 AA', 2024], ['AH 999 ZZ', 2024], ['AI 000 AA', 2026], ['AI 123 AA', 2026],
  ['AAA 000', 1995], ['AOZ 999', 1995], ['APA 000', 1996], ['DCX 123', 2000], ['DBZ 999', 1999],
  ['ONA 000', 2015], ['PLZ 999', 2015], ['PMA 000', 2016], ['PZZ 999', 2016],
];
for (const [plate, year] of cases) {
  test(`${plate} -> ${year}`, () => assert.equal(yearFromPlate(plate).year, year));
}
test('notes are Spanish and only past the last row', () => {
  assert.equal(yearFromPlate('AH 000 AA').from, 'diciembre 2024');
  assert.equal(yearFromPlate('AI 000 AA').note, undefined);
  assert.equal(yearFromPlate('AI 123 AA').note, '2026 o posterior (la tabla termina en AI 000 AA)');
  assert.equal(yearFromPlate('PZZ 999').note, 'posterior al último par tabulado (PM); el formato terminó en 2016');
  assert.match(yearFromPlate('C 123456').note, /^patentado antes de 1995/);
});
test('the Mercosur table is at most 12 months old', () => {
  // Cars registered after the last row all report that row's year, silently.
  const { MERCOSUR } = require('./patente.js');
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [, year, month] = MERCOSUR[MERCOSUR.length - 1];
  assert.notEqual(MONTHS.indexOf(month), -1, month);
  const ageMonths = (Date.now() - Date.UTC(year, MONTHS.indexOf(month), 1)) / (30.44 * 86400e3);
  assert.ok(ageMonths <= 12, `the last row is ${month} ${year}: add the newer ranges (sources in patente.js)`);
});
test('pre-1995 plate', () => {
  const r = yearFromPlate('C 123456');
  assert.equal(r.year, null); assert.equal(r.province, 'Capital Federal');
  assert.equal(yearFromPlate('B1234567').province, 'Buenos Aires');
});
test('rejects garbage', () => {
  for (const bad of ['', 'ABCD', '1234567', 'AA 12 AA', 'O 123456']) assert.throws(() => yearFromPlate(bad));
});
test('page loads patente.js from the site root', () => {
  // The page is only ever served at /, but an absolute path keeps it that way
  // if a plate path is ever served in place again instead of redirected.
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
test('plate-shaped single path segments redirect to /?p=, anything else falls through', async () => {
  const { onRequest } = await import('./functions/[plate].mjs');
  const call = (p, plate) => onRequest({ request: new Request('https://patentes.daddiego.com.ar' + p), params: { plate }, next: () => 'next' });
  for (const [p, plate, want] of [['/AF123CD', 'AF123CD', 'AF123CD'], ['/AF123CD/?p=AF123CD', 'AF123CD', 'AF123CD'], ['/abc123', 'abc123', 'ABC123'],
    ['/C1234567', 'C1234567', 'C1234567'], ['/AF%20123%20CD', 'AF%20123%20CD', 'AF123CD'], ['/af-123-cd', 'af-123-cd', 'AF123CD']]) {
    const out = call(p, plate);
    assert.equal(out.status, 302, p);
    assert.equal(out.headers.get('location'), `https://patentes.daddiego.com.ar/?p=${want}`, p);
  }
  for (const [p, plate] of [['/nope-xyz', 'nope-xyz'], ['/patente.js', 'patente.js'], ['/robots.txt', 'robots.txt'], ['/O123456', 'O123456'], ['/%E0%A4%A', '%E0%A4%A']]) {
    assert.equal(call(p, plate), 'next', p);
  }
});
test('static files skip the Function', () => {
  const routes = JSON.parse(read('public/_routes.json'));
  assert.deepEqual(routes.include, ['/*']);
  for (const f of ['/', '/patente.js', '/robots.txt', '/404.html', '/favicon.svg', '/favicon.ico']) assert.ok(routes.exclude.includes(f), f);
});
test('_headers CSP hashes cover exactly the inline script and styles', () => {
  // The CSP allows inline code by hash only, so any edit to the page's script
  // or to either <style> block must update public/_headers: this recomputes.
  const { createHash } = require('node:crypto');
  const sha = s => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
  const csp = read('public/_headers').match(/Content-Security-Policy: (.*)/)[1];
  const directive = name => (csp.match(new RegExp(`(?:^|; )${name} ([^;]*)`)) || [])[1] || '';
  const inline = (html, tag) => [...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[1]);
  const index = read('public/index.html'), notFound = read('public/404.html');
  const scripts = inline(index, 'script'), styles = [...inline(index, 'style'), ...inline(notFound, 'style')];
  assert.equal(scripts.length, 1); assert.equal(inline(notFound, 'script').length, 0); assert.equal(styles.length, 2);
  for (const s of scripts) assert.ok(directive('script-src').includes(sha(s)), `script-src lacks ${sha(s)}`);
  for (const s of styles) assert.ok(directive('style-src').includes(sha(s)), `style-src lacks ${sha(s)}`);
  const current = new Set([...scripts, ...styles].map(sha));
  for (const h of csp.match(/'sha256-[^']+'/g)) assert.ok(current.has(h), `stale hash ${h}`);
  assert.match(csp, /frame-ancestors 'none'/);
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

test('cli --json prints the result object on one line', () => {
  const { execFileSync } = require('node:child_process');
  const cli = require('node:path').join(__dirname, 'cli.js');
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, [cli, '--json', 'AF 123 CD'], { encoding: 'utf8' })),
    { plate: 'AF123CD', format: 'mercosur', year: 2021, from: 'agosto 2021' });
  assert.throws(() => execFileSync(process.execPath, [cli, '--json', 'nope'], { encoding: 'utf8', stdio: 'pipe' }), /"error"/);
});
