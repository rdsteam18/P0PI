// Firebase config और initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWQWPa3OEH6ClFQ5gv9yswr8N1Yh1vstE",
  authDomain: "study-chat-app-4a40e.firebaseapp.com",
  projectId: "study-chat-app-4a40e",
  storageBucket: "study-chat-app-4a40e.firebasestorage.app",
  messagingSenderId: "458309548485",
  appId: "1:458309548485:web:5dcccac12a7487b0d273ac",
  measurementId: "G-HQTQLDYT0Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };
