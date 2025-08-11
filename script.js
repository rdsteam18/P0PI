import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

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
const mediaBtn = document.getElementById('mediaBtn');
const mediaInput = document.getElementById('mediaInput');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const chatImg = document.getElementById('chatImg');
const chatName = document.getElementById('chatName');
const chatStatus = document.getElementById('chatStatus');
const typingIndicator = document.getElementById('typingIndicator');
const ownImg = document.getElementById('ownImg');
const homeBtn = document.getElementById('home-btn');
const friendsBtn = document.getElementById('friends-btn');
const chatBtn = document.getElementById('chat-btn');
const worldChatBtn = document.getElementById('world-chat-btn');
const settingsBtn = document.getElementById('settings-btn');
const adminBtn = document.getElementById('admin-btn');
const profileLink = document.getElementById('profile-link');
const settingsLink = document.getElementById('settings-link');
const profileModal = document.getElementById('profile-modal');
const closeProfile = document.getElementById('close-profile');
const profilePhoto = document.getElementById('profile-photo');
const profileNameInput = document.getElementById('profile-name-input');
const profileBioInput = document.getElementById('profile-bio-input');
const profileEmail = document.getElementById('profile-email');
const saveProfileBtn = document.getElementById('save-profile-btn');
const changePhotoBtn = document.getElementById('change-photo-btn');
const profilePhotoInput = document.getElementById('profile-photo-input');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const adminModal = document.getElementById('admin-modal');
const closeAdmin = document.getElementById('close-admin');
const banUserInput = document.getElementById('ban-user-input');
const banUserBtn = document.getElementById('ban-user-btn');
const announcementInput = document.getElementById('announcement-input');
const sendAnnouncementBtn = document.getElementById('send-announcement-btn');
const chatInfoBtn = document.getElementById('chat-info-btn');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCWQWPa3OEH6ClFQ5gv9yswr8N1Yh1vstE",
    authDomain: "study-chat-app-4a40e.firebaseapp.com",
    projectId: "study-chat-app-4a40e",
    storageBucket: "study-chat-app-4a40e.firebasestorage.app",
    messagingSenderId: "G-HQTQLDYT0Q",
    appId: "1:458309548485:web:5dcccac12a7487b0d273ac",
    databaseURL: "https://study-chat-app-4a40e-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const dbRT = getDatabase(app);
const storage = getStorage(app);

let currentUser = null;
let unsubscribeMessages = null;
let unsubscribeFriendRequests = null;
let currentChatId = 'global';
let currentChatPhoto = 'https://via.placeholder.com/150';
let currentChatNameText = 'World Chat';
let currentChatStatusText = 'Public';
let presenceListeners = [];
let chatListeners = [];
let typingTimeout = null;
const adminUids = ['ec6tXaR9deTa5o8lTIXe7Se1kCo2']; // Replace with actual admin UIDs

// Save User Profile
async function saveUserProfile(user, additionalData = {}) {
    if (!user || !user.uid) return;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        name: additionalData.name || user.displayName || "Anonymous",
        email: user.email || "",
        photo: user.photoURL || "https://via.placeholder.com/150",
        bio: additionalData.bio || "",
        friends: [],
        friendRequests: [],
        blocked: [],
        banned: false,
        muted: false,
        createdAt: new Date().toISOString()
    }, { merge: true });
}

// Update User Profile
async function updateUserProfile(name, photoURL, bio) {
    if (!currentUser) return;
    try {
        await updateProfile(auth.currentUser, { displayName: name, photoURL });
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { name, photo: photoURL, bio });
        showUser(currentUser);
        showToast('Profile updated successfully');
    } catch (err) {
        showToast('Failed to update profile: ' + err.message);
    }
}

// Upload Profile Photo
async function uploadProfilePhoto(file) {
    if (!currentUser || !file) return null;
    try {
        const storageReference = storageRef(storage, `profile_photos/${currentUser.uid}`);
        await uploadBytes(storageReference, file);
        return await getDownloadURL(storageReference);
    } catch (err) {
        showToast('Failed to upload photo: ' + err.message);
        return null;
    }
}

