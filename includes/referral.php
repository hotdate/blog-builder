<?php
/**
 * Referral System Class
 * Handles referral code generation, tracking, and rewards
 */

class Referral {
    private $db;
    
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Generate unique referral code for user
     */
    public function generateCode($userId) {
        // Check if user already has a code
        $stmt = $this->db->prepare("SELECT code FROM referral_codes WHERE user_id = ?");
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            return $existing['code'];
        }
        
        // Generate new unique code
        $code = REFERRAL_CODE_PREFIX . generateRandomString(10);
        
        // Ensure uniqueness
        while ($this->codeExists($code)) {
            $code = REFERRAL_CODE_PREFIX . generateRandomString(10);
        }
        
        // Insert into database
        $stmt = $this->db->prepare("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)");
        $stmt->execute([$userId, $code]);
        
        return $code;
    }
    
    /**
     * Check if referral code exists
     */
    private function codeExists($code) {
        $stmt = $this->db->prepare("SELECT id FROM referral_codes WHERE code = ?");
        $stmt->execute([$code]);
        return $stmt->fetch() !== false;
    }
    
    /**
     * Get referral code by user ID
     */
    public function getCodeByUserId($userId) {
        $stmt = $this->db->prepare("SELECT code FROM referral_codes WHERE user_id = ? AND status = 'active'");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        return $result ? $result['code'] : null;
    }
    
    /**
     * Get user ID by referral code
     */
    public function getUserIdByCode($code) {
        $stmt = $this->db->prepare("SELECT user_id FROM referral_codes WHERE code = ? AND status = 'active'");
        $stmt->execute([$code]);
        $result = $stmt->fetch();
        return $result ? $result['user_id'] : null;
    }
    
    /**
     * Track referral signup
     */
    public function trackSignup($referrerId, $referredUserId, $referralCode) {
        // Check if referral already exists
        $stmt = $this->db->prepare("SELECT id FROM referrals WHERE referred_user_id = ?");
        $stmt->execute([$referredUserId]);
        if ($stmt->fetch()) {
            return false; // Already tracked
        }
        
        // Start transaction
        $this->db->beginTransaction();
        
        try {
            // Insert referral record
            $stmt = $this->db->prepare("
                INSERT INTO referrals (referrer_id, referred_user_id, referral_code, credits_earned, status)
                VALUES (?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([$referrerId, $referredUserId, $referralCode, REFERRAL_SIGNUP_BONUS]);
            
            // Update referral code uses
            $stmt = $this->db->prepare("UPDATE referral_codes SET uses = uses + 1 WHERE code = ?");
            $stmt->execute([$referralCode]);
            
            // Award credits to referrer
            $this->addCredits($referrerId, REFERRAL_SIGNUP_BONUS, 'referral_signup');
            
            // Award bonus to referred user
            $this->addCredits($referredUserId, floor(REFERRAL_SIGNUP_BONUS / 2), 'referral_bonus');
            
            // Confirm referral
            $stmt = $this->db->prepare("UPDATE referrals SET status = 'confirmed', confirmed_at = NOW() WHERE referred_user_id = ?");
            $stmt->execute([$referredUserId]);
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }
    
    /**
     * Add credits to user
     */
    public function addCredits($userId, $amount, $reason = '') {
        // Check if user_credits record exists
        $stmt = $this->db->prepare("SELECT id FROM user_credits WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        if ($stmt->fetch()) {
            // Update existing
            $stmt = $this->db->prepare("
                UPDATE user_credits 
                SET credits = credits + ?, lifetime_credits = lifetime_credits + ?
                WHERE user_id = ?
            ");
            $stmt->execute([$amount, $amount, $userId]);
        } else {
            // Insert new
            $stmt = $this->db->prepare("
                INSERT INTO user_credits (user_id, credits, lifetime_credits)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$userId, $amount, $amount]);
        }
        
        // Check for reward tiers
        $this->checkRewardTiers($userId);
        
        return true;
    }
    
    /**
     * Deduct credits from user
     */
    public function deductCredits($userId, $amount) {
        $stmt = $this->db->prepare("
            UPDATE user_credits 
            SET credits = credits - ?
            WHERE user_id = ? AND credits >= ?
        ");
        $stmt->execute([$amount, $userId, $amount]);
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Get user credits
     */
    public function getCredits($userId) {
        $stmt = $this->db->prepare("SELECT credits, lifetime_credits, premium_features FROM user_credits WHERE user_id = ?");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        
        return $result ?: ['credits' => 0, 'lifetime_credits' => 0, 'premium_features' => []];
    }
    
    /**
     * Get referral stats for user
     */
    public function getStats($userId) {
        $stmt = $this->db->prepare("
            SELECT 
                COUNT(*) as total_referrals,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_referrals,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_referrals,
                SUM(credits_earned) as total_credits_earned
            FROM referrals
            WHERE referrer_id = ?
        ");
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();
        
        // Get user's credits
        $credits = $this->getCredits($userId);
        $stats['current_credits'] = $credits['credits'];
        $stats['lifetime_credits'] = $credits['lifetime_credits'];
        
        return $stats;
    }
    
    /**
     * Get referral history
     */
    public function getHistory($userId, $limit = 20) {
        $stmt = $this->db->prepare("
            SELECT 
                r.*,
                u.username as referred_username,
                u.email as referred_email,
                u.created_at as joined_date
            FROM referrals r
            JOIN users u ON r.referred_user_id = u.id
            WHERE r.referrer_id = ?
            ORDER BY r.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get leaderboard
     */
    public function getLeaderboard($limit = 10) {
        $stmt = $this->db->prepare("
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(r.id) as total_referrals,
                uc.lifetime_credits
            FROM users u
            LEFT JOIN referrals r ON u.id = r.referrer_id
            LEFT JOIN user_credits uc ON u.id = uc.user_id
            GROUP BY u.id
            HAVING total_referrals > 0
            ORDER BY total_referrals DESC, lifetime_credits DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
    
    /**
     * Check and award reward tiers
     */
    private function checkRewardTiers($userId) {
        $stats = $this->getStats($userId);
        $totalReferrals = $stats['total_referrals'];
        
        // Get current premium features
        $credits = $this->getCredits($userId);
        $features = json_decode($credits['premium_features'], true) ?: [];
        
        // Tier rewards
        $tiers = [
            5 => ['custom_themes', 'Custom Themes'],
            10 => ['advanced_analytics', 'Advanced Analytics'],
            15 => ['custom_domain', 'Custom Domain'],
            20 => ['priority_support', 'Priority Support'],
            25 => ['remove_branding', 'Remove Branding']
        ];
        
        $updated = false;
        foreach ($tiers as $threshold => $tier) {
            list($feature, $name) = $tier;
            if ($totalReferrals >= $threshold && !in_array($feature, $features)) {
                $features[] = $feature;
                $updated = true;
            }
        }
        
        if ($updated) {
            $stmt = $this->db->prepare("UPDATE user_credits SET premium_features = ? WHERE user_id = ?");
            $stmt->execute([json_encode($features), $userId]);
        }
    }
    
    /**
     * Use credits to unlock feature
     */
    public function useCredits($userId, $amount, $feature) {
        $credits = $this->getCredits($userId);
        
        if ($credits['credits'] < $amount) {
            return false;
        }
        
        $this->db->beginTransaction();
        
        try {
            // Deduct credits
            $this->deductCredits($userId, $amount);
            
            // Add feature
            $features = json_decode($credits['premium_features'], true) ?: [];
            if (!in_array($feature, $features)) {
                $features[] = $feature;
                $stmt = $this->db->prepare("UPDATE user_credits SET premium_features = ? WHERE user_id = ?");
                $stmt->execute([json_encode($features), $userId]);
            }
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }
}
