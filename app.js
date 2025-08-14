import { 
  auth, 
  provider, 
  db, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  getDocs, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc
} from './firebase-init.js';

// Global variables
let currentUser = null;
let unsubscribeMessages = null;
let unsubscribeFriendRequests = null;
let unsubscribeUserProfile = null;
let unreadMessagesCount = 0;
let unreadRequestsCount = 0;
let notificationPermission = Notification.permission;
let isNotificationEnabled = true;
let activeTab = 'home';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const friendRequests = document.getElementById('friendRequests');
const friendsList = document.getElementById('friendsList');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const notificationArea = document.getElementById('notificationArea');
const notificationToggle = document.getElementById('notificationToggle');
const darkModeToggle = document.getElementById('darkModeToggle');
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
const friendRequestsSummary = document.getElementById('friendRequestsSummary');
const recentMessages = document.getElementById('recentMessages');

// Initialize the app
function initApp() {
  setupEventListeners();
  initAuth();
  initTheme();
}

// Set up event listeners
function setupEventListeners() {
  // Tab navigation
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.dataset.tab;
      switchTab(tabId);
    });
  });

  // Authentication
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  // Messaging
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (msgInput) msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Search
  if (searchInput) searchInput.addEventListener('input', handleSearch);
  
  // Settings
  if (notificationToggle) {
    notificationToggle.addEventListener('change', (e) => {
      isNotificationEnabled = e.target.checked;
      saveSettings();
    });
  }
  
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
      document.body.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
      saveSettings();
    });
  }
}

// Initialize authentication
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await saveUserProfile(user);
      showUser(user);
      loadSettings();
      switchTab('home');
      loadMessages();
      listenToFriendRequests();
      loadFriendsList();
    } else {
      currentUser = null;
      showUser(null);
      clearFriendRequestsUI();
      clearFriendsListUI();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeFriendRequests) unsubscribeFriendRequests();
      if (unsubscribeUserProfile) unsubscribeUserProfile();
    }
  });
}

// Handle login
async function handleLogin() {
  try {
    await signInWithPopup(auth, provider);
    showNotification('Login successful!', 'success');
  } catch (err) {
    console.error('Login error', err);
    showNotification('Login failed: ' + (err.message || err), 'error');
  }
}

// Handle logout
async function handleLogout() {
  try {
    await signOut(auth);
    showNotification('Logged out successfully', 'success');
  } catch (err) {
    console.error('Logout error', err);
    showNotification('Logout failed: ' + (err.message || err), 'error');
  }
}

// Save user profile
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

// Show user info
function showUser(user) {
  if (!user) {
    userInfo.innerHTML = '';
    return;
  }
  
  userInfo.innerHTML = `
    <img src="${user.photoURL || ''}" alt="photo" />
    <strong>${user.displayName || user.email || 'User'}</strong>
  `;
}

