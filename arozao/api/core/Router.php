<?php
/**
 * Arozao PHP API — Router
 * Lightweight pattern-matching router with {param} support.
 */
class Router {
    private array $routes = [];

    // ─── Route Registration ──────────────────────────────────────────────────
    public function get(string $path, string $handler): void    { $this->addRoute('GET',    $path, $handler); }
    public function post(string $path, string $handler): void   { $this->addRoute('POST',   $path, $handler); }
    public function put(string $path, string $handler): void    { $this->addRoute('PUT',    $path, $handler); }
    public function patch(string $path, string $handler): void  { $this->addRoute('PATCH',  $path, $handler); }
    public function delete(string $path, string $handler): void { $this->addRoute('DELETE', $path, $handler); }

    private function addRoute(string $method, string $path, string $handler): void {
        // Convert {param} to named capture groups
        $pattern = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $path);
        $pattern = '#^' . $pattern . '$#';
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    // ─── Dispatch ────────────────────────────────────────────────────────────
    public function dispatch(string $method, string $uri): void {
        // Strip query string
        $uri = strtok($uri, '?');

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;
            if (!preg_match($route['pattern'], $uri, $matches)) continue;

            // Extract named params
            $params = array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);

            [$controllerName, $methodName] = explode('@', $route['handler']);

            if (!class_exists($controllerName)) {
                Response::error("Controller [$controllerName] not found.", 500);
                return;
            }

            $controller = new $controllerName();

            if (!method_exists($controller, $methodName)) {
                Response::error("Method [$methodName] not found on [$controllerName].", 500);
                return;
            }

            $controller->$methodName($params);
            return;
        }

        Response::error("Route not found: $method $uri", 404);
    }
}
