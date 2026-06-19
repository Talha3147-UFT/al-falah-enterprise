/* =============================================
   Al-Falah Enterprise - Complete App.js v7.0
   All Features Working - Email + Google Login
   ============================================= */

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, signOut, updatePassword, updateEmail, 
    updateProfile, EmailAuthProvider, reauthenticateWithCredential, 
    onAuthStateChanged, GoogleAuthProvider, signInWithPopup 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
    setDoc, getDoc, query, where 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ╔══════════════════════════════════════════════════════════════╗
// ║                    GLOBAL HELPERS                           ║
// ╚══════════════════════════════════════════════════════════════╝

function FC(a) { 
    return '৳' + parseFloat(a || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 }); 
}

function TD() { 
    return new Date().toISOString().split('T')[0]; 
}

function CP() { 
    var p = window.location.pathname; 
    return p.substring(p.lastIndexOf('/') + 1) || 'index.html'; 
}

function UID() {
    // Check localStorage first
    var s = localStorage.getItem('alfalah_user');
    if (!s) s = sessionStorage.getItem('alfalah_user');
    if (s) {
        try { 
            var data = JSON.parse(s);
            if (data.loginTime && (Date.now() - data.loginTime) < 86400000) {
                return data.uid; 
            }
        } catch(e) { 
            // Invalid session, clear it
            localStorage.removeItem('alfalah_user');
            sessionStorage.removeItem('alfalah_user');
        }
    }
    // Check Firebase Auth
    if (auth.currentUser && auth.currentUser.uid) {
        return auth.currentUser.uid;
    }
    return null;
}

function saveSession(userData, remember) {
    userData.loginTime = Date.now();
    if (remember) {
        localStorage.setItem('alfalah_user', JSON.stringify(userData));
    } else {
        sessionStorage.setItem('alfalah_user', JSON.stringify(userData));
    }
}

function clearSession() {
    localStorage.removeItem('alfalah_user');
    sessionStorage.removeItem('alfalah_user');
}

var page = CP();
console.log('📄 Page:', page);
console.log('👤 User ID:', UID());

// ╔══════════════════════════════════════════════════════════════╗
// ║                    SESSION MANAGEMENT                       ║
// ╚══════════════════════════════════════════════════════════════╝

var publicPages = ['index.html', 'login.html', 'setup.html', 'firebase-test.html', ''];

// If already logged in and on login page → go to dashboard
if (page === 'login.html') {
    var uid = UID();
    if (uid) {
        console.log('🔄 Already logged in, redirecting to dashboard');
        window.location.href = 'dashboard.html';
    }
}

// If not logged in and on protected page → go to login
if (!publicPages.includes(page)) {
    var uid = UID();
    if (!uid) {
        console.log('🔒 Not logged in, redirecting to login');
        window.location.href = 'login.html';
    }
}

// Firebase Auth State Listener
onAuthStateChanged(auth, function(user) {
    if (user) {
        console.log('✅ Firebase Auth:', user.email);
        // Sync with localStorage if needed
        var stored = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user');
        if (!stored) {
            saveSession({
                uid: user.uid,
                email: user.email,
                username: user.displayName || user.email.split('@')[0],
                role: 'user',
                provider: user.providerData[0]?.providerId || 'email'
            });
        }
    }
});

// ╔══════════════════════════════════════════════════════════════╗
// ║                    GLOBAL FUNCTIONS                         ║
// ╚══════════════════════════════════════════════════════════════╝

// ============ PRINT ============
window.printTable = function(tableId, title, date) {
    var table = document.getElementById(tableId);
    if (!table) { 
        Swal.fire({ icon: 'error', title: 'Error', text: 'Table not found!' }); 
        return; 
    }
    var w = window.open('', '_blank', 'width=1000,height=700');
    var clone = table.cloneNode(true);
    clone.querySelectorAll('button, i, input[type="checkbox"], .no-print').forEach(function(el) { 
        el.remove(); 
    });
    var html = '<!DOCTYPE html><html><head><title>' + title + '</title>';
    html += '<meta charset="UTF-8">';
    html += '<style>';
    html += 'body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a}';
    html += 'table{width:100%;border-collapse:collapse;margin-top:20px}';
    html += 'th{background:#059669;color:white;padding:10px;text-align:left;font-size:12px}';
    html += 'td{padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px}';
    html += 'h2{color:#059669;margin-bottom:5px}';
    html += 'h3{margin-bottom:15px;color:#333}';
    html += '.footer{margin-top:30px;font-size:11px;color:#999;text-align:center}';
    html += '@media print{body{padding:15px}}';
    html += '</style></head><body>';
    html += '<h2>🏢 Al-Falah Enterprise</h2>';
    html += '<h3>' + title + '</h3>';
    html += '<p style="font-size:13px;color:#666">📅 Date: ' + (date || TD()) + '</p>';
    html += clone.outerHTML;
    html += '<div class="footer"><p>© ' + new Date().getFullYear() + ' Al-Falah Enterprise | Business Management System</p><p>This is a computer-generated report.</p></div>';
    html += '<script>setTimeout(function(){window.print()},500)</script>';
    html += '</body></html>';
    w.document.write(html);
    w.document.close();
    console.log('🖨️ Printed:', title);
};

