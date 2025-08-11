// chat.js
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js";
import { auth } from "./auth.js";

const db = getFirestore();
const dbRT = getDatabase();

let unsubscribeMessages = null;

function loadMessages(currentChatId) {
  if (unsubscribeMessages) unsubscribeMessages();
  const q = query(collection(db, 'chats', currentChatId, 'messages'), orderBy('timestamp'));
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

function sendMessage(currentChatId, currentUser, text) {
  addDoc(collection(db, 'chats', currentChatId, 'messages'), {
    text,
    name: currentUser.displayName || currentUser.email || 'Anonymous',
    uid: currentUser.uid,
    timestamp: serverTimestamp()
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export { loadMessages, sendMessage };
