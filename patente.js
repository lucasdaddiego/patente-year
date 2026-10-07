// Year lookup for Argentine licence plates (patentes).
// Data sources (iProfesional):
//   https://www.iprofesional.com/autos/376250-como-saber-el-ano-de-un-auto-por-la-patente-en-argentina
//   https://www.iprofesional.com/actualidad/437781-como-saber-el-ano-de-un-auto-por-la-patente-en-septiembre-2025
//   https://www.iprofesional.com/impuestos/450913-como-saber-el-ano-de-un-auto-por-la-patente-en-argentina-en-2026
// Works both in Node (module.exports) and in the browser (global `patente`).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.patente = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Mercosur format (AA 000 AA), in use since April 2016.
  // Each row: first plate issued from that month. Order: letters, digits, letters.
  // The 2025 and 2026 articles both end at "Diciembre 2024 = AH-000-AA". The
  // AG 650 and AI 000 rows have no published source (estimates from the
  // 2026-10 review, kept so the table reaches the current year): replace them
  // with sourced rows when an article covers 2025 and 2026. test.js fails
  // once the last row is more than 12 months old.
  const MERCOSUR = [
    ['AA000', 2016, 'abril'],
    ['AA900', 2017, 'enero'],
    ['AB000', 2017, 'febrero'],
    ['AC000', 2017, 'noviembre'],
    ['AC200', 2018, 'enero'],
    ['AD000', 2018, 'julio'],
    ['AD400', 2019, 'enero'],
    ['AE000', 2019, 'octubre'],
    ['AE100', 2020, 'enero'],
    ['AE600', 2021, 'enero'],
    ['AF000', 2021, 'agosto'],
    ['AF600', 2022, 'octubre'],
    ['AF770', 2023, 'enero'],
    ['AG000', 2023, 'mayo'],
    ['AG300', 2023, 'octubre'],
    ['AG450', 2024, 'enero'],
    ['AG650', 2024, 'junio'], // unsourced estimate (see above)
    ['AH000', 2024, 'diciembre'],
    ['AI000', 2026, 'enero'], // unsourced estimate (see above)
  ];

  // Old format (AAA 000), 1995-2016. The third letter identifies the
  // registry office, not the year, so only the first two letters count.
  const OLD = [
    ['AA', 1995], ['AP', 1996], ['BD', 1997], ['BU', 1998], ['CM', 1999],
    ['DC', 2000], ['DO', 2001], ['DX', 2002], ['ED', 2003], ['EI', 2004],
    ['ET', 2005], ['FI', 2006], ['GB', 2007], ['GV', 2008], ['HT', 2009],
    ['IM', 2010], ['JN', 2011], ['KU', 2012], ['MB', 2013], ['NM', 2014],
    ['ON', 2015], ['PM', 2016],
  ];

  // Pre-1995 format (one province letter + 6/7 digits), from 1958.
  const PROVINCES = {
    A: 'Salta', B: 'Buenos Aires', C: 'Capital Federal', D: 'San Luis',
    E: 'Entre Ríos', F: 'La Rioja', G: 'Santiago del Estero', H: 'Chaco',
    J: 'San Juan', K: 'Catamarca', L: 'La Pampa', M: 'Mendoza', N: 'Misiones',
    P: 'Formosa', Q: 'Neuquén', R: 'Río Negro', S: 'Santa Fe', T: 'Tucumán',
    U: 'Chubut', V: 'Tierra del Fuego', W: 'Corrientes', X: 'Córdoba',
    Y: 'Jujuy', Z: 'Santa Cruz',
  };

  function normalize(input) {
    return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function lastAtOrBelow(table, key) {
    let hit = null;
    for (const row of table) {
      if (row[0] <= key) hit = row; else break;
    }
    return hit;
  }

  /**
   * @param {string} input plate number, any spacing/dashes/case
   * @returns {{plate:string, format:string, year:number|null, from?:string, note?:string, province?:string}}
   * @throws {Error} on an unrecognised format
   */
  function yearFromPlate(input) {
    const plate = normalize(input);

    let m = /^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(plate);
    if (m) {
      const key = m[1] + m[2];
      const row = lastAtOrBelow(MERCOSUR, key);
      if (!row) throw new Error(`plate ${plate} is below the first Mercosur plate (AA 000 AA)`);
      const last = MERCOSUR[MERCOSUR.length - 1];
      const out = { plate, format: 'mercosur', year: row[1], from: `${row[2]} ${row[1]}` };
      if (row === last && key !== last[0]) out.note = `${last[1]} o posterior (la tabla termina en ${last[0].slice(0, 2)} ${last[0].slice(2)} AA)`;
      return out;
    }

    m = /^([A-Z]{3})(\d{3})$/.exec(plate);
    if (m) {
      const key = m[1].slice(0, 2);
      const row = lastAtOrBelow(OLD, key);
      if (!row) throw new Error(`plate ${plate} is below the first 3-letter plate (AAA 000)`);
      const out = { plate, format: 'old', year: row[1] };
      if (row === OLD[OLD.length - 1] && key !== row[0]) out.note = 'posterior al último par tabulado (PM); el formato terminó en 2016';
      return out;
    }

    m = /^([A-Z])(\d{6,7})$/.exec(plate);
    if (m) {
      const province = PROVINCES[m[1]];
      if (!province) throw new Error(`unknown province letter ${m[1]}`);
      return { plate, format: 'pre-1995', year: null, note: 'patentado antes de 1995 (formato usado de 1958 a 1994)', province };
    }

    throw new Error(`unrecognised plate format: "${input}" (expected AA 000 AA, AAA 000 or A 000000)`);
  }

  return { yearFromPlate, normalize, MERCOSUR, OLD, PROVINCES };
});
