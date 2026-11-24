<?php
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!preg_match('/^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/', $line, $matches)) {
            throw new RuntimeException('Invalid environment setting in api/.env.');
        }
        $name = $matches[1];
        if (getenv($name) !== false) continue;
        $value = trim($matches[2]);
        if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        } else {
            $value = preg_replace('/\s+#.*$/', '', $value);
        }
        putenv("$name=$value");
        $_ENV[$name] = $value;
    }
}
