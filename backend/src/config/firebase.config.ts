import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBmVLOays8uJvHTVfakeNdRclu0oyYQQkc',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'glovia-ac45a.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'glovia-ac45a',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'glovia-ac45a.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '431707701756',
  appId: process.env.FIREBASE_APP_ID || '1:431707701756:web:d06ea8aaa62538f16b3279',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-EKFX6HNRFT',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const storage = getStorage(app);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, analytics, storage, auth, firestore };
