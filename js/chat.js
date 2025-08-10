// chat.js
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const chatSection = document.getElementById('chatSection');
const chatFriendInfo = document.getElementById('chatFriendInfo');
const blockBtn = document.getElementById('blockBtn');
const deleteChatBtn = document.getElementById('deleteChatBtn');

let unsubscribeMessages = null;
let currentFriendUid = null;

function renderMessage(docSnap) {
  const msg = docSnap.data();
  const id = docSnap.id;
  const el = document.createElement('div');
  el.className = 'msg ' + (msg.uid === getCurrentUser().uid ? 'sent' : 'received');
  const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString() : '';
  el.innerHTML = `<strong>${escapeHtml(msg.name||'Unknown')}:</strong> ${escapeHtml(msg.text||'')} <br><small style="color:#666">${time}</small>`;

  // delete button for own messages
  if (msg.uid === getCurrentUser().uid) {
    const del = document.createElement('button');
    del.className = 'deleteBtn';
    del.textContent = '✖';
    del.title = 'Delete message';
    del.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return;
      try {
        await deleteDoc(doc(db, 'messages', id));
      } catch (err) {
        console.error('Delete message error', err);
        alert('Failed to delete message');
      }
    });
    el.appendChild(del);
  }
  messagesDiv.appendChild(el);
}

export async function loadMessagesWithFriend(friendUid) {
  const me = getCurrentUser();
  if (!me || !friendUid) return;

  // set UI
  chatSection.style.display = 'block';
  currentFriendUid = friendUid;
  const friendSnap = await getDoc(doc(db, 'users', friendUid));
  const friendData = friendSnap.exists() ? friendSnap.data() : {};
  chatFriendInfo.innerHTML = `<img src="${escapeHtml(friendData.photo||'')}" style="width:40px;border-radius:50%;margin-right:8px" /> <strong>${escapeHtml(friendData.name||friendData.email||'User')}</strong>`;

  // set block button state
  const meSnap = await getDoc(doc(db, 'users', me.uid));
  const meData = meSnap.exists() ? meSnap.data() : {};
  const isBlocked = (meData.blockedUsers || []).includes(friendUid);
  blockBtn.textContent = isBlocked ? 'Unblock' : 'Block';
  blockBtn.classList.toggle('blocked', isBlocked);

  // unsubscribe previous
  if (unsubscribeMessages) unsubscribeMessages();

  // realtime messages (global messages collection filtered in memory)
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      if (
        (msg.uid === me.uid && msg.toUid === friendUid) ||
        (msg.uid === friendUid && msg.toUid === me.uid)
      ) {
        renderMessage(docSnap);
      }
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, err => console.error('messages listen err', err));
}

// listen to selection events
window.addEventListener('friendSelected', (e) => {
  loadMessagesWithFriend(e.detail);
});

sendBtn.addEventListener('click', async () => {
  const me = getCurrentUser();
  if (!me) { alert('Please login'); return; }
  if (!currentFriendUid) { alert('Select a friend'); return; }
  const text = msgInput.value.trim();
  if (!text) return;

  // check block status both sides
  const meSnap = await getDoc(doc(db, 'users', me.uid));
  const friendSnap = await getDoc(doc(db, 'users', currentFriendUid));
  const meData = meSnap.exists() ? meSnap.data() : {};
  const friendData = friendSnap.exists() ? friendSnap.data() : {};

  if ((meData.blockedUsers||[]).includes(currentFriendUid)) {
    alert('You have blocked this user. Unblock to send messages.');
    return;
  }
  if ((friendData.blockedUsers||[]).includes(me.uid)) {
    alert('You are blocked by this user. Cannot send messages.');
    return;
  }

  try {
    await addDoc(collection(db, 'messages'), {
      text,
      name: me.displayName || me.email || 'Anonymous',
      uid: me.uid,
      toUid: currentFriendUid,
      timestamp: serverTimestamp()
    });
    msgInput.value = '';
  } catch (err) {
    console.error('send error', err);
    alert('Failed to send');
  }
});

// block/unblock button handler
blockBtn.addEventListener('click', async () => {
  const me = getCurrentUser();
  if (!me || !currentFriendUid) return;
  const meRef = doc(db, 'users', me.uid);
  const meSnap = await getDoc(meRef);
  const meData = meSnap.exists() ? meSnap.data() : {};
  const blocked = meData.blockedUsers || [];
  if (blocked.includes(currentFriendUid)) {
    // unblock
    const newArr = blocked.filter(u => u !== currentFriendUid);
    await updateDoc(meRef, { blockedUsers: newArr });
    blockBtn.textContent = 'Block';
    blockBtn.classList.remove('blocked');
  } else {
    // block
    await updateDoc(meRef, { blockedUsers: arrayUnion(currentFriendUid) });
    blockBtn.textContent = 'Unblock';
    blockBtn.classList.add('blocked');
    // optionally clear messages UI
    messagesDiv.innerHTML = '';
  }
});

// delete chat history
deleteChatBtn.addEventListener('click', async () => {
  const me = getCurrentUser();
  if (!me || !currentFriendUid) return;
  if (!confirm('Delete entire chat history with this friend?')) return;
  // fetch all messages and delete pair messages
  const snaps = await getDocs(collection(db, 'messages'));
  const deletes = [];
  for (const d of snaps.docs) {
    const m = d.data();
    if ((m.uid === me.uid && m.toUid === currentFriendUid) || (m.uid === currentFriendUid && m.toUid === me.uid)) {
      deletes.push(deleteDoc(doc(db, 'messages', d.id)));
    }
  }
  await Promise.all(deletes);
  messagesDiv.innerHTML = '';
});
