// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";

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
const worldChatBtn = document.getElementById('world-chat-btn');
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
const chatInfoBtn = document.getElementById('chat-info-btn');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
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
let currentChatPhoto = 'https://via.placeholder.com/150';
let currentChatNameText = 'World Chat';
let currentChatStatusText = 'Public';
let presenceListeners = [];
let chatListeners = [];

// Save User Profile
async function saveUserProfile(user, additionalData = {}) {
    if (!user || !user.uid) return;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        name: additionalData.name || user.displayName || "Anonymous",
        email: user.email || "",
        photo: user.photoURL || "https://via.placeholder.com/150",
        friends: [],
        friendRequests: [],
        blocked: [],
        createdAt: new Date().toISOString()
    }, { merge: true });
}

// Show User Info
function showUser(user) {
    if (!user) return;
    userPhoto.src = user.photoURL || 'https://via.placeholder.com/150';
    userName.textContent = user.displayName || user.email || 'User';
    ownImg.src = user.photoURL || 'https://via.placeholder.com/150';
    profilePhoto.src = user.photoURL || 'https://via.placeholder.com/150';
    profileName.textContent = user.displayName || user.email || 'User';
    profileEmail.textContent = user.email || '';
}

// Setup Presence
function setupPresence() {
    const connectedRef = ref(dbRT, ".info/connected");
    onValue(connectedRef, (snap) => {
        if (snap.val() === true && currentUser) {
            const presenceRef = ref(dbRT, 'presence/' + currentUser.uid);
            set(presenceRef, true);
            onDisconnect(presenceRef).set(false);
        }
    });
}

// Authentication Handlers
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) {
        showToast('Please enter email and password');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        showToast('Login failed: ' + err.message);
    }
});

signupBtn.addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    if (!name || !email || !password) {
        showToast('Please fill all fields');
        return;
    }
    if (password !== confirmPassword) {
        showToast('Passwords do not match');
        return;
    }
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserProfile(cred.user, { name });
    } catch (err) {
        showToast('Signup failed: ' + err.message);
    }
});

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        showToast('Google login failed: ' + err.message);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logged out successfully');
    } catch (err) {
        showToast('Logout failed: ' + err.message);
    }
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
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.add('hidden');
    }
});

// Add World Chat Item
function addWorldChatItem() {
    const worldItem = document.createElement('div');
    worldItem.className = 'flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer';
    worldItem.innerHTML = `
        <div class="relative mr-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <i data-lucide="globe" class="text-indigo-600 dark:text-indigo-300"></i>
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

// Send Message
sendBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showToast('Please log in to send messages');
        return;
    }
    const text = msgInput.value.trim();
    if (!text) {
        showToast('Please enter a message');
        return;
    }

    if (currentChatId !== 'global') {
        const [uid1, uid2] = currentChatId.split('_');
        const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
        const otherUserSnap = await getDoc(doc(db, 'users', otherUid));
        const otherData = otherUserSnap.data();
        if (otherData.blocked && otherData.blocked.includes(currentUser.uid)) {
            showToast('You are blocked by this user');
            return;
        }
    }

    try {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text,
            name: currentUser.displayName || currentUser.email || 'Anonymous',
            uid: currentUser.uid,
            photo: currentUser.photoURL || 'https://via.placeholder.com/150',
            timestamp: serverTimestamp()
        });
        msgInput.value = '';
    } catch (err) {
        showToast('Failed to send message: ' + err.message);
    }
});

// Load Messages
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
                ${isOwn ? '' : `<img class="w-8 h-8 rounded-full mt-1" src="${msg.photo || 'https://via.placeholder.com/150'}" alt="avatar">`}
                <div class="${isOwn ? 'order-1' : ''}">
                    <div class="${isOwn ? 'sender-bubble' : 'receiver-bubble'} px-4 py-2 max-w-xs md:max-w-md">
                        <p class="text-sm font-medium">${escapeHtml(msg.name || 'User')}</p>
                        <p class="text-sm">${escapeHtml(msg.text || '')}</p>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 ${isOwn ? 'text-right' : ''}">${msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : '...'}</p>
                </div>
                ${isOwn ? `<img class="w-8 h-8 rounded-full mt-1 order-2" src="${currentUser.photoURL || 'https://via.placeholder.com/150'}" alt="avatar">` : ''}
            `;
            if (isOwn) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-red-500 text-xs ml-2';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await deleteDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id));
                    } catch (err) {
                        showToast('Failed to delete message: ' + err.message);
                    }
                });
                div.querySelector('div').appendChild(deleteBtn);
            }
            messages.appendChild(div);
        });
        messages.scrollTop = messages.scrollHeight;
    }, (err) => {
        showToast('Error loading messages: ' + err.message);
    });
}

