import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCl4md9H5yvfD48nnLrXffAXQ9MkBl1msU",
  authDomain: "labsnatural.firebaseapp.com",
  projectId: "labsnatural",
  storageBucket: "labsnatural.firebasestorage.app",
  messagingSenderId: "459582671321",
  appId: "1:459582671321:web:5d2134ae35443ed31df1c8",
  measurementId: "G-SRY9TDY394"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { auth, db, storage, googleProvider, analytics };
