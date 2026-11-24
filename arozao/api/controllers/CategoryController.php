<?php
class CategoryController extends BaseController {
    public function index(array $params): void {
        $stmt = Database::getInstance()->query("
            SELECT c.id, c.name, c.slug, c.description, c.image_url, c.parent_id,
                   c.sort_order,
                   parent.name AS parent_name
            FROM categories c
            LEFT JOIN categories parent ON parent.id = c.parent_id
            WHERE c.is_active = 1
            ORDER BY c.sort_order, c.name
        ");
        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM categories WHERE slug = :slug AND is_active = 1 LIMIT 1");
        $stmt->execute(['slug' => $params['slug']]);
        $category = $stmt->fetch();
        if (!$category) Response::notFound('Category not found.');

        $products = $db->prepare("
            SELECT p.id, p.name, p.slug, p.regular_price, p.sale_price, p.stock,
                   p.avg_rating, p.review_count, pi.image_url AS primary_image
            FROM products p
            LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
            WHERE p.category_id = :id AND p.status = 'active'
            ORDER BY p.is_featured DESC, p.created_at DESC
            LIMIT 24
        ");
        $products->execute(['id' => $category['id']]);
        $category['products'] = $products->fetchAll();
        Response::success($category);
    }

    public function store(array $params): void { $this->save(null); }
    public function update(array $params): void { $this->save((int)$params['id']); }

    private function save(?int $id): void {
        $this->requireAdmin();
        $data = $this->body();
        $errors = $this->validate($data, ['name' => 'required|string|min:2|max:191']);
        if ($errors) Response::validationError($errors);

        $db = Database::getInstance();
        $slug = $this->makeSlug((string)($data['slug'] ?? $data['name']));
        if ($slug === '') Response::validationError(['slug' => ['A valid slug is required.']]);
        $existsSql = $id === null
            ? 'SELECT id FROM categories WHERE slug=:slug LIMIT 1'
            : 'SELECT id FROM categories WHERE slug=:slug AND id<>:id LIMIT 1';
        $exists = $db->prepare($existsSql);
        $existsValues = ['slug' => $slug];
        if ($id !== null) $existsValues['id'] = $id;
        $exists->execute($existsValues);
        if ($exists->fetch()) Response::error('A category with this slug already exists.', 409);

        $parentId = isset($data['parent_id']) && $data['parent_id'] !== '' ? (int)$data['parent_id'] : null;
        if ($parentId !== null) {
            $parent = $db->prepare('SELECT id FROM categories WHERE id = :id');
            $parent->execute(['id' => $parentId]);
            if (!$parent->fetch() || $parentId === $id) Response::validationError(['parent_id' => ['The selected parent category is invalid.']]);
        }

        $values = [
            'name' => trim($data['name']), 'slug' => $slug,
            'description' => $data['description'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'parent_id' => $parentId,
            'commission_rate' => (float)($data['commission_rate'] ?? DEFAULT_COMMISSION_RATE),
            'sort_order' => (int)($data['sort_order'] ?? 0),
        ];
        if ($id === null) {
            $stmt = $db->prepare('INSERT INTO categories (name, slug, description, image_url, parent_id, commission_rate, sort_order) VALUES (:name, :slug, :description, :image_url, :parent_id, :commission_rate, :sort_order)');
        } else {
            $values['id'] = $id;
            $stmt = $db->prepare('UPDATE categories SET name=:name, slug=:slug, description=:description, image_url=:image_url, parent_id=:parent_id, commission_rate=:commission_rate, sort_order=:sort_order WHERE id=:id');
        }
        $stmt->execute($values);
        Response::success(['id' => $id ?? (int)$db->lastInsertId(), 'slug' => $slug], 'Category saved.', $id === null ? 201 : 200);
    }

    public function destroy(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->prepare('UPDATE categories SET is_active = 0 WHERE id = :id');
        $stmt->execute(['id' => (int)$params['id']]);
        if (!$stmt->rowCount()) Response::notFound('Category not found.');
        Response::success(null, 'Category deactivated.');
    }
}
