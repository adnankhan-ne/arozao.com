<?php
class CartController extends BaseController {
    public function index(array $params): void {
        $user = $this->requireAuth();
        Response::success($this->cart((int)$user['user_id']));
    }

    public function addItem(array $params): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $errors = $this->validate($data, ['quantity' => 'required|integer|min_value:1']);
        if ($errors) Response::validationError($errors);

        $db = Database::getInstance();
        $product = $this->findProduct($db, $data);
        if (!$product) Response::notFound('Product not found or unavailable.');
        $quantity = (int)$data['quantity'];
        $db->beginTransaction();
        try {
            $locked = $db->prepare("SELECT stock FROM products WHERE id=:id AND status='active' FOR UPDATE");
            $locked->execute(['id' => (int)$product['id']]);
            $stock = $locked->fetchColumn();
            if ($stock === false) {
                $db->rollBack();
                Response::notFound('Product not found or unavailable.');
            }
            $existing = $db->prepare('SELECT quantity FROM cart_items WHERE user_id=:uid AND product_id=:pid FOR UPDATE');
            $existing->execute(['uid' => (int)$user['user_id'], 'pid' => (int)$product['id']]);
            $currentQuantity = (int)($existing->fetchColumn() ?: 0);
            if ($quantity + $currentQuantity > (int)$stock) {
                $db->rollBack();
                Response::error('Requested quantity exceeds available stock.', 409);
            }
            $stmt = $db->prepare("
                INSERT INTO cart_items (user_id, product_id, quantity)
                VALUES (:uid, :pid, :quantity)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()
            ");
            $stmt->execute(['uid' => (int)$user['user_id'], 'pid' => (int)$product['id'], 'quantity' => $quantity]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        Response::success($this->cart((int)$user['user_id']), 'Cart updated.');
    }

    public function updateItem(array $params): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $errors = $this->validate($data, ['quantity' => 'required|integer|min_value:1']);
        if ($errors) Response::validationError($errors);
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT ci.product_id, p.stock FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.id=:id AND ci.user_id=:uid AND p.status=:status');
        $stmt->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id'], 'status' => 'active']);
        $item = $stmt->fetch();
        if (!$item) Response::notFound('Cart item not found.');
        if ((int)$data['quantity'] > (int)$item['stock']) Response::error('Requested quantity exceeds available stock.', 409);
        $db->prepare('UPDATE cart_items SET quantity=:quantity, updated_at=NOW() WHERE id=:id AND user_id=:uid')
            ->execute(['quantity' => (int)$data['quantity'], 'id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        Response::success($this->cart((int)$user['user_id']), 'Cart item updated.');
    }

    public function removeItem(array $params): void {
        $user = $this->requireAuth();
        $stmt = Database::getInstance()->prepare('DELETE FROM cart_items WHERE id=:id AND user_id=:uid');
        $stmt->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        if (!$stmt->rowCount()) Response::notFound('Cart item not found.');
        Response::success($this->cart((int)$user['user_id']), 'Cart item removed.');
    }

    public function clear(array $params): void {
        $user = $this->requireAuth();
        Database::getInstance()->prepare('DELETE FROM cart_items WHERE user_id=:uid')->execute(['uid' => (int)$user['user_id']]);
        Response::success(['items' => [], 'count' => 0, 'subtotal' => 0], 'Cart cleared.');
    }

    private function findProduct(PDO $db, array $data): ?array {
        if (isset($data['product_id'])) {
            $stmt = $db->prepare("SELECT id, stock FROM products WHERE id=:id AND status='active'");
            $stmt->execute(['id' => (int)$data['product_id']]);
        } elseif (!empty($data['slug'])) {
            $stmt = $db->prepare("SELECT id, stock FROM products WHERE slug=:slug AND status='active'");
            $stmt->execute(['slug' => trim($data['slug'])]);
        } else {
            Response::validationError(['product_id' => ['A product_id or slug is required.']]);
        }
        return $stmt->fetch() ?: null;
    }

    private function cart(int $userId): array {
        $stmt = Database::getInstance()->prepare("
            SELECT ci.id, ci.product_id, ci.quantity, ci.created_at,
                   p.name, p.slug, p.sku, p.regular_price, p.sale_price, p.stock,
                   p.avg_rating, p.review_count, pi.image_url AS primary_image,
                   COALESCE(p.sale_price, p.regular_price) AS unit_price
            FROM cart_items ci JOIN products p ON p.id=ci.product_id
            LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
            WHERE ci.user_id=:uid AND p.status='active'
            ORDER BY ci.created_at DESC
        ");
        $stmt->execute(['uid' => $userId]);
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['subtotal'] = (float)$item['unit_price'] * (int)$item['quantity'];
        }
        unset($item);
        return [
            'items' => $items,
            'count' => array_sum(array_map(static fn(array $item): int => (int)$item['quantity'], $items)),
            'subtotal' => array_sum(array_column($items, 'subtotal')),
        ];
    }
}
