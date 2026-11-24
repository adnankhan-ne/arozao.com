<?php
/**
 * Arozao Marketplace — Front Controller (Router)
 * All API requests are routed through this file via .htaccess
 */

// ─── Bootstrap ───────────────────────────────────────────────────────────────
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/database.php';

// ─── Autoloader ──────────────────────────────────────────────────────────────
spl_autoload_register(function (string $class): void {
    $dirs = [
        __DIR__ . '/core/',
        __DIR__ . '/models/',
        __DIR__ . '/controllers/',
        __DIR__ . '/middleware/',
        __DIR__ . '/helpers/',
        __DIR__ . '/services/',
    ];
    foreach ($dirs as $dir) {
        $file = $dir . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// ─── CORS ────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_unique(array_filter(array_map('trim', explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: FRONTEND_URL . ',http://127.0.0.1:3000'))));

if ($origin !== '' && in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Webhook-Secret');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Request Parsing ─────────────────────────────────────────────────────────
$method = strtoupper($_SERVER['REQUEST_METHOD']);
$uri    = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Strip the base path prefix (e.g. /Arozao Website/api)
$basePath = rawurldecode((string)parse_url(APP_URL, PHP_URL_PATH));
if ($uri === $basePath) {
    $uri = '/';
} elseif ($basePath !== '' && strpos($uri, rtrim($basePath, '/') . '/') === 0) {
    $uri = substr($uri, strlen($basePath));
}

$uri = '/' . trim($uri, '/');

// ─── Routes ──────────────────────────────────────────────────────────────────
$router = new Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
$router->post('/auth/register',         'AuthController@register');
$router->post('/auth/login',            'AuthController@login');
$router->post('/auth/logout',           'AuthController@logout');
$router->post('/auth/refresh',          'AuthController@refresh');
$router->post('/auth/password-reset-token', 'AuthController@passwordResetToken');
$router->post('/auth/reset-password',   'AuthController@resetPassword');
$router->post('/auth/verify-otp',       'AuthController@verifyOtp');
$router->post('/auth/send-otp',         'AuthController@sendOtp');
$router->get( '/auth/me',               'AuthController@me');
$router->patch('/auth/me',               'AuthController@updateProfile');

// ── Products ─────────────────────────────────────────────────────────────────
$router->get( '/products',              'ProductController@index');
$router->get( '/products/{slug}',       'ProductController@show');
$router->post('/products',              'ProductController@store');
$router->put( '/products/{id}',         'ProductController@update');
$router->delete('/products/{id}',       'ProductController@destroy');
$router->get( '/products/{id}/reviews', 'ProductController@reviews');

// ── Categories ────────────────────────────────────────────────────────────────
$router->get( '/categories',            'CategoryController@index');
$router->get( '/categories/{slug}',     'CategoryController@show');
$router->post('/categories',            'CategoryController@store');
$router->put( '/categories/{id}',       'CategoryController@update');
$router->delete('/categories/{id}',     'CategoryController@destroy');

// ── Brands ────────────────────────────────────────────────────────────────────
$router->get( '/brands',                'BrandController@index');
$router->post('/brands',                'BrandController@store');
$router->put( '/brands/{id}',           'BrandController@update');
$router->delete('/brands/{id}',         'BrandController@destroy');

// ── Search ────────────────────────────────────────────────────────────────────
$router->get( '/search',                'SearchController@search');
$router->get( '/search/suggestions',    'SearchController@suggestions');

// ── Cart ─────────────────────────────────────────────────────────────────────
$router->get( '/cart',                  'CartController@index');
$router->post('/cart',                  'CartController@addItem');
$router->put( '/cart/{id}',             'CartController@updateItem');
$router->delete('/cart/{id}',           'CartController@removeItem');
$router->delete('/cart',                'CartController@clear');

// ── Wishlist ─────────────────────────────────────────────────────────────────
$router->get(  '/wishlist',             'WishlistController@index');
$router->post( '/wishlist',             'WishlistController@toggle');

// ── Orders ────────────────────────────────────────────────────────────────────
$router->get(  '/orders',               'OrderController@index');
$router->get(  '/orders/{id}',          'OrderController@show');
$router->post( '/orders',               'OrderController@store');
$router->patch('/orders/{id}/status',   'OrderController@updateStatus');
$router->post( '/orders/{id}/cancel',   'OrderController@cancel');

// ── Checkout / Coupons ───────────────────────────────────────────────────────
$router->post('/coupons/validate',      'CouponController@validate');
$router->get( '/coupons',               'CouponController@index');
$router->post('/coupons',               'CouponController@store');
$router->put( '/coupons/{id}',          'CouponController@update');
$router->delete('/coupons/{id}',        'CouponController@destroy');

// ── Payments ─────────────────────────────────────────────────────────────────
$router->post('/payments/bkash/initiate',   'PaymentController@bkashInitiate');
$router->post('/payments/bkash/execute',    'PaymentController@bkashExecute');
$router->post('/payments/bkash/callback',   'PaymentController@bkashCallback');
$router->post('/payments/nagad/initiate',   'PaymentController@nagadInitiate');
$router->post('/payments/nagad/verify',     'PaymentController@nagadVerify');
$router->post('/payments/cod/confirm',      'PaymentController@codConfirm');
$router->post('/payments/webhook',          'PaymentController@webhook');

// ── Addresses ────────────────────────────────────────────────────────────────
$router->get(  '/addresses',            'AddressController@index');
$router->post( '/addresses',            'AddressController@store');
$router->put(  '/addresses/{id}',       'AddressController@update');
$router->delete('/addresses/{id}',      'AddressController@destroy');
$router->patch('/addresses/{id}/default','AddressController@setDefault');

// ── Reviews ───────────────────────────────────────────────────────────────────
$router->post('/reviews',               'ReviewController@store');
$router->put( '/reviews/{id}',          'ReviewController@update');
$router->delete('/reviews/{id}',        'ReviewController@destroy');
$router->post('/reviews/{id}/helpful',  'ReviewController@markHelpful');

// ── Seller Onboarding ────────────────────────────────────────────────────────
$router->post('/seller/apply',                    'SellerController@apply');
$router->get( '/seller/application-status',       'SellerController@applicationStatus');
$router->post('/seller/documents/upload',         'SellerController@uploadDocument');

// ── Seller Dashboard ─────────────────────────────────────────────────────────
$router->get( '/seller/dashboard',               'SellerController@dashboard');
$router->get( '/seller/products',                'SellerController@products');
$router->post('/seller/products',                'SellerController@addProduct');
$router->put( '/seller/products/{id}',           'SellerController@updateProduct');
$router->delete('/seller/products/{id}',         'SellerController@deleteProduct');
$router->post('/seller/products/{id}/images',    'SellerController@uploadProductImages');
$router->get( '/seller/orders',                  'SellerController@orders');
$router->patch('/seller/orders/{id}/pack',       'SellerController@packOrder');
$router->get( '/seller/orders/{id}/slip',        'SellerController@generatePackingSlip');
$router->get( '/seller/payments',                'SellerController@payments');
$router->post('/seller/payments/withdraw',       'SellerController@requestWithdrawal');
$router->get( '/seller/store',                   'SellerController@store');
$router->put( '/seller/store',                   'SellerController@updateStore');
$router->patch('/seller/settings/vacation',      'SellerController@toggleVacation');

// ── Logistics / Courier ──────────────────────────────────────────────────────
$router->post('/courier/steadfast/create',       'CourierController@steadfastCreate');
$router->get( '/courier/steadfast/status/{cn}',  'CourierController@steadfastStatus');
$router->post('/courier/pathao/create',          'CourierController@pathaoCreate');
$router->post('/courier/redx/create',            'CourierController@redxCreate');
$router->post('/courier/webhook',                'CourierController@webhook');

// ── Fulfillment ──────────────────────────────────────────────────────────────
$router->get( '/fulfillment',                    'FulfillmentController@show');
$router->post('/fulfillment',                    'FulfillmentController@update');

// ── Admin ────────────────────────────────────────────────────────────────────
$router->get( '/admin/dashboard',                'AdminController@dashboard');
$router->get( '/admin/gmv',                      'AdminController@gmv');
$router->get( '/admin/orders',                   'AdminController@orders');
$router->patch('/admin/orders/{id}/status',      'AdminController@updateOrderStatus');
$router->get( '/admin/sellers',                  'AdminController@sellers');
$router->get( '/admin/sellers/{id}',             'AdminController@sellerDetail');
$router->patch('/admin/sellers/{id}/approve',    'AdminController@approveSeller');
$router->patch('/admin/sellers/{id}/reject',     'AdminController@rejectSeller');
$router->patch('/admin/sellers/{id}/suspend',    'AdminController@suspendSeller');
$router->patch('/admin/sellers/{id}/status',     'AdminController@updateSellerStatus');
$router->get( '/admin/customers',                'AdminController@customers');
$router->patch('/admin/customers/{id}/status',   'AdminController@updateCustomerStatus');
$router->get( '/admin/products',                 'AdminController@products');
$router->patch('/admin/products/{id}/publish',   'AdminController@publishProduct');
$router->patch('/admin/products/{id}/unpublish', 'AdminController@unpublishProduct');
$router->delete('/admin/products/{id}',          'AdminController@deleteProduct');
$router->patch('/admin/products/{id}',           'AdminController@updateProduct');
$router->get( '/admin/categories',               'AdminController@categories');
$router->post('/admin/categories',               'AdminController@createCategory');
$router->put( '/admin/categories/{id}',          'AdminController@updateCategory');
$router->delete('/admin/categories/{id}',        'AdminController@deleteCategory');
$router->get( '/admin/brands',                   'AdminController@brands');
$router->post('/admin/brands',                   'AdminController@createBrand');
$router->put( '/admin/brands/{id}',              'AdminController@updateBrand');
$router->delete('/admin/brands/{id}',            'AdminController@deleteBrand');
$router->get( '/admin/commissions',              'AdminController@commissions');
$router->put( '/admin/commissions/{id}',         'AdminController@updateCommission');
$router->get( '/admin/payouts',                  'AdminController@payouts');
$router->patch('/admin/payouts/{id}/approve',    'AdminController@approvePayout');
$router->patch('/admin/payouts/{id}/reject',     'AdminController@rejectPayout');
$router->post('/admin/payouts/batch',            'AdminController@processBatch');
$router->get( '/admin/coupons',                  'AdminController@coupons');
$router->post('/admin/coupons',                  'AdminController@createCoupon');
$router->put( '/admin/coupons/{id}',             'AdminController@updateCoupon');
$router->delete('/admin/coupons/{id}',           'AdminController@deleteCoupon');
$router->get( '/admin/audit-logs',               'AdminController@auditLogs');
$router->get( '/admin/analytics/districts',      'AdminController@districtAnalytics');

// ── Notifications ────────────────────────────────────────────────────────────
$router->get('/notifications',                   'NotificationController@index');
$router->patch('/notifications/{id}/read',       'NotificationController@markRead');
$router->patch('/notifications/read-all',        'NotificationController@markAllRead');

// ── Health ────────────────────────────────────────────────────────────────────
$router->get('/health',                          'HealthController@check');

// ─── Dispatch ────────────────────────────────────────────────────────────────
try {
    $router->dispatch($method, $uri);
} catch (Throwable $e) {
    error_log('[Arozao API] Unhandled request error: ' . $e->getMessage());
    Response::error(APP_DEBUG ? $e->getMessage() : 'An unexpected server error occurred.', 500);
}
