// friendsList.js
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { doc, getDoc, getDocs, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const friendsListDiv = document.getElementById('friendsList');

export async function loadFriendsList() {
  const currentUser = getCurrentUser();
  friendsListDiv.innerHTML = '';
  if (!currentUser) { friendsListDiv.innerHTML = 'No friends yet'; return; }

  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) { friendsListDiv.innerHTML = 'No friends yet'; return; }
  const data = userSnap.data();
  const friends = data.friends || [];

  if (friends.length === 0) { friendsListDiv.innerHTML = 'No friends yet'; return; }

  for (const uid of friends) {
    const fSnap = await getDoc(doc(db, 'users', uid));
    if (!fSnap.exists()) continue;
    const f = fSnap.data();

    const div = document.createElement('div');
    div.className = 'friendName';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <img src="${escapeHtml(f.photo||'')}" alt="photo" />
        <span>${escapeHtml(f.name||f.email||'User')}</span>
      </div>
      <div>
        <button class="chatBtn">Chat</button>
        <button class="blockBtn">${(data.blockedUsers||[]).includes(uid) ? 'Unblock' : 'Block'}</button>
      </div>
    `;

    div.querySelector('.chatBtn').addEventListener('click', () => {
      // notify chat module to open chat with this uid
      window.dispatchEvent(new CustomEvent('friendSelected', { detail: uid }));
    });

    div.querySelector('.blockBtn').addEventListener('click', async (e) => {
      const currentRef = doc(db, 'users', currentUser.uid);
      const isBlocked = (data.blockedUsers || []).includes(uid);
      if (isBlocked) {
        await updateDoc(currentRef, { blockedUsers: arrayRemove(uid) });
        e.target.textContent = 'Block';
      } else {
        await updateDoc(currentRef, { blockedUsers: arrayUnion(uid) });
        e.target.textContent = 'Unblock';
      }
      // reload friends list after change
      setTimeout(loadFriendsList, 200);
    });

    friendsListDiv.appendChild(div);
  }
}

// reload on event
window.addEventListener('friendsUpdated', () => { setTimeout(loadFriendsList, 200); });
window.addEventListener('authChanged', () => { setTimeout(loadFriendsList, 200); });
