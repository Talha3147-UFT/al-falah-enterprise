import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    deleteUser as firebaseDeleteUser,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    collection, 
    getDocs, 
    deleteDoc, 
    doc, 
    setDoc, 
    getDoc, 
    query, 
    where 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ============ CHECK MAIN ADMIN ============
async function isMainAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            return userDoc.data().role === 'main_admin';
        }
    } catch (e) {
        console.error('Admin check error:', e);
    }
    return false;
}

// ============ CHECK ANY ADMIN ============
async function isAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            return role === 'main_admin' || role === 'admin';
        }
    } catch (e) {
        console.error('Admin check error:', e);
    }
    return false;
}

// ============ GET CURRENT USER ROLE ============
async function getUserRole() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            return userDoc.data().role;
        }
    } catch (e) {
        console.error('Role check error:', e);
    }
    return 'user';
}

// ============ TAB SWITCHING ============
window.showTab = function(tab) {
    // Hide all tabs
    document.getElementById('tabCreateMainContent')?.classList.add('hidden');
    document.getElementById('tabManageUsersContent')?.classList.add('hidden');
    document.getElementById('tabAddUserContent')?.classList.add('hidden');
    
    // Reset all tab buttons
    document.getElementById('tabCreateMain')?.classList.remove('bg-emerald-600', 'text-white');
    document.getElementById('tabCreateMain')?.classList.add('bg-gray-200', 'text-gray-700');
    document.getElementById('tabManageUsers')?.classList.remove('bg-emerald-600', 'text-white');
    document.getElementById('tabManageUsers')?.classList.add('bg-gray-200', 'text-gray-700');
    document.getElementById('tabAddUser')?.classList.remove('bg-emerald-600', 'text-white');
    document.getElementById('tabAddUser')?.classList.add('bg-gray-200', 'text-gray-700');

    // Show selected tab
    if (tab === 'createMain') {
        document.getElementById('tabCreateMainContent')?.classList.remove('hidden');
        document.getElementById('tabCreateMain')?.classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('tabCreateMain')?.classList.add('bg-emerald-600', 'text-white');
    } else if (tab === 'manageUsers') {
        document.getElementById('tabManageUsersContent')?.classList.remove('hidden');
        document.getElementById('tabManageUsers')?.classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('tabManageUsers')?.classList.add('bg-emerald-600', 'text-white');
        loadAllUsers();
    } else if (tab === 'addUser') {
        document.getElementById('tabAddUserContent')?.classList.remove('hidden');
        document.getElementById('tabAddUser')?.classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('tabAddUser')?.classList.add('bg-emerald-600', 'text-white');
    }
};

