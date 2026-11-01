/* pelíszek. obsah webu z textových souborů ve složce obsah/
   Stejný kód používá i kontrola před nahráním webu (scripts/kontrola-obsahu.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Obsah = factory();
})(this, function () {
  'use strict';

  /* ---------- co je ve kterém souboru ---------- */

  // pole:    jednotlivé texty na řádcích „název: text“
  // seznamy: opakované položky, každá začíná řádkem s klíčem start
  // V kódu se klíče používají bez diakritiky a s pomlčkami: „pečení nadpis“ je peceni-nadpis.
  var SOUBORY = {
    'uvod':           { pole: ['podnadpis', 'popisek 1', 'popisek 2', 'popisek 3'] },
    'akce':           { pole: ['nadpis', 'text', 'oslavy', 'bez akcí'],
                        seznamy: { akce: { start: 'datum', pole: ['čas', 'název', 'info'] } } },
    'nabidka':        { pole: ['nadpis', 'text', 'pečení nadpis', 'pečení text', 'káva nadpis', 'na baru', 'poznámka'],
                        seznamy: { pecivo: { start: 'pečivo', pole: ['kdo'] },
                                   prodej: { start: 'na prodej', pole: ['popis', 'cena'] } } },
    'pro-deti':       { pole: ['nadpis', 'text'],
                        seznamy: { polozky: { start: 'položka', pole: ['popis'] } } },
    'oteviraci-doba': { pole: ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'] },
    'kontakt':        { pole: ['nadpis', 'místo', 'ulice', 'psč', 'město', 'telefon', 'instagram', 'facebook', 'patička'] },
    'rezervace':      { pole: ['nadpis', 'text', 'pod tlačítkem', 'dort předem'] }
  };

  // 0 = neděle … 6 = sobota, stejně jako Date.getDay()
  var DNY = ['nedele', 'pondeli', 'utery', 'streda', 'ctvrtek', 'patek', 'sobota'];
  // Bez těchto údajů web nedává smysl, když chybí, nahrání se zastaví.
  var POVINNE = DNY.concat(['telefon']);
  // Tyto smějí chybět. Ostatní chybějící texty jen nechají na webu prázdné místo.
  var NEPOVINNE = ['misto', 'instagram', 'facebook', 'dort-predem'];

  /* ---------- pomocné funkce ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // „Pečení nadpis“ → „peceni-nadpis“: nezáleží na velkých písmenech, diakritice ani mezerách.
  function klic(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
  }

  // „7. 11. 2026“ nebo „2026-11-07“ → „2026-11-07“, nesrozumitelné datum → ''
  function datum(s) {
    var m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s), d, mo, y;
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return '';
    var t = new Date(y, mo - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) return '';
    return y + '-' + pad(mo) + '-' + pad(d);
  }

  // „9:00–18:00“, „9-18“ nebo „zavřeno“ → [od, do] v minutách od půlnoci, null = zavřeno, undefined = nesrozumitelné
  function doba(s) {
    if (/^zavr/.test(klic(s))) return null;
    var m = /^(\d{1,2})(?:[:.](\d{2}))?\s*[-–—]\s*(\d{1,2})(?:[:.](\d{2}))?$/.exec(s);
    if (!m) return undefined;
    var m1 = +(m[2] || 0), m2 = +(m[4] || 0), od = +m[1] * 60 + m1, az = +m[3] * 60 + m2;
    return m1 < 60 && m2 < 60 && od < az && az <= 24 * 60 ? [od, az] : undefined;
  }

  /* ---------- rozbor souboru ---------- */

  // Převod textů na data, se kterými web počítá, a kontrola, jestli dávají smysl.
  var VYKLAD = {
    'akce': function (d, hlas) {
      d.akce = d.akce.map(function (a, i) {
        var date = datum(a.datum);
        if (!date) { hlas(a.radek, 'Datum „' + a.datum + '“ nechápu. Pište den, měsíc i rok, např. 7. 11. 2026.'); return null; }
        if (!a.nazev) { hlas(a.radek, 'Akce ' + a.datum + ' nemá řádek „název:“.'); return null; }
        return { id: 'akce-' + (i + 1), date: date, time: a.cas || '', title: a.nazev, info: a.info || '' };
      }).filter(Boolean);
    },
    'oteviraci-doba': function (d, hlas, radky) {
      d.dny = DNY.map(function (k) {
        var v = doba(d[k]);
        if (v !== undefined) return v;
        if (d[k]) hlas(radky[k], 'Otevírací dobu „' + d[k] + '“ nechápu. Pište třeba 9:00–18:00 nebo zavřeno.');
        return null;
      });
    },
    'kontakt': function (d, hlas, radky) {
      var tel = d.telefon.replace(/[^\d+]/g, '');
      if (/^\d{9}$/.test(tel)) tel = '+420' + tel;
      if (d.telefon && !/^\+?\d{9,15}$/.test(tel)) hlas(radky.telefon, 'Telefon „' + d.telefon + '“ nevypadá jako telefonní číslo.');
      d.tel = tel;
      ['instagram', 'facebook'].forEach(function (k) {
        if (d[k] && !/^https?:\/\//i.test(d[k])) d[k] = 'https://' + d[k];
      });
    },
    'rezervace': function (d, hlas, radky) {
      var n = parseInt(d['dort-predem'], 10);
      if (d['dort-predem'] && !(n >= 0)) hlas(radky['dort-predem'], 'U „dort předem:“ má být počet dní, např. 3.');
      d['dort-predem'] = n >= 0 ? n : 3;
    }
  };

  // Rozebere jeden soubor. Problémy hlásí přes hlas(radek, text, jeChyba).
  function rozeber(nazev, text, hlas) {
    var schema = SOUBORY[nazev], data = {}, radky = {};
    var pole = Object.create(null), starty = Object.create(null), patri = Object.create(null);
    schema.pole.forEach(function (p) { pole[klic(p)] = p; });
    Object.keys(schema.seznamy || {}).forEach(function (s) {
      var sz = schema.seznamy[s];
      data[s] = [];
      starty[klic(sz.start)] = s;
      sz.pole.forEach(function (p) { patri[klic(p)] = s; });
    });

    // posledni = [objekt, klíč], kam se připojí text pokračující na dalším řádku
    var seznam = null, polozka = null, posledni = null;
    text.replace(/^﻿/, '').split(/\r\n?|\n/).forEach(function (radek, i) {
      var t = radek.trim(), m = /^([^:]{1,40}):(.*)$/.exec(t), k = m ? klic(m[1]) : '', h = m ? m[2].trim() : '';
      if (!t || t.charAt(0) === '#') return;
      if (pole[k]) {
        if (k in data) hlas(i + 1, 'Řádek „' + pole[k] + ':“ je v souboru dvakrát, platí ten poslední.', false);
        data[k] = h;
        radky[k] = i + 1;
        posledni = [data, k];
      } else if (starty[k]) {
        seznam = starty[k];
        polozka = { radek: i + 1 };
        polozka[k] = h;
        data[seznam].push(polozka);
        posledni = [polozka, k];
      } else if (patri[k]) {
        if (patri[k] !== seznam) {
          hlas(i + 1, 'Řádek „' + m[1].trim() + ':“ musí být pod řádkem „' + schema.seznamy[patri[k]].start + ':“.');
          return;
        }
        polozka[k] = h;
        posledni = [polozka, k];
      } else if (posledni) {
        // Dlouhý text rozdělený na víc řádků
        if (m && /^[a-z-]{1,25}$/.test(k)) hlas(i + 1, 'Neznám řádek „' + m[1].trim() + ':“, beru ho jako pokračování předchozího textu.', false);
        posledni[0][posledni[1]] += ' ' + t;
      } else {
        hlas(i + 1, 'Nevím, k čemu tenhle řádek patří. Nechybí na začátku název a dvojtečka?');
      }
    });

    schema.pole.forEach(function (p) {
      var k = klic(p), povinne = POVINNE.indexOf(k) > -1;
      if (!data[k] && NEPOVINNE.indexOf(k) < 0) {
        hlas(radky[k], (k in data ? 'Řádek „' + p + ':“ je prázdný' : 'Chybí řádek „' + p + ':“') +
          (povinne ? '.' : ', na webu tam bude prázdné místo.'), povinne);
      }
      data[k] = data[k] || '';
    });
    if (VYKLAD[nazev]) VYKLAD[nazev](data, hlas, radky);
    return data;
  }

  // texty: { 'akce': 'obsah souboru', … }, chybějící soubor = null.
  // Vrací data ze všech souborů a seznam problémů { soubor, radek, text, chyba }.
  function zpracuj(texty) {
    var vysledek = { problemy: [] };
    Object.keys(SOUBORY).forEach(function (nazev) {
      var hlas = function (radek, text, chyba) {
        vysledek.problemy.push({ soubor: nazev + '.txt', radek: radek || 0, text: text, chyba: chyba !== false });
      };
      if (texty[nazev] == null) {
        hlas(0, 'Soubor se nepodařilo načíst. Nepřejmenovali nebo nesmazali jste ho?');
        hlas = function () {};
      }
      vysledek[nazev] = rozeber(nazev, texty[nazev] || '', hlas);
    });
    return vysledek;
  }

  // Stáhne soubor; při výpadku spojení to zkusí ještě jednou.
  function stahni(url, znovu) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .catch(function () {
        if (!znovu) return null;
        return new Promise(function (hotovo) { setTimeout(hotovo, 400); }).then(function () { return stahni(url, false); });
      });
  }

  // V prohlížeči: načte všechny soubory ze složky a zpracuje je.
  function nacti(slozka) {
    var texty = {};
    return Promise.all(Object.keys(SOUBORY).map(function (n) {
      return stahni(slozka + n + '.txt', true).then(function (t) { texty[n] = t; });
    })).then(function () { return zpracuj(texty); });
  }

  return { SOUBORY: SOUBORY, zpracuj: zpracuj, nacti: nacti };
});
