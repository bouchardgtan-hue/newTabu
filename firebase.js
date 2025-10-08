// Firebase Live-Sync functionality (Optional)
// This file is included but won't break anything if not used

console.log('Firebase module loaded - ready for live sync when configured');

// Example Firebase configuration structure
const EXAMPLE_FIREBASE_CONFIG = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Safe initialization that won't break the app
function initFirebase(config) {
    try {
        if (!config || typeof config !== 'object') {
            console.warn('Invalid Firebase configuration');
            return false;
        }
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded');
            return false;
        }
        
        // Initialize Firebase
        firebase.initializeApp(config);
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        return false;
    }
}

// Safe function to push to Firebase
function pushToFirebase(data) {
    try {
        if (typeof firebase === 'undefined') {
            return false;
        }
        // Firebase push logic would go here
        console.log('Firebase push simulated', data);
        return true;
    } catch (error) {
        console.warn('Firebase push failed:', error);
        return false;
    }
}

// Setup event listener for Firebase config
document.addEventListener('DOMContentLoaded', function() {
    const saveConfigBtn = document.getElementById('saveFirebaseConfig');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', function() {
            const configInput = document.getElementById('firebaseKey');
            if (configInput && configInput.value.trim()) {
                try {
                    const config = JSON.parse(configInput.value);
                    if (initFirebase(config)) {
                        alert('Firebase configuration saved successfully!');
                    } else {
                        alert('Failed to initialize Firebase. Please check your configuration.');
                    }
                } catch (error) {
                    alert('Invalid Firebase configuration format. Please check your key.');
                }
            } else {
                alert('Please enter a Firebase configuration key');
            }
        });
    }
});