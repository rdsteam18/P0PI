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
    logoutBtn.style.display = 'none';
    document.getElementById('chatSection').style.display = 'none';
    clearChat();
    return;
  }
  userInfoDiv.innerHTML = `
    <img src="${user.photoURL || ''}" alt="photo" class="friendNameImg"/>
    <strong>${user.displayName || user.email || 'User'}</strong>
  `;
  loginBtn.style.display = 'none';
  logoutBtn.style.display = 'inline-block';
}

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Login failed: " + err.message);
    console.error(err);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (err) {
    alert("Logout failed: " + err.message);
    console.error(err);
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    await saveUserProfile(user);
    showUser(user);
    renderFriendRequests();
    loadFriendsList();
    loadWorldMessages();
  } else {
    showUser(null);
    renderFriendRequests();
    loadFriendsList();
    loadWorldMessages();
  }
});

export { currentUser };
