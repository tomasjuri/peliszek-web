/* pelíszek. skripty webu */
(function () {
  'use strict';

  /* ---------- nastavení ---------- */

  // Texty, akce, otevírací doba a kontakty se načítají z textových souborů v této složce.
  var OBSAH_URL = 'obsah/';
  // Kam formulář posílá žádosti (PHP skript ve stejné složce).
  var FORM_URL = 'rezervace.php';

  /* ---------- pomocné funkce ---------- */

  var KDY = ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu'];
  var DEN = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var DK = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dt(s) { return new Date(s + 'T12:00:00'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(s, n) { var d = dt(s); d.setDate(d.getDate() + n); return iso(d); }
  function dm(s) { var d = dt(s); return d.getDate() + '. ' + (d.getMonth() + 1) + '.'; }
  // Minuty od půlnoci → „9:00“
  function hm(min) { return Math.floor(min / 60) + ':' + pad(min % 60); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // Aktuální čas v Praze, ať je návštěvník kdekoli.
  function prague() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Prague', weekday: 'short', hour: 'numeric', minute: 'numeric',
        hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var g = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; };
      return {
        wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')],
        h: +g('hour'), m: +g('minute'),
        date: g('year') + '-' + g('month') + '-' + g('day'), y: g('year')
      };
    } catch (e) {
      var d = new Date();
      return { wd: d.getDay(), h: d.getHours(), m: d.getMinutes(), date: iso(d), y: String(d.getFullYear()) };
    }
  }

  var now = prague();
  document.getElementById('rok').textContent = now.y;

  /* ---------- hlavička a menu ---------- */

  var top = document.getElementById('top');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var nav = document.getElementById('nav'), tog = document.querySelector('.navtoggle');
  function setNav(o) {
    nav.classList.toggle('open', o);
    tog.setAttribute('aria-expanded', o);
    tog.setAttribute('aria-label', o ? 'zavřít navigaci' : 'otevřít navigaci');
  }
  tog.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setNav(false); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !e.target.closest('#nav, .navtoggle')) setNav(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); tog.focus(); }
  });

  /* ---------- obsah ---------- */

  Obsah.nacti(OBSAH_URL).then(function (o) {
    o.problemy.forEach(function (p) {
      console.warn('obsah/' + p.soubor + (p.radek ? ', řádek ' + p.radek : '') + ': ' + p.text);
    });
    if (location.protocol === 'file:') console.warn('Obsah ze složky obsah/ jde načíst jen přes webový server, postup je v README.md.');
    var dny = o['oteviraci-doba'].dny;
    texty(o);
    otevreno(dny);
    hodiny(dny);
    kontakt(o.kontakt, dny);
    seznamy(o);
    formular(o, akce(o.akce));
  }).catch(function (e) {
    console.error(e);
  }).then(function () {
    document.documentElement.classList.remove('cekam');
  });

  // Prvky s data-obsah="soubor.pole" dostanou text z daného souboru.
  function texty(o) {
    document.querySelectorAll('[data-obsah]').forEach(function (el) {
      var a = el.getAttribute('data-obsah').split('.');
      el.textContent = o[a[0]][a[1]];
    });
  }

  /* ---------- otevřeno / zavřeno ---------- */

  function otevreno(dny) {
    var t = now.h * 60 + now.m, today = dny[now.wd], st = document.getElementById('status'), msg;
    if (today && t >= today[0] && t < today[1]) {
      msg = 'teď máme otevřeno, dnes do ' + hm(today[1]);
      st.classList.add('open');
    } else if (today && t < today[0]) {
      msg = 'teď máme zavřeno, dnes otevíráme v ' + hm(today[0]);
    } else {
      for (var d = 1; d <= 7; d++) {
        var w = (now.wd + d) % 7;
        if (dny[w]) { msg = 'teď máme zavřeno, otevíráme ' + (d === 1 ? 'zítra' : KDY[w]) + ' v ' + hm(dny[w][0]); break; }
      }
    }
    if (msg) document.getElementById('status-text').textContent = msg;
  }

  /* ---------- otevírací doba ---------- */

  // Po sobě jdoucí dny se stejnou dobou spojí do skupin, od pondělí: [{ dny: [2, 3, 4, 5], doba: [540, 1080] }, …]
  function skupiny(dny) {
    var out = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (w) {
      var g = out[out.length - 1];
      if (g && String(g.doba) === String(dny[w])) g.dny.push(w);
      else out.push({ dny: [w], doba: dny[w] });
    });
    return out;
  }
  // „úterý až pátek“, „sobota a neděle“, nakrátko „út–pá“
  function popis(g, kratce) {
    var a = g.dny[0], b = g.dny[g.dny.length - 1];
    if (g.dny.length === 1) return kratce ? DK[a] : DEN[a];
    return kratce ? DK[a] + '–' + DK[b] : DEN[a] + (g.dny.length === 2 ? ' a ' : ' až ') + DEN[b];
  }
  function odDo(d) { return hm(d[0]) + '–' + hm(d[1]); }

  function hodiny(dny) {
    var gs = skupiny(dny);
    document.getElementById('hodiny').innerHTML = gs.map(function (g) {
      return '<tr data-days="' + g.dny.join(',') + '"><th scope="row">' + popis(g) + '</th>' +
        '<td>' + (g.doba ? odDo(g.doba) : 'zavřeno') + '</td></tr>';
    }).join('');
    document.getElementById('hodiny-kratce').innerHTML = gs
      .filter(function (g) { return g.doba; }).map(function (g) { return popis(g, true) + ' ' + odDo(g.doba); })
      .concat(gs.filter(function (g) { return !g.doba; }).map(function (g) { return popis(g) + ' zavřeno'; }))
      .map(function (s) { return '<span class="nowrap">' + s + '</span>'; })
      .join('<br>');

    document.querySelectorAll('.hours tr').forEach(function (tr) {
      if (tr.getAttribute('data-days').split(',').indexOf(String(now.wd)) > -1) {
        tr.classList.add('today');
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = 'dnes';
        tr.querySelector('th').appendChild(tag);
      }
    });
  }

  /* ---------- kontakt ---------- */

  function kontakt(k, dny) {
    var ulice = [k.ulice, k.mesto].filter(Boolean).join(', ');
    document.getElementById('adresa').innerHTML = [k.misto, k.ulice, (k.psc + ' ' + k.mesto).trim()]
      .filter(Boolean).map(esc).join('<br>');
    document.getElementById('adresa-kratka').textContent = ulice;
    document.getElementById('mapa').href = 'https://mapy.cz/zakladni?q=' + encodeURIComponent(ulice);
    document.querySelectorAll('[data-tel]').forEach(function (a) {
      a.href = 'tel:' + k.tel;
      a.textContent = k.telefon;
    });

    var site = [['instagram', k.instagram], ['facebook', k.facebook]].filter(function (s) { return s[1]; });
    var odkaz = function (s) { return '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + s[0] + '</a>'; };
    var p = document.getElementById('site');
    p.innerHTML = 'Napsat nám můžete i na ' + site.map(odkaz).join(' nebo ') + '.';
    p.hidden = !site.length;
    document.getElementById('odkazy').insertAdjacentHTML('beforeend',
      site.map(function (s) { return '<li>' + odkaz(s) + '</li>'; }).join(''));

    // Údaje pro Google do bloku application/ld+json v hlavičce
    var ld = document.getElementById('ld'), j = JSON.parse(ld.textContent);
    var cas = function (min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); };
    j.telephone = k.tel;
    j.address = { '@type': 'PostalAddress', streetAddress: k.ulice, addressLocality: k.mesto, postalCode: k.psc, addressCountry: 'CZ' };
    j.openingHoursSpecification = skupiny(dny).filter(function (g) { return g.doba; }).map(function (g) {
      return {
        '@type': 'OpeningHoursSpecification', dayOfWeek: g.dny.map(function (w) { return DAY[w]; }),
        opens: cas(g.doba[0]), closes: cas(g.doba[1])
      };
    });
    j.sameAs = site.map(function (s) { return s[1]; });
    ld.textContent = JSON.stringify(j);
  }

  /* ---------- nabídka a pro děti ---------- */

  function seznamy(o) {
    var radek = function (nazev, sub, vpravo) {
      return '<li><span class="item">' + esc(nazev) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span>' +
        '<span class="dots"></span><span class="who">' + esc(vpravo || '') + '</span></li>';
    };
    document.getElementById('pecivo').innerHTML = o.nabidka.pecivo.map(function (p) {
      return radek(p.pecivo, '', p.kdo);
    }).join('');
    document.getElementById('prodej').innerHTML = o.nabidka.prodej.map(function (p) {
      return radek(p['na-prodej'], p.popis, p.cena);
    }).join('');
    document.getElementById('pro-male').innerHTML = o['pro-deti'].polozky.map(function (p) {
      return '<li><span><b>' + esc(p.polozka) + '</b> ' + esc(p.popis || '') + '</span></li>';
    }).join('');
  }

  /* ---------- akce ---------- */

  function akce(a) {
    var upcoming = a.akce.filter(function (e) { return e.date >= now.date; })
      .sort(function (x, y) { return x.date < y.date ? -1 : 1; });

    document.getElementById('events').innerHTML = upcoming.map(function (e) {
      return '<li class="ev"><div class="ev-date"><span class="ev-day">' + dm(e.date) + '</span>' +
        '<span class="ev-wd">' + DEN[dt(e.date).getDay()] + '</span></div>' +
        '<div><h3>' + esc(e.title) + '</h3><p>' + esc([e.time, e.info].filter(Boolean).join(', ')) + '</p></div>' +
        '<button class="btn btn-small btn-ghost" type="button" data-join="' + esc(e.id) + '">přihlásit se</button></li>';
    }).join('') || '<li class="ev"><p>' + esc(a['bez-akci']) + '</p></li>';
    return upcoming;
  }

  /* ---------- rezervace ---------- */

  function formular(o, upcoming) {
    var dny = o['oteviraci-doba'].dny, PHONE = o.kontakt.telefon, PREDEM = o.rezervace['dort-predem'];
    var form = document.getElementById('rez-form'), fmsg = document.getElementById('form-msg');
    var datum = document.getElementById('datum'), cas = document.getElementById('cas'), akceSel = document.getElementById('akce-sel');
    var submitBtn = form.querySelector('button[type="submit"]');
    var DEFAULT_MSG = fmsg.textContent;

    akceSel.innerHTML = upcoming.map(function (e) {
      return '<option value="' + esc(e.id) + '">' + DK[dt(e.date).getDay()] + ' ' + dm(e.date) + ' ' + esc(e.title) + '</option>';
    }).join('');

    // Časy po půlhodinách od otevření do půl hodiny před zavřením vybraného dne.
    function fillCas() {
      var d = datum.value ? dny[dt(datum.value).getDay()] : null, opts = [];
      if (d) for (var m = Math.ceil(d[0] / 30) * 30; m <= d[1] - 30; m += 30) opts.push(hm(m));
      var chci = opts.indexOf(cas.value) > -1 ? cas.value : opts.indexOf('10:00') > -1 ? '10:00' : opts[0];
      cas.innerHTML = '';
      opts.forEach(function (t) {
        var op = document.createElement('option');
        op.textContent = t;
        op.defaultSelected = op.selected = t === chci;
        cas.appendChild(op);
      });
    }

    function typ() { return form.querySelector('input[name="typ"]:checked').value; }
    function applyTyp() {
      var v = typ();
      form.querySelectorAll('[data-show]').forEach(function (el) {
        el.hidden = el.getAttribute('data-show').split(' ').indexOf(v) < 0;
      });
      document.getElementById('datum-label').textContent = v === 'dort' ? 'kdy si dort vyzvednete' : 'datum';
      var min = v === 'dort' ? addDays(now.date, PREDEM) : now.date;
      for (var i = 0; i < 7 && !dny[dt(min).getDay()]; i++) min = addDays(min, 1);
      datum.min = min;
      if (!datum.value || datum.value < min) datum.value = min;
      fillCas();
    }
    form.querySelectorAll('input[name="typ"]').forEach(function (r) { r.addEventListener('change', applyTyp); });
    datum.addEventListener('change', fillCas);
    applyTyp();

    function resetDone() {
      Array.prototype.forEach.call(form.children, function (c) { if (c.id !== 'done' && !c.classList.contains('hp')) c.hidden = false; });
      document.getElementById('done').hidden = true;
      fmsg.textContent = DEFAULT_MSG;
      applyTyp();
    }
    function openForm(v, id) {
      form.querySelector('input[name="typ"][value="' + v + '"]').checked = true;
      resetDone();
      if (id) akceSel.value = id;
      document.getElementById('rezervace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      setTimeout(function () { document.getElementById('jmeno').focus({ preventScroll: true }); }, 600);
    }
    document.addEventListener('click', function (e) {
      var j = e.target.closest('[data-join]'), f = e.target.closest('[data-form]');
      if (j) openForm('akce', j.getAttribute('data-join'));
      if (f) openForm(f.getAttribute('data-form'));
    });
    document.getElementById('again').addEventListener('click', function () {
      resetDone();
      document.getElementById('jmeno').focus();
    });

    function val(id) { return document.getElementById(id).value.trim(); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = typ(), bad = [];
      ['jmeno', 'telefon'].forEach(function (id) {
        var f = document.getElementById(id), ok = f.value.trim() !== '';
        f.setAttribute('aria-invalid', !ok);
        if (!ok) bad.push(f);
      });
      if (bad.length) {
        fmsg.textContent = 'Doplňte prosím ' + bad.map(function (f) {
          return document.querySelector('label[for="' + f.id + '"]').textContent;
        }).join(' a ') + '.';
        bad[0].focus();
        return;
      }
      var telEl = document.getElementById('telefon');
      if (!/^[0-9 +()\/.\-]{6,25}$/.test(telEl.value.trim())) {
        fmsg.textContent = 'Zkontrolujte prosím telefonní číslo.';
        telEl.setAttribute('aria-invalid', true);
        telEl.focus();
        return;
      }
      if (v === 'akce' && !akceSel.value) {
        fmsg.textContent = 'Teď nemáme naplánovanou žádnou akci.';
        return;
      }
      if (v !== 'akce') {
        var den = datum.value ? dt(datum.value).getDay() : 0, problem = '';
        if (!datum.value || datum.value < datum.min) problem = 'Vyberte prosím datum, nejdříve ' + dm(datum.min);
        else if (!dny[den]) problem = KDY[den].charAt(0).toUpperCase() + KDY[den].slice(1) + ' máme zavřeno, vyberte prosím jiný den.';
        if (problem) {
          fmsg.textContent = problem;
          datum.setAttribute('aria-invalid', true);
          datum.focus();
          return;
        }
      }
      datum.removeAttribute('aria-invalid');

      // Text potvrzení pro návštěvníka
      var jm = val('jmeno'), tel = val('telefon'), out, ev = null;
      var os = val('osoby'), n = parseInt(os, 10);
      var osW = String(n) === os ? (n === 1 ? '1 osobu' : (n <= 4 ? os + ' osoby' : os + ' osob')) : os + ' osob';
      if (v === 'stul') out = 'Díky, ' + jm + '. Stůl pro ' + osW + ' na ' + dm(datum.value) + ' v ' + cas.value + ' vám potvrdíme na čísle ' + tel + '.';
      if (v === 'oslava') out = 'Díky, ' + jm + '. Oslavu pro ' + osW + ' na ' + dm(datum.value) + ' s vámi domluvíme na čísle ' + tel + '.';
      if (v === 'dort') out = 'Díky, ' + jm + '. Dort pro ' + val('porce') + ' porcí k vyzvednutí ' + dm(datum.value) + ' s vámi doladíme na čísle ' + tel + '.';
      if (v === 'akce') {
        ev = upcoming.filter(function (x) { return x.id === akceSel.value; })[0];
        var a = +val('dospeli'), k = +val('deti');
        out = 'Díky, ' + jm + '. Místo na akci „' + (ev ? ev.title : '') + '“' + (ev ? ' (' + dm(ev.date) + ')' : '') +
          ' pro ' + a + ' ' + (a === 1 ? 'dospělého' : 'dospělé') + (k ? ' a ' + k + ' ' + (k === 1 ? 'dítě' : 'děti') : '') +
          ' vám potvrdíme na čísle ' + tel + '.';
      }

      // Data pro e-mail
      var data = new FormData();
      data.append('typ', v);
      data.append('jmeno', jm);
      data.append('telefon', tel);
      data.append('poznamka', val('poznamka'));
      data.append('web', document.getElementById('web').value);
      if (v !== 'akce') data.append('datum', datum.value);
      if (v === 'stul' || v === 'oslava') { data.append('cas', cas.value); data.append('osoby', os); }
      if (v === 'dort') data.append('porce', val('porce'));
      if (v === 'akce' && ev) {
        data.append('akce', ev.title + ' (' + dm(ev.date) + (ev.time ? ', ' + ev.time : '') + ')');
        data.append('dospeli', val('dospeli'));
        data.append('deti', val('deti'));
      }

      submitBtn.disabled = true;
      fmsg.textContent = 'Odesílám…';
      fetch(FORM_URL, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function (r) {
          return r.json().catch(function () { return { ok: false }; }).then(function (j) {
            if (!(r.ok && j.ok)) throw new Error(j.error || '');
          });
        })
        .then(function () {
          document.getElementById('done-text').textContent = out;
          Array.prototype.forEach.call(form.children, function (c) { if (c.id !== 'done') c.hidden = true; });
          var dn = document.getElementById('done');
          dn.hidden = false;
          dn.focus();
          form.reset();
          form.querySelector('input[name="typ"][value="' + v + '"]').checked = true;
        })
        .catch(function (err) {
          var detail = err && err.message ? err.message + ' ' : '';
          fmsg.textContent = detail + 'Žádost se nepodařilo odeslat, zavolejte nám prosím na ' + PHONE + '.';
        })
        .then(function () { submitBtn.disabled = false; });
    });
  }
})();
