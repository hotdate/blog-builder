<?php
/**
 * Authentication Middleware
 * Verify JWT tokens and protect API endpoints
 */

class Auth {
    private static $currentUser = null;
    
    /**
     * Generate JWT token
     */
    public static function generateToken($userId, $email) {
        $header = base64_encode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT'
        ]));
        
        $payload = base64_encode(json_encode([
            'user_id' => $userId,
            'email' => $email,
            'iat' => time(),
            'exp' => time() + JWT_EXPIRY
        ]));
        
        $signature = hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true);
        $signature = base64_encode($signature);
        
        return $header . '.' . $payload . '.' . $signature;
    }
    
    /**
     * Verify JWT token
     */
    public static function verifyToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Decode header and payload
        $headerData = json_decode(base64_decode($header), true);
        $payloadData = json_decode(base64_decode($payload), true);
        
        if (!$headerData || !$payloadData) {
            return false;
        }
        
        // Check expiration
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return false;
        }
        
        // Verify signature
        $expectedSignature = base64_encode(
            hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true)
        );
        
        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }
        
        return $payloadData;
    }
    
    /**
     * Get token from request
     */
    public static function getTokenFromRequest() {
        // Check Authorization header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                return $matches[1];
            }
        }
        
        // Check POST data
        if (isset($_POST['token'])) {
            return $_POST['token'];
        }
        
        // Check GET data
        if (isset($_GET['token'])) {
            return $_GET['token'];
        }
        
        return null;
    }
    
    /**
     * Require authentication for API endpoint
     */
    public static function requireAuth() {
        $token = self::getTokenFromRequest();
        
        if (!$token) {
            unauthorizedResponse('Authentication required');
        }
        
        $payload = self::verifyToken($token);
        
        if (!$payload) {
            unauthorizedResponse('Invalid or expired token');
        }
        
        self::$currentUser = $payload;
        return $payload;
    }
    
    /**
     * Get current authenticated user
     */
    public static function getCurrentUser() {
        if (self::$currentUser === null) {
            self::requireAuth();
        }
        return self::$currentUser;
    }
    
    /**
     * Check if user is authenticated (optional auth)
     */
    public static function check() {
        $token = self::getTokenFromRequest();
        
        if (!$token) {
            return false;
        }
        
        $payload = self::verifyToken($token);
        
        if (!$payload) {
            return false;
        }
        
        self::$currentUser = $payload;
        return true;
    }
    
    /**
     * Hash password
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    /**
     * Verify password
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
}

/**
 * Get all headers (fallback for PHP < 5.4)
 */
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
