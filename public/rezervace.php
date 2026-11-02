<?php
/*
  pelíszek. odeslání rezervace z webu e-mailem

  NASTAVENÍ: vyplňte dvě adresy níže.
  - PRIJEMCE:   kam mají žádosti chodit (např. vaše kavárenská schránka)
  - ODESILATEL: adresa na vaší doméně (např. web@peliszek.cz).
                Hostingy obvykle vyžadují, aby odesílatel byl z domény webu,
                jinak e-maily končí ve spamu nebo se vůbec neodešlou.
*/
const PRIJEMCE   = 'rezervace@vase-domena.cz';
const ODESILATEL = 'web@peliszek.cz';

date_default_timezone_set('Europe/Prague');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function odpoved(bool $ok, int $kod = 200, string $chyba = ''): void {
    http_response_code($kod);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $chyba], JSON_UNESCAPED_UNICODE);
    exit;
}

function zkrat(string $s, int $max): string {
    return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
}

// Jednořádkové pole: bez zalomení řádků (ochrana hlaviček e-mailu), s omezenou délkou.
function pole(string $klic, int $max = 200): string {
    $v = isset($_POST[$klic]) ? trim((string) $_POST[$klic]) : '';
    $v = preg_replace('/[\r\n\t]+/', ' ', $v);
    return zkrat($v, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    odpoved(false, 405, 'Použijte formulář na webu.');
}

// Past na roboty: skryté pole "web" člověk nevyplní.
if (pole('web') !== '') {
    odpoved(true);
}

$typy = ['stul' => 'Stůl', 'akce' => 'Místo na akci', 'oslava' => 'Oslava', 'dort' => 'Dort na objednávku'];
$typ = pole('typ', 20);
if (!isset($typy[$typ])) {
    odpoved(false, 422, 'Neznámý typ rezervace.');
}

$jmeno   = pole('jmeno', 100);
$telefon = pole('telefon', 40);
if ($jmeno === '' || $telefon === '') {
    odpoved(false, 422, 'Chybí jméno nebo telefon.');
}
if (!preg_match('/^[0-9 +()\/.\-]{6,25}$/', $telefon)) {
    odpoved(false, 422, 'Telefon nevypadá jako telefonní číslo.');
}

$datum = pole('datum', 10);
if ($datum !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datum)) {
    odpoved(false, 422, 'Neplatné datum.');
}
$datumHezky = $datum !== '' ? date('j. n. Y', strtotime($datum)) : '';

$poznamka = isset($_POST['poznamka']) ? zkrat(trim((string) $_POST['poznamka']), 1000) : '';

$radky = [
    'Typ'        => $typy[$typ],
    'Jméno'      => $jmeno,
    'Telefon'    => $telefon,
    'Akce'       => pole('akce', 200),
    'Datum'      => $datumHezky,
    'Čas'        => pole('cas', 10),
    'Počet osob' => pole('osoby', 20),
    'Dospělí'    => pole('dospeli', 5),
    'Děti'       => pole('deti', 5),
    'Porcí'      => pole('porce', 20),
    'Poznámka'   => $poznamka,
];

$text = "Nová žádost z webu pelíszek.\n\n";
foreach ($radky as $popis => $hodnota) {
    if ($hodnota !== '') {
        $delka = function_exists('mb_strlen') ? mb_strlen($popis, 'UTF-8') : strlen($popis);
        $text .= $popis . ':' . str_repeat(' ', max(1, 12 - $delka)) . $hodnota . "\n";
    }
}
$text .= "\nOdesláno " . date('j. n. Y H:i') . ".\nOdpovězte prosím telefonicky na uvedené číslo.\n";

$predmet = 'Rezervace z webu: ' . $typy[$typ] . ', ' . $jmeno;
$zakoduj = fn(string $s): string => '=?UTF-8?B?' . base64_encode($s) . '?=';

$hlavicky = implode("\r\n", [
    'From: ' . $zakoduj('Pelíszek web') . ' <' . ODESILATEL . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$odeslano = @mail(PRIJEMCE, $zakoduj($predmet), $text, $hlavicky, '-f' . ODESILATEL);

$odeslano ? odpoved(true) : odpoved(false, 500, 'E-mail se nepodařilo odeslat.');
