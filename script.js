// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, where, getDocs, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

let currentUser = null;
let unsubscribeMessages = null;
let unsubscribeFriendRequests = null;
let currentChatId = 'global'; // 'global' for world chat, or 'uid1_uid2' for private
let currentChatTitle = 'World Chat';

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
    blocked: [], // New: blocked users list
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

  // Show profile
  document.getElementById('profileSection').style.display = 'block';
  document.getElementById('profileDetails').innerHTML = `
    <img src="${user.photoURL || ''}" alt="photo" style="width:100px; border-radius:50%;" />
    <p>Name: ${user.displayName || 'No Name'}</p>
    <p>Email: ${user.email || ''}</p>
  `;
}

// Authentication
document.getElementById('loginBtn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
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
    document.getElementById('chatArea').style.display = 'flex';
    loadMessages();
    listenToFriendRequests();
    loadFriendsList();
  } else {
    currentUser = null;
    showUser(null);
    document.getElementById('chatArea').style.display = 'none';
    clearFriendRequestsUI();
    clearFriendsListUI();
    document.getElementById('profileSection').style.display = 'none';
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeFriendRequests) unsubscribeFriendRequests();
  }
});

// Send chat message
document.getElementById('sendBtn').addEventListener('click', async () => {
  if (!currentUser) { alert('Please login first'); return; }
  const textEl = document.getElementById('msgInput');
  const text = textEl.value.trim();
  if (!text) return;

  // For private chat, check if blocked
  if (currentChatId !== 'global') {
    const [uid1, uid2] = currentChatId.split('_');
    const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
    const otherUserSnap = await getDoc(doc(db, 'users', otherUid));
    const otherData = otherUserSnap.data();
    if (otherData.blocked && otherData.blocked.includes(currentUser.uid)) {
      alert('You are blocked by this user.');
      return;
    }
  }

  try {
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
      text,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      uid: currentUser.uid,
      timestamp: serverTimestamp()
    });
    textEl.value = '';
  } catch (err) {
    console.error('Send message error', err);
    alert('Failed to send message');
  }
});

// Load chat messages realtime
function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  const q = query(collection(db, 'chats', currentChatId, 'messages'), orderBy('timestamp'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    snapshot.forEach((snapDoc) => {
      const msg = snapDoc.data();
      const el = document.createElement('div');
      el.className = 'msg ' + (msg.uid === currentUser.uid ? 'own' : 'other');
      const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
      el.innerHTML = `
        <strong>${escapeHtml(msg.name || 'Unknown')}:</strong> ${escapeHtml(msg.text || '')} 
        <span style="font-size:0.8em;color:#666">${time}</span>
      `;
      if (msg.uid === currentUser.uid) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.addEventListener('click', async () => {
          await deleteDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id));
        });
        el.appendChild(deleteBtn);
      }
      messagesDiv.appendChild(el);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, (err) => {
    console.error('Messages onSnapshot error', err);
  });
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ----- FRIEND REQUEST SYSTEM -----

// Send Friend Request
async function sendFriendRequest(targetUid) {
  if (!currentUser) { alert('Please login first'); return; }
  if (targetUid === currentUser.uid) { alert("You can't send request to yourself!"); return; }

  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(currentUser.uid)
  });
  alert('Friend request sent!');
  loadFriendsList();
  listenToFriendRequests();
}

// Accept Friend Request
async function acceptFriendRequest(requesterUid) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  const requesterRef = doc(db, 'users', requesterUid);

  await updateDoc(currentRef, {
    friends: arrayUnion(requesterUid),
    friendRequests: arrayRemove(requesterUid)
  });

  await updateDoc(requesterRef, {
    friends: arrayUnion(currentUser.uid)
  });

  // Create private chat if not exists
  const chatId = [currentUser.uid, requesterUid].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  await setDoc(chatRef, { participants: [currentUser.uid, requesterUid] }, { merge: true });

  alert('Friend request accepted!');
  listenToFriendRequests();
  loadFriendsList();
}

// Reject Friend Request
async function rejectFriendRequest(requesterUid) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);

  await updateDoc(currentRef, {
    friendRequests: arrayRemove(requesterUid)
  });

  alert('Friend request rejected!');
  listenToFriendRequests();
}

