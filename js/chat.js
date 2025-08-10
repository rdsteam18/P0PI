import { currentUser, db } from './auth.js';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from './utils.js';

const chatArea = document.getElementById('chatArea');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const chatFriendInfo = document.getElementById('chatFriendInfo');
const blockBtn = document.getElementById('blockBtn');
const deleteChatBtn = document.getElementById('deleteChatBtn');

let selectedFriendUid = null;
let unsubscribeMessages = null;

function clearChat() {
  messagesDiv.innerHTML = '';
  chatFriendInfo.innerHTML = '';
  blockBtn.classList.remove('blocked');
  blockBtn.textContent = 'Block';
  selectedFriendUid = null;
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeMessages = null;
  msgInput.value = '';
  chatArea.style.display = 'none';
}

function loadMessagesWithFriend(friendUid) {
  if (!currentUser || !friendUid) return;

  clearChat();
  chatArea.style.display = 'block';
  selectedFriendUid = friendUid;

  const userRef = doc(db, 'users', currentUser.uid);
  getDoc(userRef).then(userSnap => {
    const userData = userSnap.data();
    if (userData.blockedUsers && userData.blockedUsers.includes(friendUid)) {
      blockBtn.classList.add('blocked');
      blockBtn.textContent = 'Unblock';
    } else {
      blockBtn.classList.remove('blocked');
      blockBtn.textContent = 'Block';
    }
  });

  // Show friend's name and photo
  getDoc(doc(db, 'users', friendUid)).then(friendSnap => {
    if (!friendSnap.exists()) return;
    const friendData = friendSnap.data();
    chatFriendInfo.innerHTML = `
      <img src="${escapeHtml(friendData.photo || '')}" alt="photo" style="width:40px; border-radius:50%; margin-right:8px;" />
      <strong>${escapeHtml(friendData.name || friendData.email || 'User')}</strong>
    `;
  });

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      if (
        (msg.uid === currentUser.uid && msg.toUid === friendUid) ||
        (msg.uid === friendUid && msg.toUid === currentUser.uid)
      ) {
        const el = document.createElement('div');
        el.className = 'msg';
        el.style.textAlign = msg.uid === currentUser.uid ? 'right' : 'left';
        const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
        el.innerHTML = `<strong>${escapeHtml(msg.name || 'Unknown')}:</strong> ${escapeHtml(msg.text || '')} <br><small style="color:#666">${time}</small>`;
        messagesDiv.appendChild(el);
      }
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, err => {
    console.error('Messages onSnapshot error', err);
  });
}

sendBtn.addEventListener('click', async () => {
  if (!currentUser) { alert('Please login first'); return; }
  if (!selectedFriendUid) { alert('Please select a friend to chat'); return; }
  const text = msgInput.value.trim();
  if (!text) return;

  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  if (userData.blockedUsers && userData.blockedUsers.includes(selectedFriendUid)) {
    alert('You have blocked this user. Unblock to send messages.');
    return;
  }

  const friendRef = doc(db, 'users', selectedFriendUid);
  const friendSnap = await getDoc(friendRef);
  const friendData = friendSnap.data();
  if (friendData.blockedUsers && friendData.blockedUsers.includes(currentUser.uid)) {
    alert('You are blocked by this user. Cannot send messages.');
    return;
  }

  try {
    await addDoc(collection(db, 'messages'), {
      text,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      uid: currentUser.uid,
      toUid: selectedFriendUid,
      timestamp: serverTimestamp()
    });
    msgInput.value = '';
  } catch (err) {
    console.error('Send message error', err);
    alert('Failed to send message');
  }
});

const blockBtnElem = document.createElement('button');
blockBtnElem.id = 'blockBtn';
blockBtnElem.textContent = 'Block';
blockBtnElem.style.marginLeft = '8px';

const deleteChatBtnElem = document.createElement('button');
deleteChatBtnElem.id = 'deleteChatBtn';
deleteChatBtnElem.textContent = 'Delete Chat';
deleteChatBtnElem.style.marginLeft = '8px';

chatArea.insertBefore(blockBtnElem, msgInput.parentElement);
chatArea.insertBefore(deleteChatBtnElem, msgInput.parentElement);

blockBtnElem.addEventListener('click', async () => {
  if (!currentUser || !selectedFriendUid) return;
  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  let blockedUsers = userData.blockedUsers || [];

  if (blockedUsers.includes(selectedFriendUid)) {
    // Unblock user
    blockedUsers = blockedUsers.filter(uid => uid !== selectedFriendUid);
    await updateDoc(userRef, { blockedUsers });
    blockBtnElem.classList.remove('blocked');
    blockBtnElem.textContent = 'Block';
  } else {
    // Block user
    blockedUsers.push(selectedFriendUid);
    await updateDoc(userRef, { blockedUsers });
    blockBtnElem.classList.add('blocked');
    blockBtnElem.textContent = 'Unblock';

    // Optionally clear chat after block
    messagesDiv.innerHTML = '';
  }
});

deleteChatBtnElem.addEventListener('click', async () => {
  if (!currentUser || !selectedFriendUid) return;
  if (!confirm('Are you sure you want to delete chat history with this user?')) return;

  // Delete all messages between currentUser and selectedFriendUid
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));
  const snapshot = await getDocs(q);
  const batch = db.batch ? db.batch() : null;

  for (const docSnap of snapshot.docs) {
    const msg = docSnap.data();
    if (
      (msg.uid === currentUser.uid && msg.toUid === selectedFriendUid) ||
      (msg.uid === selectedFriendUid && msg.toUid === currentUser.uid)
    ) {
      if (batch) {
        batch.delete(docSnap.ref);
      } else {
        await docSnap.ref.delete();
      }
    }
  }

  if (batch) await batch.commit();

  messagesDiv.innerHTML = '';
});
