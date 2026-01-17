import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD8nB6K1wr2YFnKfGDGIfj48eWQWysG_7o",
  authDomain: "alightgram.firebaseapp.com",
  databaseURL: "https://alightgram-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alightgram",
  storageBucket: "alightgram.firebasestorage.app",
  messagingSenderId: "911065346479",
  appId: "1:911065346479:web:5c89aa61cb47f1b24cff5a",
  measurementId: "G-J28HRM9SBS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Explicitly passing URL ensures correct region connection
export const rdb = getDatabase(app, "https://alightgram-default-rtdb.asia-southeast1.firebasedatabase.app");
export const googleProvider = new GoogleAuthProvider();