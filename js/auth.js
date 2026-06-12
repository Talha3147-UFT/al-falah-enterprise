// Auth Check - সব পেজের জন্য
import { auth } from 'firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // শুধু login.html এবং index.html ছাড়া সব পেজ থেকে রিডাইরেক্ট
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'login.html' && currentPage !== 'index.html' && currentPage !== 'setup.html' && currentPage !== '') {
      window.location.href = 'login.html';
    }
  }
});