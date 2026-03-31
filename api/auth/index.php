<?php
/**
 * Authentication API Endpoints
 * POST /api/auth/?action=register - Register new user
 * POST /api/auth/?action=login - Login user
 * GET /api/auth/?action=me - Get current user info
 */

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/referral.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    
    case 'login':
        handleLogin();
        break;
    
    case 'me':
        handleGetCurrentUser();
        break;
    
    default:
        errorResponse('Invalid action', 400);
}

/**
 * Handle user registration
 */
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse('Method not allowed', 405);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['username', 'email', 'password'];
    $errors = validateRequired($data, $required);
    
    if (!empty($errors)) {
        errorResponse('Validation failed', 400, $errors);
    }
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email format', 400);
    }
    
    // Validate password strength
    if (strlen($data['password']) < 6) {
        errorResponse('Password must be at least 6 characters', 400);
    }
    
    // Validate username
    if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $data['username'])) {
        errorResponse('Username must be 3-30 characters and contain only letters, numbers, and underscores', 400);
    }
    
    $db = getDB();
    
    // Check if username exists
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$data['username']]);
    if ($stmt->fetch()) {
        errorResponse('Username already taken', 400);
    }
    
    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 400);
    }
    
    // Hash password
    $passwordHash = Auth::hashPassword($data['password']);
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Insert user
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES (?, ?, ?, ?)
        ");
        $displayName = $data['display_name'] ?? $data['username'];
        $stmt->execute([$data['username'], $data['email'], $passwordHash, $displayName]);
        $userId = $db->lastInsertId();
        
        // Handle referral code if provided
        $referralCode = $data['referral_code'] ?? null;
        if ($referralCode) {
            $referral = new Referral();
            $referrerId = $referral->getUserIdByCode($referralCode);
            
            if ($referrerId && $referrerId != $userId) {
                $referral->trackSignup($referrerId, $userId, $referralCode);
            }
        }
        
        // Generate referral code for new user
        $referral = new Referral();
        $referral->generateCode($userId);
        
        // Initialize credits
        $signupBonus = defined('REFERRAL_SIGNUP_BONUS') ? floor(REFERRAL_SIGNUP_BONUS / 2) : 25;
        if ($referralCode) {
            $stmt = $db->prepare("INSERT INTO user_credits (user_id, credits, lifetime_credits) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $signupBonus, $signupBonus]);
        } else {
            $stmt = $db->prepare("INSERT INTO user_credits (user_id, credits, lifetime_credits) VALUES (?, 0, 0)");
            $stmt->execute([$userId]);
        }
        
        $db->commit();
        
        // Get the generated referral code
        $userReferralCode = $referral->getCodeByUserId($userId);
        
        // Generate JWT token
        $token = Auth::generateToken($userId, $data['email']);
        
        successResponse([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'username' => $data['username'],
                'email' => $data['email'],
                'display_name' => $displayName,
                'referral_code' => $userReferralCode
            ]
        ], 'Registration successful', 201);
        
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Registration failed. Please try again.', 500);
    }
}

/**
 * Handle user login
 */
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse('Method not allowed', 405);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['email', 'password'];
    $errors = validateRequired($data, $required);
    
    if (!empty($errors)) {
        errorResponse('Validation failed', 400, $errors);
    }
    
    $db = getDB();
    
    // Find user by email
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND status = 'active'");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        errorResponse('Invalid email or password', 401);
    }
    
    // Verify password
    if (!Auth::verifyPassword($data['password'], $user['password_hash'])) {
        errorResponse('Invalid email or password', 401);
    }
    
    // Update last login
    $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    // Generate JWT token
    $token = Auth::generateToken($user['id'], $user['email']);
    
    successResponse([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'display_name' => $user['display_name'],
            'avatar_url' => $user['avatar_url'],
            'created_at' => $user['created_at']
        ]
    ], 'Login successful');
}

/**
 * Get current authenticated user
 */
function handleGetCurrentUser() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed', 405);
    }
    
    $user = Auth::requireAuth();
    
    $db = getDB();
    
    // Get full user data
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user['user_id']]);
    $userData = $stmt->fetch();
    
    if (!$userData) {
        unauthorizedResponse('User not found');
    }
    
    // Get referral code
    $referral = new Referral();
    $referralCode = $referral->getCodeByUserId($user['user_id']);
    
    // Get credits
    $credits = $referral->getCredits($user['user_id']);
    
    // Get referral stats
    $refStats = $referral->getStats($user['user_id']);
    
    // Remove sensitive data
    unset($userData['password_hash']);
    
    $userData['referral_code'] = $referralCode;
    $userData['credits'] = $credits['credits'];
    $userData['lifetime_credits'] = $credits['lifetime_credits'];
    $userData['premium_features'] = json_decode($credits['premium_features'], true) ?: [];
    $userData['referral_stats'] = $refStats;
    
    successResponse([
        'user' => $userData
    ]);
}
