// chat.js
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore();

let unsubscribeMessages = null;

export function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  const q = query(collection(db, 'messages'), orderBy('timestamp'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    snapshot.forEach((snapDoc) => {
      const msg = snapDoc.data();
      const el = document.createElement('div');
      el.className = 'msg';
      const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
      el.innerHTML = `<strong>${escapeHtml(msg.name || 'Unknown')}:</strong> ${escapeHtml(msg.text || '')} <span style="float:right;font-size:0.8em;color:#666">${time}</span>`;
      messagesDiv.appendChild(el);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, (err) => {
    console.error('Messages onSnapshot error', err);
  });
}

export async function sendMessage(currentUser, text) {
  if (!currentUser) { alert('Please login first'); return; }
  if (!text) return;
  try {
    await addDoc(collection(db, 'messages'), {
      text,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      uid: currentUser.uid,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Send message error', err);
    alert('Failed to send message');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
