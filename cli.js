#!/usr/bin/env node
'use strict';
const { yearFromPlate } = require('./patente.js');

const arg = process.argv.slice(2).join(' ').trim();
if (!arg || arg === '-h' || arg === '--help') {
  console.error('usage: patente <plate>   e.g. patente "AF 123 CD"  |  patente ABC123  |  patente C123456');
  process.exit(arg ? 0 : 2);
}
try {
  const r = yearFromPlate(arg);
  console.log(r.year === null ? 'before 1995' : String(r.year));
  if (r.from) console.error(`from ${r.from}`);
  if (r.province) console.error(`province: ${r.province}`);
  if (r.note) console.error(`note: ${r.note}`);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}
