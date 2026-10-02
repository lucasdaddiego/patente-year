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
  // Pages answers any unknown path with index.html (no 404.html), so a page
  // opened at /AF123CD/ must not resolve the script relative to that path.
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, 'public/index.html'), 'utf8');
  assert.match(html, /<script src="\/patente\.js"><\/script>/);
});
