// ui.js
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./auth.js";
import { loadMessages, sendMessage } from "./chat.js";
import { loadFriendsList } from "./friends-list.js";
import { listenToFriendRequests } from "./friends-request.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const db = getFirestore();
let currentUser = null;
let currentChatId = 'global';

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await saveUserProfile(user);
    showUser(user);
    document.getElementById('chatArea').style.display = 'flex';
    loadMessages(currentChatId);
    listenToFriendRequests(user);
    loadFriendsList(user);
  } else {
    currentUser = null;
    showUser(null);
    document.getElementById('chatArea').style.display = 'none';
  }
});

async function saveUserProfile(user) {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    name: user.displayName || "No Name",
    email: user.email || "",
    photo: user.photoURL || "",
    friends: [],           
    friendRequests: [],    
    createdAt: new Date().toISOString()
  }, { merge: true });
}

function showUser(user) {
  const ui = document.getElementById('userInfo');
  if (!user) {
    ui.innerHTML = '';
    return;
  }
  ui.innerHTML = `
    <img src="${user.photoURL || ''}" alt="photo" />
    <strong>${user.displayName || user.email || 'User'}</strong>
    <button id="logoutBtn">Logout</button>
  `;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
  });
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Login error', err);
    alert('Login failed: ' + (err.message || err));
  }
});

document.getElementById('sendBtn').addEventListener('click', async () => {
  if (!currentUser) { alert('Please login first'); return; }
  const textEl = document.getElementById('msgInput');
  const text = textEl.value.trim();
  if (!text) return;
  sendMessage(currentChatId, currentUser, text);
  textEl.value = '';
});
