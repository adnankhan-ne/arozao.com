<?php
/**
 * Arozao PHP API — Seller Controller
 * Handles seller onboarding, product management, orders, payouts, store.
 */
class SellerController extends BaseController {

    // ─── Onboarding ──────────────────────────────────────────────────────────

    public function apply(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();

        $errors = $this->validate($data, [
            'store_name'    => 'required|string|min:3|max:100',
            'business_type' => 'required|in:individual,proprietorship,limited',
            'nid_number'    => 'required|string|min:10|max:20',
            'payout_method' => 'required|in:bank,bkash,nagad',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db  = Database::getInstance();
        $uid = (int)$auth['user_id'];

        // Check already applied
        $check = $db->prepare("SELECT id FROM sellers WHERE user_id = :uid LIMIT 1");
        $check->execute(['uid' => $uid]);
        if ($check->fetch()) { Response::error('You have already submitted a seller application.', 409); }

        $slug = $this->makeSlug($data['store_name']);
        // Ensure unique slug
        $slugCheck = $db->prepare("SELECT id FROM sellers WHERE slug = :slug LIMIT 1");
        $slugCheck->execute(['slug' => $slug]);
        if ($slugCheck->fetch()) { $slug .= '-' . substr(uniqid(), -4); }

        $db->beginTransaction();
        $stmt = $db->prepare("
            INSERT INTO sellers (user_id, store_name, slug, business_type, nid_number, trade_license,
                warehouse_division, warehouse_district, warehouse_address,
                payout_method, bank_name, bank_branch, bank_account, bank_routing, mfs_wallet,
                support_phone, status)
            VALUES (:uid, :sname, :slug, :btype, :nid, :tlic,
                :wdiv, :wdist, :waddr,
                :pmethod, :bname, :bbranch, :bacc, :brouting, :mwallet,
                :phone, 'pending')
        ");
        $stmt->execute([
            'uid'      => $uid,
            'sname'    => $data['store_name'],
            'slug'     => $slug,
            'btype'    => $data['business_type'],
            'nid'      => $data['nid_number'],
            'tlic'     => $data['trade_license'] ?? null,
            'wdiv'     => $data['warehouse_division'] ?? null,
            'wdist'    => $data['warehouse_district'] ?? null,
            'waddr'    => $data['warehouse_address'] ?? null,
            'pmethod'  => $data['payout_method'],
            'bname'    => $data['bank_name'] ?? null,
            'bbranch'  => $data['bank_branch'] ?? null,
            'bacc'     => $data['bank_account'] ?? null,
            'brouting' => $data['bank_routing'] ?? null,
            'mwallet'  => $data['mfs_wallet'] ?? null,
            'phone'    => $data['support_phone'] ?? null,
        ]);

        // Update user role to seller
        $db->prepare("UPDATE users SET role = 'seller' WHERE id = :id")->execute(['id' => $uid]);
        $db->commit();

        Response::success(['seller_slug' => $slug], 'Application submitted. Pending admin review.', 201);
    }

    public function applicationStatus(array $params): void {
        $auth = $this->requireAuth();
        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT id, store_name, slug, status, rejection_reason, created_at FROM sellers WHERE user_id = :uid LIMIT 1");
        $stmt->execute(['uid' => (int)$auth['user_id']]);
        $seller = $stmt->fetch();
        if (!$seller) { Response::notFound('No seller application found.'); }
        Response::success($seller);
    }

    public function uploadDocument(array $params): void {
        $auth = $this->requireRole('seller', 'admin', 'super_admin');
        $db   = Database::getInstance();

        $stmt = $db->prepare("SELECT id FROM sellers WHERE user_id = :uid LIMIT 1");
        $stmt->execute(['uid' => (int)$auth['user_id']]);
        $seller = $stmt->fetch();
        if (!$seller) { Response::error('Seller account not found.', 404); }

        $type = $_POST['type'] ?? '';
        $allowed = ['nid_front','nid_back','trade_license','tin_certificate','bank_cheque','other'];
        if (!in_array($type, $allowed, true)) { Response::error('Invalid document type.', 400); }

        if (empty($_FILES['file'])) { Response::error('No file uploaded.', 400); }
        $file = $_FILES['file'];

        if ($file['error'] !== UPLOAD_ERR_OK) { Response::error('Upload error.', 400); }
        if ($file['size'] > MAX_UPLOAD_BYTES) { Response::error('File too large. Max 5MB.', 400); }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']);
        if (!in_array($mime, array_merge(ALLOWED_IMAGE_TYPES, ['application/pdf']), true)) {
            Response::error('Only images and PDFs are allowed.', 400);
        }

        $dir = UPLOAD_DIR . 'seller-documents/' . $seller['id'] . '/';
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }

        $ext = $mime === 'application/pdf' ? 'pdf' : match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => Response::error('Unsupported upload type.', 400),
        };
        $filename = $type . '_' . time() . '.' . $ext;
        $path     = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $path)) {
            Response::error('Failed to save document.', 500);
        }

