<?php
class FulfillmentController extends BaseController {
    private const COURIERS = [
        'Arozao Express', 'Pathao Courier', 'Steadfast Courier', 'RedX Logistics',
        'Paperfly', 'eCourier', 'Sundarban Courier Service',
    ];

    private const TRANSITIONS = [
        'pending' => ['confirmed', 'packed', 'cancelled'],
        'confirmed' => ['packed', 'cancelled'],
        'packed' => ['handed_to_courier', 'cancelled'],
        'handed_to_courier' => ['in_transit', 'out_for_delivery'],
        'in_transit' => ['out_for_delivery', 'delivered'],
        'out_for_delivery' => ['delivered'],
        'delivered' => ['returned'],
        'cancelled' => [],
        'returned' => [],
    ];

    public function show(array $params): void {
        $auth = $this->requireAuth();
        $identifier = trim((string)$this->query('orderId', ''));
        if ($identifier === '') Response::validationError(['orderId' => ['Order ID or order number is required.']]);

        $db = Database::getInstance();
        $sql = is_numeric($identifier)
            ? 'SELECT * FROM orders WHERE id=:identifier LIMIT 1'
            : 'SELECT * FROM orders WHERE order_number=:identifier LIMIT 1';
        $stmt = $db->prepare($sql);
        $stmt->execute(['identifier' => is_numeric($identifier) ? (int)$identifier : strtoupper($identifier)]);
        $order = $stmt->fetch();
        if (!$order) Response::notFound('Order not found.');

        $role = $auth['role'] ?? '';
        $isAdmin = in_array($role, ['admin', 'super_admin'], true);
        $isBuyer = (int)$order['customer_id'] === (int)$auth['user_id'];
        $sellerId = null;
        if ($role === 'seller') {
            $sellerStmt = $db->prepare('SELECT id FROM sellers WHERE user_id=:uid');
            $sellerStmt->execute(['uid' => (int)$auth['user_id']]);
            $sellerId = $sellerStmt->fetchColumn();
        }
        if (!$isAdmin && !$isBuyer && !$sellerId) Response::forbidden();

        $subOrderSql = "
            SELECT so.*, s.store_name, s.slug AS store_slug, s.logo_url AS seller_logo
            FROM sub_orders so JOIN sellers s ON s.id=so.seller_id
            WHERE so.order_id=:order_id
        ";
        $subOrderBind = ['order_id' => (int)$order['id']];
        if ($sellerId && !$isAdmin && !$isBuyer) {
            $subOrderSql .= ' AND so.seller_id=:seller_id';
            $subOrderBind['seller_id'] = (int)$sellerId;
        }
        $subOrders = $db->prepare($subOrderSql);
        $subOrders->execute($subOrderBind);
        $order['sub_orders'] = $subOrders->fetchAll();
        if ($sellerId && !$isAdmin && !$isBuyer && !$order['sub_orders']) Response::forbidden();

        foreach ($order['sub_orders'] as &$subOrder) {
            $items = $db->prepare('SELECT product_id, product_name, quantity, unit_price, subtotal FROM order_items WHERE sub_order_id=:id');
            $items->execute(['id' => (int)$subOrder['id']]);
            $subOrder['items'] = $items->fetchAll();
        }
        unset($subOrder);

        $historySql = 'SELECT id, sub_order_id, changed_by, status, note, created_at FROM order_status_history WHERE order_id=:order_id';
        $historyBind = ['order_id' => (int)$order['id']];
        if ($sellerId && !$isAdmin && !$isBuyer) {
            $historySql .= ' AND (sub_order_id IS NULL OR sub_order_id IN (SELECT id FROM sub_orders WHERE seller_id=:seller_id))';
            $historyBind['seller_id'] = (int)$sellerId;
        }
        $history = $db->prepare($historySql . ' ORDER BY created_at ASC, id ASC');
        $history->execute($historyBind);

        Response::success([
            'supported_couriers' => self::COURIERS,
            'order' => $order,
            'status_history' => $history->fetchAll(),
        ]);
    }

