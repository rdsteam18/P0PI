import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { showUser, clearFriendRequestsUI, clearFriendsListUI } from './friends.js';

const firebaseConfig = {
  apiKey: "AIzaSyCWQWPa3OEH6ClFQ5gv9yswr8N1Yh1vstE",
  authDomain: "study-chat-app-4a40e.firebaseapp.com",
  projectId: "study-chat-app-4a40e",
  storageBucket: "study-chat-app-4a40e.appspot.com",
  messagingSenderId: "458309548485",
  appId: "1:458309548485:web:5dcccac12a7487b0d273ac",
  measurementId: "G-HQTQLDYT0Q"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export let currentUser = null;

async function saveUserProfile(user) {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    name: user.displayName || "No Name",
    nameLower: (user.displayName || "No Name").toLowerCase(), // for case-insensitive search
    email: user.email || "",
    photo: user.photoURL || "",
    friends: [],
    friendRequests: [],
    blockedUsers: [],    // for block/unblock feature
    createdAt: new Date().toISOString()
  }, { merge:
