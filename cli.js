#!/usr/bin/env node
'use strict';
const { yearFromPlate } = require('./patente.js');

const args = process.argv.slice(2);
// --json: the whole result object on stdout, one line, for scripts.
const json = args.includes('--json');
const arg = args.filter(a => a !== '--json').join(' ').trim();
if (!arg || arg === '-h' || arg === '--help') {
  console.error('usage: patente [--json] <plate>   e.g. patente "AF 123 CD"  |  patente ABC123  |  patente C123456');
  process.exit(arg ? 0 : 2);
}
try {
  const r = yearFromPlate(arg);
  if (json) {
    console.log(JSON.stringify(r));
  } else {
    console.log(r.year === null ? 'before 1995' : String(r.year));
    if (r.from) console.error(`from ${r.from}`);
    if (r.province) console.error(`province: ${r.province}`);
    if (r.note) console.error(`note: ${r.note}`);
  }
} catch (e) {
  console.error(json ? JSON.stringify({ error: e.message }) : `error: ${e.message}`);
  process.exit(1);
}
