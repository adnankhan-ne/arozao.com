   -- ============================================================
-- AROZAO MARKETPLACE — Complete MySQL Schema
-- Database: arozao_marketplace
-- PHP 8.3 + MySQL 8 / MariaDB 10.6+
-- ============================================================

CREATE DATABASE IF NOT EXISTS `arozao_marketplace`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `arozao_marketplace`;

SET foreign_key_checks = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS & AUTHENTICATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email`             VARCHAR(191)    NOT NULL UNIQUE,
    `phone`             VARCHAR(20)     DEFAULT NULL,
    `password_hash`     VARCHAR(255)    NOT NULL,
    `full_name`         VARCHAR(191)    NOT NULL,
    `role`              ENUM('customer','seller','admin','super_admin') NOT NULL DEFAULT 'customer',
    `gender`            ENUM('male','female','other') DEFAULT NULL,
    `avatar_url`        VARCHAR(500)    DEFAULT NULL,
    `is_active`         TINYINT(1)      NOT NULL DEFAULT 1,
    `email_verified_at` TIMESTAMP       NULL DEFAULT NULL,
    `phone_verified_at` TIMESTAMP       NULL DEFAULT NULL,
    `date_of_birth`     DATE            DEFAULT NULL,
    `preferred_language` VARCHAR(5)     NOT NULL DEFAULT 'en',
    `newsletter_subscribed` TINYINT(1)  NOT NULL DEFAULT 0,
    `last_login_at`     TIMESTAMP       NULL DEFAULT NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email`  (`email`),
    INDEX `idx_users_phone`  (`phone`),
    INDEX `idx_users_role`   (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email`      VARCHAR(191)  NOT NULL,
    `token_hash` VARCHAR(255)  NOT NULL,
    `expires_at` TIMESTAMP     NOT NULL,
    `used_at`    TIMESTAMP     NULL DEFAULT NULL,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pr_email` (`email`),
    INDEX `idx_pr_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OTP Verification
CREATE TABLE IF NOT EXISTS `otp_codes` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `phone`      VARCHAR(20)   NOT NULL,
    `code`       VARCHAR(6)    NOT NULL,
    `purpose`    ENUM('cod_verify','phone_verify','login') NOT NULL DEFAULT 'phone_verify',
    `expires_at` TIMESTAMP     NOT NULL,
    `verified_at` TIMESTAMP    NULL DEFAULT NULL,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_otp_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOMER ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `addresses` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id`      INT UNSIGNED  NOT NULL,
    `label`        VARCHAR(50)   NOT NULL DEFAULT 'Home',
    `full_name`    VARCHAR(191)  NOT NULL,
    `phone`        VARCHAR(20)   NOT NULL,
    `division`     VARCHAR(50)   NOT NULL,
    `district`     VARCHAR(50)   NOT NULL,
    `upazila`      VARCHAR(50)   DEFAULT NULL,
    `area`         VARCHAR(100)  DEFAULT NULL,
    `street`       TEXT          NOT NULL,
    `postal_code`  VARCHAR(10)   DEFAULT NULL,
    `landmark`     VARCHAR(191)  DEFAULT NULL,
    `is_default`   TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_addr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `categories` (
    `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`              VARCHAR(191)  NOT NULL,
    `slug`              VARCHAR(191)  NOT NULL UNIQUE,
    `description`       TEXT          DEFAULT NULL,
    `image_url`         VARCHAR(500)  DEFAULT NULL,
    `parent_id`         INT UNSIGNED  DEFAULT NULL,
    `commission_rate`   DECIMAL(5,2)  NOT NULL DEFAULT 7.00,
    `sort_order`        INT           NOT NULL DEFAULT 0,
    `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    INDEX `idx_cat_slug`   (`slug`),
    INDEX `idx_cat_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BRANDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `brands` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(191)  NOT NULL,
    `slug`        VARCHAR(191)  NOT NULL UNIQUE,
    `logo_url`    VARCHAR(500)  DEFAULT NULL,
    `is_official` TINYINT(1)   NOT NULL DEFAULT 0,
    `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_brand_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SELLERS / STORES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `sellers` (
    `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id`         INT UNSIGNED  NOT NULL UNIQUE,
    `store_name`      VARCHAR(191)  NOT NULL,
    `slug`            VARCHAR(191)  NOT NULL UNIQUE,
    `logo_url`        VARCHAR(500)  DEFAULT NULL,
    `banner_url`      VARCHAR(500)  DEFAULT NULL,
    `bio`             TEXT          DEFAULT NULL,
    `business_type`   ENUM('individual','proprietorship','limited') NOT NULL DEFAULT 'individual',
    `nid_number`      VARCHAR(20)   DEFAULT NULL,
    `trade_license`   VARCHAR(50)   DEFAULT NULL,
    `tin_number`      VARCHAR(20)   DEFAULT NULL,
    -- Warehouse / Pickup Address
    `warehouse_division` VARCHAR(50) DEFAULT NULL,
    `warehouse_district` VARCHAR(50) DEFAULT NULL,
    `warehouse_address`  TEXT        DEFAULT NULL,
    -- Payout
    `payout_method`   ENUM('bank','bkash','nagad') DEFAULT NULL,
    `bank_name`       VARCHAR(100)  DEFAULT NULL,
    `bank_branch`     VARCHAR(100)  DEFAULT NULL,
    `bank_account`    VARCHAR(50)   DEFAULT NULL,
    `bank_routing`    VARCHAR(20)   DEFAULT NULL,
    `mfs_wallet`      VARCHAR(20)   DEFAULT NULL,
    -- Status
    `status`          ENUM('pending','under_review','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    `rejection_reason` TEXT         DEFAULT NULL,
    `commission_rate` DECIMAL(5,2)  NOT NULL DEFAULT 7.00,
    `support_phone`   VARCHAR(20)   DEFAULT NULL,
    `is_on_vacation`  TINYINT(1)   NOT NULL DEFAULT 0,
    `approved_at`     TIMESTAMP     NULL DEFAULT NULL,
    `approved_by`     INT UNSIGNED  DEFAULT NULL,
    `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`)      REFERENCES `users`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`approved_by`)  REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_seller_slug`   (`slug`),
    INDEX `idx_seller_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller Documents (NID, Trade License, Bank Cheque)
CREATE TABLE IF NOT EXISTS `seller_documents` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `seller_id`   INT UNSIGNED  NOT NULL,
    `type`        ENUM('nid_front','nid_back','trade_license','tin_certificate','bank_cheque','other') NOT NULL,
    `file_path`   VARCHAR(500)  NOT NULL,
    `file_name`   VARCHAR(255)  DEFAULT NULL,
    `uploaded_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
    INDEX `idx_sdoc_seller` (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `products` (
    `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `seller_id`       INT UNSIGNED    NOT NULL,
    `category_id`     INT UNSIGNED    NOT NULL,
    `brand_id`        INT UNSIGNED    DEFAULT NULL,
    `sku`             VARCHAR(50)     NOT NULL UNIQUE,
    `name`            VARCHAR(500)    NOT NULL,
    `slug`            VARCHAR(500)    NOT NULL UNIQUE,
    `description`     LONGTEXT        DEFAULT NULL,
    `short_desc`      TEXT            DEFAULT NULL,
    `regular_price`   DECIMAL(10,2)   NOT NULL,
    `sale_price`      DECIMAL(10,2)   DEFAULT NULL,
    `stock`           INT             NOT NULL DEFAULT 0,
    `weight_grams`    INT             DEFAULT NULL,
    `specifications`  JSON            DEFAULT NULL,
    `features`        JSON            DEFAULT NULL,
    `status`          ENUM('draft','active','out_of_stock','archived','pending_review') NOT NULL DEFAULT 'pending_review',
    `is_featured`     TINYINT(1)      NOT NULL DEFAULT 0,
    `avg_rating`      DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
    `review_count`    INT             NOT NULL DEFAULT 0,
    `total_sold`      INT             NOT NULL DEFAULT 0,
    `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`)   REFERENCES `sellers`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`brand_id`)    REFERENCES `brands`(`id`) ON DELETE SET NULL,
    INDEX `idx_prod_slug`        (`slug`(255)),
    INDEX `idx_prod_seller`      (`seller_id`),
    INDEX `idx_prod_category`    (`category_id`),
    INDEX `idx_prod_status`      (`status`),
    INDEX `idx_prod_price`       (`sale_price`, `regular_price`),
    FULLTEXT INDEX `ft_prod_name`(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Images
CREATE TABLE IF NOT EXISTS `product_images` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `product_id`  INT UNSIGNED  NOT NULL,
    `image_url`   VARCHAR(500)  NOT NULL,
    `alt_text`    VARCHAR(255)  DEFAULT NULL,
    `sort_order`  INT           NOT NULL DEFAULT 0,
    `is_primary`  TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_pimg_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. COUPONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `coupons` (
    `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `code`            VARCHAR(50)   NOT NULL UNIQUE,
    `description`     VARCHAR(255)  DEFAULT NULL,
    `discount_type`   ENUM('percentage','flat') NOT NULL,
    `discount_value`  DECIMAL(10,2) NOT NULL,
    `min_spend`       DECIMAL(10,2) NOT NULL DEFAULT 0,
    `max_discount`    DECIMAL(10,2) DEFAULT NULL,
    `usage_limit`     INT           DEFAULT NULL,
    `used_count`      INT           NOT NULL DEFAULT 0,
    `per_user_limit`  INT           NOT NULL DEFAULT 1,
    `category_id`     INT UNSIGNED  DEFAULT NULL,
    `expires_at`      TIMESTAMP     NULL DEFAULT NULL,
    `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    INDEX `idx_coupon_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS `coupon_uses` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `coupon_id`  INT UNSIGNED NOT NULL,
    `user_id`    INT UNSIGNED NOT NULL,
    `order_id`   INT UNSIGNED DEFAULT NULL,
    `used_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `orders` (
    `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_number`     VARCHAR(30)   NOT NULL UNIQUE,
    `customer_id`      INT UNSIGNED  NOT NULL,
    `coupon_id`        INT UNSIGNED  DEFAULT NULL,
    -- Shipping
    `shipping_name`    VARCHAR(191)  NOT NULL,
    `shipping_phone`   VARCHAR(20)   NOT NULL,
    `shipping_division` VARCHAR(50)  NOT NULL,
    `shipping_district` VARCHAR(50)  NOT NULL,
    `shipping_upazila`  VARCHAR(50)  DEFAULT NULL,
    `shipping_area`     VARCHAR(100) DEFAULT NULL,
    `shipping_street`   TEXT         NOT NULL,
    `shipping_landmark` VARCHAR(191) DEFAULT NULL,
    -- Financials
    `subtotal`         DECIMAL(10,2) NOT NULL,
    `discount_amount`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `shipping_fee`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `total_amount`     DECIMAL(10,2) NOT NULL,
    -- Payment
    `payment_method`   ENUM('bkash','nagad','cod','card') NOT NULL DEFAULT 'cod',
    `payment_status`   ENUM('pending','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
    -- Order Status
    `status`           ENUM('placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned') NOT NULL DEFAULT 'placed',
    `cancelled_at`     TIMESTAMP     NULL DEFAULT NULL,
    `delivered_at`     TIMESTAMP     NULL DEFAULT NULL,
    `notes`            TEXT          DEFAULT NULL,
    `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)    ON DELETE RESTRICT,
    FOREIGN KEY (`coupon_id`)   REFERENCES `coupons`(`id`)  ON DELETE SET NULL,
    INDEX `idx_order_number`    (`order_number`),
    INDEX `idx_order_customer`  (`customer_id`),
    INDEX `idx_order_status`    (`status`),
    INDEX `idx_order_payment`   (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sub-Orders (per-seller split)
CREATE TABLE IF NOT EXISTS `sub_orders` (
    `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id`          INT UNSIGNED  NOT NULL,
    `seller_id`         INT UNSIGNED  NOT NULL,
    `status`            ENUM('pending','confirmed','packed','handed_to_courier','in_transit','out_for_delivery','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
    -- Courier
    `courier_name`      VARCHAR(50)   DEFAULT NULL,
    `tracking_number`   VARCHAR(100)  DEFAULT NULL,
    `consignment_id`    VARCHAR(100)  DEFAULT NULL,
    `courier_fee`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    -- Financials
    `subtotal`          DECIMAL(10,2) NOT NULL,
    `commission_rate`   DECIMAL(5,2)  NOT NULL DEFAULT 7.00,
    `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `seller_earnings`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `packed_at`         TIMESTAMP     NULL DEFAULT NULL,
    `shipped_at`        TIMESTAMP     NULL DEFAULT NULL,
    `delivered_at`      TIMESTAMP     NULL DEFAULT NULL,
    `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`)  REFERENCES `orders`(`id`)  ON DELETE RESTRICT,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_suborder_order`   (`order_id`),
    INDEX `idx_suborder_seller`  (`seller_id`),
    INDEX `idx_suborder_status`  (`status`),
    INDEX `idx_suborder_tracking`(`tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order Items
CREATE TABLE IF NOT EXISTS `order_items` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id`       INT UNSIGNED  NOT NULL,
    `sub_order_id`   INT UNSIGNED  NOT NULL,
    `product_id`     INT UNSIGNED  NOT NULL,
    `product_name`   VARCHAR(500)  NOT NULL,
    `product_image`  VARCHAR(500)  DEFAULT NULL,
    `quantity`       INT           NOT NULL,
    `unit_price`     DECIMAL(10,2) NOT NULL,
    `subtotal`       DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`order_id`)     REFERENCES `orders`(`id`)     ON DELETE RESTRICT,
    FOREIGN KEY (`sub_order_id`) REFERENCES `sub_orders`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`product_id`)   REFERENCES `products`(`id`)   ON DELETE RESTRICT,
    INDEX `idx_oi_order`   (`order_id`),
    INDEX `idx_oi_suborder`(`sub_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `payment_transactions` (
    `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id`              INT UNSIGNED  NOT NULL,
    `gateway`               ENUM('bkash','nagad','cod','sslcommerz') NOT NULL,
    `gateway_transaction_id` VARCHAR(100) DEFAULT NULL UNIQUE,
    `amount`                DECIMAL(10,2) NOT NULL,
    `currency`              VARCHAR(3)    NOT NULL DEFAULT 'BDT',
    `status`                ENUM('initiated','pending','completed','failed','refunded') NOT NULL DEFAULT 'initiated',
    `gateway_response`      JSON          DEFAULT NULL,
    `verified_at`           TIMESTAMP     NULL DEFAULT NULL,
    `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
    INDEX `idx_payment_order`    (`order_id`),
    INDEX `idx_payment_gateway`  (`gateway`),
    INDEX `idx_payment_gtxn`     (`gateway_transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SELLER EARNINGS & PAYOUTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `seller_earnings` (
    `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `seller_id`         INT UNSIGNED  NOT NULL,
    `sub_order_id`      INT UNSIGNED  NOT NULL UNIQUE,
    `gross_amount`      DECIMAL(10,2) NOT NULL,
    `commission_rate`   DECIMAL(5,2)  NOT NULL,
    `commission_amount` DECIMAL(10,2) NOT NULL,
    `courier_fee`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `net_earnings`      DECIMAL(10,2) NOT NULL,
    `status`            ENUM('held','available','withdrawn','refunded_reversed') NOT NULL DEFAULT 'held',
    `hold_until`        TIMESTAMP     NULL DEFAULT NULL,
    `released_at`       TIMESTAMP     NULL DEFAULT NULL,
    `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`)    REFERENCES `sellers`(`id`)    ON DELETE RESTRICT,
    FOREIGN KEY (`sub_order_id`) REFERENCES `sub_orders`(`id`) ON DELETE RESTRICT,
    INDEX `idx_earning_seller` (`seller_id`),
    INDEX `idx_earning_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `seller_payouts` (
    `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `seller_id`       INT UNSIGNED  NOT NULL,
    `amount`          DECIMAL(10,2) NOT NULL,
    `payout_method`   ENUM('bank','bkash','nagad') NOT NULL,
    `account_details` JSON          NOT NULL,
    `transaction_ref` VARCHAR(100)  DEFAULT NULL,
    `status`          ENUM('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
    `admin_notes`     TEXT          DEFAULT NULL,
    `processed_at`    TIMESTAMP     NULL DEFAULT NULL,
    `processed_by`    INT UNSIGNED  DEFAULT NULL,
    `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`)   REFERENCES `sellers`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`)  ON DELETE SET NULL,
    INDEX `idx_payout_seller` (`seller_id`),
    INDEX `idx_payout_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. CART & WISHLIST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `cart_items` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT UNSIGNED  NOT NULL,
    `product_id` INT UNSIGNED  NOT NULL,
    `quantity`   INT           NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_cart` (`user_id`, `product_id`),
    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wishlists` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT UNSIGNED  NOT NULL,
    `product_id` INT UNSIGNED  NOT NULL,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_wish` (`user_id`, `product_id`),
    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `product_reviews` (
    `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `product_id`       INT UNSIGNED  NOT NULL,
    `customer_id`      INT UNSIGNED  NOT NULL,
    `order_item_id`    INT UNSIGNED  DEFAULT NULL,
    `rating`           TINYINT       NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
    `title`            VARCHAR(191)  DEFAULT NULL,
    `body`             TEXT          NOT NULL,
    `verified_purchase` TINYINT(1)  NOT NULL DEFAULT 0,
    `is_approved`      TINYINT(1)   NOT NULL DEFAULT 1,
    `helpful_count`    INT           NOT NULL DEFAULT 0,
    `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`)   REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`)  REFERENCES `users`(`id`)    ON DELETE RESTRICT,
    INDEX `idx_review_product` (`product_id`),
    INDEX `idx_review_rating`  (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `review_helpful_votes` (
    `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `review_id` INT UNSIGNED NOT NULL,
    `user_id`   INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_vote` (`review_id`, `user_id`),
    FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `notifications` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT UNSIGNED  NOT NULL,
    `type`        VARCHAR(50)   NOT NULL,
    `title`       VARCHAR(191)  NOT NULL,
    `body`        TEXT          NOT NULL,
    `link`        VARCHAR(500)  DEFAULT NULL,
    `data`        JSON          DEFAULT NULL,
    `is_read`     TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_notif_user`   (`user_id`),
    INDEX `idx_notif_unread` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_status_history` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id`     INT UNSIGNED NOT NULL,
    `sub_order_id` INT UNSIGNED DEFAULT NULL,
    `changed_by`   INT UNSIGNED DEFAULT NULL,
    `status`       VARCHAR(50) NOT NULL,
    `note`         VARCHAR(500) DEFAULT NULL,
    `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sub_order_id`) REFERENCES `sub_orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_order_history_order` (`order_id`, `created_at`),
    INDEX `idx_order_history_sub_order` (`sub_order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. AUDIT LOGS (Immutable)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `admin_id`      INT UNSIGNED  NOT NULL,
    `action`        VARCHAR(100)  NOT NULL,
    `resource_type` VARCHAR(50)   NOT NULL,
    `resource_id`   VARCHAR(50)   NOT NULL,
    `metadata`      JSON          DEFAULT NULL,
    `ip_address`    VARCHAR(45)   DEFAULT NULL,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_audit_admin`    (`admin_id`),
    INDEX `idx_audit_action`   (`action`),
    INDEX `idx_audit_resource` (`resource_type`, `resource_id`),
    INDEX `idx_audit_created`  (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prevent UPDATE/DELETE on audit_logs via application-level enforcement
-- (MySQL doesn't have RULE, so enforce in PHP middleware)

SET foreign_key_checks = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default Super Admin + Sample Categories
-- ─────────────────────────────────────────────────────────────────────────────

-- Default super admin (password: Admin@123)
INSERT IGNORE INTO `users` (`email`, `phone`, `password_hash`, `full_name`, `role`) VALUES
('admin@arozao.com', '+8801700000000',
 '$2y$12$oWNGYOvF3SX0rfRFNvV5.exdmI/3xJZm6gRjPVRvX00vF5PLCFiV6',
 'Super Admin', 'super_admin');

-- Root categories with commission rates
INSERT IGNORE INTO `categories` (`name`, `slug`, `commission_rate`, `sort_order`) VALUES
('Smart Gadgets & Electronics', 'electronics', 5.00, 1),
('Fashion & Apparel', 'fashion', 10.00, 2),
('Home & Kitchen', 'home-kitchen', 8.00, 3),
('Health & Beauty', 'health-beauty', 8.00, 4),
('Sports & Fitness', 'sports-fitness', 7.00, 5),
('Books & Education', 'books-education', 5.00, 6),
('Baby & Kids', 'baby-kids', 7.00, 7),
('Groceries & Food', 'groceries-food', 5.00, 8),
('Automotive', 'automotive', 6.00, 9),
('Office Supplies', 'office-supplies', 7.00, 10),
('Jewellery & Accessories', 'jewellery-accessories', 10.00, 11),
('Toys & Games', 'toys-games', 7.00, 12);

-- Default coupon
INSERT IGNORE INTO `coupons` (`code`, `description`, `discount_type`, `discount_value`, `min_spend`, `usage_limit`) VALUES
('WELCOME', '10% off your first order', 'percentage', 10.00, 500.00, 1000),
('SAVE100', 'Flat ৳100 off on orders above ৳1000', 'flat', 100.00, 1000.00, 500);
