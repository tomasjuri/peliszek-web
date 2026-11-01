# pelíszek. web

Jednostránkový web kavárny Pelíszek. Je to čisté HTML, CSS a JavaScript bez knihoven, takže funguje na každém běžném webhostingu. Formulář rezervací odesílá e-maily přes malý PHP skript.

## Co je uvnitř

```
public/                    to, co se nahrává na hosting
  obsah/                   všechny texty webu v textových souborech (návod v obsah/NAVOD.txt)
  index.html               kostra stránky
  css/style.css            vzhled
  js/obsah.js              načtení a kontrola souborů z obsah/
  js/main.js               vyplnění stránky, otevírací doba, menu na mobilu, formulář
  rezervace.php            odeslání rezervace e-mailem
  fonts/                   písma a jejich licence
  favicon.svg              ikonka v prohlížeči
  apple-touch-icon.png     ikonka po přidání webu na plochu telefonu
  robots.txt               pokyny pro vyhledávače
scripts/kontrola-obsahu.js kontrola souborů z obsah/ před nahráním
.github/workflows/         automatické nahrání na hosting
```

## Vyzkoušení na počítači

Texty se načítají ze složky `public/obsah/`, a to prohlížeč dovolí jen přes webový server, ne při otevření `index.html` ze souboru. Stačí:

```
python3 -m http.server 8000 -d public
```

a otevřít http://localhost:8000. Všechno funguje kromě odeslání rezervace. To potřebuje PHP na hostingu.

Kontrolu textů před nahráním spustíte příkazem `node scripts/kontrola-obsahu.js`.

## Nahrání na hosting

Po každé změně ve složce `public/` na větvi `main` GitHub Actions soubory zkontrolují a nahrají přes FTPS na hosting. Když je v textech chyba, nic se nenahraje a na webu zůstane předchozí verze.

Přístup k FTP se zadává v nastavení repozitáře (Settings → Secrets and variables → Actions) jako `FTP_SERVER`, `FTP_USERNAME` a `FTP_PASSWORD`. Cílová složka je kořen FTP účtu, jinou nastavíte proměnnou `FTP_SERVER_DIR` (např. `www/`). Na hostingu musí být zapnuté PHP 7.4 nebo novější.

Texty je potřeba měnit v repozitáři, ne přímo na FTP. Změny na FTP by se při dalším nahrání přepsaly.

## Nastavení rezervací

Otevřete `public/rezervace.php` v textovém editoru a nahoře vyplňte dvě adresy:

```php
const PRIJEMCE   = 'rezervace@vase-domena.cz';  // kam mají žádosti chodit
const ODESILATEL = 'web@vase-domena.cz';        // adresa na vaší doméně
```

Odesílatel by měl být e-mail na stejné doméně jako web. Jinak hosting e-maily často neodešle nebo skončí ve spamu. Potom pošlete z webu zkušební rezervaci a ověřte, že dorazila.

Formulář má jednoduchou ochranu proti robotům (skryté pole). Kdyby přesto chodil spam, dá se doplnit reCAPTCHA nebo podobná služba.

## Úpravy obsahu

Všechny texty, akce, nabídka, ceny, otevírací doba a kontakty jsou v textových souborech ve složce `public/obsah/`. Jak je upravovat, popisuje `public/obsah/NAVOD.txt`. Otevírací doba i telefon se zadávají jen jednou a web je použije všude, včetně údajů pro Google.

V `index.html` zůstávají jen věci, které se mění zřídka: název stránky a popis pro vyhledávače (`<title>`, `description`, `og:`), nápisy na tlačítkách a v menu, popisky formuláře a název a popis kavárny v bloku `application/ld+json`.

Nový soubor nebo nové pole se přidává do seznamu `SOUBORY` na začátku `js/obsah.js`.

## Co je potřeba doplnit nebo ověřit

Tyto údaje jsou zatím ukázkové:
- program akcí (kromě formátu jógy s brunchem),
- druhy kávy, matchy a jejich ceny,
- položky na pultu,
- popisy herničky a dětských porcí.

Telefon 777 289 804 je převzatý z vašeho říjnového příspěvku. Ve veřejných zápisech se objevuje i 774 139 173, tak prosím ověřte, které číslo chcete na webu.

Až budete mít doménu, doplňte do hlavičky `public/index.html` řádek `<meta property="og:url" content="https://vase-domena.cz/">` a do bloku `application/ld+json` položku `"url": "https://vase-domena.cz/"`.

## Písma

Web používá zmenšené verze písem TeX Gyre Adventor (licence GUST Font License) a Lora (licence SIL Open Font License 1.1). Kvůli licencím jsou upravené soubory přejmenované na „Peliszek Display“ a „Peliszek Text“. Podrobnosti a texty licencí jsou ve složce `fonts`.
