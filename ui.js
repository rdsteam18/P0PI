// ui.js
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./auth.js";
import { loadMessages, sendMessage } from "./chat.js";
import { loadFriendsList } from "./friends-list.js";
import { listenToFriendRequests } from "./friends-request.js";
import { getFirestore, doc, setDoc, collection, getDocs, query, where, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore();
let currentUser = null;
let unsubscribeMessages = null;
let currentChatId = 'global';

document.getElementById('loginBtn').addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await saveUserProfile(user);
  } catch (err) {
    console.error('Login error', err);
    alert('Login failed: ' + (err.message || err));
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await saveUserProfile(user);
    showUser(user);
    document.getElementById('chatArea').style.display = 'block';
    loadMessages(currentChatId);
    listenToFriendRequests(currentUser);
    loadFriendsList(currentUser);
  } else {
    currentUser = null;
    showUser(null);
    document.getElementById('chatArea').style.display = 'none';
    if (unsubscribeMessages) unsubscribeMessages();
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

document.getElementById('sendBtn').addEventListener('click', async () => {
  const textEl = document.getElementById('msgInput');
  const text = textEl.value.trim();
  if (!text) return;
  sendMessage(currentUser, text);
  textEl.value = '';
});

document.getElementById('searchInput').addEventListener('input', async (e) => {
  const searchText = e.target.value.trim();
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '';
  if (searchText.length < 2) return; // minimum 2 characters

  const q = query(collection(db, 'users'), where('name', '>=', searchText), where('name', '<=', searchText + '\uf8ff'));
  const querySnapshot = await getDocs(q);

  if (!currentUser) {
    resultsDiv.innerHTML = 'Please login to send friend requests.';
    return;
  }

  const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const currentUserData = currentUserSnap.data() || {};
  const friends = currentUserData.friends || [];
  const incomingRequests = currentUserData.friendRequests || [];

  for (const docSnap of querySnapshot.docs) {
    const user = docSnap.data();
    if (user.uid === currentUser.uid) continue; // skip yourself

    const alreadyFriend = friends.includes(user.uid);
    const requestSent = incomingRequests.includes(user.uid); // If they already requested you (for simplicity)

    const div = document.createElement('div');
    div.className = 'friendName';
    div.innerHTML = `
      <img src="${escapeHtml(user.photo||'')}" alt="photo" />
      <span>${escapeHtml(user.name||user.email||'User')}</span>
      <button ${alreadyFriend || requestSent ? 'disabled' : ''} class="sendRequestBtn">${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Send Friend Request'}</button>
    `;

    if (!alreadyFriend && !requestSent) {
      div.querySelector('.sendRequestBtn').addEventListener('click', () => sendFriendRequest(user.uid));
    }

    resultsDiv.appendChild(div);
  }

  if (resultsDiv.innerHTML === '') {
    resultsDiv.innerHTML = 'No users found';
  }
});

async function sendFriendRequest(targetUid) {
  if (!currentUser) { alert('Please login first'); return; }
  if (targetUid === currentUser.uid) { alert("You can't send request to yourself!"); return; }

  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(currentUser.uid)
  });
  alert('Friend request sent!');
  loadFriendsList(currentUser);
  listenToFriendRequests(currentUser);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
