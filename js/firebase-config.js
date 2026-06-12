import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCVveNOfzOIy2dtZdSKy05foIbmLJqKyfU",
    authDomain: "al-falah-enterprise.firebaseapp.com",
    projectId: "al-falah-enterprise",
    storageBucket: "al-falah-enterprise.firebasestorage.app",
    messagingSenderId: "124305861140",
    appId: "1:124305861140:web:a05a0c2f2d73e6511b1501"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };