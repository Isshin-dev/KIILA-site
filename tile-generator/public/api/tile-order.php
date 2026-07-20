<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function cleanText($value, int $maxLength): string
{
    $text = trim((string) $value);
    return mb_substr($text, 0, $maxLength);
}

function safeHeaderValue(string $value): string
{
    return str_replace(["\r", "\n"], ' ', $value);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'POST メソッドのみ使用できます。']);
}

$configFile = __DIR__ . '/order-config.php';
if (!is_file($configFile)) {
    respond(503, ['ok' => false, 'message' => 'メール送信設定が完了していません。']);
}

$config = require $configFile;
$recipient = (string) ($config['recipient'] ?? '');
$from = (string) ($config['from'] ?? '');
if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
    respond(503, ['ok' => false, 'message' => 'メール送信設定が正しくありません。']);
}

// ボットが自動入力しやすいハニーポット。値がある投稿は成功したように返して処理しない。
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(200, ['ok' => true]);
}

// 同一 IP からの大量送信を抑止する（30 秒に 1 回まで）。
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'mokuri-order-' . hash('sha256', $ip);
if (is_file($rateFile) && (time() - (int) file_get_contents($rateFile)) < 30) {
    respond(429, ['ok' => false, 'message' => '連続送信を制限しています。少し時間をおいて再度お試しください。']);
}

$name = cleanText($_POST['name'] ?? '', 100);
$email = cleanText($_POST['email'] ?? '', 254);
$phone = cleanText($_POST['phone'] ?? '', 50);
$message = cleanText($_POST['message'] ?? '', 2000);
$specification = cleanText($_POST['specification'] ?? '', 100000);

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $specification === '') {
    respond(422, ['ok' => false, 'message' => '必須項目が不足しています。']);
}

/** @return array{name: string, mime: string, content: string}|null */
function uploadedFile(string $key, string $mime): ?array
{
    $file = $_FILES[$key] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }
    $size = (int) ($file['size'] ?? 0);
    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($size < 1 || $size > 5 * 1024 * 1024 || !is_uploaded_file($tmpName)) {
        return null;
    }
    $content = file_get_contents($tmpName);
    if ($content === false) {
        return null;
    }
    return [
        'name' => preg_replace('/[^A-Za-z0-9._-]/', '-', (string) ($file['name'] ?? $key)) ?: $key,
        'mime' => $mime,
        'content' => $content,
    ];
}

$svg = uploadedFile('svg', 'image/svg+xml');
$dxf = uploadedFile('dxf', 'application/dxf');
if ($svg === null || $dxf === null) {
    respond(422, ['ok' => false, 'message' => '設計データを受け取れませんでした。']);
}

$decodedSpecification = json_decode($specification, true);
$specificationText = is_array($decodedSpecification)
    ? json_encode($decodedSpecification, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    : $specification;

$boundary = '=_mokuri_' . bin2hex(random_bytes(16));
$subject = '【MOKURI】タイル設計データ・見積もり依頼';
$body = implode("\n", [
    'MOKURI タイル設計ツールから、見積もり依頼が届きました。',
    '',
    'お名前: ' . $name,
    'メール: ' . $email,
    '電話番号: ' . $phone,
    'ご要望:',
    $message,
    '',
    '生成条件（JSON）:',
    (string) $specificationText,
]);

$headers = [
    'From: ' . safeHeaderValue($from),
    'Reply-To: ' . safeHeaderValue($email),
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
];

$mailBody = '--' . $boundary . "\r\n";
$mailBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
$mailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$mailBody .= $body . "\r\n";
foreach ([$svg, $dxf] as $attachment) {
    $mailBody .= '--' . $boundary . "\r\n";
    $mailBody .= 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . "\"\r\n";
    $mailBody .= "Content-Transfer-Encoding: base64\r\n";
    $mailBody .= 'Content-Disposition: attachment; filename="' . $attachment['name'] . "\"\r\n\r\n";
    $mailBody .= chunk_split(base64_encode($attachment['content'])) . "\r\n";
}
$mailBody .= '--' . $boundary . "--\r\n";

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = mail($recipient, $encodedSubject, $mailBody, implode("\r\n", $headers), '-f' . $from);
if (!$sent) {
    respond(502, ['ok' => false, 'message' => 'メール送信に失敗しました。']);
}

file_put_contents($rateFile, (string) time(), LOCK_EX);
respond(200, ['ok' => true]);
