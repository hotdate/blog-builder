/**
 * BlogBuilder PWA - Main Application
 * Handles initialization, UI updates, and common utilities
 */

// API Base URL - Update for production
const API_URL = window.location.origin + '/api';

// State management
const AppState = {
    user: null,
    token: null,
    referralCode: null,
    deferredPrompt: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check for existing session
    const savedToken = localStorage.getItem('blogbuilder_token');
    if (savedToken) {
        AppState.token = savedToken;
        await loadCurrentUser();
    }
    
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
        AppState.referralCode = refCode;
        document.getElementById('register-referral').value = refCode;
    }
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        updateUI();
    }, 500);
    
    // Setup event listeners
    setupEventListeners();
    
    // Register service worker
    registerServiceWorker();
    
    // Handle PWA install prompt
    setupInstallPrompt();
}

// Load current user from API
async function loadCurrentUser() {
    try {
        const response = await fetch(API_URL + '/auth/?action=me', {
            headers: {
                'Authorization': 'Bearer ' + AppState.token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            AppState.user = data.data.user;
            localStorage.setItem('blogbuilder_user', JSON.stringify(AppState.user));
        } else {
            logout();
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        logout();
    }
}

// Update UI based on auth state
function updateUI() {
    const isLoggedIn = !!AppState.user;
    
    // Navigation links
    toggleElement('nav-login', !isLoggedIn);
    toggleElement('nav-register', !isLoggedIn);
    toggleElement('nav-dashboard', isLoggedIn);
    toggleElement('nav-logout', isLoggedIn);
    toggleElement('nav-create', isLoggedIn);
    
    // Bottom nav
    toggleElement('bottom-profile', isLoggedIn);
    toggleElement('bottom-create', isLoggedIn);
    
    // Footer
    const footer = document.getElementById('footer');
    if (footer) {
        footer.classList.toggle('hidden', isLoggedIn);
    }
    
    // Update user info in dashboard if visible
    if (isLoggedIn && AppState.user) {
        updateUserDisplay();
    }
}

// Toggle element visibility
function toggleElement(id, show) {
    const elements = document.querySelectorAll('[id="' + id + '"]');
    elements.forEach(el => {
        el.classList.toggle('hidden', !show);
    });
}

// Update user display in dashboard
function updateUserDisplay() {
    const user = AppState.user;
    
    const avatar = document.getElementById('user-avatar');
    if (avatar && user.avatar_url) {
        avatar.src = user.avatar_url;
    }
    
    const displayName = document.getElementById('user-display-name');
    if (displayName) {
        displayName.textContent = user.display_name || user.username;
    }
    
    const username = document.getElementById('user-username');
    if (username) {
        username.textContent = '@' + user.username;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Navigation clicks
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = e.currentTarget.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                handleNavClick(e.currentTarget);
            }
        });
    });
    
    // Auth form submissions
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // View switches in auth pages
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('data-view');
            navigateTo('/' + view);
        });
    });
    
    // Hero action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = e.currentTarget.getAttribute('data-action');
            navigateTo('/' + action);
        });
    });
    
    // Dashboard section navigation
    document.querySelectorAll('.dash-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.currentTarget.getAttribute('data-section');
            switchDashboardSection(section);
        });
    });
}

// Handle navigation clicks
function handleNavClick(element) {
    const id = element.id;
    
    switch (id) {
        case 'nav-login':
        case 'bottom-login':
            navigateTo('/login');
            break;
        case 'nav-register':
            navigateTo('/register');
            break;
        case 'nav-dashboard':
        case 'bottom-profile':
            navigateTo('/dashboard');
            break;
        case 'nav-logout':
            logout();
            break;
        case 'nav-create':
        case 'bottom-create':
            navigateTo('/create');
            break;
    }
}

// Switch dashboard sections
function switchDashboardSection(section) {
    // Update active link
    document.querySelectorAll('.dash-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === section);
    });
    
    // Show/hide sections
    document.querySelectorAll('.dash-section').forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== 'dash-' + section);
    });
    
    // Load section data
    if (section === 'referrals') {
        loadReferralData();
    } else if (section === 'posts') {
        loadUserPosts();
    }
}

// Navigate to a route
function navigateTo(path) {
    if (window.Router && typeof Router.navigate === 'function') {
        Router.navigate(path);
    } else {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(API_URL + '/auth/?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AppState.token = data.data.token;
            AppState.user = data.data.user;
            
            localStorage.setItem('blogbuilder_token', AppState.token);
            localStorage.setItem('blogbuilder_user', JSON.stringify(AppState.user));
            
            showToast('Login successful!', 'success');
            updateUI();
            navigateTo('/dashboard');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
}

// Register handler
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const referralCode = document.getElementById('register-referral').value;
    
    try {
        const response = await fetch(API_URL + '/auth/?action=register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                referral_code: referralCode || AppState.referralCode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AppState.token = data.data.token;
            AppState.user = data.data.user;
            
            localStorage.setItem('blogbuilder_token', AppState.token);
            localStorage.setItem('blogbuilder_user', JSON.stringify(AppState.user));
            
            showToast('Account created successfully!', 'success');
            updateUI();
            navigateTo('/dashboard');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
}

// Logout
function logout() {
    AppState.user = null;
    AppState.token = null;
    AppState.referralCode = null;
    
    localStorage.removeItem('blogbuilder_token');
    localStorage.removeItem('blogbuilder_user');
    
    showToast('Logged out successfully', 'success');
    updateUI();
    navigateTo('/');
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed:', error);
            });
    }
}

// Setup PWA install prompt
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        AppState.deferredPrompt = e;
        
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.classList.remove('hidden');
        }
    });
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (AppState.deferredPrompt) {
                AppState.deferredPrompt.prompt();
                const { outcome } = await AppState.deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    showToast('Thanks for installing!', 'success');
                }
                
                AppState.deferredPrompt = null;
                document.getElementById('install-prompt').classList.add('hidden');
            }
        });
    }
    
    const dismissBtn = document.getElementById('dismiss-install');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        });
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    }
}

// Share via social media
function shareVia(platform, text, url) {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    
    let shareUrl = '';
    
    switch (platform) {
        case 'whatsapp':
            shareUrl = 'https://wa.me/?text=' + encodedText + '%20' + encodedUrl;
            break;
        case 'facebook':
            shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
            break;
        case 'twitter':
            shareUrl = 'https://twitter.com/intent/tweet?text=' + encodedText + '&url=' + encodedUrl;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format number with K/M suffixes
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
