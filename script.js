// script.js
// Initialize Lucide icons
lucide.createIcons();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const signupScreen = document.getElementById('signup-screen');
const appContainer = document.getElementById('app-container');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const userMenuButton = document.getElementById('user-menu-button');
const userDropdown = document.getElementById('user-dropdown');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const notificationToast = document.getElementById('notification-toast');
const toastMessage = document.getElementById('toast-message');
const closeToast = document.getElementById('close-toast');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const friendsList = document.getElementById('friendsList');
const friendRequests = document.getElementById('friendRequests');
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const chatImg = document.getElementById('chatImg');
const chatName = document.getElementById('chatName');
const chatStatus = document.getElementById('chatStatus');
const ownImg = document.getElementById('ownImg');
const homeBtn = document.getElementById('home-btn');
const friendsBtn = document.getElementById('friends-btn');
const chatBtn = document.getElementById('chat-btn');
const settingsBtn = document.getElementById('settings-btn');
const profileLink = document.getElementById('profile-link');
const settingsLink = document.getElementById('settings-link');
const profileModal = document.getElementById('profile-modal');
const closeProfile = document.getElementById('close-profile');
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, where, getDocs, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWQWPa3OEH6ClFQ5gv9yswr8N1Yh1vstE",
  authDomain: "study-chat-app-4a40e.firebaseapp.com",
  projectId: "study-chat-app-4a40e",
  storageBucket: "study-chat-app-4a40e.firebasestorage.app",
  messagingSenderId: "458309548485",
  appId: "1:458309548485:web:5dcccac12a7487b0d273ac",
  measurementId: "G-HQTQLDYT0Q",
  databaseURL: "https://study-chat-app-4a40e-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const dbRT = getDatabase(app);

let currentUser = null;
let unsubscribeMessages = null;
let unsubscribeFriendRequests = null;
let currentChatId = 'global';
let currentChatPhoto = '';
let currentChatNameText = 'World Chat';
let currentChatStatusText = 'Public';
let presenceListeners = [];
let chatListeners = [];

async function saveUserProfile(user, additionalData = {}) {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    name: additionalData.name || user.displayName || "No Name",
    email: user.email || "",
    photo: user.photoURL || "",
    friends: [],
    friendRequests: [],
    blocked: [],
    createdAt: new Date().toISOString()
  }, { merge: true });
}

function showUser(user) {
  if (!user) return;
  userPhoto.src = user.photoURL || 'https://via.placeholder.com/150';
  userName.textContent = user.displayName || user.email || 'User';
  ownImg.src = user.photoURL || 'https://via.placeholder.com/150';
}

function setupPresence() {
  const connectedRef = ref(dbRT, ".info/connected");
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      const presenceRef = ref(dbRT, 'presence/' + currentUser.uid);
      set(presenceRef, true);
      onDisconnect(presenceRef).set(false);
    }
  });
}

// Authentication with email/password
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
});

signupBtn.addEventListener('click', async () => {
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserProfile(cred.user, {name});
  } catch (err) {
    alert('Signup failed: ' + err.message);
  }
});

googleLoginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert('Google login failed: ' + err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await saveUserProfile(user);
    showUser(user);
    authScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    setupPresence();
    loadMessages();
    listenToFriendRequests();
    loadFriendsList();
    addWorldChatItem();
    listenForNotifications();
  } else {
    currentUser = null;
    appContainer.classList.add('hidden');
    authScreen.classList.remove('hidden');
    clearFriendRequestsUI();
    clearFriendsListUI();
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeFriendRequests) unsubscribeFriendRequests();
    presenceListeners.forEach(unsub => unsub());
    presenceListeners = [];
    chatListeners.forEach(unsub => unsub());
    chatListeners = [];
  }
});

// Add World Chat item to sidebar
function addWorldChatItem() {
  const worldItem = document.createElement('div');
  worldItem.className = 'flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer';
  worldItem.innerHTML = `
    <div class="relative mr-3">
      <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600 dark:text-indigo-300">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </div>
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-slate-800 dark:text-slate-200">World Chat</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 last-message">Public chatroom</p>
    </div>
  `;
  worldItem.addEventListener('click', () => openWorldChat());
  friendsList.prepend(worldItem);
}

