<?php
/**
 * Arozao Marketplace — Application Configuration
 */
require_once __DIR__ . '/env.php';

// ─── Site ───────────────────────────────────────────────────────────────────
define('APP_NAME',    'Arozao Marketplace');
define('APP_URL',     getenv('APP_URL') ?: 'http://localhost/Arozao%20Website/api');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost:3000');
define('APP_ENV',     getenv('APP_ENV') ?: 'development');
define('APP_DEBUG',   APP_ENV === 'development');
define('API_INTERNAL_KEY', getenv('PHP_INTERNAL_KEY') ?: '');

// ─── JWT ────────────────────────────────────────────────────────────────────
function loadJwtSecret(): string {
    $configured = getenv('JWT_SECRET');
    if ($configured !== false && strlen($configured) >= 32) return $configured;
    if (APP_ENV === 'production') {
        throw new RuntimeException('JWT_SECRET must be set to at least 32 characters in production.');
    }

    $secretFile = __DIR__ . '/../storage/jwt-secret.local';
    if (is_file($secretFile)) {
        $secret = trim((string)file_get_contents($secretFile));
        if (strlen($secret) >= 32) return $secret;
    }
    if (!is_dir(dirname($secretFile)) && !mkdir(dirname($secretFile), 0700, true) && !is_dir(dirname($secretFile))) {
        throw new RuntimeException('Unable to create local API secret storage.');
    }
    $secret = bin2hex(random_bytes(32));
    if (file_put_contents($secretFile, $secret . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Unable to persist the local API signing secret.');
    }
    @chmod($secretFile, 0600);
    return $secret;
}

define('JWT_SECRET',         loadJwtSecret());
define('JWT_EXPIRY_SECONDS', (int)(getenv('JWT_EXPIRY')   ?: 3600 * 24 * 7));   // 7 days
define('JWT_ALGORITHM',      'HS256');

// ─── File Storage ────────────────────────────────────────────────────────────
define('UPLOAD_DIR',       __DIR__ . '/../storage/uploads/');
define('UPLOAD_URL',       APP_URL . '/storage/uploads/');
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024); // 5 MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// ─── Payment Gateways ────────────────────────────────────────────────────────
define('BKASH_APP_KEY',       getenv('BKASH_APP_KEY')       ?: '');
define('BKASH_APP_SECRET',    getenv('BKASH_APP_SECRET')    ?: '');
define('BKASH_USERNAME',      getenv('BKASH_USERNAME')      ?: '');
define('BKASH_PASSWORD',      getenv('BKASH_PASSWORD')      ?: '');
define('BKASH_BASE_URL',      getenv('BKASH_BASE_URL')      ?: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout');

define('NAGAD_MERCHANT_ID',   getenv('NAGAD_MERCHANT_ID')   ?: '');
define('NAGAD_MERCHANT_KEY',  getenv('NAGAD_MERCHANT_KEY')  ?: '');
define('NAGAD_BASE_URL',      getenv('NAGAD_BASE_URL')      ?: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0');

define('PAYMENT_WEBHOOK_SECRET', getenv('PAYMENT_WEBHOOK_SECRET') ?: '');

// ─── Courier APIs ────────────────────────────────────────────────────────────
define('STEADFAST_API_KEY',    getenv('STEADFAST_API_KEY')    ?: '');
define('STEADFAST_SECRET_KEY', getenv('STEADFAST_SECRET_KEY') ?: '');
define('STEADFAST_BASE_URL',   'https://portal.steadfast.com.bd/api/v1');

define('PATHAO_CLIENT_ID',     getenv('PATHAO_CLIENT_ID')     ?: '');
define('PATHAO_CLIENT_SECRET', getenv('PATHAO_CLIENT_SECRET') ?: '');
define('PATHAO_BASE_URL',      'https://hermes.pathao.com/api/v1');

define('REDX_API_TOKEN',  getenv('REDX_API_TOKEN')  ?: '');
define('REDX_BASE_URL',   'https://open-api.redx.com.bd/v1.0.0-beta');

// ─── SMS ─────────────────────────────────────────────────────────────────────
define('SMS_API_KEY',  getenv('SMS_API_KEY')  ?: '');
define('SMS_API_URL',  getenv('SMS_API_URL')  ?: '');

// ─── Email ───────────────────────────────────────────────────────────────────
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.mailtrap.io');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM', getenv('SMTP_FROM') ?: 'no-reply@arozao.com');
define('SMTP_FROM_NAME', 'Arozao Marketplace');

// ─── Pagination ──────────────────────────────────────────────────────────────
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE',     100);

// ─── Commission Defaults ─────────────────────────────────────────────────────
define('DEFAULT_COMMISSION_RATE', 7.0); // 7%
define('ESCROW_HOLD_DAYS',        7);   // 7-day return window

// ─── Currency ────────────────────────────────────────────────────────────────
define('CURRENCY_CODE',   'BDT');
define('CURRENCY_SYMBOL', '৳');
