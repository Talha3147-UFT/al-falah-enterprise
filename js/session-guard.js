/* =============================================
   Al-Falah Enterprise - Session Guard
   Secure Session Management
   ============================================= */

(function() {
    'use strict';
    
    // ============ CONFIGURATION ============
    const CONFIG = {
        SESSION_KEY: 'alfalah_user',
        SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
        LOGIN_PAGE: 'login.html',
        DASHBOARD_PAGE: 'dashboard.html',
        PUBLIC_PAGES: ['index.html', 'login.html', 'setup.html', ''],
    };
    
    // ============ GET CURRENT PAGE ============
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return page;
    }
    
    // ============ GET SESSION DATA ============
    function getSession() {
        // Check localStorage first, then sessionStorage
        const stored = localStorage.getItem(CONFIG.SESSION_KEY) || 
                       sessionStorage.getItem(CONFIG.SESSION_KEY);
        
        if (!stored) return null;
        
        try {
            const data = JSON.parse(stored);
            
            // Check if session has expired
            if (data.loginTime) {
                const elapsed = Date.now() - data.loginTime;
                if (elapsed > CONFIG.SESSION_DURATION) {
                    // Session expired - clear it
                    clearSession();
                    return null;
                }
            }
            
            return data;
        } catch (e) {
            console.error('Invalid session data');
            clearSession();
            return null;
        }
    }
    
    // ============ SAVE SESSION ============
    function saveSession(userData, rememberMe) {
        const data = {
            ...userData,
            loginTime: Date.now(),
            lastActive: Date.now()
        };
        
        if (rememberMe) {
            localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
        } else {
            sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
        }
    }
    
    // ============ UPDATE LAST ACTIVE ============
    function updateLastActive() {
        const stored = localStorage.getItem(CONFIG.SESSION_KEY) || 
                       sessionStorage.getItem(CONFIG.SESSION_KEY);
        
        if (stored) {
            try {
                const data = JSON.parse(stored);
                data.lastActive = Date.now();
                
                if (localStorage.getItem(CONFIG.SESSION_KEY)) {
                    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
                } else {
                    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
                }
            } catch (e) {}
        }
    }
    
    // ============ CLEAR SESSION ============
    function clearSession() {
        localStorage.removeItem(CONFIG.SESSION_KEY);
        sessionStorage.removeItem(CONFIG.SESSION_KEY);
    }
    
    // ============ IS LOGGED IN ============
    function isLoggedIn() {
        const session = getSession();
        return session !== null;
    }
    
    // ============ REDIRECT ============
    function redirectTo(page) {
        window.location.href = page;
    }
    
    // ============ MAIN SESSION GUARD ============
    function sessionGuard() {
        const currentPage = getCurrentPage();
        const loggedIn = isLoggedIn();
        
        console.log('🛡️ Session Guard:', {
            page: currentPage,
            loggedIn: loggedIn,
            isPublic: CONFIG.PUBLIC_PAGES.includes(currentPage)
        });
        
        // CASE 1: User is logged in and tries to access login page
        // → Redirect to dashboard
        if (loggedIn && currentPage === CONFIG.LOGIN_PAGE) {
            console.log('🔄 Already logged in → Redirecting to Dashboard');
            redirectTo(CONFIG.DASHBOARD_PAGE);
            return;
        }
        
        // CASE 2: User is logged in and tries to access index page
        // → Redirect to dashboard
        if (loggedIn && currentPage === 'index.html') {
            console.log('🔄 Already logged in → Redirecting to Dashboard');
            redirectTo(CONFIG.DASHBOARD_PAGE);
            return;
        }
        
        // CASE 3: User is NOT logged in and tries to access protected page
        // → Redirect to login
        if (!loggedIn && !CONFIG.PUBLIC_PAGES.includes(currentPage)) {
            console.log('🔒 Not logged in → Redirecting to Login');
            // Save intended page for redirect after login
            sessionStorage.setItem('alfalah_redirect', currentPage);
            redirectTo(CONFIG.LOGIN_PAGE);
            return;
        }
        
        // CASE 4: Everything is fine
        console.log('✅ Session OK');
    }
    
    // ============ ACTIVITY TRACKER ============
    function setupActivityTracker() {
        // Update last active on user activity
        const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, updateLastActive, { passive: true });
        });
    }
    
    // ============ LOGOUT HANDLER ============
    window.secureLogout = function() {
        clearSession();
        // Also sign out from Firebase if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(() => {});
        }
        redirectTo(CONFIG.LOGIN_PAGE);
    };
    
    // ============ EXPORT TO WINDOW ============
    window.sessionGuard = {
        getSession,
        saveSession,
        clearSession,
        isLoggedIn,
        redirectTo,
        secureLogout: window.secureLogout
    };
    
    // ============ RUN GUARD ON PAGE LOAD ============
    sessionGuard();
    
    // ============ SETUP ACTIVITY TRACKER ============
    setupActivityTracker();
    
    console.log('🛡️ Session Guard Active');
    
})();