// Send chat message
sendBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const text = msgInput.value.trim();
  if (!text) return;

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
    msgInput.value = '';
  } catch (err) {
    alert('Failed to send message');
  }
});

// Load chat messages realtime
function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  const q = query(collection(db, 'chats', currentChatId, 'messages'), orderBy('timestamp'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messages.innerHTML = '';
    snapshot.forEach((snapDoc) => {
      const msg = snapDoc.data();
      const isOwn = msg.uid === currentUser.uid;
      const div = document.createElement('div');
      div.className = 'flex items-start space-x-3 ' + (isOwn ? 'justify-end' : '');
      div.innerHTML = `
        ${isOwn ? '' : '<img class="w-8 h-8 rounded-full mt-1" src="' + (msg.photo || 'https://via.placeholder.com/40') + '" alt="avatar">'}
        <div class="${isOwn ? 'order-1' : ''}">
          <div class="${isOwn ? 'sender-bubble' : 'receiver-bubble'} px-4 py-2 max-w-xs md:max-w-md">
            <p class="text-sm">${escapeHtml(msg.text || '')}</p>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 ${isOwn ? 'text-right' : ''}">${msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : ''}</p>
        </div>
        ${isOwn ? '<img class="w-8 h-8 rounded-full mt-1 order-2" src="' + (currentUser.photoURL || 'https://via.placeholder.com/40') + '" alt="avatar">' : ''}
      `;
      if (isOwn) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 text-xs ml-2';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
          await deleteDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id));
        });
        div.querySelector('div').appendChild(deleteBtn);
      }
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;
  });
}

// Escape HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
}

// Send Friend Request
async function sendFriendRequest(targetUid) {
  if (!currentUser || targetUid === currentUser.uid) return;
  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(currentUser.uid)
  });
  showToast('Friend request sent');
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

  const chatId = [currentUser.uid, requesterUid].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  await setDoc(chatRef, { participants: [currentUser.uid, requesterUid], lastMessage: '' }, { merge: true });

  showToast('Friend request accepted');
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
  showToast('Friend request rejected');
  listenToFriendRequests();
}

// Toggle Block
async function toggleBlock(targetUid, isBlocked) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  if (isBlocked) {
    await updateDoc(currentRef, {
      blocked: arrayRemove(targetUid)
    });
  } else {
    await updateDoc(currentRef, {
      blocked: arrayUnion(targetUid)
    });
  }
  loadFriendsList();
}

// Listen to friend requests
function listenToFriendRequests() {
  if (!currentUser) return;
  if (unsubscribeFriendRequests) unsubscribeFriendRequests();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribeFriendRequests = onSnapshot(userRef, (docSnap) => {
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    renderFriendRequests(requests);
  });
}