        $relPath = 'seller-documents/' . $seller['id'] . '/' . $filename;
        $db->prepare("INSERT INTO seller_documents (seller_id, type, file_path, file_name) VALUES (:sid, :type, :path, :name)")
           ->execute(['sid' => $seller['id'], 'type' => $type, 'path' => $relPath, 'name' => $file['name']]);

        Response::success(['file_path' => UPLOAD_URL . $relPath], 'Document uploaded successfully.');
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────

    public function dashboard(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $sid    = $seller['id'];

        // Revenue today / week / month
        $revenue = $db->prepare("
            SELECT
                SUM(CASE WHEN DATE(so.created_at) = CURDATE() THEN so.subtotal ELSE 0 END) AS today,
                SUM(CASE WHEN so.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN so.subtotal ELSE 0 END) AS week,
                SUM(CASE WHEN MONTH(so.created_at) = MONTH(NOW()) THEN so.subtotal ELSE 0 END) AS month
            FROM sub_orders so
            WHERE so.seller_id = :sid AND so.status NOT IN ('cancelled','returned')
        ");
        $revenue->execute(['sid' => $sid]);
        $revenueData = $revenue->fetch();

        // Pending orders
        $pending = $db->prepare("SELECT COUNT(*) FROM sub_orders WHERE seller_id = :sid AND status = 'pending'");
        $pending->execute(['sid' => $sid]);
        $pendingCount = $pending->fetchColumn();

        // Total products
        $prodCount = $db->prepare("SELECT COUNT(*) FROM products WHERE seller_id = :sid AND status != 'archived'");
        $prodCount->execute(['sid' => $sid]);

        // Net payable balance
        $balance = $db->prepare("
            SELECT GREATEST(
                COALESCE((SELECT SUM(net_earnings) FROM seller_earnings WHERE seller_id = :sid_earnings AND status = 'available'), 0)
                - COALESCE((SELECT SUM(amount) FROM seller_payouts WHERE seller_id = :sid_payouts AND status IN ('pending','processing','completed')), 0),
                0
            )
        ");
        $balance->execute(['sid_earnings' => $sid, 'sid_payouts' => $sid]);

        // Held in escrow
        $escrow = $db->prepare("SELECT COALESCE(SUM(net_earnings), 0) FROM seller_earnings WHERE seller_id = :sid AND status = 'held'");
        $escrow->execute(['sid' => $sid]);

        // Daily sales (last 30 days) for chart
        $chart = $db->prepare("
            SELECT DATE(so.created_at) AS date, SUM(so.subtotal) AS revenue, COUNT(*) AS orders
            FROM sub_orders so
            WHERE so.seller_id = :sid
              AND so.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND so.status NOT IN ('cancelled','returned')
            GROUP BY DATE(so.created_at)
            ORDER BY date ASC
        ");
        $chart->execute(['sid' => $sid]);

        Response::success([
            'revenue'       => $revenueData,
            'pending_orders'=> (int)$pendingCount,
            'total_products'=> (int)$prodCount->fetchColumn(),
            'balance'       => (float)$balance->fetchColumn(),
            'escrow_balance'=> (float)$escrow->fetchColumn(),
            'daily_chart'   => $chart->fetchAll(),
        ]);
    }

    // ─── Product Management ──────────────────────────────────────────────────

    public function products(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db = Database::getInstance();
        $statusFilter = $this->query('status') ? " AND p.status = :status" : "";
        $bind = ['sid' => $seller['id']];
        if ($this->query('status')) { $bind['status'] = $this->query('status'); }

        $count = $db->prepare("SELECT COUNT(*) FROM products p WHERE p.seller_id = :sid $statusFilter");
        $count->execute($bind);
        $total = (int)$count->fetchColumn();

        $stmt = $db->prepare("
            SELECT p.id, p.name, p.slug, p.sku, p.regular_price, p.sale_price,
                   p.stock, p.status, p.avg_rating, p.review_count, p.total_sold, p.created_at,
                   c.name AS category_name, c.slug AS category_slug,
                   (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) AS primary_image
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.seller_id = :sid $statusFilter
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $page, $perPage);
    }

    public function addProduct(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        if ($seller['status'] !== 'approved') { Response::forbidden('Your seller account is not yet approved.'); }

        $data   = $this->body();
        $errors = $this->validate($data, [
            'name'         => 'required|string|min:5|max:500',
            'category_id'  => 'required|integer',
            'regular_price'=> 'required|numeric|min_value:1',
            'stock'        => 'required|integer|min_value:0',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db   = Database::getInstance();
        $category = $db->prepare("SELECT id FROM categories WHERE id = :id AND is_active = 1 LIMIT 1");
        $category->execute(['id' => (int)$data['category_id']]);
        if (!$category->fetch()) { Response::validationError(['category_id' => ['Select an active product category.']]); }

        $slug = $this->makeSlug($data['name']);
        // Unique slug
        $sc   = $db->prepare("SELECT id FROM products WHERE slug = :slug LIMIT 1");
        $sc->execute(['slug' => $slug]);
        if ($sc->fetch()) { $slug .= '-' . substr(uniqid(), -5); }

        $sku = trim((string)($data['sku'] ?? ''));
        if ($sku === '') { $sku = 'SKU-' . strtoupper(substr(uniqid(), -6)); }
        if (strlen($sku) > 50) { Response::validationError(['sku' => ['SKU must be 50 characters or fewer.']]); }
        $skuCheck = $db->prepare("SELECT id FROM products WHERE sku = :sku LIMIT 1");
        $skuCheck->execute(['sku' => $sku]);
        if ($skuCheck->fetch()) { Response::error('This SKU is already in use.', 409); }
        $imageUrl = trim((string)($data['image_url'] ?? ''));
        if ($imageUrl !== '' && (strlen($imageUrl) > 500 || !filter_var($imageUrl, FILTER_VALIDATE_URL))) {
            Response::validationError(['image_url' => ['Enter a valid product image URL.']]);
        }

        $stmt = $db->prepare("
            INSERT INTO products (seller_id, category_id, brand_id, sku, name, slug,
                description, short_desc, regular_price, sale_price, stock,
                weight_grams, specifications, features, status)
            VALUES (:sid, :cat, :brand, :sku, :name, :slug,
                :desc, :sdesc, :rprice, :sprice, :stock,
                :weight, :specs, :feats, 'pending_review')
        ");
        $stmt->execute([
            'sid'    => $seller['id'],
            'cat'    => $data['category_id'],
            'brand'  => $data['brand_id'] ?? null,
            'sku'    => $sku,
            'name'   => $data['name'],
            'slug'   => $slug,
            'desc'   => $data['description'] ?? null,
            'sdesc'  => $data['short_desc'] ?? null,
            'rprice' => $data['regular_price'],
            'sprice' => $data['sale_price'] ?? null,
            'stock'  => $data['stock'],
            'weight' => $data['weight_grams'] ?? null,
            'specs'  => isset($data['specifications']) ? json_encode($data['specifications']) : null,
            'feats'  => isset($data['features'])       ? json_encode($data['features'])       : null,
        ]);

        $productId = (int)$db->lastInsertId();
        if ($imageUrl !== '') {
            $db->prepare("INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (:pid, :url, 1, 0)")
               ->execute(['pid' => $productId, 'url' => $imageUrl]);
        }

        Response::success(['product_id' => $productId, 'sku' => $sku, 'slug' => $slug], 'Product submitted for review.', 201);
    }

    public function updateProduct(array $params): void {
        $auth    = $this->requireRole('seller', 'admin', 'super_admin');
        $seller  = $this->getSellerOrFail($auth['user_id']);
        $db      = Database::getInstance();
        $prodId  = (int)$params['id'];

        $check = $db->prepare("SELECT id, status FROM products WHERE id = :id AND seller_id = :sid");
        $check->execute(['id' => $prodId, 'sid' => $seller['id']]);
        $ownedProduct = $check->fetch();
        if (!$ownedProduct) { Response::forbidden('Product not found or access denied.'); }

        $data = $this->body();
        $sets = [];
        $bind = ['id' => $prodId];

        $fields = ['name','description','short_desc','regular_price','sale_price','stock','weight_grams'];
        foreach ($fields as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = :$f"; $bind[$f] = $data[$f]; }
        }
        if (array_key_exists('sku', $data)) {
            $sku = trim((string)$data['sku']);
            if ($sku === '' || strlen($sku) > 50) { Response::validationError(['sku' => ['Enter a SKU of 1 to 50 characters.']]); }
            $skuCheck = $db->prepare("SELECT id FROM products WHERE sku = :sku AND id <> :id LIMIT 1");
            $skuCheck->execute(['sku' => $sku, 'id' => $prodId]);
            if ($skuCheck->fetch()) { Response::error('This SKU is already in use.', 409); }
            $sets[] = "sku = :sku";
            $bind['sku'] = $sku;
        }
        if (array_key_exists('category_id', $data)) {
            $categoryId = (int)$data['category_id'];
            $category = $db->prepare("SELECT id FROM categories WHERE id = :id AND is_active = 1 LIMIT 1");
            $category->execute(['id' => $categoryId]);
            if (!$category->fetch()) { Response::validationError(['category_id' => ['Select an active product category.']]); }
            $sets[] = "category_id = :category_id";
            $bind['category_id'] = $categoryId;
        }
        if (array_key_exists('status', $data)) {
            $allowedStatuses = ['draft', 'active', 'out_of_stock'];
            $status = (string)$data['status'];
            if (!in_array($status, $allowedStatuses, true)) { Response::validationError(['status' => ['Select a valid product status.']]); }
            if ($status === 'active' && $ownedProduct['status'] === 'pending_review') {
                Response::forbidden('Products pending review cannot be activated by a seller.');
            }
            $sets[] = "status = :status";
            $bind['status'] = $status;
        }
        if (isset($data['specifications'])) { $sets[] = "specifications = :specs"; $bind['specs'] = json_encode($data['specifications']); }
        if (isset($data['features']))       { $sets[] = "features = :feats";       $bind['feats'] = json_encode($data['features']); }
        if (array_key_exists('image_url', $data)) {
            $imageUrl = trim((string)$data['image_url']);
            if ($imageUrl !== '' && (strlen($imageUrl) > 500 || !filter_var($imageUrl, FILTER_VALIDATE_URL))) {
                Response::validationError(['image_url' => ['Enter a valid product image URL.']]);
            }
        }

        if (empty($sets) && !array_key_exists('image_url', $data)) {
            Response::error('No fields to update.', 400);
        }

        if ($sets) {
            $db->prepare("UPDATE products SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = :id")
               ->execute($bind);
        } elseif (array_key_exists('image_url', $data)) {
            $db->prepare("UPDATE products SET updated_at = NOW() WHERE id = :id")
               ->execute(['id' => $prodId]);
        }

        if (array_key_exists('image_url', $data)) {
            $imageUrl = trim((string)$data['image_url']);
            $image = $db->prepare("SELECT id FROM product_images WHERE product_id = :pid AND is_primary = 1 LIMIT 1");
            $image->execute(['pid' => $prodId]);
            $imageId = $image->fetchColumn();
            if ($imageId) {
                if ($imageUrl === '') {
                    $db->prepare("DELETE FROM product_images WHERE id = :id")->execute(['id' => $imageId]);
                } else {
                    $db->prepare("UPDATE product_images SET image_url = :url WHERE id = :id")
                       ->execute(['url' => $imageUrl, 'id' => $imageId]);
                }
            } elseif ($imageUrl !== '') {
                $db->prepare("INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (:pid, :url, 1, 0)")
                   ->execute(['pid' => $prodId, 'url' => $imageUrl]);
            }
        }

        Response::success(null, 'Product updated.');
    }

    public function deleteProduct(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $prodId = (int)$params['id'];

        $check = $db->prepare("SELECT id FROM products WHERE id = :id AND seller_id = :sid");
        $check->execute(['id' => $prodId, 'sid' => $seller['id']]);
        if (!$check->fetch()) { Response::forbidden('Product not found or access denied.'); }

        $db->prepare("UPDATE products SET status = 'archived' WHERE id = :id")->execute(['id' => $prodId]);
        Response::success(null, 'Product archived successfully.');
    }

    public function uploadProductImages(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $prodId = (int)$params['id'];

        $check = $db->prepare("SELECT id FROM products WHERE id = :id AND seller_id = :sid");
        $check->execute(['id' => $prodId, 'sid' => $seller['id']]);
        if (!$check->fetch()) { Response::forbidden('Product not found or access denied.'); }

        if (empty($_FILES['images'])) { Response::error('No images uploaded.', 400); }

        $files    = $_FILES['images'];
        $uploaded = [];
        $isPrimary = true; // First image is primary

        $dir = UPLOAD_DIR . 'products/' . $prodId . '/';
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }

        $count = is_array($files['name']) ? count($files['name']) : 1;
        for ($i = 0; $i < $count; $i++) {
            $file = is_array($files['name']) ? [
                'name'     => $files['name'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'size'     => $files['size'][$i],
                'error'    => $files['error'][$i],
            ] : $files;

            if ($file['error'] !== UPLOAD_ERR_OK) Response::error('One or more image uploads failed.', 400);
            if ($file['size'] > MAX_UPLOAD_BYTES) Response::error('Each image must be 5 MB or smaller.', 400);

            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            if (!in_array($mime, ALLOWED_IMAGE_TYPES, true)) Response::error('Only JPEG, PNG, WebP, or GIF images are allowed.', 400);

            $ext = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'image/gif' => 'gif',
                default => Response::error('Unsupported image type.', 400),
            };
            $filename = bin2hex(random_bytes(16)) . '.' . $ext;
            if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) Response::error('Failed to save uploaded image.', 500);

            $relUrl = UPLOAD_URL . 'products/' . $prodId . '/' . $filename;
            $db->prepare("INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (:pid, :url, :primary, :order)")
               ->execute(['pid' => $prodId, 'url' => $relUrl, 'primary' => $isPrimary ? 1 : 0, 'order' => $i]);

            $uploaded[] = $relUrl;
            $isPrimary  = false;
        }

        Response::success(['uploaded' => $uploaded], count($uploaded) . ' image(s) uploaded.');
    }

    // ─── Order Management ────────────────────────────────────────────────────

    public function orders(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db          = Database::getInstance();
        $statusFilter = $this->query('status') ? " AND so.status = :status" : "";
        $bind = ['sid' => $seller['id']];
        if ($this->query('status')) { $bind['status'] = $this->query('status'); }

        $count = $db->prepare("SELECT COUNT(*) FROM sub_orders so WHERE so.seller_id = :sid $statusFilter");
        $count->execute($bind);
        $total = (int)$count->fetchColumn();

        $stmt = $db->prepare("
            SELECT so.id, so.status, so.subtotal, so.commission_amount, so.seller_earnings,
                   so.commission_rate, so.tracking_number, so.courier_name, so.created_at,
                   o.order_number, o.shipping_name, o.shipping_phone, o.shipping_district,
                   o.shipping_street, o.shipping_landmark, o.payment_method, o.payment_status
            FROM sub_orders so
            JOIN orders o ON so.order_id = o.id
            WHERE so.seller_id = :sid $statusFilter
            ORDER BY so.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        $orders = $stmt->fetchAll();

        // Attach items
        foreach ($orders as &$o) {
            $iStmt = $db->prepare("SELECT product_name, quantity, unit_price, subtotal FROM order_items WHERE sub_order_id = :sid");
            $iStmt->execute(['sid' => $o['id']]);
            $o['items'] = $iStmt->fetchAll();
        }
        unset($o);

        Response::paginated($orders, $total, $page, $perPage);
    }

    public function packOrder(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $soId   = (int)$params['id'];

        $check = $db->prepare("SELECT * FROM sub_orders WHERE id = :id AND seller_id = :sid AND status = 'pending'");
        $check->execute(['id' => $soId, 'sid' => $seller['id']]);
        if (!$check->fetch()) { Response::error('Sub-order not found or already packed.', 404); }

        $data = $this->body();
        $courierName = trim((string)($data['courier_name'] ?? ''));
        $trackingNumber = trim((string)($data['tracking_number'] ?? ''));
        if (strlen($courierName) > 50 || strlen($trackingNumber) > 100) {
            Response::validationError(['courier' => ['Courier name or tracking number is too long.']]);
        }

        $db->prepare("
            UPDATE sub_orders
            SET status = 'packed', packed_at = NOW(),
                courier_name = :courier_name, tracking_number = :tracking_number
            WHERE id = :id AND seller_id = :sid AND status = 'pending'
        ")->execute([
            'courier_name' => $courierName !== '' ? $courierName : null,
            'tracking_number' => $trackingNumber !== '' ? $trackingNumber : null,
            'id' => $soId,
            'sid' => $seller['id'],
        ]);

        Response::success(null, 'Parcel marked as packed and is awaiting courier pickup.');
    }

    public function generatePackingSlip(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $soId   = (int)$params['id'];

        $soStmt = $db->prepare("
            SELECT so.*, o.order_number, o.shipping_name, o.shipping_phone,
                   o.shipping_district, o.shipping_street, o.shipping_landmark, o.payment_method
            FROM sub_orders so JOIN orders o ON so.order_id = o.id
            WHERE so.id = :id AND so.seller_id = :sid
        ");
        $soStmt->execute(['id' => $soId, 'sid' => $seller['id']]);
        $so = $soStmt->fetch();
        if (!$so) { Response::notFound('Sub-order not found.'); }

        $iStmt = $db->prepare("SELECT * FROM order_items WHERE sub_order_id = :sid");
        $iStmt->execute(['sid' => $soId]);
        $items = $iStmt->fetchAll();

        // Return data for frontend PDF generation (or generate HTML slip)
        Response::success([
            'sub_order'  => $so,
            'items'      => $items,
            'seller'     => $seller,
            'generated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    // ─── Payments & Payouts ──────────────────────────────────────────────────

    public function payments(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $db     = Database::getInstance();
        $sid    = $seller['id'];

        $balance = $db->prepare("
            SELECT GREATEST(
                COALESCE((SELECT SUM(net_earnings) FROM seller_earnings WHERE seller_id = :sid_earnings AND status = 'available'), 0)
                - COALESCE((SELECT SUM(amount) FROM seller_payouts WHERE seller_id = :sid_payouts AND status IN ('pending','processing','completed')), 0),
                0
            )
        ");
        $balance->execute(['sid_earnings' => $sid, 'sid_payouts' => $sid]);

        $escrow = $db->prepare("SELECT COALESCE(SUM(net_earnings), 0) FROM seller_earnings WHERE seller_id = :sid AND status = 'held'");
        $escrow->execute(['sid' => $sid]);

        $payouts = $db->prepare("SELECT * FROM seller_payouts WHERE seller_id = :sid ORDER BY created_at DESC LIMIT 20");
        $payouts->execute(['sid' => $sid]);

        $earnings = $db->prepare("
            SELECT se.*, so.id AS sub_order_id, so.status AS order_status, o.order_number
            FROM seller_earnings se
            JOIN sub_orders so ON se.sub_order_id = so.id
            JOIN orders o      ON so.order_id = o.id
            WHERE se.seller_id = :sid
            ORDER BY se.created_at DESC
            LIMIT 50
        ");
        $earnings->execute(['sid' => $sid]);

        $totals = $db->prepare("
            SELECT COALESCE(SUM(gross_amount), 0) AS gross_total,
                   COALESCE(SUM(commission_amount), 0) AS commission_total
            FROM seller_earnings
            WHERE seller_id = :sid
        ");
        $totals->execute(['sid' => $sid]);
        $totalsData = $totals->fetch();

        Response::success([
            'available_balance' => (float)$balance->fetchColumn(),
            'escrow_balance'    => (float)$escrow->fetchColumn(),
            'payouts'           => $payouts->fetchAll(),
            'earnings'          => $earnings->fetchAll(),
            'gross_total'       => (float)$totalsData['gross_total'],
            'commission_total'  => (float)$totalsData['commission_total'],
        ]);
    }

    public function requestWithdrawal(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $data   = $this->body();

        $errors = $this->validate($data, ['amount' => 'required|numeric|min_value:100']);
        if ($errors) { Response::validationError($errors); }

        $db  = Database::getInstance();
        $sid = $seller['id'];

        $balance = $db->prepare("
            SELECT GREATEST(
                COALESCE((SELECT SUM(net_earnings) FROM seller_earnings WHERE seller_id = :sid_earnings AND status = 'available'), 0)
                - COALESCE((SELECT SUM(amount) FROM seller_payouts WHERE seller_id = :sid_payouts AND status IN ('pending','processing','completed')), 0),
                0
            )
        ");
        $balance->execute(['sid_earnings' => $sid, 'sid_payouts' => $sid]);
        $available = (float)$balance->fetchColumn();

        if ((float)$data['amount'] > $available) {
            Response::error("Insufficient balance. Available: ৳" . number_format($available, 2), 400);
        }

        $accountDetails = [
            'method'  => $seller['payout_method'],
            'bank'    => $seller['bank_name'],
            'account' => $seller['bank_account'],
            'wallet'  => $seller['mfs_wallet'],
        ];

        $db->prepare("
            INSERT INTO seller_payouts (seller_id, amount, payout_method, account_details, status)
            VALUES (:sid, :amt, :pm, :acct, 'pending')
        ")->execute([
            'sid'  => $sid,
            'amt'  => $data['amount'],
            'pm'   => $seller['payout_method'],
            'acct' => json_encode($accountDetails),
        ]);

        Response::success(null, 'Withdrawal request submitted. Processing within 2-3 business days.', 201);
    }

    // ─── Store Profile ────────────────────────────────────────────────────────

    public function store(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        Response::success($seller);
    }

    public function updateStore(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $data   = $this->body();
        $db     = Database::getInstance();

        $allowed = ['bio', 'logo_url', 'banner_url', 'support_phone', 'warehouse_division', 'warehouse_district', 'warehouse_address'];
        $sets = [];
        $bind = ['id' => $seller['id']];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = :$f"; $bind[$f] = $data[$f]; }
        }

        if (empty($sets)) { Response::error('No fields to update.', 400); }
        $db->prepare("UPDATE sellers SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = :id")
           ->execute($bind);

        Response::success(null, 'Store profile updated.');
    }

    public function toggleVacation(array $params): void {
        $auth   = $this->requireRole('seller', 'admin', 'super_admin');
        $seller = $this->getSellerOrFail($auth['user_id']);
        $data   = $this->body();
        $db     = Database::getInstance();

        $mode = (bool)($data['vacation_mode'] ?? !$seller['is_on_vacation']);
        $db->prepare("UPDATE sellers SET is_on_vacation = :v WHERE id = :id")
           ->execute(['v' => $mode ? 1 : 0, 'id' => $seller['id']]);

        Response::success(['vacation_mode' => $mode], $mode ? 'Vacation mode enabled.' : 'Vacation mode disabled.');
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    private function getSellerOrFail(int $userId): array {
        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM sellers WHERE user_id = :uid LIMIT 1");
        $stmt->execute(['uid' => $userId]);
        $seller = $stmt->fetch();
        if (!$seller) { Response::error('Seller account not found.', 404); }
        return $seller;
    }
}