// Show User Info
function showUser(user) {
    if (!user) return;
    userPhoto.src = user.photoURL || 'https://via.placeholder.com/150';
    userName.textContent = user.displayName || user.email || 'User';
    ownImg.src = user.photoURL || 'https://via.placeholder.com/150';
    profilePhoto.src = user.photoURL || 'https://via.placeholder.com/150';
    profileNameInput.value = user.displayName || user.email || 'User';
    profileEmail.textContent = user.email || '';
    getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
            profileBioInput.value = snap.data().bio || '';
        }
    });
    if (adminUids.includes(user.uid)) {
        adminBtn.classList.remove('hidden');
    } else {
        adminBtn.classList.add('hidden');
    }
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
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
    if (userSnap.exists() && (userSnap.data().banned || userSnap.data().muted)) {
        showToast('You are banned or muted');
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
        const messageRef = await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text,
            name: currentUser.displayName || currentUser.email || 'Anonymous',
            uid: currentUser.uid,
            photo: currentUser.photoURL || 'https://via.placeholder.com/150',
            timestamp: serverTimestamp(),
            status: 'sent',
            reactions: {}
        });
        await updateDoc(doc(db, 'chats', currentChatId), { lastMessage: text });
        if (currentChatId !== 'global') {
            const [uid1, uid2] = currentChatId.split('_');
            const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
            await set(ref(dbRT, `typing/${currentChatId}/${currentUser.uid}`), false);
            await updateDoc(doc(db, 'chats', currentChatId, 'messages', messageRef.id), { status: 'delivered' });
        }
        msgInput.value = '';
    } catch (err) {
        showToast('Failed to send message: ' + err.message);
    }
});

// Upload Media
mediaBtn.addEventListener('click', () => {
    mediaInput.click();
});

