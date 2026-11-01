# pelíszek. web

Jednostránkový web kavárny Pelíszek. Je to čisté HTML, CSS a JavaScript bez knihoven, takže funguje na každém běžném webhostingu. Formulář rezervací odesílá e-maily přes malý PHP skript.

## Co je uvnitř

```
index.html            celá stránka
css/style.css         vzhled
js/akce.js            program akcí (tohle budete upravovat nejčastěji)
js/main.js            otevírací doba, menu na mobilu, formulář
rezervace.php         odeslání rezervace e-mailem
fonts/                písma a jejich licence
favicon.svg           ikonka v prohlížeči
apple-touch-icon.png  ikonka po přidání webu na plochu telefonu
robots.txt            pokyny pro vyhledávače
```

## Vyzkoušení na počítači

Stačí otevřít `index.html` v prohlížeči. Všechno funguje kromě odeslání rezervace. To potřebuje PHP na hostingu, takže lokálně formulář ukáže hlášku, že se žádost nepodařilo odeslat.

## Nahrání na hosting (např. WEDOS)

1. Ve správě hostingu zkontrolujte, že je zapnuté PHP (stačí jakákoli verze od 7.4 výš).
2. Přes FTP nebo správce souborů nahrajte **obsah** složky `peliszek-web` do kořenové složky webu. U WEDOSu je to obvykle složka `www`. Soubor `index.html` musí ležet přímo v ní, ne v další podsložce.
3. Otevřete svou doménu a zkontrolujte, že se web načte i s písmy.

## Nastavení rezervací

Otevřete `rezervace.php` v textovém editoru a nahoře vyplňte dvě adresy:

```php
const PRIJEMCE   = 'rezervace@vase-domena.cz';  // kam mají žádosti chodit
const ODESILATEL = 'web@vase-domena.cz';        // adresa na vaší doméně
```

Odesílatel by měl být e-mail na stejné doméně jako web. Jinak hosting e-maily často neodešle nebo skončí ve spamu. Potom pošlete z webu zkušební rezervaci a ověřte, že dorazila.

Formulář má jednoduchou ochranu proti robotům (skryté pole). Kdyby přesto chodil spam, dá se doplnit reCAPTCHA nebo podobná služba.

## Úpravy obsahu

**Akce.** Upravte `js/akce.js`. Každá akce je jeden řádek s datem, časem, názvem a krátkou poznámkou. Proběhlé akce se schovají samy a nové se zároveň objeví ve výběru ve formuláři.

**Otevírací doba** je na třech místech, změňte ji ve všech:
- `js/main.js`, proměnná `HOURS` (podle ní web píše „teď máme otevřeno“),
- `index.html`, tabulka v sekci „kde nás najdete.“ a patička,
- `index.html`, blok `application/ld+json` v hlavičce (údaje pro Google).

**Nabídka a ceny** jsou v `index.html` v sekci „co u nás dobrého.“ Každá položka je jeden řádek `<li>`.

**Texty** jsou všechny v `index.html`, stačí je přepsat.

## Co je potřeba doplnit nebo ověřit

Tyto údaje jsou zatím ukázkové:
- program akcí (kromě formátu jógy s brunchem),
- druhy kávy, matchy a jejich ceny,
- položky na pultu,
- popisy herničky a dětských porcí.

Telefon 777 289 804 je převzatý z vašeho říjnového příspěvku. Ve veřejných zápisech se objevuje i 774 139 173, tak prosím ověřte, které číslo chcete na webu.

Až budete mít doménu, doplňte do hlavičky `index.html` řádek `<meta property="og:url" content="https://vase-domena.cz/">` a do bloku `application/ld+json` položku `"url": "https://vase-domena.cz/"`.

## Písma

Web používá zmenšené verze písem TeX Gyre Adventor (licence GUST Font License) a Lora (licence SIL Open Font License 1.1). Kvůli licencím jsou upravené soubory přejmenované na „Peliszek Display“ a „Peliszek Text“. Podrobnosti a texty licencí jsou ve složce `fonts`.
