<?php
class CouponController extends BaseController {
    public function index(array $params): void {
        $stmt = Database::getInstance()->query("
            SELECT code, description, discount_type, discount_value, min_spend, max_discount, expires_at
            FROM coupons WHERE is_active=1 AND (expires_at IS NULL OR expires_at>NOW())
            ORDER BY created_at DESC LIMIT 50
        ");
        Response::success($stmt->fetchAll());
    }

    public function validate(array $params): void {
        $data = $this->body();
        $errors = $this->validate($data, [
            'code' => 'required|string|min:2|max:50',
            'subtotal' => 'required|numeric|min_value:0',
        ]);
        if ($errors) Response::validationError($errors);

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM coupons WHERE code=:code AND is_active=1 LIMIT 1');
        $stmt->execute(['code' => strtoupper(trim($data['code']))]);
        $coupon = $stmt->fetch();
        if (!$coupon) Response::error('This coupon is invalid or inactive.', 422);
        if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) Response::error('This coupon has expired.', 422);

        $subtotal = (float)$data['subtotal'];
        if ($subtotal < (float)$coupon['min_spend']) Response::error('The minimum order amount for this coupon has not been reached.', 422);
        if ($coupon['usage_limit'] !== null && (int)$coupon['used_count'] >= (int)$coupon['usage_limit']) Response::error('This coupon has reached its usage limit.', 422);

        $userId = null;
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth = $this->requireAuth();
            $userId = (int)$auth['user_id'];
        }
        if ($userId && $coupon['per_user_limit'] !== null) {
            $uses = $db->prepare('SELECT COUNT(*) FROM coupon_uses WHERE coupon_id=:coupon_id AND user_id=:user_id');
            $uses->execute(['coupon_id' => $coupon['id'], 'user_id' => $userId]);
            if ((int)$uses->fetchColumn() >= (int)$coupon['per_user_limit']) Response::error('You have reached the usage limit for this coupon.', 422);
        }

        $discount = $coupon['discount_type'] === 'percentage'
            ? $subtotal * (float)$coupon['discount_value'] / 100
            : (float)$coupon['discount_value'];
        if ($coupon['max_discount'] !== null) $discount = min($discount, (float)$coupon['max_discount']);
        $discount = min(max($discount, 0), $subtotal);
        Response::success([
            'valid' => true, 'code' => $coupon['code'], 'coupon_id' => (int)$coupon['id'],
            'discount_type' => $coupon['discount_type'], 'discount_value' => (float)$coupon['discount_value'],
            'discount_amount' => round($discount, 2), 'label' => $coupon['description'] ?: $coupon['code'],
        ]);
    }

    public function store(array $params): void { $this->save(null); }
    public function update(array $params): void { $this->save((int)$params['id']); }

    private function save(?int $id): void {
        $this->requireAdmin();
        $data = $this->body();
        $errors = $this->validate($data, [
            'code' => 'required|string|min:2|max:50',
            'discount_type' => 'required|in:percentage,flat',
            'discount_value' => 'required|numeric|min_value:0',
        ]);
        if ($errors) Response::validationError($errors);
        $db = Database::getInstance();
        $code = strtoupper(trim($data['code']));
        $sql = $id === null
            ? 'SELECT id FROM coupons WHERE code=:code LIMIT 1'
            : 'SELECT id FROM coupons WHERE code=:code AND id<>:id LIMIT 1';
        $check = $db->prepare($sql);
        $bind = ['code' => $code];
        if ($id !== null) $bind['id'] = $id;
        $check->execute($bind);
        if ($check->fetch()) Response::error('A coupon with this code already exists.', 409);

        $values = [
            'code' => $code, 'description' => $data['description'] ?? null,
            'discount_type' => $data['discount_type'], 'discount_value' => (float)$data['discount_value'],
            'min_spend' => (float)($data['min_spend'] ?? 0),
            'max_discount' => isset($data['max_discount']) && $data['max_discount'] !== '' ? (float)$data['max_discount'] : null,
            'usage_limit' => isset($data['usage_limit']) && $data['usage_limit'] !== '' ? (int)$data['usage_limit'] : null,
            'per_user_limit' => isset($data['per_user_limit']) && $data['per_user_limit'] !== '' ? (int)$data['per_user_limit'] : null,
            'expires_at' => $data['expires_at'] ?? null,
            'is_active' => !empty($data['is_active']) ? 1 : 0,
        ];
        if ($id === null) {
            $stmt = $db->prepare('INSERT INTO coupons (code, description, discount_type, discount_value, min_spend, max_discount, usage_limit, per_user_limit, expires_at, is_active) VALUES (:code, :description, :discount_type, :discount_value, :min_spend, :max_discount, :usage_limit, :per_user_limit, :expires_at, :is_active)');
        } else {
            $values['id'] = $id;
            $stmt = $db->prepare('UPDATE coupons SET code=:code, description=:description, discount_type=:discount_type, discount_value=:discount_value, min_spend=:min_spend, max_discount=:max_discount, usage_limit=:usage_limit, per_user_limit=:per_user_limit, expires_at=:expires_at, is_active=:is_active WHERE id=:id');
        }
        $stmt->execute($values);
        Response::success(['id' => $id ?? (int)$db->lastInsertId()], 'Coupon saved.', $id === null ? 201 : 200);
    }

    public function destroy(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->prepare('UPDATE coupons SET is_active=0 WHERE id=:id');
        $stmt->execute(['id' => (int)$params['id']]);
        if (!$stmt->rowCount()) Response::notFound('Coupon not found.');
        Response::success(null, 'Coupon deactivated.');
    }
}
