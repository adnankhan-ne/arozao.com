<?php
class NotificationController extends BaseController {
    public function index(array $params): void {
        $user = $this->requireAuth();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();
        $db = Database::getInstance();
        $count = $db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=:uid');
        $count->execute(['uid' => (int)$user['user_id']]);
        $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id=:uid ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':uid', (int)$user['user_id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }

    public function markRead(array $params): void {
        $user = $this->requireAuth();
        $stmt = Database::getInstance()->prepare('UPDATE notifications SET is_read=1 WHERE id=:id AND user_id=:uid');
        $stmt->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        if (!$stmt->rowCount()) Response::notFound('Notification not found.');
        Response::success(null, 'Notification marked as read.');
    }

    public function markAllRead(array $params): void {
        $user = $this->requireAuth();
        Database::getInstance()->prepare('UPDATE notifications SET is_read=1 WHERE user_id=:uid AND is_read=0')
            ->execute(['uid' => (int)$user['user_id']]);
        Response::success(null, 'Notifications marked as read.');
    }
}
