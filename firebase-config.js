// Firebase configuration and initialization
// Using Firebase v9+ compat library for simpler syntax

// Wait for Firebase libraries to load
async function initFirebase() {
    // Firebase will be loaded from CDN
    const firebaseConfig = {
        apiKey: "AIzaSyB6tNHoRCKxLMtFokVvH9YCQ6lmddYrWh8",
        authDomain: "our-game-1958d.firebaseapp.com",
        projectId: "our-game-1958d",
        storageBucket: "our-game-1958d.firebasestorage.app",
        messagingSenderId: "906642673667",
        appId: "1:906642673667:web:db64fbbc15545fb800be36"
    };

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Export for use in game
    window.firebaseDB = db;

    console.log('Firebase initialized!');
}

// Auto-initialize when script loads
if (typeof firebase !== 'undefined') {
    initFirebase();
} else {
    console.error('Firebase not loaded yet');
}