// Block User
async function blockUser(targetUid) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  await updateDoc(currentRef, {
    blocked: arrayUnion(targetUid)
  });
  alert('User blocked!');
  loadFriendsList(); // Refresh
}

// Unblock User
async function unblockUser(targetUid) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  await updateDoc(currentRef, {
    blocked: arrayRemove(targetUid)
  });
  alert('User unblocked!');
  loadFriendsList(); // Refresh
}

// Listen to friend requests realtime
function listenToFriendRequests() {
  if (!currentUser) return;
  if (unsubscribeFriendRequests) unsubscribeFriendRequests();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribeFriendRequests = onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    renderFriendRequests(requests);
  });
}

// Render friend requests UI
async function renderFriendRequests(requestUids) {
  const container = document.getElementById('friendRequests');
  container.innerHTML = '';
  if (requestUids.length === 0) {
    container.innerHTML = 'No friend requests';
    return;
  }
  for (const uid of requestUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const div = document.createElement('div');

    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(userData.photo||'')}" alt="photo" />
        <span>${escapeHtml(userData.name||userData.email||'User')}</span>
      </div>
      <div>
        <button class="acceptBtn">Accept</button>
        <button class="rejectBtn">Reject</button>
      </div>
    `;

    div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
    div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));

    container.appendChild(div);
  }
}

// Load friends list UI
async function loadFriendsList() {
  if (!currentUser) return;
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) return;
  const data = userSnap.data();
  const friends = data.friends || [];
  const blocked = data.blocked || [];
  const container = document.getElementById('friendsList');
  container.innerHTML = '';
  if (friends.length === 0) {
    container.innerHTML = 'No friends yet';
    return;
  }
  for (const uid of friends) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(userData.photo||'')}" alt="photo" />
        <span>${escapeHtml(userData.name||userData.email||'User')}</span>
      </div>
      <div>
        <button class="chatBtn">Chat</button>
        <button class="blockBtn">${blocked.includes(uid) ? 'Unblock' : 'Block'}</button>
      </div>
    `;
    div.querySelector('.chatBtn').addEventListener('click', () => openPrivateChat(uid));
    div.querySelector('.blockBtn').addEventListener('click', () => {
      if (blocked.includes(uid)) {
        unblockUser(uid);
      } else {
        blockUser(uid);
      }
    });
    container.appendChild(div);
  }
}

function clearFriendRequestsUI() {
  document.getElementById('friendRequests').innerHTML = 'No friend requests';
}
function clearFriendsListUI() {
  document.getElementById('friendsList').innerHTML = 'No friends yet';
}

// Search students
document.getElementById('searchInput').addEventListener('input', async (e) => {
  const searchText = e.target.value.trim();
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '';
  if (searchText.length < 2) return;

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
    if (user.uid === currentUser.uid) continue;

    const alreadyFriend = friends.includes(user.uid);
    const requestSent = incomingRequests.includes(user.uid); // Simplified

    const div = document.createElement('div');
    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(user.photo||'')}" alt="photo" />
        <span>${escapeHtml(user.name||user.email||'User')}</span>
      </div>
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

// Open private chat
async function openPrivateChat(friendUid) {
  const chatId = [currentUser.uid, friendUid].sort().join('_');
  currentChatId = chatId;

  const friendSnap = await getDoc(doc(db, 'users', friendUid));
  const friendData = friendSnap.data();
  currentChatTitle = `Chat with ${friendData.name || friendData.email || 'User'}`;
  document.getElementById('chatTitle').textContent = currentChatTitle;

  loadMessages();
}

// World chat button
document.getElementById('worldChatBtn').addEventListener('click', () => {
  currentChatId = 'global';
  currentChatTitle = 'World Chat';
  document.getElementById('chatTitle').textContent = currentChatTitle;
  loadMessages();
});

// Initialize global chat doc if needed
(async () => {
  const globalChatRef = doc(db, 'chats', 'global');
  await setDoc(globalChatRef, { type: 'global' }, { merge: true });
})();

// Mobile menu toggle (simple)
if (window.innerWidth <= 768) {
  const header = document.querySelector('.app-header');
  header.addEventListener('click', (e) => {
    if (e.target.tagName === 'H1') return;
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
  });
}
