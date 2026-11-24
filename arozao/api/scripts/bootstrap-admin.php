<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

$email = strtolower(trim((string)getenv('ADMIN_BOOTSTRAP_EMAIL')));
$password = (string)getenv('ADMIN_BOOTSTRAP_PASSWORD');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "ADMIN_BOOTSTRAP_EMAIL must be a valid email address.\n");
    exit(1);
}
if (strlen($password) < 12) {
    fwrite(STDERR, "ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.\n");
    exit(1);
}

$db = Database::getInstance();
$db->beginTransaction();
try {
    $select = $db->prepare('SELECT id FROM users WHERE email=:email LIMIT 1 FOR UPDATE');
    $select->execute(['email' => $email]);
    $existingId = $select->fetchColumn();
    if ($existingId) {
        $userId = (int)$existingId;
        $db->prepare("UPDATE users SET password_hash=:password_hash, role='super_admin', is_active=1 WHERE id=:id")
            ->execute(['password_hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $userId]);
    } else {
        $db->prepare("INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (:email, :password_hash, 'Super Admin', 'super_admin', 1)")
            ->execute(['email' => $email, 'password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
        $userId = (int)$db->lastInsertId();
    }

    $db->prepare("INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, metadata, ip_address) VALUES (:admin_id, 'admin_bootstrapped', 'users', :resource_id, :metadata, '127.0.0.1')")
        ->execute([
            'admin_id' => $userId,
            'resource_id' => (string)$userId,
            'metadata' => json_encode(['email' => $email, 'role' => 'super_admin'], JSON_THROW_ON_ERROR),
        ]);
    $db->commit();
    fwrite(STDOUT, "Admin account is ready for $email.\n");
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('[Arozao API] Admin bootstrap failed: ' . $e->getMessage());
    fwrite(STDERR, "Admin bootstrap failed. Check the PHP error log.\n");
    exit(1);
}
