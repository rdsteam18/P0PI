import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

let unsubscribeMessages = null;
let selectedFriendUid = null;

export function clearChat() {
  if (unsubscribeMessages) unsubscribeMessages();
  messagesDiv.innerHTML = '';
  selectedFriendUid = null;
  document.getElementById('chatFriendName').textContent = '';
  document.getElementById('chatSection').style.display = 'none';
}

export function loadMessagesWithFriend(friendUid) {
  const currentUser = getCurrentUser();
  if (!currentUser || !friendUid) return;
  if (unsubscribeMessages) unsubscribeMessages();

  selectedFriendUid = friendUid;
  messagesDiv.innerHTML = '';

  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      // Filter messages between currentUser and friendUid only
      if (
        (msg.uid === currentUser.uid && msg.toUid === friendUid) ||
        (msg.uid === friendUid && msg.toUid === currentUser.uid)
      ) {
        const el = document.createElement('div');
        el.className = 'msg';
        el.classList.add(msg.uid === currentUser.uid ? 'sent' : 'received');
        const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
        el.innerHTML = `<strong>${escapeHtml(msg.name || 'Unknown')}:</strong> ${escapeHtml(msg.text || '')}<br><small>${time}</small>`;
        messagesDiv.appendChild(el);
      }
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, (err) => {
    console.error('Messages onSnapshot error', err);
  });
}

sendBtn.addEventListener('click', async () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return alert('Please login first');
  if (!selectedFriendUid) return alert('Please select a friend to chat');
  const text = msgInput.value.trim();
  if (!text) return;

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
    alert('Failed to send message');
    console.error(err);
  }
});
