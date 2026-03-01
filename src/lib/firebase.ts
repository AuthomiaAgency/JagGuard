import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCl4md9H5yvfD48nnLrXffAXQ9MkBl1msU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "labsnatural.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "labsnatural",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "labsnatural.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "459582671321",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:459582671321:web:5d2134ae35443ed31df1c8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SRY9TDY394"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Initialize analytics only in browser environment
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { auth, db, storage, googleProvider, analytics };