// ============ CSV EXPORT ============
window.exportCSV = function(tableId, filename) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var rows = table.querySelectorAll('tr');
    var csv = [];
    rows.forEach(function(row) {
        var cols = row.querySelectorAll('th, td');
        var rowData = [];
        for (var i = 1; i < cols.length - 1; i++) {
            if (cols[i]) {
                var text = cols[i].textContent.trim().replace(/"/g, '""').replace(/,/g, ' ');
                rowData.push('"' + text + '"');
            }
        }
        if (rowData.length > 0) csv.push(rowData.join(','));
    });
    var blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (filename || 'export') + '_' + TD() + '.csv';
    link.click();
    Swal.fire({ icon: 'success', title: '✅ Exported!', text: 'CSV file downloaded.', timer: 1500, showConfirmButton: false });
    console.log('📥 CSV Exported:', filename);
};

// ============ LOGOUT ============
window.logout = async function() {
    var result = await Swal.fire({
        title: 'Logout?',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout!'
    });
    
    if (result.isConfirmed) {
        clearSession();
        try { await signOut(auth); } catch(e) {}
        console.log('👋 Logged out');
        window.location.href = 'login.html';
    }
};

// ============ DELETE ITEM ============
window.deleteItem = async function(collectionName, id) {
    var result = await Swal.fire({
        title: 'Delete?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete!'
    });
    
    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, collectionName, id));
            Swal.fire({ icon: 'success', title: '✅ Deleted!', timer: 1000, showConfirmButton: false });
            console.log('🗑️ Deleted:', collectionName, id);
            setTimeout(function() { location.reload(); }, 500);
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
            console.error('Delete error:', e);
        }
    }
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                    PAGE: LOGIN                              ║
// ╚══════════════════════════════════════════════════════════════╝

if (page === 'login.html') {
    console.log('🔐 Login Page Loaded');

    // ============ TOGGLE PASSWORD ============
    var toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            var inp = document.getElementById('password');
            if (inp) {
                inp.type = inp.type === 'password' ? 'text' : 'password';
                var icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                }
            }
        });
    }

    // ============ GOOGLE SIGN-IN ============
    var googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async function() {
            console.log('🔵 Google Sign-In clicked');
            var provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            
            Swal.fire({
                title: 'Google Sign-In',
                html: '<p>Opening Google login popup...</p>',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: function() { Swal.showLoading(); }
            });
            
            try {
                var result = await signInWithPopup(auth, provider);
                var user = result.user;
                console.log('✅ Google Sign-In success:', user.email);
                
                // Save/update user in Firestore
                var userRef = doc(db, 'users', user.uid);
                var userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        username: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        role: 'user',
                        authProvider: 'google',
                        photoURL: user.photoURL || '',
                        lastLogin: new Date().toISOString(),
                        loginCount: 1,
                        createdAt: new Date().toISOString()
                    });
                    console.log('📝 New user created in Firestore');
                } else {
                    await setDoc(userRef, {
                        lastLogin: new Date().toISOString(),
                        loginCount: (userSnap.data().loginCount || 0) + 1,
                        photoURL: user.photoURL || ''
                    }, { merge: true });
                    console.log('📝 User updated in Firestore');
                }
                
                saveSession({
                    uid: user.uid,
                    email: user.email,
                    username: user.displayName || user.email.split('@')[0],
                    role: userSnap.exists() ? (userSnap.data().role || 'user') : 'user',
                    photoURL: user.photoURL || '',
                    provider: 'google'
                }, true);
                
                Swal.close();
                await Swal.fire({
                    icon: 'success',
                    title: '✅ Welcome!',
                    text: 'Signed in with Google successfully!',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                window.location.href = 'dashboard.html';
                
            } catch(error) {
                console.error('Google error:', error);
                Swal.close();
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Google Sign-In Failed',
                        text: error.message || 'Please try again.',
                        confirmButtonColor: '#059669'
                    });
                }
            }
        });
    }

    // ============ EMAIL LOGIN (FIXED) ============
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            var usernameInput = document.getElementById('username');
            var passwordInput = document.getElementById('password');
            var rememberCheck = document.getElementById('rememberMe');
            
            if (!usernameInput || !passwordInput) {
                console.error('❌ Login inputs not found!');
                return;
            }
            
            var username = usernameInput.value.trim();
            var password = passwordInput.value;
            var remember = rememberCheck ? rememberCheck.checked : false;
            
            console.log('🔑 Login attempt:', username);
            
            // Validate
            if (!username) {
                Swal.fire({ icon: 'warning', title: 'Error', text: 'Please enter username or email!' });
                return;
            }
            if (!password) {
                Swal.fire({ icon: 'warning', title: 'Error', text: 'Please enter password!' });
                return;
            }
            
            Swal.fire({
                title: '🔐 Logging in...',
                text: 'Please wait while we authenticate you',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: function() { Swal.showLoading(); }
            });
            
            try {
                var email = username;
                
                // Convert username to email if needed
                if (!username.includes('@')) {
                    console.log('📝 Username detected, converting to email...');
                    
                    if (username === 'Al-Falah Admin123') {
                        email = 'alfalahenterprise203@gmail.com';
                        console.log('✅ Default admin email used');
                    } else {
                        // Search Firestore for username
                        try {
                            var usersSnap = await getDocs(query(collection(db, 'users'), where('username', '==', username)));
                            if (!usersSnap.empty) {
                                email = usersSnap.docs[0].data().email;
                                console.log('✅ Found email by username:', email);
                            } else {
                                throw new Error('Username not found! Use: Al-Falah Admin123');
                            }
                        } catch(searchError) {
                            console.error('Username search error:', searchError);
                            throw new Error('Username not found! Use your email address instead.');
                        }
                    }
                }
                
                console.log('📧 Attempting login with email:', email);
                
                // Firebase Auth - Sign In
                var userCredential = await signInWithEmailAndPassword(auth, email, password);
                var user = userCredential.user;
                
                console.log('✅ Firebase Auth success:', user.uid);
                
                // Check/create Firestore document
                var userRef = doc(db, 'users', user.uid);
                var userSnap = await getDoc(userRef);
                
                var userData = {};
                
                if (!userSnap.exists()) {
                    // Create user document
                    userData = {
                        username: username.includes('@') ? email.split('@')[0] : username,
                        email: email,
                        role: 'admin',
                        authProvider: 'email',
                        lastLogin: new Date().toISOString(),
                        loginCount: 1,
                        createdAt: new Date().toISOString()
                    };
                    await setDoc(userRef, userData);
                    console.log('📝 User document created');
                } else {
                    // Update existing user
                    userData = userSnap.data();
                    await setDoc(userRef, {
                        lastLogin: new Date().toISOString(),
                        loginCount: (userData.loginCount || 0) + 1
                    }, { merge: true });
                    console.log('📝 User document updated');
                }
                
                // Save session
                saveSession({
                    uid: user.uid,
                    email: user.email,
                    username: userData.username || username,
                    role: userData.role || 'admin',
                    provider: 'email'
                }, remember);
                
                console.log('💾 Session saved');
                
                Swal.close();
                await Swal.fire({
                    icon: 'success',
                    title: '✅ Welcome ' + (userData.username || username) + '!',
                    text: 'Login successful! Redirecting...',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
                
            } catch(error) {
                console.error('❌ Login error:', error);
                Swal.close();
                
                var message = 'Login failed! Please try again.';
                
                if (error.code === 'auth/user-not-found') {
                    message = '❌ No account found with this email! Please sign up first or contact admin.';
                } else if (error.code === 'auth/wrong-password') {
                    message = '❌ Incorrect password! Please try again.';
                } else if (error.code === 'auth/invalid-email') {
                    message = '❌ Invalid email format!';
                } else if (error.code === 'auth/invalid-credential') {
                    message = '❌ Invalid email or password! Please check your credentials.';
                } else if (error.code === 'auth/too-many-requests') {
                    message = '⚠️ Too many failed attempts! Please wait a moment and try again.';
                } else if (error.code === 'auth/network-request-failed') {
                    message = '🌐 Network error! Please check your internet connection.';
                } else if (error.message) {
                    message = '❌ ' + error.message;
                }
                
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: message,
                    confirmButtonColor: '#059669',
                    confirmButtonText: 'Try Again'
                });
            }
        });
    }
    
    console.log('🔐 Login Page Ready');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                    PAGE: DASHBOARD                          ║
// ╚══════════════════════════════════════════════════════════════╝

if (page === 'dashboard.html') {
    console.log('📊 Dashboard Loaded');
    
    var userData = {};
    var stored = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user');
    if (stored) {
        try { userData = JSON.parse(stored); } catch(e) {}
    }
    
    var welcomeEl = document.getElementById('welcomeMessage');
    var dateEl = document.getElementById('currentDate');
    
    if (welcomeEl) {
        welcomeEl.textContent = 'Welcome back, ' + (userData.username || 'Admin') + '!';
    }
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    async function loadDashboard() {
        var uid = UID();
        if (!uid) return;
        
        var today = TD();
        console.log('📊 Loading dashboard for:', today);
        
        try {
            var salesSnap = await getDocs(query(collection(db, 'sales'), where('userId', '==', uid)));
            var expenseSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', uid)));
            
            var totalSales = 0, totalCost = 0;
            salesSnap.forEach(function(d) {
                if (d.data().date === today) {
                    totalSales += (d.data().totalRevenue || d.data().sellingPrice || 0);
                    totalCost += (d.data().totalCost || ((d.data().purchasePricePerUnit || 0) * (d.data().quantitySold || 0)));
                }
            });
            
            var totalExpenses = 0;
            expenseSnap.forEach(function(d) {
                if (d.data().date === today) totalExpenses += (d.data().cost || 0);
            });
            
            document.getElementById('todaySales').textContent = FC(totalSales);
            document.getElementById('todayPurchases').textContent = FC(totalCost);
            document.getElementById('todayExpenses').textContent = FC(totalExpenses);
            document.getElementById('netBalance').textContent = FC(totalSales - totalCost - totalExpenses);
            
            // Recent activity
            var recent = [];
            salesSnap.forEach(function(d) {
                if (d.data().date === today) recent.push(d);
            });
            recent.sort(function(a, b) {
                return new Date(b.data().createdAt || 0) - new Date(a.data().createdAt || 0);
            });
            recent = recent.slice(0, 5);
            
            var ad = document.getElementById('recentActivity');
            if (ad) {
                if (recent.length === 0) {
                    ad.innerHTML = '<div class="text-center py-4 text-gray-500"><i class="fas fa-inbox text-3xl mb-2 block"></i><p>No sales recorded today</p></div>';
                } else {
                    ad.innerHTML = recent.map(function(d) {
                        var dt = d.data();
                        return '<div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2 hover:bg-emerald-50 transition-all">' +
                            '<div><p class="font-semibold text-sm">' + dt.productName + '</p>' +
                            '<p class="text-xs text-gray-500">Qty: ' + dt.quantitySold + ' | To: ' + (dt.customerName || 'Walk-in') + '</p></div>' +
                            '<span class="text-emerald-600 font-semibold text-sm">' + FC(dt.totalRevenue || 0) + '</span></div>';
                    }).join('');
                }
            }
            
            console.log('📊 Dashboard updated');
        } catch(e) {
            console.error('Dashboard error:', e);
        }
    }
    
    loadDashboard();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                    PAGE: PURCHASES                          ║
// ╚══════════════════════════════════════════════════════════════╝

if (page === 'purchases.html') {
    console.log('🛒 Purchases Loaded');
    
    document.getElementById('purchaseDate').value = TD();
    
    var qtyInput = document.getElementById('quantity');
    var stockInput = document.getElementById('stockRemaining');
    if (qtyInput && stockInput) {
        qtyInput.addEventListener('input', function() {
            stockInput.value = this.value;
        });
    }
    
    async function loadPurchases() {
        var uid = UID();
        if (!uid) return;
        
        try {
            var snap = await getDocs(query(collection(db, 'purchases'), where('userId', '==', uid)));
            var tbody = document.getElementById('purchasesTableBody');
            tbody.innerHTML = '';
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-12 text-gray-500"><i class="fas fa-shopping-cart text-4xl mb-2 block"></i>No purchases found</td></tr>';
                return;
            }
            
            var docs = [];
            snap.forEach(function(d) { docs.push(d); });
            docs.sort(function(a, b) { return new Date(b.data().createdAt || 0) - new Date(a.data().createdAt || 0); });
            
            docs.forEach(function(d) {
                var dt = d.data();
                var row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50 transition-all';
                row.innerHTML = 
                    '<td class="p-3"><input type="checkbox" class="purchase-checkbox" value="' + d.id + '"></td>' +
                    '<td class="p-3 text-sm">' + (dt.foundationName || '-') + '</td>' +
                    '<td class="p-3 text-sm font-medium">' + (dt.productName || '-') + '</td>' +
                    '<td class="p-3 text-sm">' + (dt.date || '-') + '</td>' +
                    '<td class="p-3 text-sm text-right">' + FC(dt.price) + '</td>' +
                    '<td class="p-3 text-sm text-center">' + (dt.quantity || 0) + '</td>' +
                    '<td class="p-3 text-sm text-center"><span class="badge ' + (dt.stockRemaining > 10 ? 'badge-success' : dt.stockRemaining > 0 ? 'badge-warning' : 'badge-danger') + '">' + (dt.stockRemaining || 0) + '</span></td>' +
                    '<td class="p-3 text-center no-print">' +
                    '<button class="text-blue-600 hover:text-blue-800 mr-2" onclick="editPurchase(\'' + d.id + '\')" title="Edit"><i class="fas fa-edit"></i></button>' +
                    '<button class="text-red-600 hover:text-red-800" onclick="deleteItem(\'purchases\',\'' + d.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
                    '</td>';
                tbody.appendChild(row);
            });
        } catch(e) {
            console.error('Load purchases error:', e);
        }
    }
    
    var purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var uid = UID();
            if (!uid) { Swal.fire({ icon: 'error', title: 'Error', text: 'Please login again!' }); return; }
            
            try {
                var pid = document.getElementById('purchaseId').value;
                var data = {
                    foundationName: document.getElementById('foundationName').value.trim(),
                    productName: document.getElementById('productName').value.trim(),
                    date: document.getElementById('purchaseDate').value,
                    price: parseFloat(document.getElementById('price').value) || 0,
                    quantity: parseInt(document.getElementById('quantity').value) || 0,
                    stockRemaining: parseInt(document.getElementById('stockRemaining').value) || parseInt(document.getElementById('quantity').value) || 0,
                    userId: uid,
                    createdAt: new Date().toISOString()
                };
                
                if (pid) {
                    await updateDoc(doc(db, 'purchases', pid), data);
                    Swal.fire({ icon: 'success', title: '✅ Updated!', timer: 1500, showConfirmButton: false });
                } else {
                    await addDoc(collection(db, 'purchases'), data);
                    Swal.fire({ icon: 'success', title: '✅ Added!', timer: 1500, showConfirmButton: false });
                }
                
                purchaseForm.reset();
                document.getElementById('purchaseDate').value = TD();
                document.getElementById('purchaseModal').classList.remove('active');
                loadPurchases();
            } catch(e) {
                Swal.fire({ icon: 'error', title: 'Error', text: e.message });
            }
        });
    }
    
    window.openAddModal = function() {
        document.getElementById('modalTitle').textContent = 'Add New Purchase';
        document.getElementById('purchaseForm').reset();
        document.getElementById('purchaseId').value = '';
        document.getElementById('purchaseDate').value = TD();
        document.getElementById('purchaseModal').classList.add('active');
    };
    
    window.closeModal = function() {
        document.getElementById('purchaseModal').classList.remove('active');
    };
    
    window.editPurchase = async function(id) {
        try {
            var snap = await getDoc(doc(db, 'purchases', id));
            if (snap.exists()) {
                var d = snap.data();
                document.getElementById('modalTitle').textContent = 'Edit Purchase';
                document.getElementById('purchaseId').value = id;
                document.getElementById('foundationName').value = d.foundationName || '';
                document.getElementById('productName').value = d.productName || '';
                document.getElementById('purchaseDate').value = d.date || '';
                document.getElementById('price').value = d.price || 0;
                document.getElementById('quantity').value = d.quantity || 0;
                document.getElementById('stockRemaining').value = d.stockRemaining || 0;
                document.getElementById('purchaseModal').classList.add('active');
            }
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    };
    
    window.printPurchases = function() { printTable('purchasesTable', 'Purchase Report', TD()); };
    window.exportPurchasesCSV = function() { exportCSV('purchasesTable', 'purchases'); };
    
    loadPurchases();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                    PAGE: SALES                              ║
// ╚══════════════════════════════════════════════════════════════╝

if (page === 'sales.html') {
    console.log('💰 Sales Loaded');
    
    async function loadProducts() {
        var uid = UID();
        if (!uid) return;
        
        var sel = document.getElementById('productSelect');
        sel.innerHTML = '<option value="">Loading products...</option>';
        
        try {
            var snap = await getDocs(query(collection(db, 'purchases'), where('userId', '==', uid)));
            sel.innerHTML = '<option value="">-- Choose a product --</option>';
            
            var count = 0;
            snap.forEach(function(d) {
                var dt = d.data();
                if (dt.stockRemaining > 0) {
                    var opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = dt.productName + ' | Stock: ' + dt.stockRemaining + ' | Buy: ৳' + dt.price;
                    opt.dataset.stock = dt.stockRemaining;
                    opt.dataset.price = dt.price;
                    opt.dataset.name = dt.productName;
                    opt.dataset.foundation = dt.foundationName || '';
                    sel.appendChild(opt);
                    count++;
                }
            });
            
            if (count === 0) {
                sel.innerHTML += '<option value="" disabled>No products in stock</option>';
            }
            console.log('📦 Products loaded:', count);
        } catch(e) {
            sel.innerHTML = '<option value="">Error loading products</option>';
        }
    }
    
    window.onProductSelect = function() {
        var sel = document.getElementById('productSelect');
        var details = document.getElementById('productDetails');
        
        if (!sel.value) {
            details.classList.add('hidden');
            return;
        }
        
        var opt = sel.options[sel.selectedIndex];
        document.getElementById('stockAvailable').textContent = opt.dataset.stock;
        document.getElementById('purchasePrice').textContent = FC(parseFloat(opt.dataset.price));
        document.getElementById('sellQuantity').max = opt.dataset.stock;
        document.getElementById('sellQuantity').value = '';
        document.getElementById('sellingPrice').value = '';
        document.getElementById('maxQuantity').textContent = 'Maximum: ' + opt.dataset.stock + ' units';
        details.classList.remove('hidden');
        document.getElementById('profitLossDisplay').classList.add('hidden');
    };
    
    function calcPL() {
        var sel = document.getElementById('productSelect');
        if (!sel || !sel.value) return;
        
        var opt = sel.options[sel.selectedIndex];
        var bp = parseFloat(opt.dataset.price) || 0;
        var qty = parseInt(document.getElementById('sellQuantity').value) || 0;
        var sp = parseFloat(document.getElementById('sellingPrice').value) || 0;
        
        var disp = document.getElementById('profitLossDisplay');
        if (qty <= 0 || sp <= 0) {
            disp.classList.add('hidden');
            return;
        }
        
        var cost = bp * qty;
        var revenue = sp * qty;
        var pl = revenue - cost;
        
        disp.classList.remove('hidden');
        
        if (pl >= 0) {
            disp.className = 'bg-green-50 p-4 rounded-lg border-2 border-green-300';
            disp.innerHTML = '<div class="space-y-1 text-sm"><div class="flex justify-between"><span>Buy: ' + FC(bp) + ' × ' + qty + '</span><span>= ' + FC(cost) + '</span></div><div class="flex justify-between"><span>Sell: ' + FC(sp) + ' × ' + qty + '</span><span>= ' + FC(revenue) + '</span></div><hr><div class="flex justify-between items-center"><span class="font-bold text-green-700">📈 PROFIT</span><span class="text-xl font-bold text-green-600">' + FC(pl) + '</span></div></div>';
        } else {
            disp.className = 'bg-red-50 p-4 rounded-lg border-2 border-red-300';
            disp.innerHTML = '<div class="space-y-1 text-sm"><div class="flex justify-between"><span>Buy: ' + FC(bp) + ' × ' + qty + '</span><span>= ' + FC(cost) + '</span></div><div class="flex justify-between"><span>Sell: ' + FC(sp) + ' × ' + qty + '</span><span>= ' + FC(revenue) + '</span></div><hr><div class="flex justify-between items-center"><span class="font-bold text-red-700">📉 LOSS</span><span class="text-xl font-bold text-red-600">' + FC(Math.abs(pl)) + '</span></div></div>';
        }
    }
    
    document.getElementById('sellQuantity')?.addEventListener('input', calcPL);
    document.getElementById('sellQuantity')?.addEventListener('change', calcPL);
    document.getElementById('sellingPrice')?.addEventListener('input', calcPL);
    document.getElementById('sellingPrice')?.addEventListener('change', calcPL);
    
    document.getElementById('salesForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        var uid = UID();
        if (!uid) { Swal.fire({ icon: 'error', title: 'Error', text: 'Please login again!' }); return; }
        
        var sel = document.getElementById('productSelect');
        if (!sel.value) { Swal.fire({ icon: 'warning', title: 'Error', text: 'Please select a product!' }); return; }
        
        var opt = sel.options[sel.selectedIndex];
        var pname = opt.dataset.name;
        var bp = parseFloat(opt.dataset.price);
        var stock = parseInt(opt.dataset.stock);
        var qty = parseInt(document.getElementById('sellQuantity').value) || 0;
        var sp = parseFloat(document.getElementById('sellingPrice').value) || 0;
        var cname = document.getElementById('customerName')?.value?.trim() || 'Walk-in Customer';
        
        if (qty <= 0) { Swal.fire({ icon: 'warning', title: 'Error', text: 'Please enter quantity!' }); return; }
        if (sp <= 0) { Swal.fire({ icon: 'warning', title: 'Error', text: 'Please enter selling price!' }); return; }
        if (qty > stock) { Swal.fire({ icon: 'error', title: 'Error', text: 'Not enough stock! Available: ' + stock }); return; }
        
        var cost = bp * qty;
        var revenue = sp * qty;
        var pl = revenue - cost;
        
        try {
            await addDoc(collection(db, 'sales'), {
                purchaseId: sel.value,
                productName: pname,
                foundationName: opt.dataset.foundation || '',
                customerName: cname,
                purchasePricePerUnit: bp,
                sellPricePerUnit: sp,
                quantitySold: qty,
                totalCost: cost,
                totalRevenue: revenue,
                profitLoss: pl,
                date: TD(),
                userId: uid,
                createdAt: new Date().toISOString()
            });
            
            await updateDoc(doc(db, 'purchases', sel.value), { stockRemaining: stock - qty });
            
            if (pl !== 0) {
                await addDoc(collection(db, 'profitLossEntries'), {
                    type: pl > 0 ? 'profit' : 'loss',
                    productName: pname,
                    customerName: cname,
                    amount: Math.abs(pl),
                    source: 'auto',
                    date: TD(),
                    userId: uid,
                    createdAt: new Date().toISOString()
                });
            }
            
            Swal.fire({
                icon: 'success',
                title: '✅ Sale Recorded!',
                html: '<p><b>Customer:</b> ' + cname + '</p><p><b>Product:</b> ' + pname + '</p><p>Qty: ' + qty + ' | Revenue: ' + FC(revenue) + '</p><p class="font-bold ' + (pl >= 0 ? 'text-green-600' : 'text-red-600') + '">' + (pl >= 0 ? 'Profit' : 'Loss') + ': ' + FC(Math.abs(pl)) + '</p>',
                confirmButtonColor: '#059669'
            });
            
            document.getElementById('salesForm').reset();
            document.getElementById('productDetails').classList.add('hidden');
            document.getElementById('profitLossDisplay').classList.add('hidden');
            if (document.getElementById('customerName')) document.getElementById('customerName').value = '';
            
            loadProducts();
            loadSalesHistory();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    });
    
    async function loadSalesHistory() {
        var uid = UID();
        if (!uid) return;
        
        var fd = document.getElementById('filterDate')?.value || TD();
        var tbody = document.getElementById('salesTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading sales...</td></tr>';
        
        try {
            var snap = await getDocs(query(collection(db, 'sales'), where('userId', '==', uid)));
            var docs = [];
            snap.forEach(function(d) { if (d.data().date === fd) docs.push(d); });
            docs.sort(function(a, b) { return new Date(b.data().createdAt || 0) - new Date(a.data().createdAt || 0); });
            
            tbody.innerHTML = '';
            
            if (docs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">No sales for ' + fd + '</td></tr>';
                return;
            }
            
            docs.forEach(function(d) {
                var dt = d.data();
                var isProfit = (dt.profitLoss || 0) >= 0;
                var row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50 transition-all';
                row.innerHTML = 
                    '<td class="p-3 text-sm">' + (dt.date || '-') + '</td>' +
                    '<td class="p-3 text-sm font-medium">' + (dt.customerName || '-') + '</td>' +
                    '<td class="p-3 text-sm">' + (dt.productName || '-') + '</td>' +
                    '<td class="p-3 text-center">' + (dt.quantitySold || 0) + '</td>' +
                    '<td class="p-3 text-right text-sm">' + FC(dt.sellPricePerUnit || 0) + '</td>' +
                    '<td class="p-3 text-right text-sm font-semibold">' + FC(dt.totalRevenue || 0) + '</td>' +
                    '<td class="p-3 text-right font-bold ' + (isProfit ? 'text-green-600' : 'text-red-600') + '">' + (isProfit ? '📈' : '📉') + ' ' + FC(Math.abs(dt.profitLoss || 0)) + '</td>' +
                    '<td class="p-3 text-center no-print"><button class="text-red-600 hover:text-red-800" onclick="deleteItem(\'sales\',\'' + d.id + '\')"><i class="fas fa-trash"></i></button></td>';
                tbody.appendChild(row);
            });
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Error loading sales</td></tr>';
        }
    }
    
    window.loadSalesHistory = loadSalesHistory;
    window.printSales = function() { printTable('salesTable', 'Sales Report', document.getElementById('filterDate')?.value || TD()); };
    window.exportSalesCSV = function() { exportCSV('salesTable', 'sales'); };
    
    document.getElementById('filterDate').value = TD();
    loadProducts();
    loadSalesHistory();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 PAGES: EXPENSES, COLLECTIONS, BALANCE       ║
// ╚══════════════════════════════════════════════════════════════╝

// Expenses
if (page === 'expenses.html') {
    document.getElementById('expenseDate').value = TD();
    
    async function loadExpenses() {
        var uid = UID(); if (!uid) return;
        var snap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', uid)));
        var tbody = document.getElementById('expensesTableBody'); tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-gray-500">No expenses found</td></tr>'; return; }
        var docs = []; snap.forEach(function(d) { docs.push(d); });
        docs.sort(function(a, b) { return new Date(b.data().createdAt || 0) - new Date(a.data().createdAt || 0); });
        docs.forEach(function(d) {
            var dt = d.data();
            var row = document.createElement('tr'); row.className = 'border-b hover:bg-gray-50';
            row.innerHTML = '<td class="p-3"><input type="checkbox" value="' + d.id + '"></td><td class="p-3 text-sm">' + (dt.reason || '-') + '</td><td class="p-3 text-sm text-right font-semibold text-red-600">' + FC(dt.cost) + '</td><td class="p-3 text-sm">' + (dt.date || '-') + '</td><td class="p-3 text-center no-print"><button class="text-blue-600 mr-2" onclick="editExpense(\'' + d.id + '\')"><i class="fas fa-edit"></i></button><button class="text-red-600" onclick="deleteItem(\'expenses\',\'' + d.id + '\')"><i class="fas fa-trash"></i></button></td>';
            tbody.appendChild(row);
        });
    }
    
    document.getElementById('expenseForm')?.addEventListener('submit', async function(e) {
        e.preventDefault(); var uid = UID();
        var eid = document.getElementById('expenseId').value;
        var data = { reason: document.getElementById('expenseReason').value.trim(), cost: parseFloat(document.getElementById('expenseCost').value) || 0, date: document.getElementById('expenseDate').value, userId: uid, createdAt: new Date().toISOString() };
        if (eid) { await updateDoc(doc(db, 'expenses', eid), data); } else { await addDoc(collection(db, 'expenses'), data); }
        Swal.fire({ icon: 'success', title: '✅ Saved!', timer: 1500, showConfirmButton: false });
        document.getElementById('expenseForm').reset(); document.getElementById('expenseDate').value = TD();
        document.getElementById('expenseModal').classList.remove('active'); loadExpenses();
    });
    
    window.openExpenseModal = function() { document.getElementById('expenseModalTitle').textContent = 'Add New Expense'; document.getElementById('expenseForm').reset(); document.getElementById('expenseId').value = ''; document.getElementById('expenseDate').value = TD(); document.getElementById('expenseModal').classList.add('active'); };
    window.closeExpenseModal = function() { document.getElementById('expenseModal').classList.remove('active'); };
    window.editExpense = async function(id) { var s = await getDoc(doc(db, 'expenses', id)); if (s.exists()) { var d = s.data(); document.getElementById('expenseModalTitle').textContent = 'Edit Expense'; document.getElementById('expenseId').value = id; document.getElementById('expenseReason').value = d.reason || ''; document.getElementById('expenseCost').value = d.cost || 0; document.getElementById('expenseDate').value = d.date || ''; document.getElementById('expenseModal').classList.add('active'); } };
    window.printExpenses = function() { printTable('expensesTable', 'Expense Report', TD()); };
    window.exportExpensesCSV = function() { exportCSV('expensesTable', 'expenses'); };
    
    loadExpenses();
}

// Collections
if (page === 'collections.html') {
    (async function() {
        var uid = UID(); if (!uid) return; var today = TD();
        var snap = await getDocs(query(collection(db, 'profitLossEntries'), where('userId', '==', uid)));
        var pb = document.getElementById('profitEntries'), lb = document.getElementById('lossEntries');
        pb.innerHTML = ''; lb.innerHTML = ''; var tp = 0, tl = 0;
        var entries = []; snap.forEach(function(d) { if (d.data().date === today) entries.push(d); });
        entries.sort(function(a, b) { return new Date(b.data().createdAt || 0) - new Date(a.data().createdAt || 0); });
        if (entries.length === 0) { pb.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No entries</td></tr>'; lb.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No entries</td></tr>'; }
        else entries.forEach(function(d) {
            var dt = d.data();
            var row = '<tr class="border-b hover:bg-gray-50"><td class="p-3">' + dt.productName + '</td><td class="p-3 font-semibold ' + (dt.type === 'profit' ? 'text-green-600' : 'text-red-600') + '">' + FC(dt.amount) + '</td><td class="p-3"><span class="badge badge-' + (dt.source === 'auto' ? 'success' : 'warning') + '">' + dt.source + '</span></td><td class="p-3">' + dt.date + '</td><td class="p-3 no-print"><button class="text-red-600" onclick="deleteItem(\'profitLossEntries\',\'' + d.id + '\')"><i class="fas fa-trash"></i></button></td></tr>';
            if (dt.type === 'profit') { tp += dt.amount; pb.innerHTML += row; } else { tl += dt.amount; lb.innerHTML += row; }
        });
        document.getElementById('totalProfit').textContent = FC(tp);
        document.getElementById('totalLoss').textContent = FC(tl);
        document.getElementById('netCollection').textContent = FC(tp - tl);
    })();
}

// Balance
if (page === 'balance.html') {
    document.getElementById('balanceDate').value = TD();
    window.loadBalance = async function() {
        var uid = UID(); if (!uid) return; var date = document.getElementById('balanceDate').value;
        var sS = await getDocs(query(collection(db, 'sales'), where('userId', '==', uid)));
        var eS = await getDocs(query(collection(db, 'expenses'), where('userId', '==', uid)));
        var ts = 0, tp = 0; sS.forEach(function(d) { if (d.data().date === date) { ts += (d.data().totalRevenue || d.data().sellingPrice || 0); tp += (d.data().totalCost || ((d.data().purchasePricePerUnit || 0) * (d.data().quantitySold || 0))); } });
        var te = 0; eS.forEach(function(d) { if (d.data().date === date) te += (d.data().cost || 0); });
        var pf = 0, ls = 0; sS.forEach(function(d) { if (d.data().date === date) { var pl = d.data().profitLoss || 0; if (pl > 0) pf += pl; else ls += Math.abs(pl); } });
        document.getElementById('totalSales').textContent = FC(ts);
        document.getElementById('totalPurchases').textContent = FC(tp);
        document.getElementById('totalExpenses').textContent = FC(te);
        document.getElementById('totalProfit').textContent = FC(pf);
        document.getElementById('totalLoss').textContent = FC(ls);
        document.getElementById('netBalance').textContent = FC(ts - tp - te);
    };
    loadBalance();
}

// Account
if (page === 'account.html') {
    var ui = {};
    var stored = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user');
    if (stored) { try { ui = JSON.parse(stored); } catch(e) {} }
    
    document.getElementById('displayUsername').textContent = ui.username || 'Admin';
    document.getElementById('displayEmail').textContent = ui.email || 'alfalahenterprise203@gmail.com';
    document.getElementById('updateUsername').value = ui.username || 'Admin';
    document.getElementById('updateEmail').value = ui.email || 'alfalahenterprise203@gmail.com';
    document.getElementById('memberSince').textContent = new Date(ui.loginTime || Date.now()).toLocaleDateString();
    
    window.switchAccountTab = function(tab) {
        document.getElementById('changePasswordSection').classList.toggle('hidden', tab !== 'changePassword');
        document.getElementById('updateProfileSection').classList.toggle('hidden', tab !== 'updateProfile');
        document.getElementById('changePasswordTab').className = tab === 'changePassword' ? 'px-6 py-3 rounded-lg font-semibold bg-emerald-600 text-white cursor-pointer' : 'px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 cursor-pointer';
        document.getElementById('updateProfileTab').className = tab === 'updateProfile' ? 'px-6 py-3 rounded-lg font-semibold bg-emerald-600 text-white cursor-pointer' : 'px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 cursor-pointer';
    };
    
    document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
        e.preventDefault(); var user = auth.currentUser;
        if (!user) { Swal.fire({ icon: 'error', title: 'Login again!' }); return; }
        var np = document.getElementById('newPassword').value, cp = document.getElementById('confirmPassword').value;
        if (np !== cp) { Swal.fire({ icon: 'error', title: 'Passwords do not match!' }); return; }
        try { var cred = EmailAuthProvider.credential(user.email, document.getElementById('currentPassword').value); await reauthenticateWithCredential(user, cred); await updatePassword(user, np); Swal.fire({ icon: 'success', title: '✅ Updated!' }); document.getElementById('changePasswordForm').reset(); } catch(err) { Swal.fire({ icon: 'error', title: 'Error', text: err.message }); }
    });
    
    document.getElementById('updateProfileForm')?.addEventListener('submit', async function(e) {
        e.preventDefault(); var user = auth.currentUser;
        if (!user) { Swal.fire({ icon: 'error', title: 'Login again!' }); return; }
        try { var ne = document.getElementById('updateEmail').value; if (ne !== user.email) await updateEmail(user, ne); await updateProfile(user, { displayName: document.getElementById('updateUsername').value }); await updateDoc(doc(db, 'users', user.uid), { username: document.getElementById('updateUsername').value, email: ne }); document.getElementById('displayUsername').textContent = document.getElementById('updateUsername').value; document.getElementById('displayEmail').textContent = ne; Swal.fire({ icon: 'success', title: '✅ Updated!' }); } catch(err) { Swal.fire({ icon: 'error', title: 'Error', text: err.message }); }
    });
    
    window.togglePasswordVisibility = function(id) { var inp = document.getElementById(id); if (inp) inp.type = inp.type === 'password' ? 'text' : 'password'; };
}

console.log('✅ Al-Falah Enterprise v7.0 Ready - Page:', page);
console.log('👤 Session:', UID() ? 'Active' : 'None');
