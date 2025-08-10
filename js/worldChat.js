import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const worldMessagesDiv = document.getElementById('worldMessages');
const worldMsgInput = document.getElementById('worldMsgInput');
const worldSendBtn = document.getElementById('worldSendBtn');

let unsubscribeWorld = null;

export function loadWorldMessages() {
  if (unsubscribeWorld) unsubscribeWorld();

  const messagesRef = collection(db, 'worldMessages');
  const q = query(messagesRef, orderBy('timestamp'));

  unsubscribeWorld = onSnapshot(q, (snapshot) => {
    worldMessagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const el = document.createElement('div');
      el.className = 'msg received';
      const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
      el.innerHTML = `<strong>${escapeHtml(msg.name || 'Anonymous')}:</strong> ${escapeHtml(msg.text || '')} <br><small>${time}</small>`;
      worldMessagesDiv.appendChild(el);
    });
    worldMessagesDiv.scrollTop = worldMessagesDiv.scrollHeight;
  }, (err) => {
    console.error('World chat onSnapshot error', err);
  });
}

worldSendBtn.addEventListener('click', async () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return alert('Please login first');
  const text = worldMsgInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, 'worldMessages'), {
      text,
      name: currentUser.displayName || currentUser.email || 'Anonymous',
      uid: currentUser.uid,
      timestamp: serverTimestamp()
    });
    worldMsgInput.value = '';
  } catch (err) {
    alert('Failed to send world message');
    console.error(err);
  }
});
