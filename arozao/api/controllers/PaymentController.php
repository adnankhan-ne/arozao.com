<?php
/**
 * Arozao PHP API — Payment Controller
 * bKash Tokenized Checkout + Nagad PGW + COD + Webhook
 */
class PaymentController extends BaseController {

    // ──────────────────────────────────────────────────────────────────────────
    // bKASH
    // ──────────────────────────────────────────────────────────────────────────

    public function bkashInitiate(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, ['order_id' => 'required|integer']);
        if ($errors) { Response::validationError($errors); }

        $db    = Database::getInstance();
        $order = $this->getOrderForUser((int)$data['order_id'], (int)$auth['user_id'], $db);
        if ($order['payment_method'] !== 'bkash') {
            Response::error('This order is not configured for bKash payment.', 400);
        }

        // 1. Get bKash token
        $tokenData = $this->bkashGrantToken();

        // 2. Create payment
        $payload = [
            'mode'              => '0011',
            'payerReference'    => (string)$auth['user_id'],
            'callbackURL'       => APP_URL . '/payments/bkash/callback',
            'amount'            => number_format((float)$order['total_amount'], 2, '.', ''),
            'currency'          => 'BDT',
            'intent'            => 'sale',
            'merchantInvoiceNumber' => $order['order_number'],
        ];

        $response = $this->bkashPost('/create', $payload, $tokenData['id_token']);

        if (empty($response['bkashURL']) || empty($response['paymentID'])) {
            Response::error('bKash payment initiation failed: ' . ($response['statusMessage'] ?? 'Unknown error'), 502);
        }

        // Record initiated transaction
        $db->prepare("INSERT INTO payment_transactions (order_id, gateway, gateway_transaction_id, amount, status) VALUES (:oid, 'bkash', :txid, :amt, 'pending')")
           ->execute(['oid' => $order['id'], 'txid' => $response['paymentID'] ?? null, 'amt' => $order['total_amount']]);

