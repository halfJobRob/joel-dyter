<?php
// Enquiry form settings. Edit these on the server if the email addresses change.
return [
    // Where enquiries are delivered.
    'to'        => 'mail@joeldyter.co.uk',
    // Sender address. Must be a mailbox on the joeldyter.co.uk domain hosted at Armour,
    // otherwise messages are likely to land in spam.
    'from'      => 'website@joeldyter.co.uk',
    'from_name' => 'Joel Dyter website',
    'subject'   => 'New website enquiry',
    'max_files' => 5,
    'max_total_bytes' => 20 * 1024 * 1024,
    'allowed_types' => [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
        'image/heic' => 'heic', 'image/heif' => 'heif', 'application/pdf' => 'pdf',
    ],
    // Minimum seconds between page load and submit (bots submit instantly).
    'min_seconds' => 3,
];
