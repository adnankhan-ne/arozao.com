<?php
/**
 * Arozao PHP API — Base Controller
 * All controllers extend this to get common helpers.
 */
abstract class BaseController {

    // ─── Parsed Request Body ─────────────────────────────────────────────────
    protected function body(): array {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return [];
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Request body must be a valid JSON object.', 400);
        }
        return $data;
    }

    protected function query(string $key, mixed $default = null): mixed {
        return $_GET[$key] ?? $default;
    }

    protected function input(string $key, mixed $default = null): mixed {
        $data = $this->body();
        return $data[$key] ?? $default;
    }

    // ─── Pagination ──────────────────────────────────────────────────────────
    protected function paginationParams(): array {
        $page    = max(1, (int)($this->query('page', 1)));
        $perPage = min(MAX_PAGE_SIZE, max(1, (int)($this->query('per_page', DEFAULT_PAGE_SIZE))));
        $offset  = ($page - 1) * $perPage;
        return compact('page', 'perPage', 'offset');
    }

    // ─── Validation ──────────────────────────────────────────────────────────
    protected function validate(array $data, array $rules): array {
        $errors = [];
        foreach ($rules as $field => $ruleString) {
            $fieldRules = explode('|', $ruleString);
            $value = $data[$field] ?? null;
            foreach ($fieldRules as $rule) {
                [$ruleName, $ruleParam] = array_pad(explode(':', $rule, 2), 2, null);
                $error = $this->applyRule($field, $value, $ruleName, $ruleParam, $data);
                if ($error) {
                    $errors[$field][] = $error;
                    break; // Stop at first error per field
                }
            }
        }
        return $errors;
    }

    private function applyRule(string $field, mixed $value, string $rule, ?string $param, array $data): ?string {
        $label = ucfirst(str_replace('_', ' ', $field));
        switch ($rule) {
            case 'required':
                if ($value === null || $value === '') return "$label is required.";
                break;
            case 'string':
                if ($value !== null && !is_string($value)) return "$label must be a string.";
                break;
            case 'numeric':
                if ($value !== null && !is_numeric($value)) return "$label must be numeric.";
                break;
            case 'integer':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_INT)) return "$label must be an integer.";
                break;
            case 'email':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) return "$label must be a valid email.";
                break;
            case 'min':
                if ($value !== null && strlen((string)$value) < (int)$param) return "$label must be at least $param characters.";
                break;
            case 'max':
                if ($value !== null && strlen((string)$value) > (int)$param) return "$label must not exceed $param characters.";
                break;
            case 'min_value':
                if ($value !== null && (float)$value < (float)$param) return "$label must be at least $param.";
                break;
            case 'max_value':
                if ($value !== null && (float)$value > (float)$param) return "$label must not exceed $param.";
                break;
            case 'in':
                $allowed = explode(',', $param);
                if ($value !== null && !in_array($value, $allowed, true)) return "$label must be one of: " . implode(', ', $allowed) . ".";
                break;
            case 'phone_bd':
                if ($value !== null && !preg_match('/^(\+?880|0)?1[3-9]\d{8}$/', (string)$value)) return "$label must be a valid Bangladeshi phone number.";
                break;
            case 'url':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_URL)) return "$label must be a valid URL.";
                break;
            case 'boolean':
                if ($value !== null && !is_bool($value) && !in_array($value, [0, 1, '0', '1', 'true', 'false'], true)) return "$label must be true or false.";
                break;
            case 'confirmed':
                $confirmField = $field . '_confirmation';
                if ($value !== ($data[$confirmField] ?? null)) return "$label confirmation does not match.";
                break;
        }
        return null;
    }

    // ─── Auth Guard ──────────────────────────────────────────────────────────
    protected function requireAuth(): array {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (!str_starts_with($header, 'Bearer ')) {
            Response::unauthorized();
        }
        $token = substr($header, 7);
        try {
            $payload = JWT::decode($token);
        } catch (RuntimeException $e) {
            Response::unauthorized($e->getMessage());
        }
        $userId = (int)($payload['user_id'] ?? 0);
        if ($userId < 1) Response::unauthorized('Invalid authentication token.');

        $stmt = Database::getInstance()->prepare('SELECT id, email, role, is_active FROM users WHERE id=:id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();
        if (!$user || !(int)$user['is_active']) Response::unauthorized('This user account is unavailable.');

        $payload['user_id'] = (int)$user['id'];
        $payload['email'] = $user['email'];
        $payload['role'] = $user['role'];
        return $payload;
    }

    protected function requireRole(string ...$roles): array {
        $user = $this->requireAuth();
        if (!in_array($user['role'] ?? '', $roles, true)) {
            Response::forbidden("This action requires role: " . implode(' or ', $roles));
        }
        return $user;
    }

    protected function requireAdmin(): array {
        return $this->requireRole('admin', 'super_admin');
    }

    protected function requireSeller(): array {
        return $this->requireRole('seller', 'admin', 'super_admin');
    }

    // ─── Slug Generator ──────────────────────────────────────────────────────
    protected function makeSlug(string $text): string {
        $slug = strtolower(trim($text));
        $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
        $slug = preg_replace('/[\s-]+/', '-', $slug);
        return trim($slug, '-');
    }

    // ─── Order Number ────────────────────────────────────────────────────────
    protected function generateOrderNumber(): string {
        return 'ARZ-' . date('Y') . '-' . strtoupper(substr(uniqid(), -6));
    }

    // ─── Audit Logging ───────────────────────────────────────────────────────
    protected function auditLog(int $adminId, string $action, string $resourceType, mixed $resourceId, array $metadata = []): void {
        $db = Database::getInstance();
        $stmt = $db->prepare("
            INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, metadata, ip_address)
            VALUES (:admin_id, :action, :resource_type, :resource_id, :metadata, :ip)
        ");
        $stmt->execute([
            'admin_id'      => $adminId,
            'action'        => $action,
            'resource_type' => $resourceType,
            'resource_id'   => (string)$resourceId,
            'metadata'      => json_encode($metadata),
            'ip'            => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        ]);
    }
}
