<?php
class ReviewController extends BaseController {
    public function store(array $params): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $errors = $this->validate($data, [
            'product_id' => 'required|integer',
            'rating' => 'required|integer|min_value:1|max_value:5',
            'body' => 'required|string|min:2|max:5000',
            'order_item_id' => 'required|integer',
        ]);
        if ($errors) Response::validationError($errors);

        $db = Database::getInstance();
        $purchase = $db->prepare("
            SELECT oi.id FROM order_items oi
            JOIN orders o ON o.id=oi.order_id
            WHERE oi.id=:item AND oi.product_id=:product AND o.customer_id=:uid
              AND o.status IN ('delivered','completed')
        ");
        $purchase->execute(['item' => (int)$data['order_item_id'], 'product' => (int)$data['product_id'], 'uid' => (int)$user['user_id']]);
        if (!$purchase->fetch()) Response::forbidden('A delivered purchase of this product is required to leave a review.');

        try {
            $stmt = $db->prepare('INSERT INTO product_reviews (product_id,customer_id,order_item_id,rating,title,body,verified_purchase) VALUES (:product,:uid,:item,:rating,:title,:body,1)');
            $stmt->execute([
                'product' => (int)$data['product_id'], 'uid' => (int)$user['user_id'],
                'item' => (int)$data['order_item_id'], 'rating' => (int)$data['rating'],
                'title' => $data['title'] ?? null, 'body' => trim($data['body']),
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') Response::error('A review for this order item already exists.', 409);
            throw $e;
        }
        $this->updateRating((int)$data['product_id']);
        Response::success(['id' => (int)$db->lastInsertId()], 'Review submitted.', 201);
    }

    public function update(array $params): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $errors = $this->validate($data, ['rating' => 'required|integer|min_value:1|max_value:5', 'body' => 'required|string|min:2|max:5000']);
        if ($errors) Response::validationError($errors);
        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE product_reviews SET rating=:rating,title=:title,body=:body WHERE id=:id AND customer_id=:uid');
        $stmt->execute(['rating' => (int)$data['rating'], 'title' => $data['title'] ?? null, 'body' => trim($data['body']), 'id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        if (!$stmt->rowCount()) Response::notFound('Review not found or unchanged.');
        $product = $db->prepare('SELECT product_id FROM product_reviews WHERE id=:id');
        $product->execute(['id' => (int)$params['id']]);
        $this->updateRating((int)$product->fetchColumn());
        Response::success(null, 'Review updated.');
    }

    public function destroy(array $params): void {
        $user = $this->requireAuth();
        $db = Database::getInstance();
        $product = $db->prepare('SELECT product_id FROM product_reviews WHERE id=:id AND customer_id=:uid');
        $product->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        $productId = $product->fetchColumn();
        if (!$productId) Response::notFound('Review not found.');
        $db->prepare('DELETE FROM product_reviews WHERE id=:id')->execute(['id' => (int)$params['id']]);
        $this->updateRating((int)$productId);
        Response::success(null, 'Review deleted.');
    }

    public function markHelpful(array $params): void {
        $user = $this->requireAuth();
        $db = Database::getInstance();
        $reviewId = (int)$params['id'];
        $db->beginTransaction();
        try {
            $check = $db->prepare('SELECT id FROM product_reviews WHERE id=:id AND is_approved=1');
            $check->execute(['id' => $reviewId]);
            if (!$check->fetch()) {
                $db->rollBack();
                Response::notFound('Review not found.');
            }
            $vote = $db->prepare('INSERT IGNORE INTO review_helpful_votes (review_id,user_id) VALUES (:review,:uid)');
            $vote->execute(['review' => $reviewId, 'uid' => (int)$user['user_id']]);
            if ($vote->rowCount()) {
                $db->prepare('UPDATE product_reviews SET helpful_count=helpful_count+1 WHERE id=:id')
                    ->execute(['id' => $reviewId]);
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        Response::success(['helpful' => (bool)$vote->rowCount()], 'Review vote recorded.');
    }

    private function updateRating(int $productId): void {
        Database::getInstance()->prepare("
            UPDATE products p SET
                p.avg_rating=COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id=p.id AND r.is_approved=1),0),
                p.review_count=(SELECT COUNT(*) FROM product_reviews r WHERE r.product_id=p.id AND r.is_approved=1)
            WHERE p.id=:id
        ")->execute(['id' => $productId]);
    }
}
