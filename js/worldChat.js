// worldChat.js
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const worldMessagesDiv = document.getElementById('worldMessages');
const worldInput = document.getElementById('worldMsgInput');
const worldSendBtn = document.getElementById('worldSendBtn');

let unsubscribeWorld = null;

export function listenWorld() {
  const messagesRef = collection(db, 'worldMessages');
  const q = query(messagesRef, orderBy('timestamp'));
  if (unsubscribeWorld) unsubscribeWorld();
  unsubscribeWorld = onSnapshot(q, snapshot => {
    worldMessagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const el = document.createElement('div');
      el.className = 'msg received';
      el.innerHTML = `<strong>${escapeHtml(m.name||'Anonymous')}:</strong> ${escapeHtml(m.text||'')} <br><small style="color:#666">${m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleTimeString() : ''}</small>`;
      worldMessagesDiv.appendChild(el);
    });
    worldMessagesDiv.scrollTop = worldMessagesDiv.scrollHeight;
  });
}

worldSendBtn.addEventListener('click', async () => {
  const me = getCurrentUser();
  if (!me) { alert('Please login'); return; }
  const text = worldInput.value.trim();
  if (!text) return;
  try {
    await addDoc(collection(db, 'worldMessages'), {
      text,
      name: me.displayName || me.email || 'Anonymous',
      uid: me.uid,
      timestamp: serverTimestamp()
    });
    worldInput.value = '';
  } catch (err) {
    console.error('world send err', err);
    alert('Failed to send');
  }
});

// start listening when auth changes
window.addEventListener('authChanged', () => listenWorld());
// immediate call to start (if module loads after auth)
listenWorld();
