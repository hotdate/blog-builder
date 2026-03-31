/**
 * Referral System - Frontend Functions
 * Handles referral code display, stats, and sharing
 */

// Load referral data for dashboard
async function loadReferralData() {
    if (!AppState.user || !AppState.token) return;
    
    try {
        // Get referral code and stats
        const response = await fetch(API_URL + '/referral/?action=my-code', {
            headers: {
                'Authorization': 'Bearer ' + AppState.token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateReferralDisplay(data.data);
        }
        
        // Get detailed stats with tiers
        const statsResponse = await fetch(API_URL + '/referral/?action=stats', {
            headers: {
                'Authorization': 'Bearer ' + AppState.token,
                'Content-Type': 'application/json'
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateRewardTiers(statsData.reward_tiers);
        }
    } catch (error) {
        console.error('Failed to load referral data:', error);
    }
}

// Update referral display in dashboard
function updateReferralDisplay(data) {
    const codeEl = document.getElementById('referral-code');
    const linkEl = document.getElementById('referral-link');
    const statTotal = document.getElementById('stat-total');
    const statConfirmed = document.getElementById('stat-confirmed');
    const statCredits = document.getElementById('stat-credits');
    
    if (codeEl && data.code) {
        codeEl.textContent = data.code;
    }
    
    if (linkEl && data.referral_link) {
        linkEl.textContent = data.referral_link;
    }
    
    if (statTotal && data.stats) {
        statTotal.textContent = formatNumber(data.stats.total_referrals || 0);
    }
    
    if (statConfirmed && data.stats) {
        statConfirmed.textContent = formatNumber(data.stats.confirmed_referrals || 0);
    }
    
    if (statCredits && data.stats) {
        statCredits.textContent = formatNumber(data.stats.current_credits || 0);
    }
}

// Update reward tiers display
function updateRewardTiers(tiers) {
    const container = document.getElementById('tiers-container');
    if (!container || !tiers) return;
    
    container.innerHTML = tiers.map(tier => `
        <div class="tier-item ${tier.unlocked ? 'unlocked' : ''}">
            <div class="tier-header">
                <span class="tier-name">${tier.feature}</span>
                <span class="tier-threshold">${tier.threshold} referrals</span>
            </div>
            <div class="tier-progress">
                <div class="progress-bar" style="width: ${tier.progress}%"></div>
            </div>
            <span class="tier-status">${tier.unlocked ? '✓ Unlocked' : tier.progress + '% progress'}</span>
        </div>
    `).join('');
}

// Copy referral code
function copyReferralCode() {
    if (AppState.user && AppState.user.referral_code) {
        copyToClipboard(AppState.user.referral_code);
    }
}

// Share referral link
function shareReferralLink(platform) {
    if (!AppState.user || !AppState.user.referral_code) return;
    
    const text = 'Join me on BlogBuilder! Use my referral code and get bonus credits.';
    const url = window.location.origin + '/?ref=' + AppState.user.referral_code;
    
    shareVia(platform, text, url);
}

// Load leaderboard
async function loadLeaderboard(limit = 10) {
    try {
        const response = await fetch(API_URL + '/referral/?action=leaderboard&limit=' + limit);
        
        if (response.ok) {
            const data = await response.json();
            return data.data;
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
    return null;
}

// Display leaderboard in UI
function renderLeaderboard(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !data || !data.leaderboard) return;
    
    container.innerHTML = `
        <div class="leaderboard">
            ${data.leaderboard.map((user, index) => `
                <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <span class="rank">#${index + 1}</span>
                    <img src="${user.avatar_url || 'assets/images/default-avatar.png'}" 
                         alt="${user.username}" class="avatar">
                    <span class="username">${user.display_name || user.username}</span>
                    <span class="count">${user.total_referrals} referrals</span>
                </div>
            `).join('')}
        </div>
        ${data.current_user_rank ? `
            <p class="your-rank">Your rank: #${data.current_user_rank}</p>
        ` : ''}
    `;
}

// Track referral click (for analytics)
function trackReferralClick(refCode) {
    // Send analytics event
    if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('ref_code', refCode);
        data.append('timestamp', Date.now());
        
        navigator.sendBeacon(API_URL + '/referral/track-click', data);
    }
}

// Auto-detect and apply referral from URL
function applyReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        // Store in session for later use
        sessionStorage.setItem('pending_referral', refCode);
        
        // Pre-fill in registration form if present
        const refInput = document.getElementById('register-referral');
        if (refInput) {
            refInput.value = refCode;
        }
        
        // Show notification
        showToast('Referral code applied! You\'ll get bonus credits when you sign up.', 'success');
    }
}

// Initialize referral system
document.addEventListener('DOMContentLoaded', () => {
    applyReferralFromURL();
});
