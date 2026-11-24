<?php
class WishlistController extends BaseController {
    public function index(array $params): void {
        $user = $this->requireAuth();
        $stmt = Database::getInstance()->prepare("
            SELECT p.id, p.name, p.slug, p.regular_price, p.sale_price, p.stock,
                   p.avg_rating, p.review_count, pi.image_url AS primary_image
            FROM wishlists w JOIN products p ON p.id=w.product_id
            LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
            WHERE w.user_id=:uid AND p.status='active'
            ORDER BY w.created_at DESC
        ");
        $stmt->execute(['uid' => (int)$user['user_id']]);
        Response::success($stmt->fetchAll());
    }

    public function toggle(array $params): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $db = Database::getInstance();
        $product = null;
        if (isset($data['product_id'])) {
            $stmt = $db->prepare("SELECT id FROM products WHERE id=:id AND status='active'");
            $stmt->execute(['id' => (int)$data['product_id']]);
            $product = $stmt->fetch();
        } elseif (!empty($data['slug'])) {
            $stmt = $db->prepare("SELECT id FROM products WHERE slug=:slug AND status='active'");
            $stmt->execute(['slug' => trim($data['slug'])]);
            $product = $stmt->fetch();
        }
        if (!$product) Response::notFound('Product not found or unavailable.');

        $stmt = $db->prepare('SELECT id FROM wishlists WHERE user_id=:uid AND product_id=:pid');
        $stmt->execute(['uid' => (int)$user['user_id'], 'pid' => (int)$product['id']]);
        $existing = $stmt->fetch();
        if ($existing) {
            $db->prepare('DELETE FROM wishlists WHERE id=:id')->execute(['id' => $existing['id']]);
            Response::success(['added' => false], 'Product removed from wishlist.');
        }
        $db->prepare('INSERT INTO wishlists (user_id, product_id) VALUES (:uid, :pid)')
            ->execute(['uid' => (int)$user['user_id'], 'pid' => (int)$product['id']]);
        Response::success(['added' => true], 'Product added to wishlist.', 201);
    }
}