// Switch between tabs
function switchTab(tabId) {
  // Update active tab link
  tabLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabId);
  });
  
  // Show active tab content
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}-tab`);
  });
  
  activeTab = tabId;
  
  // Reset notification counts when switching to relevant tabs
  if (tabId === 'chat') {
    unreadMessagesCount = 0;
    updateTabBadges();
  } else if (tabId === 'friends') {
    unreadRequestsCount = 0;
    updateTabBadges();
  }
  
  // Update dashboard when switching to home
  if (tabId === 'home') {
    updateDashboard();
  }
}

// Update dashboard
function updateDashboard() {
  // Update friend requests summary
  if (unreadRequestsCount > 0) {
    friendRequestsSummary.innerHTML = `
      <div class="notification-badge">${unreadRequestsCount}</div>
      <p>You have ${unreadRequestsCount} pending friend request${unreadRequestsCount > 1 ? 's' : ''}</p>
      <button class="primary" data-tab="friends">View Requests</button>
    `;
    friendRequestsSummary.querySelector('button').addEventListener('click', () => {
      switchTab('friends');
    });
  } else {
    friendRequestsSummary.innerHTML = '<p>No pending friend requests</p>';
  }
  
  // Update recent messages (simplified example)
  recentMessages.innerHTML = '<p>Your recent messages will appear here</p>';
}

// Update tab badges
function updateTabBadges() {
  tabLinks.forEach(link => {
    const tabId = link.dataset.tab;
    let badge = link.querySelector('.tab-badge');
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      link.appendChild(badge);
    }
    
    if (tabId === 'chat' && unreadMessagesCount > 0) {
      badge.textContent = unreadMessagesCount;
      badge.style.display = 'inline-block';
    } else if (tabId === 'friends' && unreadRequestsCount > 0) {
      badge.textContent = unreadRequestsCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  });
}

// Send message
async function sendMessage() {
  if (!currentUser) {
    showNotification('Please login first', 'error');
    return;
  }
  
  const text = msgInput.value.trim();
  if (!text) return;
  
  try {
    await addDoc(collection(db, 'messages'), {
      text,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      uid: currentUser.uid,
      timestamp: serverTimestamp()
    });
    msgInput.value = '';
  } catch (err) {
    console.error('Send message error', err);
    showNotification('Failed to send message', 'error');
  }
}

// Load messages
function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  
  const q = query(collection(db, 'messages'), orderBy('timestamp'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach((snapDoc) => {
      const msg = snapDoc.data();
      displayMessage(msg);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Update unread count if not on chat tab
    if (activeTab !== 'chat') {
      unreadMessagesCount++;
      updateTabBadges();
    }
  }, (err) => {
    console.error('Messages onSnapshot error', err);
  });
}

// Display a message
function displayMessage(msg) {
  const el = document.createElement('div');
  el.className = 'msg';
  const time = msg.timestamp && msg.timestamp.toDate ? 
    msg.timestamp.toDate().toLocaleTimeString() : '';
  
  el.innerHTML = `
    <strong>${escapeHtml(msg.name || 'Unknown')}:</strong> 
    ${escapeHtml(msg.text || '')} 
    <span class="msg-time">${time}</span>
  `;
  messagesDiv.appendChild(el);
}

// Handle search
async function handleSearch(e) {
  const searchText = e.target.value.trim();
  searchResults.innerHTML = '';
  
  if (searchText.length < 2) return;
  if (!currentUser) {
    searchResults.innerHTML = 'Please login to send friend requests.';
    return;
  }
  
  try {
    const q = query(
      collection(db, 'users'), 
      where('name', '>=', searchText),
      where('name', '<=', searchText + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    const currentUserData = await getUserData(currentUser.uid);
    
    if (!currentUserData) return;
    
    const friends = currentUserData.friends || [];
    const incomingRequests = currentUserData.friendRequests || [];
    
    if (querySnapshot.empty) {
      searchResults.innerHTML = 'No users found';
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const user = docSnap.data();
      if (user.uid === currentUser.uid) return;
      
      const alreadyFriend = friends.includes(user.uid);
      const requestReceived = incomingRequests.includes(user.uid);
      
      const div = document.createElement('div');
      div.className = 'friendName';
      
      div.innerHTML = `
        <img src="${escapeHtml(user.photo || '')}" alt="photo" />
        <span>${escapeHtml(user.name || user.email || 'User')}</span>
        <button class="${alreadyFriend ? 'disabled' : requestReceived ? 'pending' : 'primary'}" 
                ${alreadyFriend || requestReceived ? 'disabled' : ''}>
          ${alreadyFriend ? 'Friends' : requestReceived ? 'Request Sent' : 'Add Friend'}
        </button>
      `;
      
      if (!alreadyFriend && !requestReceived) {
        div.querySelector('button').addEventListener('click', () => {
          sendFriendRequest(user.uid);
        });
      }
      
      searchResults.appendChild(div);
    });
  } catch (err) {
    console.error('Search error', err);
    searchResults.innerHTML = 'Error searching users';
  }
}

// Send friend request
async function sendFriendRequest(targetUid) {
  if (!currentUser) {
    showNotification('Please login first', 'error');
    return;
  }
  
  if (targetUid === currentUser.uid) {
    showNotification("You can't send request to yourself!", 'error');
    return;
  }
  
  try {
    const targetRef = doc(db, 'users', targetUid);
    await updateDoc(targetRef, {
      friendRequests: arrayUnion(currentUser.uid)
    });
    showNotification('Friend request sent!', 'success');
  } catch (err) {
    console.error('Send friend request error', err);
    showNotification('Failed to send friend request', 'error');
  }
}

// Accept friend request
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
    
    showNotification('Friend request accepted!', 'success');
    listenToFriendRequests();
    loadFriendsList();
  } catch (err) {
    console.error('Accept friend request error', err);
    showNotification('Failed to accept friend request', 'error');
  }
}

// Reject friend request
async function rejectFriendRequest(requesterUid) {
  if (!currentUser) return;
  
  try {
    const currentRef = doc(db, 'users', currentUser.uid);
    await updateDoc(currentRef, {
      friendRequests: arrayRemove(requesterUid)
    });
    showNotification('Friend request rejected', 'success');
    listenToFriendRequests();
  } catch (err) {
    console.error('Reject friend request error', err);
    showNotification('Failed to reject friend request', 'error');
  }
}

// Listen to friend requests
function listenToFriendRequests() {
  if (!currentUser) return;
  if (unsubscribeFriendRequests) unsubscribeFriendRequests();
  
  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribeFriendRequests = onSnapshot(userRef, async (docSnap) => {
    if (!docSnap.exists()) return;
    
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    
    // Update unread count if not on friends tab
    if (activeTab !== 'friends') {
      unreadRequestsCount = requests.length;
      updateTabBadges();
    }
    
    await renderFriendRequests(requests);
  });
}

// Render friend requests
async function renderFriendRequests(requestUids) {
  friendRequests.innerHTML = '';
  
  if (requestUids.length === 0) {
    friendRequests.innerHTML = 'No friend requests';
    return;
  }
  
  for (const uid of requestUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    
    const userData = userSnap.data();
    const div = document.createElement('div');
    
    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(userData.photo || '')}" alt="photo" />
        <span>${escapeHtml(userData.name || userData.email || 'User')}</span>
      </div>
      <div>
        <button class="primary accept-btn">Accept</button>
        <button class="reject-btn">Reject</button>
      </div>
    `;
    
    div.querySelector('.accept-btn').addEventListener('click', () => {
      acceptFriendRequest(uid);
    });
    
    div.querySelector('.reject-btn').addEventListener('click', () => {
      rejectFriendRequest(uid);
    });
    
    friendRequests.appendChild(div);
  }
}

