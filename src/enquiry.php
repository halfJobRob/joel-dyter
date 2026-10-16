<?php
// Handles the contact form: validates, attaches photos, emails Joel.
// Replies with JSON for the site's JavaScript, or redirects for plain form posts.
declare(strict_types=1);

$config = require __DIR__ . '/enquiry-config.php';
$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $error = ''): void {
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($ok ? 200 : 422);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } else {
        if ($ok) {
            header('Location: /thank-you/', true, 303);
        } else {
            http_response_code(422);
            header('Content-Type: text/html; charset=utf-8');
            echo '<!doctype html><meta charset="utf-8"><title>Enquiry not sent</title><p>' . htmlspecialchars($error) . '</p><p><a href="/contact/">Back to the form</a></p>';
        }
    }
    exit;
}

function clean_line(string $v, int $max = 200): string {
    $v = trim(preg_replace('/[\r\n\t]+/', ' ', $v));
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /contact/', true, 303);
    exit;
}

// Spam traps: hidden field must be empty, and the form must not be submitted instantly.
if (!empty($_POST['website'])) respond(true);
$started = (int)($_POST['started'] ?? 0);
if ($started > 0 && time() - $started < $config['min_seconds']) respond(true);

$name      = clean_line((string)($_POST['name'] ?? ''), 100);
$email     = clean_line((string)($_POST['email'] ?? ''), 200);
$phone     = clean_line((string)($_POST['phone'] ?? ''), 40);
$postcode  = clean_line((string)($_POST['postcode'] ?? ''), 20);
$project   = clean_line((string)($_POST['project'] ?? ''), 80);
$budget    = clean_line((string)($_POST['budget'] ?? ''), 80);
$timescale = clean_line((string)($_POST['timescale'] ?? ''), 80);
$message   = trim(mb_substr((string)($_POST['message'] ?? ''), 0, 5000));
$consent   = ($_POST['consent'] ?? '') === 'yes';

if ($name === '' || $message === '' || $project === '') respond(false, 'Please fill in your name, the type of project and a short message.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Please check your email address.');
if (!$consent) respond(false, 'Please tick the box so Joel can reply to you.');

// Attachments
$attachments = [];
if (!empty($_FILES['photos']) && is_array($_FILES['photos']['name'])) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $total = 0;
    $count = 0;
    foreach ($_FILES['photos']['name'] as $i => $origName) {
        $err = $_FILES['photos']['error'][$i];
        if ($err === UPLOAD_ERR_NO_FILE) continue;
        if ($err !== UPLOAD_ERR_OK) respond(false, 'One of the files could not be uploaded. Try smaller photos, or send them on WhatsApp.');
        $tmp = $_FILES['photos']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) continue;
        $count++;
        $total += (int)$_FILES['photos']['size'][$i];
        if ($count > $config['max_files']) respond(false, 'Please attach up to ' . $config['max_files'] . ' files.');
        if ($total > $config['max_total_bytes']) respond(false, 'The files are too large in total. Try fewer photos, or send them on WhatsApp.');
        $type = $finfo->file($tmp) ?: '';
        if (!isset($config['allowed_types'][$type])) respond(false, 'Please attach photos (JPG, PNG, HEIC) or PDF drawings only.');
        $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '-', pathinfo((string)$origName, PATHINFO_FILENAME)) ?: 'photo';
        $attachments[] = [
            'name' => mb_substr($safeName, 0, 60) . '.' . $config['allowed_types'][$type],
            'type' => $type,
            'data' => file_get_contents($tmp),
        ];
    }
}

// Build the email
$rows = [
    'Name' => $name, 'Email' => $email, 'Phone' => $phone ?: '-', 'Postcode' => $postcode ?: '-',
    'Project' => $project, 'Budget' => $budget ?: 'Not given', 'Timescale' => $timescale ?: 'Not given',
];
$text = "New enquiry from the website\n\n";
foreach ($rows as $k => $v) $text .= str_pad($k . ':', 12) . $v . "\n";
$text .= "\nMessage:\n" . $message . "\n";
if ($attachments) $text .= "\n" . count($attachments) . " file(s) attached.\n";
$text .= "\nReply to this email to answer " . $name . " directly.\n";

$subject = $config['subject'] . ': ' . $project . ' (' . $name . ')';
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$fromName = '=?UTF-8?B?' . base64_encode($config['from_name']) . '?=';
$replyName = '=?UTF-8?B?' . base64_encode($name) . '?=';

$headers = [
    'From: ' . $fromName . ' <' . $config['from'] . '>',
    'Reply-To: ' . $replyName . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'X-Mailer: joeldyter.co.uk',
];

if ($attachments) {
    $boundary = 'b_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($text)) . "\r\n";
    foreach ($attachments as $a) {
        $body .= "--$boundary\r\nContent-Type: {$a['type']}; name=\"{$a['name']}\"\r\n"
               . "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n"
               . chunk_split(base64_encode($a['data'])) . "\r\n";
    }
    $body .= "--$boundary--\r\n";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $body = chunk_split(base64_encode($text));
}

$sent = mail($config['to'], $encodedSubject, $body, implode("\r\n", $headers), '-f' . $config['from']);
if (!$sent) {
    error_log('Enquiry mail() failed for ' . $email);
    respond(false, 'Sorry, the message could not be sent just now. Please WhatsApp or email Joel directly.');
}
respond(true);
