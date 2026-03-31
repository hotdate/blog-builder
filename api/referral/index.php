<?php
/**
 * Referral API Endpoints
 * GET /api/referral/?action=my-code - Get user's referral code
 * GET /api/referral/?action=stats - Get referral statistics
 * GET /api/referral/?action=history - Get referral history
 * GET /api/referral/?action=leaderboard - Get top referrers
 * POST /api/referral/?action=use-credits - Spend credits on features
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

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'my-code':
        getMyReferralCode();
        break;
    
    case 'stats':
        getReferralStats();
        break;
    
    case 'history':
        getReferralHistory();
        break;
    
    case 'leaderboard':
        getLeaderboard();
        break;
    
    case 'use-credits':
        useCredits();
        break;
    
    default:
        errorResponse('Invalid action', 400);
}

/**
 * Get current user's referral code
 */
function getMyReferralCode() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed', 405);
    }
    
    $user = Auth::requireAuth();
    $referral = new Referral();
    
    $code = $referral->getCodeByUserId($user['user_id']);
    $stats = $referral->getStats($user['user_id']);
    
    successResponse([
        'code' => $code,
        'referral_link' => APP_URL . '/?ref=' . $code,
        'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode(APP_URL . '/?ref=' . $code),
        'stats' => $stats
    ]);
}

/**
 * Get referral statistics
 */
function getReferralStats() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed', 405);
    }
    
    $user = Auth::requireAuth();
    $referral = new Referral();
    
    $stats = $referral->getStats($user['user_id']);
    
    // Get reward tiers progress
    $tiers = [
        ['threshold' => 5, 'feature' => 'Custom Themes', 'unlocked' => false],
        ['threshold' => 10, 'feature' => 'Advanced Analytics', 'unlocked' => false],
        ['threshold' => 15, 'feature' => 'Custom Domain', 'unlocked' => false],
        ['threshold' => 20, 'feature' => 'Priority Support', 'unlocked' => false],
        ['threshold' => 25, 'feature' => 'Remove Branding', 'unlocked' => false]
    ];
    
    foreach ($tiers as &$tier) {
        $tier['unlocked'] = $stats['total_referrals'] >= $tier['threshold'];
        $tier['progress'] = min(100, floor(($stats['total_referrals'] / $tier['threshold']) * 100));
    }
    
    $stats['reward_tiers'] = $tiers;
    
    successResponse($stats);
}

/**
 * Get referral history
 */
function getReferralHistory() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed', 405);
    }
    
    $user = Auth::requireAuth();
    $referral = new Referral();
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    $history = $referral->getHistory($user['user_id'], $limit);
    
    successResponse([
        'history' => $history,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total' => count($history)
        ]
    ]);
}

/**
 * Get leaderboard
 */
function getLeaderboard() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed', 405);
    }
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $referral = new Referral();
    
    $leaderboard = $referral->getLeaderboard($limit);
    
    // Get current user's rank if authenticated
    $currentUserRank = null;
    if (Auth::check()) {
        $user = Auth::getCurrentUser();
        $db = getDB();
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) + 1 as rank
            FROM (
                SELECT u.id, COUNT(r.id) as referral_count
                FROM users u
                LEFT JOIN referrals r ON u.id = r.referrer_id
                GROUP BY u.id
                HAVING referral_count > ?
            ) as higher_users
        ");
        $stmt->execute([$user['user_id']]);
        $rankData = $stmt->fetch();
        $currentUserRank = $rankData ? $rankData['rank'] : null;
    }
    
    successResponse([
        'leaderboard' => $leaderboard,
        'current_user_rank' => $currentUserRank
    ]);
}

/**
 * Use credits to unlock features
 */
function useCredits() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse('Method not allowed', 405);
    }
    
    $user = Auth::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['feature']) || !isset($data['amount'])) {
        errorResponse('Feature and amount are required', 400);
    }
    
    $feature = sanitizeInput($data['feature']);
    $amount = (int)$data['amount'];
    
    if ($amount <= 0) {
        errorResponse('Amount must be positive', 400);
    }
    
    $referral = new Referral();
    
    // Define feature costs
    $featureCosts = [
        'custom_domain_slot' => 500,
        'premium_template' => 100,
        'analytics_boost' => 200
    ];
    
    if (!isset($featureCosts[$feature])) {
        errorResponse('Invalid feature', 400);
    }
    
    if ($amount !== $featureCosts[$feature]) {
        errorResponse('Invalid amount for this feature', 400);
    }
    
    if ($referral->useCredits($user['user_id'], $amount, $feature)) {
        successResponse([
            'feature' => $feature,
            'credits_used' => $amount,
            'remaining_credits' => $referral->getCredits($user['user_id'])['credits']
        ], 'Feature unlocked successfully');
    } else {
        errorResponse('Insufficient credits', 400);
    }
}
