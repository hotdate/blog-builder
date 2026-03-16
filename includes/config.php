<?php
/**
 * Database Configuration
 * Update these settings for your shared hosting environment
 */

// Database credentials - UPDATE THESE FOR YOUR HOSTING
define('DB_HOST', 'localhost');
define('DB_NAME', 'blog_builder');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Application settings
define('APP_NAME', 'BlogBuilder');
define('APP_URL', 'http://localhost'); // Change to your domain
define('APP_ENV', 'development'); // development or production

// Security
define('JWT_SECRET', 'your-secret-key-change-this-in-production-' . bin2hex(random_bytes(32)));
define('JWT_EXPIRY', 3600 * 24 * 7); // 7 days

// Referral settings
define('REFERRAL_SIGNUP_BONUS', 50);
define('REFERRAL_PUBLISH_BONUS', 25);
define('REFERRAL_CODE_PREFIX', 'ref_');

// Upload settings
define('UPLOAD_DIR', __DIR__ . '/../public/images/uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Pagination
define('POSTS_PER_PAGE', 10);
define('COMMENTS_PER_PAGE', 20);

// Error reporting
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('Africa/Douala'); // Cameroon timezone, adjust as needed

// Session settings
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.gc_maxlifetime', JWT_EXPIRY);