// Escape HTML
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Send Friend Request
async function sendFriendRequest(targetUid) {
    if (!currentUser || targetUid === currentUser.uid) {
        showToast('Cannot send request to yourself');
        return;
    }
    try {
        const targetRef = doc(db, 'users', targetUid);
        await updateDoc(targetRef, {
            friendRequests: arrayUnion(currentUser.uid)
        });
        showToast('Friend request sent');
    } catch (err) {
        showToast('Failed to send friend request: ' + err.message);
    }
}

// Accept Friend Request
async function acceptFriendRequest(requesterUid) {
    if (!currentUser) return;
    try {
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
        loadFriendsList();
    } catch (err) {
        showToast('Failed to accept friend request: ' + err.message);
    }
}

// Reject Friend Request
async function rejectFriendRequest(requesterUid) {
    if (!currentUser) return;
    try {
        const currentRef = doc(db, 'users', currentUser.uid);
        await updateDoc(currentRef, {
            friendRequests: arrayRemove(requesterUid)
        });
        showToast('Friend request rejected');
    } catch (err) {
        showToast('Failed to reject friend request: ' + err.message);
    }
}

// Toggle Block
async function toggleBlock(targetUid, isBlocked) {
    if (!currentUser) return;
    try {
        const currentRef = doc(db, 'users', currentUser.uid);
        await updateDoc(currentRef, {
            blocked: isBlocked ? arrayRemove(targetUid) : arrayUnion(targetUid)
        });
        showToast(isBlocked ? 'User unblocked' : 'User blocked');
        loadFriendsList();
    } catch (err) {
        showToast('Failed to update block status: ' + err.message);
    }
}

// Listen to Friend Requests
function listenToFriendRequests() {
    if (!currentUser) return;
    if (unsubscribeFriendRequests) unsubscribeFriendRequests();
    const userRef = doc(db, 'users', currentUser.uid);
    unsubscribeFriendRequests = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const requests = data.friendRequests || [];
            renderFriendRequests(requests);
        } else {
            friendRequests.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friend requests</p>';
        }
    }, (err) => {
        showToast('Error loading friend requests: ' + err.message);
    });
}

// Render Friend Requests
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
                    <img class="w-8 h-8 rounded-full" src="${userData.photo || 'https://via.placeholder.com/150'}" alt="photo">
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(userData.name || 'User')}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Sent request</p>
                </div>
            </div>
            <div class="flex space-x-1">
                <button class="acceptBtn p-1.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition">
                    <i data-lucide="check"></i>
                </button>
                <button class="rejectBtn p-1.5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
        div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
        div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));
        friendRequests.appendChild(div);
    }
}

