<?php
class HealthController extends BaseController {
    public function check(array $params): void {
        try {
            Database::getInstance()->query('SELECT 1');
            Response::success(['status' => 'ok', 'database' => 'connected']);
        } catch (Throwable $e) {
            error_log('[Arozao API] Health check database error: ' . $e->getMessage());
            Response::error('Service temporarily unavailable.', 503);
        }
    }
}
