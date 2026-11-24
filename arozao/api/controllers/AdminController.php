<?php
/**
 * Arozao PHP API — Admin Controller
 * Full governance: sellers, products, orders, commissions, payouts, analytics, audit.
 */
class AdminController extends BaseController {

    // ─── Dashboard & Analytics ───────────────────────────────────────────────

    public function dashboard(array $params): void {
        $this->requireAdmin();
        $db = Database::getInstance();

        // GMV & Revenue
        $gmv = $db->query("
            SELECT
                COALESCE(SUM(total_amount), 0)                                  AS total_gmv,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0)          AS today_gmv,
                COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total_amount ELSE 0 END), 0) AS week_gmv,
                COUNT(*)                                                         AS total_orders,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END)        AS today_orders,
                COALESCE(AVG(total_amount), 0)                                   AS aov
            FROM orders
            WHERE status NOT IN ('cancelled', 'returned')
        ")->fetch();

        // Net Revenue (platform commission)
        $netRev = $db->query("SELECT COALESCE(SUM(commission_amount), 0) AS net_revenue FROM seller_earnings")->fetch();

        // Pending seller applications
        $pendingSellers = $db->query("SELECT COUNT(*) FROM sellers WHERE status = 'pending'")->fetchColumn();

        // Products pending review
        $pendingProducts = $db->query("SELECT COUNT(*) FROM products WHERE status = 'pending_review'")->fetchColumn();

        // Marketplace inventory totals
        $activeSellers = $db->query("SELECT COUNT(*) FROM sellers WHERE status = 'approved'")->fetchColumn();
        $totalProducts = $db->query("SELECT COUNT(*) FROM products")->fetchColumn();

        // Top sellers (by revenue)
        $topSellers = $db->query("
            SELECT s.store_name, s.slug, SUM(so.subtotal) AS revenue, COUNT(so.id) AS order_count
            FROM sub_orders so JOIN sellers s ON so.seller_id = s.id
            WHERE so.status NOT IN ('cancelled','returned')
            GROUP BY so.seller_id ORDER BY revenue DESC LIMIT 5
        ")->fetchAll();

        // Top products
        $topProducts = $db->query("
            SELECT p.name, p.slug, p.total_sold, COALESCE(p.sale_price, p.regular_price) AS price
            FROM products p WHERE p.status = 'active'
            ORDER BY p.total_sold DESC LIMIT 5
        ")->fetchAll();

        // Daily GMV (last 30 days)
        $dailyGmv = $db->query("
            SELECT DATE(created_at) AS date, SUM(total_amount) AS gmv, COUNT(*) AS orders
            FROM orders WHERE status NOT IN ('cancelled','returned')
              AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at) ORDER BY date ASC
        ")->fetchAll();

        Response::success([
            'gmv'              => $gmv,
            'net_revenue'      => (float)$netRev['net_revenue'],
            'pending_sellers'  => (int)$pendingSellers,
            'pending_products' => (int)$pendingProducts,
            'active_sellers'   => (int)$activeSellers,
            'total_products'   => (int)$totalProducts,
            'top_sellers'      => $topSellers,
            'top_products'     => $topProducts,
            'daily_gmv'        => $dailyGmv,
        ]);
    }

    public function gmv(array $params): void {
        $this->requireAdmin();
        $db     = Database::getInstance();
        $from   = $this->query('from', date('Y-m-01'));
        $to     = $this->query('to',   date('Y-m-t'));

        $stmt = $db->prepare("
            SELECT DATE(created_at) AS date,
                   SUM(total_amount) AS gmv,
                   SUM(discount_amount) AS discounts,
                   COUNT(*) AS orders,
                   AVG(total_amount) AS aov
            FROM orders
            WHERE created_at BETWEEN :from AND :to
              AND status NOT IN ('cancelled','returned')
            GROUP BY DATE(created_at) ORDER BY date ASC
        ");
        $stmt->execute(['from' => $from . ' 00:00:00', 'to' => $to . ' 23:59:59']);
        Response::success($stmt->fetchAll());
    }

    public function districtAnalytics(array $params): void {
        $this->requireAdmin();
        $db = Database::getInstance();

        $stmt = $db->query("
            SELECT shipping_district AS district,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS total_gmv,
                   AVG(total_amount) AS avg_order_value
            FROM orders
            WHERE status NOT IN ('cancelled','returned')
            GROUP BY shipping_district
            ORDER BY order_count DESC
        ");

        Response::success($stmt->fetchAll());
    }

    // ─── Orders ──────────────────────────────────────────────────────────────

    public function orders(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db    = Database::getInstance();
        $where = ['1=1'];
        $bind  = [];

        if ($q = $this->query('q')) {
            $where[] = "(o.order_number LIKE :q OR o.shipping_phone LIKE :q OR o.shipping_name LIKE :q)";
            $bind['q'] = "%$q%";
        }
        if ($status = $this->query('status')) { $where[] = "o.status = :status"; $bind['status'] = $status; }
        if ($pm     = $this->query('payment_method')) { $where[] = "o.payment_method = :pm"; $bind['pm'] = $pm; }

        $whereStr = implode(' AND ', $where);

        $countStmt = $db->prepare("SELECT COUNT(*) FROM orders o WHERE $whereStr");
        $countStmt->execute($bind);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
                   o.total_amount, o.shipping_name, o.shipping_phone, o.shipping_district, o.created_at,
                   u.email AS customer_email,
                   COUNT(oi.id) AS item_count
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE $whereStr
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $page, $perPage);
    }

    public function updateOrderStatus(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $id   = (int)$params['id'];

        $db = Database::getInstance();
        $db->prepare("UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id")
           ->execute(['status' => $data['status'], 'id' => $id]);

        $this->auditLog($auth['user_id'], 'order_status_override', 'orders', $id, ['new_status' => $data['status']]);
        Response::success(null, 'Order status updated.');
    }

    // ─── Seller Management ────────────────────────────────────────────────────

    public function sellers(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db    = Database::getInstance();
        $where = ['1=1'];
        $bind  = [];

        if ($status = $this->query('status')) { $where[] = "s.status = :status"; $bind['status'] = $status; }
        if ($q      = $this->query('q'))      { $where[] = "(s.store_name LIKE :q OR u.email LIKE :q OR u.phone LIKE :q)"; $bind['q'] = "%$q%"; }

        $whereStr = implode(' AND ', $where);

        $count = $db->prepare("SELECT COUNT(*) FROM sellers s JOIN users u ON s.user_id = u.id WHERE $whereStr");
        $count->execute($bind);

        $stmt = $db->prepare("
            SELECT s.id, s.store_name, s.slug, s.status, s.business_type, s.commission_rate,
                   s.nid_number, s.trade_license, s.created_at, s.approved_at, s.rejection_reason,
                   u.email, u.phone, u.full_name
            FROM sellers s JOIN users u ON s.user_id = u.id
            WHERE $whereStr
            ORDER BY s.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }

    public function sellerDetail(array $params): void {
        $this->requireAdmin();
        $db   = Database::getInstance();
        $stmt = $db->prepare("
            SELECT s.*, u.email, u.phone, u.full_name
            FROM sellers s JOIN users u ON s.user_id = u.id
            WHERE s.id = :id
        ");
        $stmt->execute(['id' => (int)$params['id']]);
        $seller = $stmt->fetch();
        if (!$seller) { Response::notFound('Seller not found.'); }

        $docs = $db->prepare("SELECT type, file_path, file_name, uploaded_at FROM seller_documents WHERE seller_id = :id");
        $docs->execute(['id' => $seller['id']]);
        $seller['documents'] = $docs->fetchAll();

        Response::success($seller);
    }

    public function approveSeller(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $commissionRate = $data['commission_rate'] ?? DEFAULT_COMMISSION_RATE;
        $db->prepare("UPDATE sellers SET status = 'approved', commission_rate = :cr, approved_at = NOW(), approved_by = :by, rejection_reason = NULL WHERE id = :id")
           ->execute(['cr' => $commissionRate, 'by' => $auth['user_id'], 'id' => $id]);

        $this->auditLog($auth['user_id'], 'seller_approved', 'sellers', $id, ['commission_rate' => $commissionRate]);

        // Notify seller
        $seller = $db->prepare("SELECT user_id FROM sellers WHERE id = :id")->execute(['id' => $id]);
        $seller = $db->query("SELECT user_id FROM sellers WHERE id = $id")->fetch();
        if ($seller) {
            $db->prepare("INSERT INTO notifications (user_id, type, title, body, link) VALUES (:uid, 'seller_approved', '🎉 Store Approved!', 'Congratulations! Your Arozao seller account has been approved. You can now list products.', '/seller/dashboard')")
               ->execute(['uid' => $seller['user_id']]);
        }

        Response::success(null, 'Seller approved.');
    }

    public function rejectSeller(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $db->prepare("UPDATE sellers SET status = 'rejected', rejection_reason = :reason WHERE id = :id")
           ->execute(['reason' => $data['reason'] ?? 'Does not meet requirements.', 'id' => $id]);

        $this->auditLog($auth['user_id'], 'seller_rejected', 'sellers', $id, ['reason' => $data['reason'] ?? '']);
        Response::success(null, 'Seller application rejected.');
    }

    public function suspendSeller(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $db->prepare("UPDATE sellers SET status = 'suspended' WHERE id = :id")->execute(['id' => $id]);
        $this->auditLog($auth['user_id'], 'seller_suspended', 'sellers', $id, ['reason' => $data['reason'] ?? '']);
        Response::success(null, 'Seller suspended.');
    }

    public function updateSellerStatus(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $id = (int)$params['id'];
        $db = Database::getInstance();
        $sellerStmt = $db->prepare('SELECT id FROM sellers WHERE id=:id LIMIT 1');
        $sellerStmt->execute(['id' => $id]);
        if (!$sellerStmt->fetch()) Response::notFound('Seller not found.');

        $sets = [];
        $values = ['id' => $id];
        if (array_key_exists('status', $data)) {
            $status = $data['status'] === 'active' ? 'approved' : $data['status'];
            if (!in_array($status, ['approved', 'suspended'], true)) {
                Response::validationError(['status' => ['Seller status must be active or suspended.']]);
            }
            $sets[] = 'status=:status';
            $values['status'] = $status;
            if ($status === 'approved') {
                $sets[] = 'approved_at=COALESCE(approved_at,NOW())';
                $sets[] = 'approved_by=:approved_by';
                $values['approved_by'] = (int)$auth['user_id'];
            }
        }
        if (array_key_exists('commission_rate', $data)) {
            $errors = $this->validate($data, ['commission_rate' => 'required|numeric|min_value:0|max_value:50']);
            if ($errors) Response::validationError($errors);
            $sets[] = 'commission_rate=:commission_rate';
            $values['commission_rate'] = $data['commission_rate'];
        }
        if (!$sets) Response::validationError(['seller' => ['No supported seller fields were provided.']]);

        $db->prepare('UPDATE sellers SET ' . implode(', ', $sets) . ' WHERE id=:id')->execute($values);
        $this->auditLog((int)$auth['user_id'], 'seller_admin_update', 'sellers', $id, $data);
        Response::success(null, 'Seller updated.');
    }

    // ─── Customer Management ─────────────────────────────────────────────────

    public function customers(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db = Database::getInstance();
        $q  = $this->query('q');
        $whereClause = $q ? "WHERE role = 'customer' AND (email LIKE :q OR full_name LIKE :q OR phone LIKE :q)" : "WHERE role = 'customer'";
        $bind = $q ? ['q' => "%$q%"] : [];

        $count = $db->prepare("SELECT COUNT(*) FROM users $whereClause");
        $count->execute($bind);

        $stmt = $db->prepare("
            SELECT u.id, u.email, u.phone, u.full_name, u.is_active, u.created_at, u.last_login_at,
                   COUNT(o.id) AS order_count,
                   COALESCE(SUM(o.total_amount), 0) AS lifetime_value
            FROM users u
            LEFT JOIN orders o ON o.customer_id = u.id
            $whereClause
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }

    public function updateCustomerStatus(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $active = isset($data['is_active']) ? (int)(bool)$data['is_active'] : null;
        if ($active === null) { Response::validationError(['is_active' => ['Required.']]); }

        $db->prepare("UPDATE users SET is_active = :a WHERE id = :id")->execute(['a' => $active, 'id' => $id]);
        $this->auditLog($auth['user_id'], 'customer_status_changed', 'users', $id, ['is_active' => $active]);
        Response::success(null, $active ? 'Customer activated.' : 'Customer suspended.');
    }

    // ─── Product Moderation ──────────────────────────────────────────────────

    public function products(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db     = Database::getInstance();
        $status = $this->query('status', 'pending_review');
        $bind   = ['status' => $status];

        $count = $db->prepare("SELECT COUNT(*) FROM products WHERE status = :status");
        $count->execute($bind);

        $stmt = $db->prepare("
            SELECT p.id, p.name, p.slug, p.regular_price, p.sale_price, p.stock, p.status, p.created_at,
                   c.name AS category_name,
                   s.store_name, s.slug AS seller_slug,
                   (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) AS primary_image
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN sellers s    ON p.seller_id = s.id
            WHERE p.status = :status
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }

    public function publishProduct(array $params): void {
        $auth = $this->requireAdmin();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];
        $db->prepare("UPDATE products SET status = 'active' WHERE id = :id")->execute(['id' => $id]);
        $this->auditLog($auth['user_id'], 'product_published', 'products', $id, []);
        Response::success(null, 'Product published.');
    }

    public function unpublishProduct(array $params): void {
        $auth = $this->requireAdmin();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];
        $db->prepare("UPDATE products SET status = 'draft' WHERE id = :id")->execute(['id' => $id]);
        $this->auditLog($auth['user_id'], 'product_unpublished', 'products', $id, []);
        Response::success(null, 'Product unpublished.');
    }

    public function deleteProduct(array $params): void {
        $auth = $this->requireAdmin();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];
        $db->prepare("UPDATE products SET status = 'archived' WHERE id = :id")->execute(['id' => $id]);
        $this->auditLog($auth['user_id'], 'product_archived', 'products', $id, []);
        Response::success(null, 'Product archived.');
    }

    public function updateProduct(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $id = (int)$params['id'];
        $rules = [];
        if (array_key_exists('status', $data)) $rules['status'] = 'required|in:active,archived';
        if (array_key_exists('stock', $data)) $rules['stock'] = 'required|integer|min_value:0';
        if (array_key_exists('is_featured', $data)) $rules['is_featured'] = 'required|boolean';
        if (!$rules) Response::validationError(['product' => ['No supported product fields were provided.']]);
        if ($errors = $this->validate($data, $rules)) Response::validationError($errors);

        $sets = [];
        $values = ['id' => $id];
        if (array_key_exists('status', $data)) {
            $sets[] = 'status=:status';
            $values['status'] = $data['status'];
        }
        if (array_key_exists('stock', $data)) {
            $sets[] = 'stock=:stock';
            $values['stock'] = (int)$data['stock'];
        }
        if (array_key_exists('is_featured', $data)) {
            $sets[] = 'is_featured=:is_featured';
            $values['is_featured'] = in_array($data['is_featured'], [true, 1, '1', 'true'], true) ? 1 : 0;
        }

        $db = Database::getInstance();
        $exists = $db->prepare('SELECT id FROM products WHERE id=:id LIMIT 1');
        $exists->execute(['id' => $id]);
        if (!$exists->fetch()) Response::notFound('Product not found.');
        $db->prepare('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id=:id')->execute($values);
        $this->auditLog((int)$auth['user_id'], 'product_admin_update', 'products', $id, $data);
        Response::success(null, 'Product updated.');
    }

    // ─── Categories ──────────────────────────────────────────────────────────

    public function categories(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->query("
            SELECT c.*, (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) AS subcategory_count,
                        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
            FROM categories c ORDER BY c.sort_order ASC, c.name ASC
        ");
        Response::success($stmt->fetchAll());
    }

    public function createCategory(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $errors = $this->validate($data, ['name' => 'required|string|min:2|max:100']);
        if ($errors) { Response::validationError($errors); }

        $db   = Database::getInstance();
        $slug = $this->makeSlug($data['name']);
        $db->prepare("INSERT INTO categories (name, slug, description, image_url, parent_id, commission_rate, sort_order) VALUES (:name, :slug, :desc, :img, :pid, :cr, :sort)")
           ->execute([
               'name' => $data['name'], 'slug' => $slug, 'desc' => $data['description'] ?? null,
               'img'  => $data['image_url'] ?? null, 'pid'  => $data['parent_id'] ?? null,
               'cr'   => $data['commission_rate'] ?? DEFAULT_COMMISSION_RATE,
               'sort' => $data['sort_order'] ?? 0,
           ]);
        $this->auditLog($auth['user_id'], 'category_created', 'categories', $db->lastInsertId(), ['name' => $data['name']]);
        Response::success(['id' => $db->lastInsertId(), 'slug' => $slug], 'Category created.', 201);
    }

    public function updateCategory(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $allowed = ['name','description','image_url','commission_rate','sort_order','is_active'];
        $sets = []; $bind = ['id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = :$f"; $bind[$f] = $data[$f]; }
        }
        if (empty($sets)) { Response::error('Nothing to update.', 400); }
        $db->prepare("UPDATE categories SET " . implode(', ', $sets) . " WHERE id = :id")->execute($bind);
        $this->auditLog($auth['user_id'], 'category_updated', 'categories', $id, $data);
        Response::success(null, 'Category updated.');
    }

    public function deleteCategory(array $params): void {
        $auth = $this->requireAdmin();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];
        $db->prepare("UPDATE categories SET is_active = 0 WHERE id = :id")->execute(['id' => $id]);
        $this->auditLog($auth['user_id'], 'category_deactivated', 'categories', $id, []);
        Response::success(null, 'Category deactivated.');
    }

    // ─── Brands ──────────────────────────────────────────────────────────────

    public function brands(array $params): void {
        $this->requireAdmin();
        Response::success(Database::getInstance()->query("SELECT * FROM brands ORDER BY name ASC")->fetchAll());
    }

    public function createBrand(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $errors = $this->validate($data, ['name' => 'required|string|min:1']);
        if ($errors) { Response::validationError($errors); }
        $db   = Database::getInstance();
        $slug = $this->makeSlug($data['name']);
        $db->prepare("INSERT INTO brands (name, slug, logo_url, is_official) VALUES (:name, :slug, :logo, :official)")
           ->execute(['name' => $data['name'], 'slug' => $slug, 'logo' => $data['logo_url'] ?? null, 'official' => $data['is_official'] ?? 0]);
        Response::success(['id' => $db->lastInsertId()], 'Brand created.', 201);
    }

    public function updateBrand(array $params): void {
        $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];
        $allowed = ['name','logo_url','is_official','is_active'];
        $sets = []; $bind = ['id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = :$f"; $bind[$f] = $data[$f]; }
        }
        $db->prepare("UPDATE brands SET " . implode(', ', $sets) . " WHERE id = :id")->execute($bind);
        Response::success(null, 'Brand updated.');
    }

    public function deleteBrand(array $params): void {
        $this->requireAdmin();
        Database::getInstance()->prepare("UPDATE brands SET is_active = 0 WHERE id = :id")->execute(['id' => (int)$params['id']]);
        Response::success(null, 'Brand deactivated.');
    }

    // ─── Commissions ─────────────────────────────────────────────────────────

    public function commissions(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->query("SELECT id, name, slug, commission_rate FROM categories ORDER BY name");
        Response::success($stmt->fetchAll());
    }

    public function updateCommission(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $errors = $this->validate($data, ['commission_rate' => 'required|numeric|min_value:0|max_value:50']);
        if ($errors) { Response::validationError($errors); }

        $db->prepare("UPDATE categories SET commission_rate = :cr WHERE id = :id")->execute(['cr' => $data['commission_rate'], 'id' => $id]);
        $this->auditLog($auth['user_id'], 'commission_updated', 'categories', $id, ['rate' => $data['commission_rate']]);
        Response::success(null, 'Commission rate updated.');
    }

    // ─── Payouts ─────────────────────────────────────────────────────────────

    public function payouts(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();
        $db     = Database::getInstance();
        $status = $this->query('status', 'pending');

        $count = $db->prepare("SELECT COUNT(*) FROM seller_payouts WHERE status = :s");
        $count->execute(['s' => $status]);

        $stmt = $db->prepare("
            SELECT sp.*, s.store_name, u.email, u.full_name
            FROM seller_payouts sp
            JOIN sellers s ON sp.seller_id = s.id
            JOIN users u   ON s.user_id = u.id
            WHERE sp.status = :s
            ORDER BY sp.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':s',      $status);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }

    public function approvePayout(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $db->prepare("UPDATE seller_payouts SET status = 'completed', transaction_ref = :ref, processed_at = NOW(), processed_by = :by WHERE id = :id")
           ->execute(['ref' => $data['transaction_ref'] ?? null, 'by' => $auth['user_id'], 'id' => $id]);

        // Deduct from seller available balance
        $payout = $db->prepare("SELECT * FROM seller_payouts WHERE id = :id")->execute(['id' => $id]);
        // Mark earnings as withdrawn - simplified
        $this->auditLog($auth['user_id'], 'payout_approved', 'seller_payouts', $id, ['ref' => $data['transaction_ref'] ?? '']);
        Response::success(null, 'Payout approved and marked as completed.');
    }

    public function rejectPayout(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $db->prepare("UPDATE seller_payouts SET status = 'rejected', admin_notes = :notes, processed_by = :by WHERE id = :id")
           ->execute(['notes' => $data['reason'] ?? '', 'by' => $auth['user_id'], 'id' => $id]);

        $this->auditLog($auth['user_id'], 'payout_rejected', 'seller_payouts', $id, ['reason' => $data['reason'] ?? '']);
        Response::success(null, 'Payout rejected.');
    }

    public function processBatch(array $params): void {
        $auth = $this->requireAdmin();
        $db   = Database::getInstance();

        // Release escrow for orders delivered more than 7 days ago
        $released = $db->exec("
            UPDATE seller_earnings se
            JOIN sub_orders so ON se.sub_order_id = so.id
            SET se.status = 'available', se.released_at = NOW()
            WHERE se.status = 'held'
              AND so.status = 'delivered'
              AND so.delivered_at <= DATE_SUB(NOW(), INTERVAL " . ESCROW_HOLD_DAYS . " DAY)
        ");

        $this->auditLog($auth['user_id'], 'escrow_batch_released', 'seller_earnings', 'batch', ['released_count' => $released]);
        Response::success(['released_count' => $released], "$released earning(s) released from escrow.");
    }

    // ─── Coupons ─────────────────────────────────────────────────────────────

    public function coupons(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->query("SELECT c.*, cat.name AS category_name FROM coupons c LEFT JOIN categories cat ON c.category_id = cat.id ORDER BY c.created_at DESC");
        Response::success($stmt->fetchAll());
    }

    public function createCoupon(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $errors = $this->validate($data, [
            'code'           => 'required|string|min:3|max:20',
            'discount_type'  => 'required|in:percentage,flat',
            'discount_value' => 'required|numeric|min_value:0.01',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db = Database::getInstance();
        $db->prepare("
            INSERT INTO coupons (code, description, discount_type, discount_value, min_spend, max_discount, usage_limit, per_user_limit, category_id, expires_at)
            VALUES (:code, :desc, :type, :val, :min, :max, :limit, :per_user, :cat, :exp)
        ")->execute([
            'code'     => strtoupper(trim($data['code'])),
            'desc'     => $data['description'] ?? null,
            'type'     => $data['discount_type'],
            'val'      => $data['discount_value'],
            'min'      => $data['min_spend'] ?? 0,
            'max'      => $data['max_discount'] ?? null,
            'limit'    => $data['usage_limit'] ?? null,
            'per_user' => $data['per_user_limit'] ?? 1,
            'cat'      => $data['category_id'] ?? null,
            'exp'      => $data['expires_at'] ?? null,
        ]);

        $this->auditLog($auth['user_id'], 'coupon_created', 'coupons', $db->lastInsertId(), ['code' => $data['code']]);
        Response::success(null, 'Coupon created.', 201);
    }

    public function updateCoupon(array $params): void {
        $auth = $this->requireAdmin();
        $data = $this->body();
        $db   = Database::getInstance();
        $id   = (int)$params['id'];

        $allowed = ['description','discount_value','min_spend','max_discount','usage_limit','expires_at','is_active'];
        $sets = []; $bind = ['id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = :$f"; $bind[$f] = $data[$f]; }
        }
        $db->prepare("UPDATE coupons SET " . implode(', ', $sets) . " WHERE id = :id")->execute($bind);
        Response::success(null, 'Coupon updated.');
    }

    public function deleteCoupon(array $params): void {
        $auth = $this->requireAdmin();
        Database::getInstance()->prepare("UPDATE coupons SET is_active = 0 WHERE id = :id")->execute(['id' => (int)$params['id']]);
        Response::success(null, 'Coupon deactivated.');
    }

    // ─── Audit Logs ──────────────────────────────────────────────────────────

    public function auditLogs(array $params): void {
        $this->requireAdmin();
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db    = Database::getInstance();
        $where = ['1=1'];
        $bind  = [];

        if ($action = $this->query('action'))   { $where[] = "al.action = :action";   $bind['action'] = $action; }
        if ($type   = $this->query('resource')) { $where[] = "al.resource_type = :type"; $bind['type'] = $type; }
        if ($from   = $this->query('from'))     { $where[] = "al.created_at >= :from"; $bind['from'] = $from; }
        if ($to     = $this->query('to'))       { $where[] = "al.created_at <= :to";   $bind['to']   = $to . ' 23:59:59'; }

        $whereStr = implode(' AND ', $where);

        $count = $db->prepare("SELECT COUNT(*) FROM audit_logs al WHERE $whereStr");
        $count->execute($bind);

        $stmt = $db->prepare("
            SELECT al.*, u.full_name AS admin_name, u.email AS admin_email
            FROM audit_logs al
            JOIN users u ON al.admin_id = u.id
            WHERE $whereStr
            ORDER BY al.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), (int)$count->fetchColumn(), $page, $perPage);
    }
}
