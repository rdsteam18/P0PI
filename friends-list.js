// friends-list.js
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { auth } from "./auth.js";

const db = getFirestore();

async function loadFriendsList(currentUser) {
  if (!currentUser) return;
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) return;
  const data = userSnap.data();
  const friends = data.friends || [];
  const container = document.getElementById('friendsList');
  container.innerHTML = '';
  if (friends.length === 0) {
    container.innerHTML = 'No friends yet';
    return;
  }
  for (const uid of friends) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(userData.photo||'')}" alt="photo" />
        <span>${escapeHtml(userData.name||userData.email||'User')}</span>
      </div>
    `;
    container.appendChild(div);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export { loadFriendsList };
