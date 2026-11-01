/* pelíszek. skripty webu */
(function () {
  'use strict';

  /* ---------- nastavení ---------- */

  // Otevírací doba: 0 = neděle, 1 = pondělí … 6 = sobota. null = zavřeno.
  // Při změně upravte i tabulku a patičku v index.html.
  var HOURS = { 0: [9, 19], 1: null, 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 19] };

  // Kam formulář posílá žádosti (PHP skript ve stejné složce).
  var FORM_URL = 'rezervace.php';
  var PHONE = '777 289 804';

  /* ---------- pomocné funkce ---------- */

  var KDY = ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu'];
  var DEN = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var DK = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  var EVENTS = Array.isArray(window.AKCE) ? window.AKCE : [];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dt(s) { return new Date(s + 'T12:00:00'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(s, n) { var d = dt(s); d.setDate(d.getDate() + n); return iso(d); }
  function dm(s) { var d = dt(s); return d.getDate() + '. ' + (d.getMonth() + 1) + '.'; }
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

  /* ---------- otevřeno / zavřeno ---------- */

  var t = now.h + now.m / 60, today = HOURS[now.wd], st = document.getElementById('status'), msg;
  if (today && t >= today[0] && t < today[1]) {
    msg = 'teď máme otevřeno, dnes do ' + today[1] + ':00';
    st.classList.add('open');
  } else if (today && t < today[0]) {
    msg = 'teď máme zavřeno, dnes otevíráme v ' + today[0] + ':00';
  } else {
    for (var d = 1; d <= 7; d++) {
      var w = (now.wd + d) % 7;
      if (HOURS[w]) { msg = 'teď máme zavřeno, otevíráme ' + (d === 1 ? 'zítra' : KDY[w]) + ' v ' + HOURS[w][0] + ':00'; break; }
    }
  }
  document.getElementById('status-text').textContent = msg;

  document.querySelectorAll('.hours tr').forEach(function (tr) {
    if (tr.getAttribute('data-days').split(',').indexOf(String(now.wd)) > -1) {
      tr.classList.add('today');
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'dnes';
      tr.querySelector('th').appendChild(tag);
    }
  });

  /* ---------- akce ---------- */

  var upcoming = EVENTS.filter(function (e) { return e.date >= now.date; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });

  document.getElementById('events').innerHTML = upcoming.map(function (e) {
    return '<li class="ev"><div class="ev-date"><span class="ev-day">' + dm(e.date) + '</span>' +
      '<span class="ev-wd">' + DEN[dt(e.date).getDay()] + '</span></div>' +
      '<div><h3>' + esc(e.title) + '</h3><p>' + esc(e.time) + ', ' + esc(e.info) + '</p></div>' +
      '<button class="btn btn-small btn-ghost" type="button" data-join="' + esc(e.id) + '">přihlásit se</button></li>';
  }).join('') || '<li class="ev"><p>Nové akce chystáme, novinky dáváme na instagram.</p></li>';

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

  /* ---------- rezervace ---------- */

  var form = document.getElementById('rez-form'), fmsg = document.getElementById('form-msg');
  var datum = document.getElementById('datum'), cas = document.getElementById('cas'), akceSel = document.getElementById('akce-sel');
  var submitBtn = form.querySelector('button[type="submit"]');
  var DEFAULT_MSG = fmsg.textContent;

  for (var h = 9; h <= 17; h++) {
    ['00', '30'].forEach(function (mm) {
      var o = document.createElement('option');
      o.textContent = h + ':' + mm;
      if (h === 10 && mm === '00') o.selected = true;
      cas.appendChild(o);
    });
  }
  akceSel.innerHTML = upcoming.map(function (e) {
    return '<option value="' + esc(e.id) + '">' + DK[dt(e.date).getDay()] + ' ' + dm(e.date) + ' ' + esc(e.title) + '</option>';
  }).join('');

  function typ() { return form.querySelector('input[name="typ"]:checked').value; }
  function applyTyp() {
    var v = typ();
    form.querySelectorAll('[data-show]').forEach(function (el) {
      el.hidden = el.getAttribute('data-show').split(' ').indexOf(v) < 0;
    });
    document.getElementById('datum-label').textContent = v === 'dort' ? 'kdy si dort vyzvednete' : 'datum';
    var min = v === 'dort' ? addDays(now.date, 3) : now.date;
    while (dt(min).getDay() === 1) min = addDays(min, 1);
    datum.min = min;
    if (!datum.value || datum.value < min) datum.value = min;
  }
  form.querySelectorAll('input[name="typ"]').forEach(function (r) { r.addEventListener('change', applyTyp); });
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
    if (v !== 'akce' && dt(datum.value).getDay() === 1) {
      fmsg.textContent = 'V pondělí máme zavřeno, vyberte prosím jiný den.';
      datum.setAttribute('aria-invalid', true);
      datum.focus();
      return;
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
      data.append('akce', ev.title + ' (' + dm(ev.date) + ', ' + ev.time + ')');
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
})();
