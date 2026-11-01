// Shared Firebase app. The web apiKey is a client identifier, not a staff secret.
// Staff access is Firebase Auth plus security rules, not this config.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Fixed login identifier. Not a personal mailbox and not a secret.
export const ADMIN_EMAIL = "admin@pawfect-portal.invalid";

export const firebaseConfig = { apiKey: "AIzaSyBhFUkCP0WslzdB2WY93hp6L-Z5g8vo40E", authDomain: "pawfect-memories-2c8a0.firebaseapp.com", projectId: "pawfect-memories-2c8a0", storageBucket: "pawfect-memories-2c8a0.firebasestorage.app", messagingSenderId: "860879002502", appId: "1:860879002502:web:eeaa936317b1fefc33aa07" };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