// Render friend requests
async function renderFriendRequests(requestUids) {
  friendRequests.innerHTML = '';
  if (requestUids.length === 0) {
    friendRequests.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friend requests</p>';
    return;
  }
  for (const uid of requestUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700';
    div.innerHTML = `
      <div class="flex items-center">
        <div class="relative mr-3">
          <img class="w-8 h-8 rounded-full" src="${userData.photo || 'https://via.placeholder.com/40'}" alt="photo">
        </div>
        <div>
          <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(userData.name || 'User')}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Sent request</p>
        </div>
      </div>
      <div class="flex space-x-1">
        <button class="acceptBtn p-1.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button class="rejectBtn p-1.5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
    div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));
    friendRequests.appendChild(div);
  }
}

// Load friends list with last message
async function loadFriendsList() {
  if (!currentUser) return;
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = userSnap.data();
  const friends = data.friends || [];
  const blocked = data.blocked || [];
  friendsList.innerHTML = '';
  if (friends.length === 0) {
    friendsList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>';
    return;
  }
  for (const uid of friends) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const isBlocked = blocked.includes(uid);
    const div = document.createElement('div');
    div.className = 'flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer';
    div.innerHTML = `
      <div class="relative mr-3">
        <img class="w-10 h-10 rounded-full" src="${userData.photo || 'https://via.placeholder.com/40'}" alt="photo">
        <span id="online-${uid}" class="online-indicator bg-gray-400"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(userData.name || 'User')}</p>
        <p id="status-${uid}" class="text-xs text-slate-500 dark:text-slate-400">Offline</p>
        <p id="last-msg-${uid}" class="text-xs text-slate-500 dark:text-slate-400 last-message">No messages yet</p>
      </div>
      <button class="blockBtn p-1.5 rounded-full ${isBlocked ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'} hover:bg-red-200 dark:hover:bg-red-800 transition">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    div.addEventListener('click', () => openPrivateChat(uid, userData));
    div.querySelector('.blockBtn').addEventListener('click', () => toggleBlock(uid, isBlocked));
    friendsList.appendChild(div);

    // Presence
    const presenceUnsub = onValue(ref(dbRT, 'presence/' + uid), (snap) => {
      const online = snap.val();
      const ind = document.getElementById(`online-${uid}`);
      const status = document.getElementById(`status-${uid}`);
      if (ind && status) {
        ind.className = 'online-indicator ' + (online ? 'bg-green-500' : 'bg-gray-400');
        status.textContent = online ? 'Online' : 'Offline';
      }
    });
    presenceListeners.push(presenceUnsub);

    // Last message
    const chatId = [currentUser.uid, uid].sort().join('_');
    const lastMsgQ = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'desc'), limit(1));
    const lastMsgUnsub = onSnapshot(lastMsgQ, (snap) => {
      const lastMsgEl = document.getElementById(`last-msg-${uid}`);
      if (lastMsgEl) {
        if (snap.empty) {
          lastMsgEl.textContent = 'No messages yet';
        } else {
          const msg = snap.docs[0].data();
          lastMsgEl.textContent = (msg.uid === currentUser.uid ? 'You: ' : '') + msg.text.substring(0, 30) + (msg.text.length > 30 ? '...' : '');
        }
      }
    });
    chatListeners.push(lastMsgUnsub);
  }
}

function clearFriendRequestsUI() {
  friendRequests.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friend requests</p>';
}
function clearFriendsListUI() {
  friendsList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>';
}

// Search students
searchInput.addEventListener('input', async (e) => {
  const searchText = e.target.value.trim();
  searchResults.innerHTML = '';
  if (searchText.length < 2) return;

  const q = query(collection(db, 'users'), where('name', '>=', searchText), where('name', '<=', searchText + '\uf8ff'));
  const querySnapshot = await getDocs(q);

  if (!currentUser) return;

  const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const currentUserData = currentUserSnap.data() || {};
  const friends = currentUserData.friends || [];
  const incomingRequests = currentUserData.friendRequests || [];

  querySnapshot.forEach((docSnap) => {
    const user = docSnap.data();
    if (user.uid === currentUser.uid) return;

    const alreadyFriend = friends.includes(user.uid);
    const requestSent = incomingRequests.includes(user.uid);

    const div = document.createElement('div');
    div.className = 'flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer';
    div.innerHTML = `
      <div class="relative mr-3">
        <img class="w-10 h-10 rounded-full" src="${user.photo || 'https://via.placeholder.com/40'}" alt="photo">
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(user.name || 'User')}</p>
      </div>
      <button class="sendRequestBtn p-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition ${alreadyFriend || requestSent ? 'opacity-50 cursor-not-allowed' : ''}">
        ${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Add Friend'}
      </button>
    `;

    if (!alreadyFriend && !requestSent) {
      div.querySelector('.sendRequestBtn').addEventListener('click', () => sendFriendRequest(user.uid));
    }

    searchResults.appendChild(div);
  });

  if (searchResults.innerHTML === '') {
    searchResults.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No users found</p>';
  }
});

// Open private chat
async function openPrivateChat(friendUid, friendData) {
  const chatId = [currentUser.uid, friendUid].sort().join('_');
  currentChatId = chatId;
  currentChatPhoto = friendData.photo || 'https://via.placeholder.com/40';
  currentChatNameText = friendData.name || 'User';
  currentChatStatusText = 'Offline'; // Initial
  updateChatHeader();
  // Presence for header
  const unsub = onValue(ref(dbRT, 'presence/' + friendUid), (snap) => {
    const online = snap.val();
    currentChatStatusText = online ? 'Online' : 'Offline';
    updateChatHeader();
  });
  presenceListeners.push(unsub);
  loadMessages();
}

function openWorldChat() {
  currentChatId = 'global';
  currentChatPhoto = 'https://p0pi.netlify.app/assets/logo.png';
  currentChatNameText = 'World Chat';
  currentChatStatusText = 'Public';
  updateChatHeader();
  loadMessages();
}

