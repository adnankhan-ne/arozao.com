<?php
/**
 * Arozao PHP API — JSON Response Helper
 */
class Response {

    public static function json(mixed $data, int $status = 200): void {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'Success', int $status = 200): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    public static function paginated(array $items, int $total, int $page, int $perPage, string $message = 'OK'): void {
        self::json([
            'success'    => true,
            'message'    => $message,
            'data'       => $items,
            'pagination' => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => (int)ceil($total / $perPage),
                'from'         => ($page - 1) * $perPage + 1,
                'to'           => min($page * $perPage, $total),
            ],
        ], 200);
    }

    public static function error(string $message, int $status = 400, array $errors = []): void {
        $body = [
            'success' => false,
            'message' => $message,
        ];
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        self::json($body, $status);
    }

    public static function unauthorized(string $message = 'Unauthorized. Please login.'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden. Insufficient permissions.'): void {
        self::error($message, 403);
    }

    public static function notFound(string $message = 'Resource not found.'): void {
        self::error($message, 404);
    }

    public static function validationError(array $errors, string $message = 'Validation failed.'): void {
        self::error($message, 422, $errors);
    }
}