// Load Friends List
async function loadFriendsList() {
    if (!currentUser) return;
    try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userSnap.exists()) {
            friendsList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>';
            return;
        }
        const data = userSnap.data();
        const friends = data.friends || [];
        const blocked = data.blocked || [];
        friendsList.innerHTML = '';
        if (friends.length === 0 && friendsList.children.length === 0) {
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
                    <img class="w-10 h-10 rounded-full" src="${userData.photo || 'https://via.placeholder.com/150'}" alt="photo">
                    <span id="online-${uid}" class="online-indicator bg-gray-400"></span>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(userData.name || 'User')}</p>
                    <p id="status-${uid}" class="text-xs text-slate-500 dark:text-slate-400">Offline</p>
                    <p id="last-msg-${uid}" class="text-xs text-slate-500 dark:text-slate-400 last-message">No messages yet</p>
                </div>
                <button class="blockBtn p-1.5 rounded-full ${isBlocked ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'} hover:bg-red-200 dark:hover:bg-red-800 transition">
                    <i data-lucide="x"></i>
                </button>
            `;
            div.addEventListener('click', () => openPrivateChat(uid, userData));
            div.querySelector('.blockBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBlock(uid, isBlocked);
            });
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

            // Last Message
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
            }, (err) => {
                showToast('Error loading last message: ' + err.message);
            });
            chatListeners.push(lastMsgUnsub);
        }
    } catch (err) {
        showToast('Error loading friends: ' + err.message);
    }
}

// Clear UI
function clearFriendRequestsUI() {
    friendRequests.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friend requests</p>';
}

function clearFriendsListUI() {
    friendsList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>';
}

// Search Users
searchInput.addEventListener('input', async (e) => {
    const searchText = e.target.value.trim();
    searchResults.innerHTML = '';
    if (searchText.length < 2) return;

    try {
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
                    <img class="w-10 h-10 rounded-full" src="${user.photo || 'https://via.placeholder.com/150'}" alt="photo">
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
    } catch (err) {
        showToast('Error searching users: ' + err.message);
    }
});

// Open Private Chat
async function openPrivateChat(friendUid, friendData) {
    const chatId = [currentUser.uid, friendUid].sort().join('_');
    currentChatId = chatId;
    currentChatPhoto = friendData.photo || 'https://via.placeholder.com/150';
    currentChatNameText = friendData.name || 'User';
    currentChatStatusText = 'Offline';
    updateChatHeader();
    const unsub = onValue(ref(dbRT, 'presence/' + friendUid), (snap) => {
        const online = snap.val();
        currentChatStatusText = online ? 'Online' : 'Offline';
        updateChatHeader();
    });
    presenceListeners.push(unsub);
    loadMessages();
    sidebar.classList.remove('sidebar-open');
    sidebarOverlay.classList.add('hidden');
}

// Open World Chat
function openWorldChat() {
    currentChatId = 'global';
    currentChatPhoto = 'https://via.placeholder.com/150';
    currentChatNameText = 'World Chat';
    currentChatStatusText = 'Public';
    updateChatHeader();
    loadMessages();
    sidebar.classList.remove('sidebar-open');
    sidebarOverlay.classList.add('hidden');
}

// Update Chat Header
function updateChatHeader() {
    chatImg.src = currentChatPhoto;
    chatName.textContent = currentChatNameText;
    chatStatus.textContent = currentChatStatusText;
    const ind = document.getElementById('chatIndicator');
    ind.className = 'online-indicator ' + (currentChatStatusText === 'Online' ? 'bg-green-500' : 'bg-gray-400');
}

// Listen for Notifications
function listenForNotifications() {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    const userRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userRef, async (snap) => {
        if (!snap.exists()) return;
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
            }, (err) => {
                showToast('Error in notifications: ' + err.message);
            });
            chatListeners.push(unsub);
        });
    });
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
    }, (err) => {
        showToast('Error in global notifications: ' + err.message);
    });
    chatListeners.push(globalUnsub);
}

// Show Toast
function showToast(message) {
    toastMessage.textContent = message;
    notificationToast.classList.remove('hidden', 'translate-y-10', 'opacity-0');
    notificationToast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        notificationToast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => notificationToast.classList.add('hidden'), 300);
    }, 5000);
}

// Event Listeners
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

document.addEventListener('click', (e) => {
    if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
});

closeToast.addEventListener('click', () => {
    notificationToast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => notificationToast.classList.add('hidden'), 300);
});

homeBtn.addEventListener('click', () => {
    openWorldChat();
});

friendsBtn.addEventListener('click', () => {
    sidebar.classList.add('sidebar-open');
    sidebarOverlay.classList.remove('hidden');
});

chatBtn.addEventListener('click', () => {
    if (currentChatId === 'global') {
        openWorldChat();
    } else {
        loadMessages();
    }
});

worldChatBtn.addEventListener('click', () => {
    openWorldChat();
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    profileModal.classList.remove('hidden');
});

settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    settingsModal.classList.remove('hidden');
});

closeProfile.addEventListener('click', () => {
    profileModal.classList.add('hidden');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

chatInfoBtn.addEventListener('click', () => {
    if (currentChatId === 'global') {
        showToast('This is the World Chat, open to all users');
    } else {
        const [uid1, uid2] = currentChatId.split('_');
        const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
        getDoc(doc(db, 'users', otherUid)).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                profilePhoto.src = data.photo || 'https://via.placeholder.com/150';
                profileName.textContent = data.name || 'User';
                profileEmail.textContent = data.email || '';
                profileModal.classList.remove('hidden');
            }
        }).catch((err) => {
            showToast('Error loading profile: ' + err.message);
        });
    }
});

if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
} else if (localStorage.getItem('darkMode') === 'false') {
    document.documentElement.classList.remove('dark');
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
}

messages.addEventListener('DOMSubtreeModified', () => {
    messages.scrollTop = messages.scrollHeight;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Service Worker registration failed:', err);
        });
    });
}
