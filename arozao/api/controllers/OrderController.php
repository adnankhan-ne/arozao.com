<?php
/**
 * Arozao PHP API — Order Controller
 * Handles customer order placement (multi-vendor split), tracking, cancellation.
 */
class OrderController extends BaseController {

    public function index(array $params): void {
        $auth = $this->requireAuth();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db  = Database::getInstance();
        $uid = (int)$auth['user_id'];

        $countStmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE customer_id = :uid");
        $countStmt->execute(['uid' => $uid]);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
                   o.total_amount, o.shipping_fee, o.discount_amount, o.created_at,
                   COUNT(oi.id) AS item_count
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.customer_id = :uid
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':uid',    $uid,     PDO::PARAM_INT);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $page, $perPage);
    }

    public function show(array $params): void {
        $auth = $this->requireAuth();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $stmt = $db->prepare("SELECT * FROM orders WHERE id = :id AND customer_id = :uid");
        $stmt->execute(['id' => $id, 'uid' => (int)$auth['user_id']]);
        $order = $stmt->fetch();
        if (!$order) { Response::notFound('Order not found.'); }

        // Sub-orders with courier info
        $soStmt = $db->prepare("
            SELECT so.*, s.store_name, s.logo_url AS seller_logo
            FROM sub_orders so JOIN sellers s ON so.seller_id = s.id
            WHERE so.order_id = :id
        ");
        $soStmt->execute(['id' => $id]);
        $subOrders = $soStmt->fetchAll();

        // Items
        foreach ($subOrders as &$so) {
            $iStmt = $db->prepare("SELECT * FROM order_items WHERE sub_order_id = :sid");
            $iStmt->execute(['sid' => $so['id']]);
            $so['items'] = $iStmt->fetchAll();
        }
        unset($so);

        $order['sub_orders'] = $subOrders;

        // Payment transactions
        $pStmt = $db->prepare("SELECT gateway, gateway_transaction_id, amount, status, created_at FROM payment_transactions WHERE order_id = :id ORDER BY created_at DESC");
        $pStmt->execute(['id' => $id]);
        $order['payments'] = $pStmt->fetchAll();

        Response::success($order);
    }

    public function store(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, [
            'shipping_name'     => 'required|string',
            'shipping_phone'    => 'required|phone_bd',
            'shipping_district' => 'required|string',
            'shipping_street'   => 'required|string',
            'payment_method'    => 'required|in:bkash,nagad,cod',
            'items'             => 'required',
        ]);
        if ($errors) { Response::validationError($errors); }
        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('Cart is empty.');
        }

        $db  = Database::getInstance();
        $uid = (int)$auth['user_id'];

        // ── Validate cart items & calculate totals ───────────────────────────
        $db->beginTransaction();
        $sellerGroups  = [];  // seller_id => [ items ]
        $subtotal      = 0.0;

        foreach ($data['items'] as $item) {
            if (empty($item['product_id']) || empty($item['quantity'])) continue;
            $stmt = $db->prepare("
                SELECT p.*, s.id AS seller_id, s.commission_rate AS seller_commission,
                       cat.commission_rate AS cat_commission
                FROM products p
                JOIN sellers s ON p.seller_id = s.id
                JOIN categories cat ON p.category_id = cat.id
                WHERE p.id = :id AND p.status = 'active'
                  AND s.status = 'approved' AND cat.is_active = 1
                FOR UPDATE
            ");
            $stmt->execute(['id' => (int)$item['product_id']]);
            $product = $stmt->fetch();

            if (!$product) { Response::error("Product #" . $item['product_id'] . " not found or unavailable.", 400); }
            $qty = max(1, (int)$item['quantity']);
            if ($product['stock'] < $qty) { Response::error("Insufficient stock for: " . $product['name'], 400); }

            $unitPrice = (float)($product['sale_price'] ?: $product['regular_price']);
            $lineTotal = $unitPrice * $qty;
            $subtotal += $lineTotal;

            $sid = (int)$product['seller_id'];
            if (!isset($sellerGroups[$sid])) { $sellerGroups[$sid] = []; }
            $sellerGroups[$sid][] = [
                'product_id'    => $product['id'],
                'product_name'  => $product['name'],
                'product_image' => null, // fetched below
                'quantity'      => $qty,
                'unit_price'    => $unitPrice,
                'subtotal'      => $lineTotal,
                'commission_rate' => max((float)$product['seller_commission'], (float)$product['cat_commission']),
            ];
        }

        if (empty($sellerGroups)) { Response::error('No valid items in cart.'); }

        // ── Coupon ───────────────────────────────────────────────────────────
        $discountAmount = 0.0;
        $couponId       = null;
        if (!empty($data['coupon_code'])) {
            $cStmt = $db->prepare("SELECT * FROM coupons WHERE code = :code AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1 FOR UPDATE");
            $cStmt->execute(['code' => strtoupper(trim($data['coupon_code']))]);
            $coupon = $cStmt->fetch();
            if (!$coupon) Response::error('This coupon is invalid, inactive, or expired.', 422);
            if ($subtotal < (float)$coupon['min_spend']) Response::error('The minimum order amount for this coupon has not been reached.', 422);
            if ($coupon['usage_limit'] !== null && (int)$coupon['used_count'] >= (int)$coupon['usage_limit']) {
                Response::error('This coupon has reached its usage limit.', 422);
            }
            $uses = $db->prepare('SELECT COUNT(*) FROM coupon_uses WHERE coupon_id=:coupon_id AND user_id=:user_id');
            $uses->execute(['coupon_id' => (int)$coupon['id'], 'user_id' => $uid]);
            if ((int)$uses->fetchColumn() >= (int)$coupon['per_user_limit']) {
                Response::error('You have reached the usage limit for this coupon.', 422);
            }
            $discountAmount = $coupon['discount_type'] === 'percentage'
                ? ($subtotal * (float)$coupon['discount_value']) / 100
                : (float)$coupon['discount_value'];
            if ($coupon['max_discount'] !== null) $discountAmount = min($discountAmount, (float)$coupon['max_discount']);
            $discountAmount = min(max($discountAmount, 0), $subtotal);
            $couponId = (int)$coupon['id'];
        }

        // ── Delivery Fee ─────────────────────────────────────────────────────
        $district    = strtolower(trim($data['shipping_district'] ?? ''));
        $shippingFee = $district === 'dhaka' ? 70.0 : 130.0;

        $totalAmount = max(0, $subtotal - $discountAmount + $shippingFee);

        // ── Begin Transaction ─────────────────────────────────────────────────
        try {
            // Insert parent order
            $orderNum = $this->generateOrderNumber();
            $oStmt = $db->prepare("
                INSERT INTO orders (order_number, customer_id, coupon_id,
                    shipping_name, shipping_phone, shipping_division, shipping_district,
                    shipping_upazila, shipping_area, shipping_street, shipping_landmark,
                    subtotal, discount_amount, shipping_fee, total_amount,
                    payment_method, payment_status, status)
                VALUES (:num, :uid, :coupon,
                    :sname, :sphone, :sdiv, :sdist,
                    :supz, :sarea, :sstreet, :slmk,
                    :sub, :disc, :sfee, :total,
                    :pm, 'pending', 'placed')
            ");
            $oStmt->execute([
                'num'    => $orderNum,
                'uid'    => $uid,
                'coupon' => $couponId,
                'sname'  => $data['shipping_name'],
                'sphone' => $data['shipping_phone'],
                'sdiv'   => $data['shipping_division'] ?? '',
                'sdist'  => $data['shipping_district'],
                'supz'   => $data['shipping_upazila'] ?? null,
                'sarea'  => $data['shipping_area'] ?? null,
                'sstreet'=> $data['shipping_street'],
                'slmk'   => $data['shipping_landmark'] ?? null,
                'sub'    => $subtotal,
                'disc'   => $discountAmount,
                'sfee'   => $shippingFee,
                'total'  => $totalAmount,
                'pm'     => $data['payment_method'],
            ]);
            $orderId = (int)$db->lastInsertId();

            // Per-seller sub-orders
            foreach ($sellerGroups as $sellerId => $items) {
                $sellerSubtotal = array_sum(array_column($items, 'subtotal'));
                $commRate       = $items[0]['commission_rate'];
                $commAmount     = ($sellerSubtotal * $commRate) / 100;
                $sellerFee      = round($shippingFee / count($sellerGroups), 2);
                $sellerEarning  = $sellerSubtotal - $commAmount - $sellerFee;

                $soStmt = $db->prepare("
                    INSERT INTO sub_orders (order_id, seller_id, status, courier_fee, subtotal, commission_rate, commission_amount, seller_earnings)
                    VALUES (:oid, :sid, 'pending', :cfee, :sub, :crate, :camnt, :sear)
                ");
                $soStmt->execute([
                    'oid'   => $orderId,
                    'sid'   => $sellerId,
                    'cfee'  => $sellerFee,
                    'sub'   => $sellerSubtotal,
                    'crate' => $commRate,
                    'camnt' => $commAmount,
                    'sear'  => max(0, $sellerEarning),
                ]);
                $subOrderId = (int)$db->lastInsertId();

                // Items
                $iStmt = $db->prepare("INSERT INTO order_items (order_id, sub_order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (:oid, :soid, :pid, :pname, :qty, :up, :sub)");
                foreach ($items as $item) {
                    $iStmt->execute([
                        'oid'   => $orderId,
                        'soid'  => $subOrderId,
                        'pid'   => $item['product_id'],
                        'pname' => $item['product_name'],
                        'qty'   => $item['quantity'],
                        'up'    => $item['unit_price'],
                        'sub'   => $item['subtotal'],
                    ]);
                    // Decrement stock
                    $stockUpdate = $db->prepare("UPDATE products SET stock = stock - :quantity WHERE id = :id AND stock >= :available");
                    $stockUpdate->execute([
                        'quantity' => $item['quantity'],
                        'available' => $item['quantity'],
                        'id' => $item['product_id'],
                    ]);
                    if ($stockUpdate->rowCount() !== 1) {
                        throw new RuntimeException('Inventory changed during checkout. Please try again.');
                    }
                }

                // Escrow entry (held for 7 days post-delivery)
                $db->prepare("
                    INSERT INTO seller_earnings (seller_id, sub_order_id, gross_amount, commission_rate, commission_amount, courier_fee, net_earnings, status)
                    VALUES (:sid, :soid, :gross, :rate, :camnt, :cfee, :net, 'held')
                ")->execute([
                    'sid'   => $sellerId,
                    'soid'  => $subOrderId,
                    'gross' => $sellerSubtotal,
                    'rate'  => $commRate,
                    'camnt' => $commAmount,
                    'cfee'  => $sellerFee,
                    'net'   => max(0, $sellerEarning),
                ]);
            }

            // Coupon usage
            if ($couponId) {
                $db->prepare("INSERT INTO coupon_uses (coupon_id, user_id, order_id) VALUES (:c, :u, :o)")
                   ->execute(['c' => $couponId, 'u' => $uid, 'o' => $orderId]);
                $db->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = :id")
                   ->execute(['id' => $couponId]);
            }

            // Initial payment transaction
            $db->prepare("INSERT INTO payment_transactions (order_id, gateway, amount, status) VALUES (:oid, :gw, :amt, 'initiated')")
               ->execute(['oid' => $orderId, 'gw' => $data['payment_method'], 'amt' => $totalAmount]);

            // Notification to customer
            $db->prepare("INSERT INTO notifications (user_id, type, title, body, link) VALUES (:uid, 'order_placed', 'Order Placed!', :body, :link)")
               ->execute(['uid' => $uid, 'body' => "Your order #$orderNum has been placed successfully.", 'link' => "/orders/$orderId"]);

            $db->commit();

            Response::success([
                'order_id'     => $orderId,
                'order_number' => $orderNum,
                'total_amount' => $totalAmount,
                'payment_method' => $data['payment_method'],
            ], 'Order placed successfully!', 201);

        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('[Arozao API] Order placement failed: ' . $e->getMessage());
            Response::error(APP_DEBUG ? 'Failed to place order: ' . $e->getMessage() : 'Failed to place order.', 500);
        }
    }

    public function updateStatus(array $params): void {
        $auth = $this->requireRole('admin', 'super_admin');
        $data = $this->body();
        $id   = (int)$params['id'];

        $validStatuses = ['confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned'];
        if (!in_array($data['status'] ?? '', $validStatuses, true)) {
            Response::validationError(['status' => ['Invalid status value.']]);
        }

        $db = Database::getInstance();
        $db->prepare("UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id")
           ->execute(['status' => $data['status'], 'id' => $id]);

        $this->auditLog($auth['user_id'], 'order_status_updated', 'orders', $id, ['status' => $data['status']]);
        Response::success(null, 'Order status updated.');
    }

    public function cancel(array $params): void {
        $auth = $this->requireAuth();
        $id   = (int)$params['id'];
        $db   = Database::getInstance();

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT * FROM orders WHERE id = :id AND customer_id = :uid FOR UPDATE");
            $stmt->execute(['id' => $id, 'uid' => (int)$auth['user_id']]);
            $order = $stmt->fetch();
            if (!$order) {
                $db->rollBack();
                Response::notFound('Order not found.');
            }
            if (!in_array($order['status'], ['placed', 'confirmed'], true)) {
                $db->rollBack();
                Response::error('This order cannot be cancelled at its current stage.', 400);
            }
            $advanced = $db->prepare("SELECT COUNT(*) FROM sub_orders WHERE order_id=:id AND status NOT IN ('pending','confirmed')");
            $advanced->execute(['id' => $id]);
            if ((int)$advanced->fetchColumn() > 0) {
                $db->rollBack();
                Response::error('This order cannot be cancelled after seller fulfillment has started.', 409);
            }

            $db->prepare("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = :id")
               ->execute(['id' => $id]);
            $db->prepare("UPDATE sub_orders SET status='cancelled' WHERE order_id=:id")
               ->execute(['id' => $id]);

            // Restore stock
            $items = $db->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = :id");
            $items->execute(['id' => $id]);
            foreach ($items->fetchAll() as $item) {
                $db->prepare("UPDATE products SET stock = stock + :qty WHERE id = :pid")
                   ->execute(['qty' => $item['quantity'], 'pid' => $item['product_id']]);
            }

            // Reverse earnings
            $db->prepare("UPDATE seller_earnings SET status = 'refunded_reversed' WHERE sub_order_id IN (SELECT id FROM sub_orders WHERE order_id = :oid)")
               ->execute(['oid' => $id]);

            $db->commit();
            Response::success(null, 'Order cancelled successfully.');
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('[Arozao API] Order cancellation failed: ' . $e->getMessage());
            Response::error(APP_DEBUG ? 'Cancellation failed: ' . $e->getMessage() : 'Cancellation failed.', 500);
        }
    }
}
