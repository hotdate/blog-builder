/**
 * Simple Client-Side Router
 * Handles navigation between views
 */

const Router = {
    routes: {},
    currentRoute: null,
    
    // Define routes
    addRoute(path, handler) {
        this.routes[path] = handler;
    },
    
    // Navigate to a route
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute(path);
    },
    
    // Handle route change
    handleRoute(path) {
        this.currentRoute = path;
        
        // Check if we have a specific handler
        if (this.routes[path]) {
            this.routes[path]();
        } else {
            // Default: render view based on path
            this.renderView(path);
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    },
    
    // Render view based on path
    renderView(path) {
        const mainContent = document.getElementById('main-content');
        
        // Remove active class from bottom nav items
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        switch (path) {
            case '/':
                this.renderHome();
                this.setBottomNavActive(0);
                break;
            
            case '/login':
                this.renderTemplate('login-view');
                break;
            
            case '/register':
                this.renderTemplate('register-view');
                break;
            
            case '/dashboard':
                this.renderDashboard();
                this.setBottomNavActive(3);
                break;
            
            case '/explore':
                this.renderExplore();
                this.setBottomNavActive(1);
                break;
            
            case '/create':
                this.renderCreate();
                break;
            
            default:
                // Check for blog post slug
                if (path.startsWith('/blog/')) {
                    this.renderBlogPost(path.replace('/blog/', ''));
                } else {
                    this.render404();
                }
        }
    },
    
    // Render home view
    renderHome() {
        const template = document.getElementById('home-view');
        const mainContent = document.getElementById('main-content');
        
        if (template && mainContent) {
            mainContent.innerHTML = template.innerHTML;
            this.loadTrendingPosts();
        }
    },
    
    // Render template by ID
    renderTemplate(templateId) {
        const template = document.getElementById(templateId);
        const mainContent = document.getElementById('main-content');
        
        if (template && mainContent) {
            mainContent.innerHTML = template.innerHTML;
            
            // Re-setup event listeners for new content
            setTimeout(() => {
                const loginForm = document.getElementById('login-form');
                if (loginForm) {
                    loginForm.addEventListener('submit', handleLogin);
                }
                
                const registerForm = document.getElementById('register-form');
                if (registerForm) {
                    registerForm.addEventListener('submit', handleRegister);
                }
                
                document.querySelectorAll('[data-view]').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const view = e.currentTarget.getAttribute('data-view');
                        this.navigate('/' + view);
                    });
                });
            }, 100);
        }
    },
    
    // Render dashboard
    renderDashboard() {
        const template = document.getElementById('dashboard-view');
        const mainContent = document.getElementById('main-content');
        
        if (template && mainContent) {
            mainContent.innerHTML = template.innerHTML;
            
            // Setup dashboard
            setTimeout(() => {
                // Load user data
                if (AppState.user) {
                    updateUserDisplay();
                    
                    // Setup referral code copy
                    const copyBtn = document.getElementById('copy-code');
                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            const code = AppState.user.referral_code;
                            if (code) {
                                copyToClipboard(code);
                            }
                        });
                    }
                    
                    // Setup share buttons
                    document.querySelectorAll('.btn-share').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const platform = btn.getAttribute('data-platform');
                            const text = 'Join me on BlogBuilder! Use my referral code: ' + AppState.user.referral_code;
                            const url = window.location.origin + '/?ref=' + AppState.user.referral_code;
                            shareVia(platform, text, url);
                        });
                    });
                    
                    // Load referral data
                    loadReferralData();
                }
                
                // Dashboard section navigation
                document.querySelectorAll('.dash-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const section = e.currentTarget.getAttribute('data-section');
                        switchDashboardSection(section);
                    });
                });
                
                // Create post button
                const createBtn = document.getElementById('create-post-btn');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        this.navigate('/create');
                    });
                }
            }, 100);
        }
    },
    
    // Render explore page
    renderExplore() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="view explore-view">
                    <div class="explore-header">
                        <h1>Explore Blogs</h1>
                        <input type="search" placeholder="Search blogs..." class="search-input">
                    </div>
                    <div id="explore-posts" class="posts-grid"></div>
                </div>
            `;
            this.loadExplorePosts();
        }
    },
    
    // Render create post page
    renderCreate() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="view create-view">
                    <h1>Create New Post</h1>
                    <form id="create-post-form" class="post-form">
                        <div class="form-group">
                            <label for="post-title">Title</label>
                            <input type="text" id="post-title" required placeholder="Enter post title">
                        </div>
                        <div class="form-group">
                            <label for="post-excerpt">Excerpt</label>
                            <textarea id="post-excerpt" rows="3" placeholder="Brief description..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="post-content">Content</label>
                            <textarea id="post-content" rows="15" required placeholder="Write your story..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Publish</button>
                            <button type="button" class="btn btn-secondary">Save Draft</button>
                        </div>
                    </form>
                </div>
            `;
        }
    },
    
    // Render 404
    render404() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="view error-view">
                    <h1>404</h1>
                    <p>Page not found</p>
                    <a href="/" class="btn btn-primary">Go Home</a>
                </div>
            `;
        }
    },
    
    // Set bottom nav active item
    setBottomNavActive(index) {
        const items = document.querySelectorAll('.bottom-nav-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    },
    
    // Load trending posts (placeholder)
    async loadTrendingPosts() {
        const container = document.getElementById('trending-posts');
        if (container) {
            container.innerHTML = '<p>Loading posts...</p>';
            // TODO: Fetch from API
            setTimeout(() => {
                container.innerHTML = '<p class="text-center text-secondary">No posts yet. Be the first to write!</p>';
            }, 500);
        }
    },
    
    // Load explore posts (placeholder)
    async loadExplorePosts() {
        const container = document.getElementById('explore-posts');
        if (container) {
            container.innerHTML = '<p>Loading posts...</p>';
            // TODO: Fetch from API
        }
    }
};

// Handle browser back/forward
window.addEventListener('popstate', () => {
    Router.handleRoute(window.location.pathname);
});

// Initialize router on load
document.addEventListener('DOMContentLoaded', () => {
    Router.handleRoute(window.location.pathname);
});
