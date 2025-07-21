
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase for client-side
function getFirebaseApp(): FirebaseApp {
    if (typeof window !== 'undefined') {
        return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    // On the server, we need to create a new app instance
    return initializeApp(firebaseConfig, `app-${Date.now()}-${Math.random()}`);
}

const app = getFirebaseApp();
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc };
