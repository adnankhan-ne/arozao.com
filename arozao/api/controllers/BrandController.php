<?php
class BrandController extends BaseController {
    public function index(array $params): void {
        $stmt = Database::getInstance()->query('SELECT id, name, slug, logo_url, is_official FROM brands WHERE is_active = 1 ORDER BY name');
        Response::success($stmt->fetchAll());
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
            ? 'SELECT id FROM brands WHERE slug=:slug LIMIT 1'
            : 'SELECT id FROM brands WHERE slug=:slug AND id<>:id LIMIT 1';
        $exists = $db->prepare($existsSql);
        $existsValues = ['slug' => $slug];
        if ($id !== null) $existsValues['id'] = $id;
        $exists->execute($existsValues);
        if ($exists->fetch()) Response::error('A brand with this slug already exists.', 409);

        $values = [
            'name' => trim($data['name']), 'slug' => $slug,
            'logo_url' => $data['logo_url'] ?? null,
            'is_official' => !empty($data['is_official']) ? 1 : 0,
        ];
        if ($id === null) {
            $stmt = $db->prepare('INSERT INTO brands (name, slug, logo_url, is_official) VALUES (:name, :slug, :logo_url, :is_official)');
        } else {
            $values['id'] = $id;
            $stmt = $db->prepare('UPDATE brands SET name=:name, slug=:slug, logo_url=:logo_url, is_official=:is_official WHERE id=:id');
        }
        $stmt->execute($values);
        Response::success(['id' => $id ?? (int)$db->lastInsertId(), 'slug' => $slug], 'Brand saved.', $id === null ? 201 : 200);
    }

    public function destroy(array $params): void {
        $this->requireAdmin();
        $stmt = Database::getInstance()->prepare('UPDATE brands SET is_active = 0 WHERE id = :id');
        $stmt->execute(['id' => (int)$params['id']]);
        if (!$stmt->rowCount()) Response::notFound('Brand not found.');
        Response::success(null, 'Brand deactivated.');
    }
}
