<?php
/**
 * Arozao PHP API — Product Controller
 * Public browse + seller CRUD (via SellerController for write ops)
 */
class ProductController extends BaseController {

    public function index(array $params): void {
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db  = Database::getInstance();
        $where = ["p.status = 'active'", "s.status = 'approved'", "c.is_active = 1"];
        $bind  = [];

        // Filters
        if ($cat = $this->query('category')) {
            $where[] = "c.slug = :cat";
            $bind['cat'] = $cat;
        }
        if ($brand = $this->query('brand')) {
            $where[] = "b.slug = :brand";
            $bind['brand'] = $brand;
        }
        if ($minPrice = $this->query('min_price')) {
            $where[] = "COALESCE(p.sale_price, p.regular_price) >= :min_price";
            $bind['min_price'] = $minPrice;
        }
        if ($maxPrice = $this->query('max_price')) {
            $where[] = "COALESCE(p.sale_price, p.regular_price) <= :max_price";
            $bind['max_price'] = $maxPrice;
        }
        if ($this->query('in_stock') === '1') {
            $where[] = "p.stock > 0";
        }
        if ($minRating = $this->query('rating')) {
            $where[] = "p.avg_rating >= :min_rating";
            $bind['min_rating'] = $minRating;
        }
        if ($search = $this->query('q')) {
            $where[] = "MATCH(p.name) AGAINST(:search IN BOOLEAN MODE)";
            $bind['search'] = $search . '*';
        }

        $whereStr = implode(' AND ', $where);

        // Sort
        $sortMap = [
            'newest'        => 'p.created_at DESC',
            'price_asc'     => 'COALESCE(p.sale_price, p.regular_price) ASC',
            'price_desc'    => 'COALESCE(p.sale_price, p.regular_price) DESC',
            'best_sellers'  => 'p.total_sold DESC',
            'top_rated'     => 'p.avg_rating DESC',
        ];
        $sort = $sortMap[$this->query('sort', 'newest')] ?? 'p.created_at DESC';

        $countSql = "
            SELECT COUNT(*) FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b     ON p.brand_id = b.id
            WHERE $whereStr
        ";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($bind);
        $total = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT p.id, p.name, p.slug, p.regular_price, p.sale_price, p.stock,
                   p.avg_rating, p.review_count, p.total_sold, p.is_featured,
                   c.name AS category_name, c.slug AS category_slug,
                   b.name AS brand_name,
                   s.store_name, s.slug AS seller_slug,
                   pi.image_url AS primary_image
            FROM products p
            LEFT JOIN categories c   ON p.category_id = c.id
            LEFT JOIN brands b       ON p.brand_id = b.id
            JOIN sellers s           ON p.seller_id = s.id
            LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
            WHERE $whereStr
            ORDER BY $sort
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $db->prepare($sql);
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();

        Response::paginated($products, $total, $page, $perPage);
    }

    public function show(array $params): void {
        $db   = Database::getInstance();
        $stmt = $db->prepare("
            SELECT p.*,
                   c.name AS category_name, c.slug AS category_slug,
                   b.name AS brand_name, b.logo_url AS brand_logo,
                   s.store_name, s.slug AS seller_slug, s.logo_url AS seller_logo,
                   s.support_phone AS seller_phone, s.avg_rating AS seller_rating
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b     ON p.brand_id = b.id
            LEFT JOIN sellers s    ON p.seller_id = s.id
            WHERE p.slug = :slug AND p.status = 'active'
              AND s.status = 'approved' AND c.is_active = 1
        ");
        $stmt->execute(['slug' => $params['slug']]);
        $product = $stmt->fetch();

        if (!$product) { Response::notFound('Product not found.'); }

        // Decode JSON columns
        $product['specifications'] = $product['specifications'] ? json_decode($product['specifications'], true) : null;
        $product['features']       = $product['features']       ? json_decode($product['features'], true)       : null;

        // Images
        $imgStmt = $db->prepare("SELECT image_url, alt_text, sort_order, is_primary FROM product_images WHERE product_id = :id ORDER BY is_primary DESC, sort_order ASC");
        $imgStmt->execute(['id' => $product['id']]);
        $product['images'] = $imgStmt->fetchAll();

        // Related products (same category, excluding this one)
        $relStmt = $db->prepare("
            SELECT p2.id, p2.name, p2.slug, p2.regular_price, p2.sale_price, p2.avg_rating,
                   pi.image_url AS primary_image
            FROM products p2
            LEFT JOIN product_images pi ON pi.product_id = p2.id AND pi.is_primary = 1
            WHERE p2.category_id = :cat AND p2.id != :id AND p2.status = 'active'
            ORDER BY p2.total_sold DESC
            LIMIT 8
        ");
        $relStmt->execute(['cat' => $product['category_id'], 'id' => $product['id']]);
        $product['related_products'] = $relStmt->fetchAll();

        Response::success($product);
    }

    public function reviews(array $params): void {
        ['page' => $page, 'perPage' => $perPage, 'offset' => $offset] = $this->paginationParams();

        $db = Database::getInstance();

        // Find product by ID
        $productId = (int)$params['id'];

        // Rating distribution
        $distStmt = $db->prepare("
            SELECT rating, COUNT(*) AS count
            FROM product_reviews WHERE product_id = :id AND is_approved = 1
            GROUP BY rating ORDER BY rating DESC
        ");
        $distStmt->execute(['id' => $productId]);
        $distribution = $distStmt->fetchAll();

        // Filter by rating
        $ratingFilter = $this->query('rating') ? " AND r.rating = :rating" : '';
        $bind = ['id' => $productId];
        if ($this->query('rating')) { $bind['rating'] = (int)$this->query('rating'); }

        $countStmt = $db->prepare("SELECT COUNT(*) FROM product_reviews WHERE product_id = :id AND is_approved = 1");
        $countStmt->execute(['id' => $productId]);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT r.id, r.rating, r.title, r.body, r.verified_purchase, r.helpful_count, r.created_at,
                   u.full_name AS reviewer_name, u.avatar_url
            FROM product_reviews r
            JOIN users u ON r.customer_id = u.id
            WHERE r.product_id = :id AND r.is_approved = 1 $ratingFilter
            ORDER BY r.helpful_count DESC, r.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bind as $k => $v) { $stmt->bindValue(":$k", $v); }
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated([
            'distribution' => $distribution,
            'reviews'      => $stmt->fetchAll(),
        ], $total, $page, $perPage);
    }

    public function store(array $params): void {
        (new SellerController())->addProduct($params);
    }

    public function update(array $params): void {
        (new SellerController())->updateProduct($params);
    }

    public function destroy(array $params): void {
        (new SellerController())->deleteProduct($params);
    }
}