// Load friends list
async function loadFriendsList() {
  if (!currentUser) return;
  
  try {
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userSnap.exists()) return;
    
    const data = userSnap.data();
    const friends = data.friends || [];
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
      friendsList.innerHTML = 'No friends yet';
      return;
    }
    
    for (const uid of friends) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) continue;
      
      const userData = userSnap.data();
      const div = document.createElement('div');
      div.className = 'friendName';
      
      div.innerHTML = `
        <img src="${escapeHtml(userData.photo || '')}" alt="photo" />
        <span>${escapeHtml(userData.name || userData.email || 'User')}</span>
        <button class="chat-btn" data-uid="${uid}">Message</button>
      `;
      
      div.querySelector('.chat-btn').addEventListener('click', (e) => {
        const friendUid = e.target.dataset.uid;
        // For simplicity, we just show a notification
        // In a real app, you might open a private chat
        showNotification(`Opening chat with ${userData.name}`, 'success');
      });
      
      friendsList.appendChild(div);
    }
  } catch (err) {
    console.error('Load friends list error', err);
    friendsList.innerHTML = 'Error loading friends';
  }
}

// Get user data
async function getUserData(uid) {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.error('Get user data error', err);
    return null;
  }
}

// Clear UI elements
function clearFriendRequestsUI() {
  friendRequests.innerHTML = 'No friend requests';
}

function clearFriendsListUI() {
  friendsList.innerHTML = 'No friends yet';
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = message;
  
  // Add to notification area
  notificationArea.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
  
  // Show desktop notification if enabled and permission granted
  if (isNotificationEnabled && notificationPermission === 'granted' && 
      type !== 'info' && document.hidden) {
    new Notification('Study Chat', {
      body: message,
      icon: currentUser?.photoURL || ''
    });
  }
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initialize theme
function initTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  darkModeToggle.checked = darkMode;
  document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
}

// Load settings
function loadSettings() {
  isNotificationEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
  notificationToggle.checked = isNotificationEnabled;
  
  // Request notification permission
  if (isNotificationEnabled && notificationPermission !== 'granted') {
    Notification.requestPermission().then(permission => {
      notificationPermission = permission;
    });
  }
}

// Save settings
function saveSettings() {
  localStorage.setItem('notificationsEnabled', isNotificationEnabled);
  localStorage.setItem('darkMode', darkModeToggle.checked);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
