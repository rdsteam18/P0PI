import { auth, provider, db } from "./firebase-config.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { renderFriendRequests } from "./friendRequests.js";
import { loadFriendsList } from "./friendsList.js";
import { loadMessagesWithFriend, clearChat } from "./chat.js";
import { loadWorldMessages } from "./worldChat.js";

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfoDiv = document.getElementById('userInfo');

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

async function saveUserProfile(user) {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "No Name",
      email: user.email || "",
      photo: user.photoURL || "",
      friends: [],
      friendRequests: [],
      createdAt: new Date().toISOString()
    });
  }
}

function showUser(user) {
  if (!user) {
    userInfoDiv.innerHTML = '';
    loginBtn.style.display = 'inline-block';
