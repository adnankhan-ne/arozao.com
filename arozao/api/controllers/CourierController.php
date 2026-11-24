<?php
/**
 * Arozao PHP API — Courier Controller
 * Steadfast, Pathao, RedX integration + webhook handler.
 */
class CourierController extends BaseController {

    // ─── Steadfast ───────────────────────────────────────────────────────────

    public function steadfastCreate(array $params): void {
        $auth = $this->requireRole('seller', 'admin', 'super_admin');
        $data = $this->body();

        $errors = $this->validate($data, [
            'sub_order_id'       => 'required|integer',
            'recipient_name'     => 'required|string',
            'recipient_phone'    => 'required|phone_bd',
            'recipient_address'  => 'required|string',
            'cod_amount'         => 'required|numeric',
        ]);
        if ($errors) { Response::validationError($errors); }

        // Create consignment via Steadfast API
        $payload = [
            'invoice'            => 'ARZ-' . $data['sub_order_id'],
            'recipient_name'     => $data['recipient_name'],
            'recipient_phone'    => $data['recipient_phone'],
            'recipient_address'  => $data['recipient_address'],
            'cod_amount'         => $data['cod_amount'],
            'note'               => $data['note'] ?? 'Arozao Marketplace Order',
        ];

        $ch = curl_init(STEADFAST_BASE_URL . '/create_order');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Api-Key: '  . STEADFAST_API_KEY,
                'Secret-Key: ' . STEADFAST_SECRET_KEY,
            ],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (empty($response['consignment']['tracking_code'])) {
            Response::error('Steadfast consignment creation failed: ' . ($response['message'] ?? 'Unknown error'), 502);
        }

        $trackingCode = $response['consignment']['tracking_code'];
        $consignmentId = $response['consignment']['id'] ?? null;

        // Update sub_order with tracking info
        $db = Database::getInstance();
        $db->prepare("UPDATE sub_orders SET courier_name = 'steadfast', tracking_number = :tn, consignment_id = :cid, status = 'handed_to_courier', shipped_at = NOW() WHERE id = :id")
           ->execute(['tn' => $trackingCode, 'cid' => $consignmentId, 'id' => $data['sub_order_id']]);

        Response::success([
            'tracking_number' => $trackingCode,
            'consignment_id'  => $consignmentId,
            'courier'         => 'steadfast',
        ], 'Consignment created with Steadfast.');
    }

    public function steadfastStatus(array $params): void {
        $this->requireAuth();
        $cn = $params['cn'];

        $ch = curl_init(STEADFAST_BASE_URL . '/status_by_trackingcode/' . $cn);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Api-Key: '    . STEADFAST_API_KEY,
                'Secret-Key: ' . STEADFAST_SECRET_KEY,
            ],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        Response::success($response);
    }

    // ─── Pathao ──────────────────────────────────────────────────────────────

    public function pathaoCreate(array $params): void {
        $auth = $this->requireRole('seller', 'admin', 'super_admin');
        $data = $this->body();

        $errors = $this->validate($data, [
            'sub_order_id'    => 'required|integer',
            'store_id'        => 'required|integer',
            'merchant_order_id' => 'required|string',
            'recipient_name'  => 'required|string',
            'recipient_phone' => 'required|phone_bd',
            'recipient_address' => 'required|string',
            'delivery_type'   => 'required|in:48,72',
            'item_quantity'   => 'required|integer',
            'amount_to_collect' => 'required|numeric',
        ]);
        if ($errors) { Response::validationError($errors); }

        // Get Pathao access token
        $tokenCh = curl_init(PATHAO_BASE_URL . '/issue-token');
        curl_setopt_array($tokenCh, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'client_id'     => PATHAO_CLIENT_ID,
                'client_secret' => PATHAO_CLIENT_SECRET,
                'grant_type'    => 'client_credentials',
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        ]);
        $tokenResp = json_decode(curl_exec($tokenCh), true);
        curl_close($tokenCh);

        $accessToken = $tokenResp['access_token'] ?? null;
        if (!$accessToken) { Response::error('Pathao authentication failed.', 502); }

        $ch = curl_init(PATHAO_BASE_URL . '/orders');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'store_id'            => $data['store_id'],
                'merchant_order_id'   => $data['merchant_order_id'],
                'recipient_name'      => $data['recipient_name'],
                'recipient_phone'     => $data['recipient_phone'],
                'recipient_address'   => $data['recipient_address'],
                'recipient_city'      => $data['recipient_city'] ?? 1,
                'recipient_zone'      => $data['recipient_zone'] ?? 1,
                'delivery_type'       => (int)$data['delivery_type'],
                'item_type'           => $data['item_type'] ?? 2,
                'special_instruction' => $data['note'] ?? '',
                'item_quantity'       => $data['item_quantity'],
                'item_weight'         => $data['item_weight'] ?? 0.5,
                'amount_to_collect'   => $data['amount_to_collect'],
                'item_description'    => $data['item_description'] ?? 'Arozao Order',
            ]),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
            ],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (!isset($response['data']['consignment_id'])) {
            Response::error('Pathao order creation failed: ' . ($response['message'] ?? 'Error'), 502);
        }

        $db = Database::getInstance();
        $db->prepare("UPDATE sub_orders SET courier_name = 'pathao', tracking_number = :tn, consignment_id = :cid, status = 'handed_to_courier', shipped_at = NOW() WHERE id = :id")
           ->execute([
               'tn'  => $response['data']['consignment_id'],
               'cid' => $response['data']['consignment_id'],
               'id'  => $data['sub_order_id'],
           ]);

        Response::success($response['data'], 'Pathao order created.');
    }

    // ─── RedX ────────────────────────────────────────────────────────────────

    public function redxCreate(array $params): void {
        $auth = $this->requireRole('seller', 'admin', 'super_admin');
        $data = $this->body();

        $errors = $this->validate($data, [
            'sub_order_id'    => 'required|integer',
            'customer_name'   => 'required|string',
            'customer_phone'  => 'required|phone_bd',
            'delivery_area'   => 'required|string',
            'merchant_invoice_id' => 'required|string',
            'cash_collection_amount' => 'required|numeric',
        ]);
        if ($errors) { Response::validationError($errors); }

        $ch = curl_init(REDX_BASE_URL . '/parcel');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'customer_name'            => $data['customer_name'],
                'customer_phone'           => $data['customer_phone'],
                'delivery_area'            => $data['delivery_area'],
                'delivery_area_id'         => $data['delivery_area_id'] ?? 1,
                'merchant_invoice_id'      => $data['merchant_invoice_id'],
                'cash_collection_amount'   => (float)$data['cash_collection_amount'],
                'parcel_weight'            => $data['parcel_weight'] ?? 0.5,
                'instruction_to_courier'   => $data['instruction'] ?? '',
                'value'                    => $data['value'] ?? $data['cash_collection_amount'],
            ]),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'API-ACCESS-TOKEN: Bearer ' . REDX_API_TOKEN,
            ],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (empty($response['tracking_id'])) {
            Response::error('RedX parcel creation failed.', 502);
        }

        $db = Database::getInstance();
        $db->prepare("UPDATE sub_orders SET courier_name = 'redx', tracking_number = :tn, status = 'handed_to_courier', shipped_at = NOW() WHERE id = :id")
           ->execute(['tn' => $response['tracking_id'], 'id' => $data['sub_order_id']]);

        Response::success(['tracking_id' => $response['tracking_id']], 'RedX parcel created.');
    }

    // ─── Courier Webhook (delivery status updates) ───────────────────────────

    public function webhook(array $params): void {
        $raw    = file_get_contents('php://input');
        $data   = json_decode($raw, true) ?? [];
        $db     = Database::getInstance();

        // Steadfast webhook payload
        $trackingCode = $data['tracking_code'] ?? $data['consignment_id'] ?? null;
        $newStatus    = strtolower($data['delivery_status'] ?? $data['status'] ?? '');

        if (!$trackingCode || !$newStatus) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing tracking_code or status']);
            exit;
        }

        // Map courier status to Arozao sub-order status
        $statusMap = [
            'in_transit'        => 'in_transit',
            'delivered'         => 'delivered',
            'out_for_delivery'  => 'out_for_delivery',
            'returned'          => 'returned',
            'cancelled'         => 'cancelled',
            'picked_up'         => 'handed_to_courier',
        ];

        $arozaoStatus = $statusMap[$newStatus] ?? null;

        if ($arozaoStatus) {
            $db->prepare("UPDATE sub_orders SET status = :status, updated_at = NOW() WHERE tracking_number = :tn")
               ->execute(['status' => $arozaoStatus, 'tn' => $trackingCode]);

            // If delivered, set delivered_at and prepare for escrow release
            if ($arozaoStatus === 'delivered') {
                $db->prepare("UPDATE sub_orders SET delivered_at = NOW() WHERE tracking_number = :tn")
                   ->execute(['tn' => $trackingCode]);

                // Update parent order if all sub-orders delivered
                $soStmt = $db->prepare("SELECT order_id FROM sub_orders WHERE tracking_number = :tn LIMIT 1");
                $soStmt->execute(['tn' => $trackingCode]);
                $so = $soStmt->fetch();
                if ($so) {
                    $pendingStmt = $db->prepare("SELECT COUNT(*) FROM sub_orders WHERE order_id = :oid AND status NOT IN ('delivered','cancelled','returned')");
                    $pendingStmt->execute(['oid' => $so['order_id']]);
                    if ((int)$pendingStmt->fetchColumn() === 0) {
                        $db->prepare("UPDATE orders SET status = 'delivered', delivered_at = NOW(), payment_status = IF(payment_method='cod','paid',payment_status) WHERE id = :id")
                           ->execute(['id' => $so['order_id']]);
                    }
                }
            }
        }

        http_response_code(200);
        echo json_encode(['received' => true]);
    }
}