    public function update(array $params): void {
        $auth = $this->requireSeller();
        $data = $this->body();
        $errors = $this->validate($data, [
            'subOrderId' => 'required|integer',
            'fulfillmentStatus' => 'required|string',
        ]);
        if ($errors) Response::validationError($errors);

        $next = $this->normalizeStatus(trim($data['fulfillmentStatus']));
        if ($next === null || !isset(self::TRANSITIONS[$next])) {
            Response::validationError(['fulfillmentStatus' => ['Unsupported fulfillment status.']]);
        }
        $courier = trim((string)($data['courierPartner'] ?? self::COURIERS[0]));
        if (!in_array($courier, self::COURIERS, true)) {
            Response::validationError(['courierPartner' => ['Select a supported courier partner.']]);
        }
        $tracking = trim((string)($data['trackingCode'] ?? ''));
        $tracking = $tracking === '' ? null : $tracking;
        $db = Database::getInstance();
        $subOrderId = (int)$data['subOrderId'];
        $seller = null;
        if (!in_array($auth['role'], ['admin', 'super_admin'], true)) {
            $seller = $db->prepare('SELECT id FROM sellers WHERE user_id=:uid');
            $seller->execute(['uid' => (int)$auth['user_id']]);
            $seller = $seller->fetchColumn();
            if (!$seller) Response::forbidden('Seller account not found.');
        }

        $db->beginTransaction();
        try {
            $lookupSql = 'SELECT so.*, o.id AS parent_order_id FROM sub_orders so JOIN orders o ON o.id=so.order_id WHERE so.id=:id';
            $lookupValues = ['id' => $subOrderId];
            if ($seller) {
                $lookupSql .= ' AND so.seller_id=:seller_id';
                $lookupValues['seller_id'] = (int)$seller;
            }
            $lookupSql .= ' FOR UPDATE';
            $lookup = $db->prepare($lookupSql);
            $lookup->execute($lookupValues);
            $subOrder = $lookup->fetch();
            if (!$subOrder) {
                $db->rollBack();
                Response::notFound('Sub-order not found.');
            }

            $current = $subOrder['status'];
            if (!in_array($next, self::TRANSITIONS[$current] ?? [], true)) {
                $db->rollBack();
                Response::error("Cannot transition fulfillment from '$current' to '$next'.", 409);
            }
            if ($next === 'handed_to_courier' && !$tracking && !in_array($courier, ['Arozao Express'], true)) {
                $db->rollBack();
                Response::validationError(['trackingCode' => ['A tracking code is required for this courier.']]);
            }

            $update = $db->prepare("
                UPDATE sub_orders
                SET status=:status,
                    courier_name=CASE WHEN :courier_status='handed_to_courier' THEN :courier_name ELSE courier_name END,
                    tracking_number=CASE WHEN :tracking_status='handed_to_courier' THEN :tracking ELSE tracking_number END,
                    packed_at=CASE WHEN :packed_status='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
                    shipped_at=CASE WHEN :shipped_status='handed_to_courier' THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,
                    delivered_at=CASE WHEN :delivered_status='delivered' THEN NOW() ELSE delivered_at END
                WHERE id=:id
            ");
            $update->execute([
                'status' => $next,
                'courier_status' => $next, 'courier_name' => $courier,
                'tracking_status' => $next, 'tracking' => $tracking,
                'packed_status' => $next, 'shipped_status' => $next,
                'delivered_status' => $next, 'id' => $subOrderId,
            ]);

            if ($next === 'cancelled') $this->restoreInventory($db, $subOrderId);
            $db->prepare('INSERT INTO order_status_history (order_id,sub_order_id,changed_by,status,note) VALUES (:order_id,:sub_order_id,:user_id,:status,:note)')
                ->execute([
                    'order_id' => (int)$subOrder['parent_order_id'], 'sub_order_id' => $subOrderId,
                    'user_id' => (int)$auth['user_id'], 'status' => $next,
                    'note' => isset($data['note']) ? trim((string)$data['note']) : null,
                ]);

            if (in_array($next, ['cancelled', 'delivered'], true)) {
                $remaining = $db->prepare("SELECT COUNT(*) FROM sub_orders WHERE order_id=:id AND status NOT IN ('cancelled','delivered','returned')");
                $remaining->execute(['id' => (int)$subOrder['parent_order_id']]);
                if ((int)$remaining->fetchColumn() === 0) {
                    $parentStatus = $next === 'cancelled' ? 'cancelled' : 'delivered';
                    $db->prepare('UPDATE orders SET status=:status, updated_at=NOW() WHERE id=:id')
                        ->execute(['status' => $parentStatus, 'id' => (int)$subOrder['parent_order_id']]);
                }
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        Response::success(['sub_order_id' => $subOrderId, 'status' => $next], 'Fulfillment updated.');
    }

    private function normalizeStatus(string $status): ?string {
        $map = [
            'Pending Dispatch' => 'pending',
            'Confirmed' => 'confirmed',
            'Packed' => 'packed',
            'Handed to Courier' => 'handed_to_courier',
            'In Transit' => 'in_transit',
            'Out for Delivery' => 'out_for_delivery',
            'Delivered' => 'delivered',
            'Cancelled' => 'cancelled',
            'Returned' => 'returned',
        ];
        return $map[$status] ?? (strtolower(str_replace(' ', '_', $status)));
    }

    private function restoreInventory(PDO $db, int $subOrderId): void {
        $items = $db->prepare('SELECT product_id, quantity FROM order_items WHERE sub_order_id=:id');
        $items->execute(['id' => $subOrderId]);
        foreach ($items->fetchAll() as $item) {
            $db->prepare('UPDATE products SET stock=stock+:quantity WHERE id=:product_id')
                ->execute(['quantity' => (int)$item['quantity'], 'product_id' => (int)$item['product_id']]);
        }
        $db->prepare("UPDATE seller_earnings SET status='refunded_reversed' WHERE sub_order_id=:id")
            ->execute(['id' => $subOrderId]);
    }
}
