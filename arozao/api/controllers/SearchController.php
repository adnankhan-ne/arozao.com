<?php
class SearchController extends BaseController {
    public function search(array $params): void {
        $query = trim((string)$this->query('q', ''));
        if ($query === '') Response::validationError(['q' => ['A search query is required.']]);

        $_GET['q'] = $query;
        $_GET['sort'] = $this->query('sort', 'newest');
        (new ProductController())->index([]);
    }

    public function suggestions(array $params): void {
        $query = trim((string)$this->query('q', ''));
        if (strlen($query) < 2) Response::success([]);
        $stmt = Database::getInstance()->prepare("
            SELECT id, name, slug FROM products
            WHERE status = 'active' AND name LIKE :query
            ORDER BY is_featured DESC, total_sold DESC, name ASC
            LIMIT 8
        ");
        $stmt->execute(['query' => '%' . $query . '%']);
        Response::success($stmt->fetchAll());
    }
}
