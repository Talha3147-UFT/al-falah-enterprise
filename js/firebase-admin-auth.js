// Firebase Admin Authentication Module
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, getDoc, setDoc, updateDoc, 
    collection, addDoc, getDocs, query, 
    where, orderBy, limit, deleteDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ============ CONFIG ============
const CONFIG = {
    LOGS_COLLECTION: 'admin_access_logs',
    MAX_FAILED_ATTEMPTS: 3
};

// ============ ADMIN LOGIN (Firebase Auth) ============
export async function adminLogin(email, password, recaptchaToken) {
    try {
        // Sign in with Firebase Auth (password auto-hashed)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        const isAdmin = userData && (userData.role === 'main_admin' || userData.role === 'admin');
        
        if (!isAdmin) {
            await signOut(auth);
            return { 
                success: false, 
                message: 'Access denied! You are not an admin.' 
            };
        }

        // Save admin session
        localStorage.setItem('adminSession', JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: userData.role,
            loginTime: Date.now()
        }));

        // Log success
        await logAdminAccess(email, true, 'Admin login successful');

        return { 
            success: true, 
            user: { uid: user.uid, email: user.email, role: userData.role },
            message: 'Welcome Admin!' 
        };

    } catch (error) {
        console.error('Admin login error:', error);
        
        // Log failure
        await logAdminAccess(email, false, error.code);
        
        let message = 'Login failed!';
        if (error.code === 'auth/user-not-found') message = 'Admin account not found!';
        else if (error.code === 'auth/wrong-password') message = 'Invalid password!';
        else if (error.code === 'auth/too-many-requests') message = 'Too many attempts! Try later.';
        else if (error.code === 'auth/invalid-credential') message = 'Invalid credentials!';
        else message = error.message;
        
        return { success: false, message };
    }
}

// ============ CREATE ADMIN USER ============
export async function createAdminUser(username, email, password, role = 'admin') {
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user data in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            email: email,
            role: role,
            createdBy: auth.currentUser?.uid || 'system',
            createdAt: new Date().toISOString(),
            isActive: true
        });

        return { 
            success: true, 
            message: `${role === 'main_admin' ? 'Main Admin' : 'Admin'} created successfully!`,
            uid: user.uid 
        };

    } catch (error) {
        console.error('Create admin error:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, message: 'Email already in use!' };
        }
        return { success: false, message: error.message };
    }
}

// ============ ADMIN LOGOUT ============
export async function adminLogout() {
    try {
        await signOut(auth);
        localStorage.removeItem('adminSession');
        localStorage.removeItem('alfalah_user');
        return { success: true, message: 'Logged out!' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// ============ CHECK ADMIN SESSION ============
export async function checkAdminSession() {
    const session = localStorage.getItem('adminSession');
    if (!session) return { isAdmin: false };
    
    try {
        const sessionData = JSON.parse(session);
        // Session valid for 12 hours
        const isValid = (Date.now() - sessionData.loginTime) < (12 * 60 * 60 * 1000);
        
        if (isValid && auth.currentUser) {
            return { isAdmin: true, ...sessionData };
        }
    } catch (e) {}
    
    return { isAdmin: false };
}

// ============ RESET ADMIN PASSWORD ============
export async function resetAdminPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// ============ CHANGE PASSWORD (WHILE LOGGED IN) ============
export async function changeAdminPassword(currentPassword, newPassword) {
    try {
        const user = auth.currentUser;
        if (!user) return { success: false, message: 'Not logged in!' };
        
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        
        return { success: true, message: 'Password changed successfully!' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// ============ LOG ACCESS ============
async function logAdminAccess(email, success, details) {
    try {
        const today = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, CONFIG.LOGS_COLLECTION), {
            email: email,
            success: success,
            details: details,
            date: today,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
    } catch (e) { console.error('Log error:', e); }
}

// ============ CHECK LOCKOUT ============
export async function checkAdminLockout(email) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const q = query(
            collection(db, CONFIG.LOGS_COLLECTION),
            where('date', '==', today),
            where('email', '==', email),
            where('success', '==', false)
        );
        const snap = await getDocs(q);
        const failed = snap.size;
        
        return {
            isLocked: failed >= CONFIG.MAX_FAILED_ATTEMPTS,
            failedAttempts: failed,
            remaining: Math.max(0, CONFIG.MAX_FAILED_ATTEMPTS - failed)
        };
    } catch (e) {
        return { isLocked: false, failedAttempts: 0, remaining: 3 };
    }
}

// ============ GET ALL USERS ============
export async function getAllUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        const users = [];
        snap.forEach(d => users.push({ id: d.id, ...d.data() }));
        return users;
    } catch (e) {
        return [];
    }
}

// ============ DELETE USER ============
export async function deleteAdminUser(uid) {
    try {
        await deleteDoc(doc(db, 'users', uid));
        return { success: true, message: 'User deleted!' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// ============ GET ACCESS LOGS ============
export async function getAdminLogs(limitCount = 50) {
    try {
        const q = query(collection(db, CONFIG.LOGS_COLLECTION), orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
        return logs;
    } catch (e) {
        return [];
    }
}

console.log('🛡️ Firebase Admin Auth Ready (Secure)');