/*
  Kontrola textových souborů v public/obsah/ před nahráním webu.
  Spouští ji GitHub Actions. Když najde chybu, web se nenahraje a u souboru
  se ukáže, na kterém řádku chyba je. Ručně: node scripts/kontrola-obsahu.js
*/
'use strict';
var fs = require('fs');
var path = require('path');
var Obsah = require('../public/js/obsah.js');

var SLOZKA = 'public/obsah';
var texty = {};
Object.keys(Obsah.SOUBORY).forEach(function (n) {
  try { texty[n] = fs.readFileSync(path.join(__dirname, '..', SLOZKA, n + '.txt'), 'utf8'); }
  catch (e) { texty[n] = null; }
});

var chyb = 0;
Obsah.zpracuj(texty).problemy.forEach(function (p) {
  var soubor = SLOZKA + '/' + p.soubor;
  if (p.chyba) chyb++;
  if (process.env.GITHUB_ACTIONS) {
    // Anotace, kterou GitHub ukáže přímo u souboru a řádku
    console.log('::' + (p.chyba ? 'error' : 'warning') + ' file=' + soubor + (p.radek ? ',line=' + p.radek : '') +
      '::' + p.text.replace(/%/g, '%25'));
  } else {
    console.log((p.chyba ? 'CHYBA  ' : 'pozor  ') + soubor + (p.radek ? ':' + p.radek : '') + '  ' + p.text);
  }
});
console.log(chyb ? 'Chyb v obsahu: ' + chyb + '. Web se nenahraje, dokud je neopravíte.' : 'Obsah je v pořádku.');
process.exit(chyb ? 1 : 0);