// ============ CREATE MAIN ADMIN ============
window.createMainAdmin = async function() {
    const username = document.getElementById('mainUsername')?.value.trim();
    const email = document.getElementById('mainEmail')?.value.trim();
    const password = document.getElementById('mainPassword')?.value;
    
    if (!username || !email || !password) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'All fields are required!', confirmButtonColor: '#059669' });
        return;
    }
    
    const msgDiv = document.getElementById('mainAdminMsg');
    if (msgDiv) {
        msgDiv.classList.remove('hidden');
        msgDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating main admin...';
        msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-blue-100 text-blue-700';
    }

    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save to Firestore with main_admin role
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            email: email,
            role: 'main_admin',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            permissions: {
                canManageUsers: true,
                canDeleteUsers: true,
                canViewAllData: true,
                canEditAllData: true
            }
        });

        // Sign out after creating
        await signOut(auth);

        if (msgDiv) {
            msgDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>✅ Main Admin created successfully!';
            msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-green-100 text-green-700 font-semibold';
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Main Admin Created!',
            html: `
                <p>You can now login with:</p>
                <p class="font-semibold mt-2">📧 ${email}</p>
                <p class="font-semibold">🔑 ${password}</p>
            `,
            confirmButtonColor: '#059669'
        });

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            if (msgDiv) {
                msgDiv.innerHTML = '<i class="fas fa-info-circle mr-2"></i>ℹ️ Main admin already exists!';
                msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-yellow-100 text-yellow-700';
            }
            Swal.fire({ icon: 'info', title: 'Already Exists', text: 'Main admin already exists. You can login.', confirmButtonColor: '#059669' });
        } else {
            if (msgDiv) {
                msgDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>❌ ${error.message}`;
                msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-red-100 text-red-700';
            }
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#059669' });
        }
    }
};

// ============ ADD NEW USER (BY MAIN ADMIN) ============
window.addNewUser = async function() {
    const username = document.getElementById('newUsername')?.value.trim();
    const email = document.getElementById('newEmail')?.value.trim();
    const password = document.getElementById('newPassword')?.value;
    const role = document.getElementById('newRole')?.value;
    
    if (!username || !email || !password || !role) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'All fields are required!', confirmButtonColor: '#059669' });
        return;
    }
    
    // Check if current user is admin
    const admin = await isAdmin();
    if (!admin) {
        Swal.fire({ icon: 'error', title: 'Permission Denied', text: 'Only admin can add users!', confirmButtonColor: '#059669' });
        return;
    }
    
    const msgDiv = document.getElementById('addUserMsg');
    if (msgDiv) {
        msgDiv.classList.remove('hidden');
        msgDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding user...';
        msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-blue-100 text-blue-700';
    }

    try {
        // Store current admin info
        const currentAdmin = auth.currentUser;
        
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Save user to Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
            username: username,
            email: email,
            role: role,
            createdBy: currentAdmin.uid,
            createdByEmail: currentAdmin.email,
            createdAt: new Date().toISOString(),
            permissions: {
                canManageUsers: role === 'admin',
                canDeleteUsers: false,
                canViewAllData: role === 'admin',
                canEditAllData: role === 'admin'
            }
        });

        // Sign out new user and sign back in as admin
        await signOut(auth);
        
        if (msgDiv) {
            msgDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>✅ User "${username}" added as ${role}!`;
            msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-green-100 text-green-700 font-semibold';
        }
        
        document.getElementById('addUserForm')?.reset();
        
        Swal.fire({
            icon: 'success',
            title: 'User Added!',
            html: `
                <p><strong>${username}</strong> added successfully!</p>
                <p class="text-sm mt-2">📧 ${email}</p>
                <p class="text-sm">🔑 ${password}</p>
                <p class="text-sm">👤 Role: ${role}</p>
            `,
            confirmButtonColor: '#059669'
        });

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            if (msgDiv) {
                msgDiv.innerHTML = '<i class="fas fa-info-circle mr-2"></i>ℹ️ Email already in use!';
                msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-yellow-100 text-yellow-700';
            }
        } else {
            if (msgDiv) {
                msgDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>❌ ${error.message}`;
                msgDiv.className = 'mt-4 p-3 rounded-lg text-center bg-red-100 text-red-700';
            }
        }
        Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#059669' });
    }
};

// ============ LOAD ALL USERS ============
async function loadAllUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8"><i class="fas fa-spinner fa-spin mr-2"></i>Loading users...</td></tr>';

    try {
        const snap = await getDocs(collection(db, 'users'));
        
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        snap.forEach(d => {
            const data = d.data();
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50 transition-colors';
            
            let roleBadge = '';
            let actionButtons = '';
            
            if (data.role === 'main_admin') {
                roleBadge = '<span class="badge bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">👑 Main Admin</span>';
                actionButtons = '<span class="text-gray-400 text-xs">🔒 Protected</span>';
            } else if (data.role === 'admin') {
                roleBadge = '<span class="badge bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">⭐ Admin</span>';
                actionButtons = `<button onclick="deleteUserAccount('${d.id}', '${data.username}')" class="text-red-600 hover:text-red-800 ml-2" title="Delete User">
                    <i class="fas fa-trash"></i>
                </button>`;
            } else {
                roleBadge = '<span class="badge bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">👤 User</span>';
                actionButtons = `<button onclick="deleteUserAccount('${d.id}', '${data.username}')" class="text-red-600 hover:text-red-800 ml-2" title="Delete User">
                    <i class="fas fa-trash"></i>
                </button>`;
            }
            
            tr.innerHTML = `
                <td class="p-3 font-semibold text-gray-800">${data.username || 'N/A'}</td>
                <td class="p-3 text-sm text-gray-600">${data.email || 'N/A'}</td>
                <td class="p-3">${roleBadge}</td>
                <td class="p-3 text-xs text-gray-500">${data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                <td class="p-3">${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">Error: ${error.message}</td></tr>`;
        console.error('Load users error:', error);
    }
}

// ============ DELETE USER (ONLY MAIN ADMIN) ============
window.deleteUserAccount = async function(uid, username) {
    // Check if current user is main admin
    const mainAdmin = await isMainAdmin();
    if (!mainAdmin) {
        Swal.fire({
            icon: 'error',
            title: 'Permission Denied',
            text: 'Only Main Admin can delete users!',
            confirmButtonColor: '#059669'
        });
        return;
    }
    
    const result = await Swal.fire({
        title: 'Delete User?',
        html: `
            <p>Are you sure you want to delete:</p>
            <p class="font-bold text-red-600 mt-2">"${username}"</p>
            <p class="text-sm text-gray-500 mt-2">This action cannot be undone!</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete permanently!'
    });

    if (result.isConfirmed) {
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'users', uid));
            
            Swal.fire({
                icon: 'success',
                title: 'User Deleted!',
                text: `${username} has been removed from the system.`,
                timer: 2000,
                showConfirmButton: false
            });
            
            // Reload users list
            loadAllUsers();
            
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: error.message,
                confirmButtonColor: '#059669'
            });
        }
    }
};

// ============ CHECK USER PERMISSIONS ============
window.checkUserPermission = async function(permission) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.permissions && data.permissions[permission]) {
                return true;
            }
            // Main admin has all permissions
            if (data.role === 'main_admin') return true;
        }
    } catch (e) {
        console.error('Permission check error:', e);
    }
    return false;
};

// ============ GET ALL USERS COUNT ============
window.getUserCount = async function() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.size;
    } catch (e) {
        return 0;
    }
};

// ============ EXPORT USERS TO CSV ============
window.exportUsersCSV = async function() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        let csv = ['Username,Email,Role,Created Date'];
        
        snap.forEach(d => {
            const data = d.data();
            csv.push([
                data.username || '',
                data.email || '',
                data.role || 'user',
                data.createdAt || ''
            ].join(','));
        });
        
        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        Swal.fire({ icon: 'success', title: 'Exported!', timer: 1500, showConfirmButton: false });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message, confirmButtonColor: '#059669' });
    }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Admin User Management Ready');
    
    // Add event listeners for forms
    document.getElementById('createMainAdminForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        createMainAdmin();
    });
    
    document.getElementById('addUserForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewUser();
    });
    
    // Load users on page load
    loadAllUsers();
});

// Export functions for global use
export {
    isMainAdmin,
    isAdmin,
    getUserRole,
    createMainAdmin,
    addNewUser,
    deleteUserAccount,
    loadAllUsers,
    checkUserPermission,
    getUserCount,
    exportUsersCSV
};