function updateChatHeader() {
  chatImg.src = currentChatPhoto;
  chatName.textContent = currentChatNameText;
  chatStatus.textContent = currentChatStatusText;
  const ind = chatImg.parentElement.querySelector('.online-indicator');
  ind.className = 'online-indicator ' + (currentChatStatusText === 'Online' ? 'bg-green-500' : 'bg-gray-400');
}

// Listen for notifications
function listenForNotifications() {
  // Request permission for notifications
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Listen to all chats for new messages
  const userRef = doc(db, 'users', currentUser.uid);
  onSnapshot(userRef, async (snap) => {
    const data = snap.data();
    const friends = data.friends || [];
    friends.forEach((friendUid) => {
      const chatId = [currentUser.uid, friendUid].sort().join('_');
      const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'desc'), limit(1));
      const unsub = onSnapshot(q, (msgSnap) => {
        if (!msgSnap.empty) {
          const msg = msgSnap.docs[0].data();
          if (msg.uid !== currentUser.uid && chatId !== currentChatId) {
            showToast(`New message from ${msg.name}: ${msg.text.substring(0, 30)}...`);
            if (Notification.permission === 'granted') {
              new Notification(`New message from ${msg.name}`, { body: msg.text });
            }
          }
        }
      });
      chatListeners.push(unsub);
    });
  });

  // Global chat notifications
  const globalQ = query(collection(db, 'chats', 'global', 'messages'), orderBy('timestamp', 'desc'), limit(1));
  const globalUnsub = onSnapshot(globalQ, (msgSnap) => {
    if (!msgSnap.empty) {
      const msg = msgSnap.docs[0].data();
      if (msg.uid !== currentUser.uid && currentChatId !== 'global') {
        showToast(`New message in World Chat: ${msg.text.substring(0, 30)}...`);
        if (Notification.permission === 'granted') {
          new Notification('New message in World Chat', { body: msg.text });
        }
      }
    }
  });
  chatListeners.push(globalUnsub);
}

// Show toast
function showToast(message) {
  toastMessage.textContent = message;
  notificationToast.classList.remove('hidden', 'translate-y-10', 'opacity-0');
  notificationToast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    notificationToast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => notificationToast.classList.add('hidden'), 300);
  }, 5000);
}

closeToast.addEventListener('click', () => {
  notificationToast.classList.add('translate-y-10', 'opacity-0');
  setTimeout(() => notificationToast.classList.add('hidden'), 300);
});

// Nav buttons
homeBtn.addEventListener('click', openWorldChat);
friendsBtn.addEventListener('click', () => {
  sidebar.classList.add('sidebar-open');
  sidebarOverlay.classList.remove('hidden');
});
chatBtn.addEventListener('click', () => {
  // Already in chat, perhaps refresh or something
});
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));

// Profile and Settings
profileLink.addEventListener('click', (e) => {
  e.preventDefault();
  profilePhoto.src = currentUser.photoURL || 'https://via.placeholder.com/150';
  profileName.textContent = currentUser.displayName || 'User';
  profileEmail.textContent = currentUser.email || '';
  profileModal.classList.remove('hidden');
});

closeProfile.addEventListener('click', () => profileModal.classList.add('hidden'));

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  settingsModal.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

// Other event listeners...
switchToSignup.addEventListener('click', () => {
  authScreen.classList.add('hidden');
  signupScreen.classList.remove('hidden');
});

switchToLogin.addEventListener('click', () => {
  signupScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
});

darkModeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
});

userMenuButton.addEventListener('click', () => {
  userDropdown.classList.toggle('hidden');
});

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('sidebar-open');
  sidebarOverlay.classList.toggle('hidden');
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('sidebar-open');
  sidebarOverlay.classList.add('hidden');
});

// Close dropdown
document.addEventListener('click', (e) => {
  if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.classList.add('hidden');
  }
});

// Dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
} else if (localStorage.getItem('darkMode') === 'false') {
  document.documentElement.classList.remove('dark');
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
  localStorage.setItem('darkMode', 'true');
}

// Auto-scroll messages
messages.addEventListener('DOMSubtreeModified', () => {
  messages.scrollTop = messages.scrollHeight;
});

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