mediaInput.addEventListener('change', async (e) => {
    if (!currentUser) {
        showToast('Please log in to send media');
        return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
    if (userSnap.exists() && (userSnap.data().banned || userSnap.data().muted)) {
        showToast('You are banned or muted');
        return;
    }
    try {
        const storageReference = storageRef(storage, `media/${currentChatId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageReference, file);
        const url = await getDownloadURL(storageReference);
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            media: url,
            name: currentUser.displayName || currentUser.email || 'Anonymous',
            uid: currentUser.uid,
            photo: currentUser.photoURL || 'https://via.placeholder.com/150',
            timestamp: serverTimestamp(),
            status: 'sent',
            reactions: {}
        });
        await updateDoc(doc(db, 'chats', currentChatId), { lastMessage: 'Image' });
        mediaInput.value = '';
    } catch (err) {
        showToast('Failed to upload media: ' + err.message);
    }
});

// Load Messages
function loadMessages() {
    if (unsubscribeMessages) unsubscribeMessages();
    const q = query(collection(db, 'chats', currentChatId, 'messages'), orderBy('timestamp'));
    unsubscribeMessages = onSnapshot(q, async (snapshot) => {
        messages.innerHTML = '';
        const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const isBanned = currentUserSnap.exists() && currentUserSnap.data().banned;
        snapshot.forEach(async (snapDoc) => {
            const msg = snapDoc.data();
            const isOwn = msg.uid === currentUser.uid;
            const div = document.createElement('div');
            div.className = `flex items-start space-x-3 ${isOwn ? 'justify-end' : ''} fade-in`;
            div.dataset.messageId = snapDoc.id;
            let content = '';
            if (msg.text) {
                content = `<p class="text-sm">${escapeHtml(msg.text)}</p>`;
            } else if (msg.media) {
                content = `<img src="${msg.media}" class="max-w-xs rounded-lg" alt="media">`;
            }
            const reactions = msg.reactions || {};
            const reactionKeys = Object.keys(reactions);
            const reactionHtml = reactionKeys.length > 0 ? `<div class="flex space-x-1 mt-1">${reactionKeys.map(emoji => `<span class="reaction text-sm">${emoji} ${reactions[emoji].length}</span>`).join('')}</div>` : '';
            div.innerHTML = `
                ${isOwn ? '' : `<img class="w-8 h-8 rounded-full mt-1" src="${msg.photo || 'https://via.placeholder.com/150'}" alt="avatar">`}
                <div class="${isOwn ? 'order-1' : ''}">
                    <div class="${isOwn ? 'sender-bubble' : 'receiver-bubble'} px-4 py-2 max-w-xs md:max-w-md relative">
                        <p class="text-sm font-medium">${escapeHtml(msg.name || 'User')}</p>
                        ${content}
                        ${reactionHtml}
                        <div class="reaction-menu hidden absolute top-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-md shadow-lg p-2 z-10">
                            <button class="reaction-btn" data-emoji="👍">👍</button>
                            <button class="reaction-btn" data-emoji="❤️">❤️</button>
                            <button class="reaction-btn" data-emoji="😂">😂</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 ${isOwn ? 'text-right' : ''}">
                        ${msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : '...'}
                        ${isOwn && msg.status ? `<span class="ml-2">${msg.status === 'seen' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}</span>` : ''}
                    </p>
                </div>
                ${isOwn ? `<img class="w-8 h-8 rounded-full mt-1 order-2" src="${currentUser.photoURL || 'https://via.placeholder.com/150'}" alt="avatar">` : ''}
            `;
            if (!isBanned) {
                const bubble = div.querySelector('.sender-bubble, .receiver-bubble');
                bubble.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const reactionMenu = div.querySelector('.reaction-menu');
                    reactionMenu.classList.toggle('hidden');
                });
                div.querySelectorAll('.reaction-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const emoji = e.target.dataset.emoji;
                        await updateDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id), {
                            [`reactions.${emoji}`]: arrayUnion(currentUser.uid)
                        });
                        div.querySelector('.reaction-menu').classList.add('hidden');
                    });
                });
                if (isOwn || adminUids.includes(currentUser.uid)) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'text-red-500 text-xs ml-2';
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            await deleteDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id));
                            if (adminUids.includes(currentUser.uid)) {
                                showToast('Message deleted for everyone');
                            }
                        } catch (err) {
                            showToast('Failed to delete message: ' + err.message);
                        }
                    });
                    div.querySelector('div').appendChild(deleteBtn);
                }
            }
            if (!isOwn && currentChatId !== 'global' && msg.status !== 'seen') {
                await updateDoc(doc(db, 'chats', currentChatId, 'messages', snapDoc.id), { status: 'seen' });
            }
            messages.appendChild(div);
        });
        messages.scrollTop = messages.scrollHeight;
    }, (err) => {
        showToast('Error loading messages: ' + err.message);
    });
}

// Typing Indicator
msgInput.addEventListener('input', () => {
    if (!currentUser || currentChatId === 'global') return;
    clearTimeout(typingTimeout);
    set(ref(dbRT, `typing/${currentChatId}/${currentUser.uid}`), true);
    typingTimeout = setTimeout(() => {
        set(ref(dbRT, `typing/${currentChatId}/${currentUser.uid}`), false);
    }, 2000);
});

// Listen for Typing
function listenForTyping() {
    if (currentChatId === 'global') {
        typingIndicator.classList.add('hidden');
        return;
    }
    const [uid1, uid2] = currentChatId.split('_');
    const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
    const typingRef = ref(dbRT, `typing/${currentChatId}/${otherUid}`);
    const unsub = onValue(typingRef, (snap) => {
        const isTyping = snap.val();
        typingIndicator.classList.toggle('hidden', !isTyping);
    });
    presenceListeners.push(unsub);
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

// Ban or Mute User
async function banOrMuteUser(email, action) {
    if (!currentUser || !adminUids.includes(currentUser.uid)) return;
    try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            showToast('User not found');
            return;
        }
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
            [action]: true
        });
        showToast(`User ${action === 'banned' ? 'banned' : 'muted'} successfully`);
    } catch (err) {
        showToast(`Failed to ${action} user: ` + err.message);
    }
}

// Send Announcement
async function sendAnnouncement(text) {
    if (!currentUser || !adminUids.includes(currentUser.uid)) return;
    try {
        await addDoc(collection(db, 'chats', 'global', 'messages'), {
            text: `[Announcement] ${text}`,
            name: currentUser.displayName || currentUser.email || 'Admin',
            uid: currentUser.uid,
            photo: currentUser.photoURL || 'https://via.placeholder.com/150',
            timestamp: serverTimestamp(),
            status: 'sent',
            reactions: {}
        });
        await updateDoc(doc(db, 'chats', 'global'), { lastMessage: `[Announcement] ${text}` });
        showToast('Announcement sent');
        announcementInput.value = '';
    } catch (err) {
        showToast('Failed to send announcement: ' + err.message);
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
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(userData.bio || 'No bio')}</p>
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
        addWorldChatItem();
        if (friends.length === 0) {
            friendsList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>';
            addWorldChatItem();
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
                    <p id="status-${uid}" class="text-xs text-slate-500 dark:text-slate-400">${userData.bio || 'No bio'}</p>
                    <p id="last-msg-${uid}" class="text-xs text-slate-500 dark:text-slate-400 last-message">No messages yet</p>
                </div>
                <button class="blockBtn p-1.5 rounded-full ${isBlocked ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'} hover:bg-red-200 dark:hover:bg-red-800 transition">
                    <i data-lucide="${isBlocked ? 'check' : 'x'}"></i>
                </button>
            `;
            div.addEventListener('click', (e) => {
                if (!e.target.classList.contains('blockBtn')) {
                    openPrivateChat(uid, userData);
                }
            });
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
                    status.textContent = online ? userData.bio || 'Online' : userData.bio || 'Offline';
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
                        lastMsgEl.textContent = (msg.uid === currentUser.uid ? 'You: ' : '') + (msg.text || 'Image').substring(0, 30) + ((msg.text || 'Image').length > 30 ? '...' : '');
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

// Search Users and Messages
searchInput.addEventListener('input', async (e) => {
    const searchText = e.target.value.trim();
    searchResults.innerHTML = '';
    if (searchText.length < 2) return;

    try {
        // Search Users
        const userQ = query(collection(db, 'users'), where('name', '>=', searchText), where('name', '<=', searchText + '\uf8ff'));
        const userSnapshot = await getDocs(userQ);
        if (!currentUser) return;
        const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const currentUserData = currentUserSnap.data() || {};
        const friends = currentUserData.friends || [];
        const incomingRequests = currentUserData.friendRequests || [];

        userSnapshot.forEach((docSnap) => {
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
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(user.bio || 'No bio')}</p>
                </div>
                <button class="sendRequestBtn p-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition ${alreadyFriend || requestSent ? 'opacity-50 cursor-not-allowed' : ''}">
                    ${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Add Friend'}
                </button>
            `;
            if (!alreadyFriend && !requestSent) {
                div.querySelector('.sendRequestBtn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    sendFriendRequest(user.uid);
                });
            }
            searchResults.appendChild(div);
        });

        // Search Messages
        const msgQ = query(collection(db, 'chats', currentChatId, 'messages'), where('text', '>=', searchText), where('text', '<=', searchText + '\uf8ff'));
        const msgSnapshot = await getDocs(msgQ);
        msgSnapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const div = document.createElement('div');
            div.className = 'flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer';
            div.innerHTML = `
                <div class="flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${escapeHtml(msg.name || 'User')}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(msg.text.substring(0, 50))}...</p>
                </div>
            `;
            div.addEventListener('click', () => {
                const messageEl = document.querySelector(`[data-message-id="${docSnap.id}"]`);
                if (messageEl) {
                    messages.scrollTop = messageEl.offsetTop - 20;
                }
            });
            searchResults.appendChild(div);
        });

        if (searchResults.innerHTML === '') {
            searchResults.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No results found</p>';
        }
    } catch (err) {
        showToast('Error searching: ' + err.message);
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
        currentChatStatusText = online ? friendData.bio || 'Online' : friendData.bio || 'Offline';
        updateChatHeader();
    });
    presenceListeners.push(unsub);
    listenForTyping();
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
    typingIndicator.classList.add('hidden');
    sidebar.classList.remove('sidebar-open');
    sidebarOverlay.classList.add('hidden');
    presenceListeners.forEach(unsub => unsub());
    presenceListeners = [];
}

// Update Chat Header
function updateChatHeader() {
    chatImg.src = currentChatPhoto;
    chatName.textContent = currentChatNameText;
    chatStatus.textContent = currentChatStatusText;
    const ind = document.getElementById('chatIndicator');
    ind.className = 'online-indicator ' + (currentChatStatusText === 'Online' || currentChatStatusText === 'Public' ? 'bg-green-500' : 'bg-gray-400');
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
                        showToast(`New message from ${msg.name}: ${msg.text || 'Image'}`);
                        if (Notification.permission === 'granted') {
                            new Notification(`New message from ${msg.name}`, { body: msg.text || 'Sent an image' });
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
                showToast(`New message in World Chat: ${msg.text || 'Image'}`);
                if (Notification.permission === 'granted') {
                    new Notification('New message in World Chat', { body: msg.text || 'Sent an image' });
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

// Event Listeners (continued from where left off)
sendAnnouncementBtn.addEventListener('click', () => {
    const text = announcementInput.value.trim();
    if (!text) {
        showToast('Please enter an announcement');
        return;
    }
    sendAnnouncement(text);
});

// Chat Info Button (Shows chat details or participants)
chatInfoBtn.addEventListener('click', async () => {
    if (currentChatId === 'global') {
        showToast('World Chat is a public chatroom');
        return;
    }
    const [uid1, uid2] = currentChatId.split('_');
    const otherUid = uid1 === currentUser.uid ? uid2 : uid1;
    const userSnap = await getDoc(doc(db, 'users', otherUid));
    if (userSnap.exists()) {
        const userData = userSnap.data();
        showToast(`${userData.name || 'User'}\n${userData.bio || 'No bio'}\n${userData.email || 'No email'}`);
    } else {
        showToast('User information not available');
    }
});

// Handle Enter Key for Sending Messages
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// Initialize Dark Mode from Local Storage
if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// Event Listeners (previously defined)
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
    const icon = darkModeToggle.querySelector('i');
    icon.dataset.lucide = document.documentElement.classList.contains('dark') ? 'moon' : 'sun';
    lucide.createIcons();
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

adminBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
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

closeAdmin.addEventListener('click', () => {
    adminModal.classList.add('hidden');
});

changePhotoBtn.addEventListener('click', () => {
    profilePhotoInput.click();
});

profilePhotoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = await uploadProfilePhoto(file);
        if (url) {
            profilePhoto.src = url;
        }
    }
});

saveProfileBtn.addEventListener('click', () => {
    const name = profileNameInput.value.trim();
    const bio = profileBioInput.value.trim();
    if (!name) {
        showToast('Name is required');
        return;
    }
    updateUserProfile(name, profilePhoto.src, bio);
    profileModal.classList.add('hidden');
});

banUserBtn.addEventListener('click', () => {
    const email = banUserInput.value.trim();
    if (!email) {
        showToast('Please enter an email');
        return;
    }
    banOrMuteUser(email, 'banned');
    banUserInput.value = '';
});

// Service Worker Registration for Offline Support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.error('Service Worker registration failed:', err));
}