        Response::success([
            'bkash_url'   => $response['bkashURL'],
            'payment_id'  => $response['paymentID'] ?? null,
        ]);
    }

    public function bkashExecute(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, [
            'payment_id' => 'required|string|max:100',
            'order_id' => 'required|integer',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db = Database::getInstance();
        $stmt = $db->prepare("
            SELECT pt.id AS payment_transaction_id, pt.amount AS payment_amount,
                   pt.currency, pt.status AS payment_status, o.id AS order_id,
                   o.order_number, o.total_amount
            FROM payment_transactions pt
            JOIN orders o ON o.id = pt.order_id
            WHERE pt.gateway = 'bkash'
              AND pt.gateway_transaction_id = :payment_id
              AND pt.status = 'pending'
              AND o.id = :order_id
              AND o.customer_id = :customer_id
              AND o.payment_method = 'bkash'
              AND o.payment_status = 'pending'
            LIMIT 1
        ");
        $stmt->execute([
            'payment_id' => $data['payment_id'],
            'order_id' => (int)$data['order_id'],
            'customer_id' => (int)$auth['user_id'],
        ]);
        $payment = $stmt->fetch();
        if (
            !$payment ||
            $payment['currency'] !== 'BDT' ||
            !$this->amountsMatch($payment['payment_amount'], $payment['total_amount'])
        ) {
            Response::notFound('Pending bKash payment not found for this order.');
        }

        $tokenData = $this->bkashGrantToken();
        $response  = $this->bkashPost('/execute', ['paymentID' => $data['payment_id']], $tokenData['id_token']);

        if (
            ($response['statusCode'] ?? '') !== '0000' ||
            ($response['transactionStatus'] ?? '') !== 'Completed' ||
            ($response['paymentID'] ?? '') !== $data['payment_id'] ||
            ($response['merchantInvoiceNumber'] ?? '') !== $payment['order_number'] ||
            ($response['currency'] ?? '') !== 'BDT' ||
            !$this->amountsMatch($response['amount'] ?? null, $payment['payment_amount']) ||
            empty($response['trxID'])
        ) {
            Response::error('bKash payment execution failed: ' . ($response['statusMessage'] ?? 'Error'), 400);
        }

        if (!$this->markOrderPaid(
            (int)$payment['order_id'],
            (int)$payment['payment_transaction_id'],
            'bkash',
            $response['trxID'],
            json_encode($response),
            (string)$payment['payment_amount']
        )) {
            Response::error('The order payment could not be completed. Please contact support.', 409);
        }

        Response::success([
            'trx_id'  => $response['trxID'],
            'amount'  => $response['amount'],
            'message' => 'Payment successful.',
        ]);
    }

    public function bkashCallback(array $params): void {
        $paymentId = $_GET['paymentID'] ?? '';
        $status    = $_GET['status']    ?? '';

        if ($status !== 'success' || empty($paymentId)) {
            header('Location: ' . FRONTEND_URL . '/checkout?payment=failed');
            exit;
        }

        header('Location: ' . FRONTEND_URL . '/order-confirmation?bkash=' . urlencode($paymentId));
        exit;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NAGAD
    // ──────────────────────────────────────────────────────────────────────────

    public function nagadInitiate(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, ['order_id' => 'required|integer']);
        if ($errors) { Response::validationError($errors); }

        $db    = Database::getInstance();
        $order = $this->getOrderForUser((int)$data['order_id'], (int)$auth['user_id'], $db);
        if ($order['payment_method'] !== 'nagad') {
            Response::error('This order is not configured for Nagad payment.', 400);
        }

        // Nagad merchant account check initialization
        $dateTime   = date('Ymdhis');
        $challenge  = $this->nagadPost('/api/dfs/check-merchant-account/' . NAGAD_MERCHANT_ID . '/' . $dateTime, []);

        $sensitive  = [
            'merchantId'   => NAGAD_MERCHANT_ID,
            'datetime'     => $dateTime,
            'orderId'      => $order['order_number'],
            'challenge'    => $challenge['challenge'] ?? '',
        ];

        $callbackUrl = APP_URL . '/payments/nagad/verify';
        $payloadBody = [
            'merchantId'           => NAGAD_MERCHANT_ID,
            'datetime'             => $dateTime,
            'orderId'              => $order['order_number'],
            'challenge'            => $challenge['challenge'] ?? '',
            'amount'               => number_format((float)$order['total_amount'], 2, '.', ''),
            'currencyCode'         => '050',
            'callbackUrl'          => $callbackUrl,
            'additionalMerchantInfo' => ['data' => 'arozao'],
        ];

        $checkoutPayload = [
            'merchantId'  => NAGAD_MERCHANT_ID,
            'datetime'    => $dateTime,
            'orderId'     => $order['order_number'],
            'sensitiveData' => base64_encode(json_encode($payloadBody)),
            'signature'   => base64_encode(hash_hmac('sha256', json_encode($sensitive), NAGAD_MERCHANT_KEY, true)),
        ];

        $result = $this->nagadPost('/api/dfs/checkout/initialize/' . NAGAD_MERCHANT_ID . '/' . $dateTime, $checkoutPayload);

        if (empty($result['callBackUrl'])) {
            Response::error('Nagad payment initiation failed.', 502);
        }

        $db->prepare("INSERT INTO payment_transactions (order_id, gateway, amount, status) VALUES (:oid, 'nagad', :amt, 'pending')")
           ->execute(['oid' => $order['id'], 'amt' => $order['total_amount']]);

        Response::success(['nagad_url' => $result['callBackUrl']]);
    }

    public function nagadVerify(array $params): void {
        $orderId = $_GET['order_id'] ?? null;
        $trxId   = $_GET['payment_ref_id'] ?? null;
        $status  = $_GET['status'] ?? '';

        if (
            $status !== 'Success' ||
            !is_string($orderId) ||
            $orderId === '' ||
            !is_string($trxId) ||
            $trxId === ''
        ) {
            header('Location: ' . FRONTEND_URL . '/checkout?payment=failed');
            exit;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare("
            SELECT pt.id AS payment_transaction_id, pt.amount AS payment_amount,
                   pt.currency, pt.status AS payment_status, o.id AS order_id,
                   o.order_number, o.total_amount
            FROM payment_transactions pt
            JOIN orders o ON o.id = pt.order_id
            WHERE pt.gateway = 'nagad'
              AND pt.status = 'pending'
              AND o.order_number = :order_number
              AND o.payment_method = 'nagad'
              AND o.payment_status = 'pending'
            ORDER BY pt.created_at DESC
            LIMIT 1
        ");
        $stmt->execute(['order_number' => $orderId]);
        $payment = $stmt->fetch();
        if (!$payment || $payment['currency'] !== 'BDT') {
            header('Location: ' . FRONTEND_URL . '/checkout?payment=failed');
            exit;
        }

        // Verify with Nagad
        $result = $this->nagadPost('/api/dfs/verify/payment/' . $trxId, []);

        if (
            ($result['status'] ?? '') !== 'Success' ||
            ($result['orderId'] ?? '') !== $payment['order_number'] ||
            ($result['paymentRefId'] ?? '') !== $trxId ||
            !$this->amountsMatch($result['amount'] ?? null, $payment['payment_amount']) ||
            !$this->amountsMatch($payment['total_amount'], $payment['payment_amount'])
        ) {
            header('Location: ' . FRONTEND_URL . '/checkout?payment=failed');
            exit;
        }

        if (!$this->markOrderPaid(
            (int)$payment['order_id'],
            (int)$payment['payment_transaction_id'],
            'nagad',
            $trxId,
            json_encode($result),
            (string)$payment['payment_amount']
        )) {
            header('Location: ' . FRONTEND_URL . '/checkout?payment=failed');
            exit;
        }

        header('Location: ' . FRONTEND_URL . '/order-confirmation?nagad=' . urlencode($trxId ?? ''));
        exit;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COD
    // ──────────────────────────────────────────────────────────────────────────

    public function codConfirm(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, ['order_id' => 'required|integer']);
        if ($errors) { Response::validationError($errors); }

        $db   = Database::getInstance();
        $order = $this->getOrderForUser((int)$data['order_id'], (int)$auth['user_id'], $db);

        if ($order['payment_method'] !== 'cod') {
            Response::error('This order is not a COD order.', 400);
        }

        // COD payment_status stays 'pending' until doorstep delivery
        $db->prepare("INSERT IGNORE INTO payment_transactions (order_id, gateway, amount, status) VALUES (:oid, 'cod', :amt, 'pending')")
           ->execute(['oid' => $order['id'], 'amt' => $order['total_amount']]);

        Response::success(null, 'COD order confirmed. Payment will be collected on delivery.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Generic Webhook
    // ──────────────────────────────────────────────────────────────────────────

    public function webhook(array $params): void {
        $secret = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
        if (!hash_equals(PAYMENT_WEBHOOK_SECRET, $secret)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        $data = $this->body();
        // Process gateway webhook payload
        // Log raw body for audit
        error_log('[Arozao Webhook] ' . json_encode($data));
        Response::success(null, 'Webhook received.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function getOrderForUser(int $orderId, int $userId, PDO $db): array {
        $stmt = $db->prepare("SELECT * FROM orders WHERE id = :id AND customer_id = :uid AND payment_status = 'pending'");
        $stmt->execute(['id' => $orderId, 'uid' => $userId]);
        $order = $stmt->fetch();
        if (!$order) { Response::notFound('Order not found or already paid.'); }
        return $order;
    }

    private function amountsMatch(mixed $actual, mixed $expected): bool {
        if (!is_string($actual) && !is_int($actual) && !is_float($actual)) {
            return false;
        }
        if (!is_string($expected) && !is_int($expected) && !is_float($expected)) {
            return false;
        }

        $actualAmount = (string)$actual;
        $expectedAmount = (string)$expected;
        $moneyPattern = '/^\d+(?:\.\d{1,2})?$/D';
        if (
            !preg_match($moneyPattern, $actualAmount) ||
            !preg_match($moneyPattern, $expectedAmount)
        ) {
            return false;
        }

        return (int)round((float)$actualAmount * 100) ===
            (int)round((float)$expectedAmount * 100);
    }

    private function markOrderPaid(
        int $orderId,
        int $paymentTransactionId,
        string $gateway,
        string $trxId,
        string $rawResponse,
        string $expectedAmount
    ): bool {
        $db = Database::getInstance();
        $db->beginTransaction();
        try {
            $orderUpdate = $db->prepare("
                UPDATE orders
                SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
                WHERE id = :id AND payment_method = :gateway
                  AND payment_status = 'pending' AND total_amount = :amount
            ");
            $orderUpdate->execute([
                'id' => $orderId,
                'gateway' => $gateway,
                'amount' => $expectedAmount,
            ]);
            if ($orderUpdate->rowCount() !== 1) {
                $db->rollBack();
                return false;
            }

            $paymentUpdate = $db->prepare("
                UPDATE payment_transactions
                SET status = 'completed', gateway_transaction_id = :txid,
                    gateway_response = :resp, verified_at = NOW()
                WHERE id = :payment_id AND order_id = :order_id
                  AND gateway = :gateway AND status = 'pending' AND amount = :amount
            ");
            $paymentUpdate->execute([
                'txid' => $trxId,
                'resp' => $rawResponse,
                'payment_id' => $paymentTransactionId,
                'order_id' => $orderId,
                'gateway' => $gateway,
                'amount' => $expectedAmount,
            ]);
            if ($paymentUpdate->rowCount() !== 1) {
                $db->rollBack();
                return false;
            }

            $db->commit();
            return true;
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
    }

    private function bkashGrantToken(): array {
        $ch = curl_init(BKASH_BASE_URL . '/token/grant');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode(['app_key' => BKASH_APP_KEY, 'app_secret' => BKASH_APP_SECRET]),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'username: '  . BKASH_USERNAME,
                'password: '  . BKASH_PASSWORD,
            ],
        ]);
        $result = json_decode(curl_exec($ch), true);
        curl_close($ch);
        return $result ?? [];
    }

    private function bkashPost(string $endpoint, array $payload, string $token): array {
        $ch = curl_init(BKASH_BASE_URL . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: ' . $token,
                'X-App-Key: '     . BKASH_APP_KEY,
            ],
        ]);
        $result = json_decode(curl_exec($ch), true);
        curl_close($ch);
        return $result ?? [];
    }

    private function nagadPost(string $endpoint, array $payload): array {
        $ch = curl_init(NAGAD_BASE_URL . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-KM-Api-Version: v-0.2.0',
                'X-KM-IP-V4: ' . ($_SERVER['SERVER_ADDR'] ?? '127.0.0.1'),
                'X-KM-Client-Type: PC_WEB',
            ],
        ]);
        $result = json_decode(curl_exec($ch), true);
        curl_close($ch);
        return $result ?? [];
    }
}
