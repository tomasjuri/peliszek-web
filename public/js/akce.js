/*
  Program akcí na webu.

  Jak upravit:
  - Každá akce je jeden blok ve složených závorkách { ... }.
  - id:    krátký název bez mezer a diakritiky (musí být jedinečný)
  - date:  datum ve tvaru RRRR-MM-DD, např. '2026-11-07'
  - time:  čas, který se zobrazí, např. '9:00–14:00'
  - title: název akce (malými písmeny, jako zbytek webu)
  - info:  krátký doplněk, např. co je v ceně a kolik je míst
  Proběhlé akce se na webu samy schovají.
  Když je seznam prázdný, web ukáže větu, že nové akce chystáte.
*/
window.AKCE = [
  { id: 'joga',     date: '2026-11-07', time: '9:00–14:00',  title: 'jóga, pilates a brunch',           info: 'lekce, brunch a hernička pro děti v ceně, 15 míst' },
  { id: 'rohlicky', date: '2026-11-11', time: '15:30–17:00', title: 'svatomartinské rohlíčky s dětmi',  info: 'pečeme se Žanet, 10 dětí' },
  { id: 'cupping',  date: '2026-11-21', time: '10:00–11:30', title: 'ochutnávka výběrové kávy',         info: 'tři kávy vedle sebe, 12 míst' },
  { id: 'pernicky', date: '2026-11-29', time: '14:00–16:00', title: 'adventní zdobení perníčků',        info: 'perníčky od Cukrové víly, 14 dětí' },
  { id: 'matcha',   date: '2026-12-03', time: '18:00–19:30', title: 'matcha doma: jak na to',           info: 'šlehání metličkou a matcha latte, 10 míst' }
];
