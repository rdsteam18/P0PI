// friends-request.js
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { loadFriendsList } from "./friends-list.js";

const db = getFirestore();

let unsubscribeFriendRequests = null;

export function listenToFriendRequests(currentUser) {
  if (!currentUser) return;
  if (unsubscribeFriendRequests) unsubscribeFriendRequests();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribeFriendRequests = onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    renderFriendRequests(requests, currentUser);
  }, (err) => {
    console.error('Friend requests onSnapshot error', err);
  });
}

async function renderFriendRequests(requestUids, currentUser) {
  const container = document.getElementById('friendRequests');
  container.innerHTML = '';
  if (requestUids.length === 0) {
    container.innerHTML = 'No friend requests';
    return;
  }
  for (const uid of requestUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    const div = document.createElement('div');

    div.innerHTML = `
      <div class="friendName">
        <img src="${escapeHtml(userData.photo||'')}" alt="photo" />
        <span>${escapeHtml(userData.name||userData.email||'User')}</span>
      </div>
      <div>
        <button class="acceptBtn">Accept</button>
        <button class="rejectBtn">Reject</button>
      </div>
    `;

    div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid, currentUser));
    div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid, currentUser));

    container.appendChild(div);
  }
}

async function acceptFriendRequest(requesterUid, currentUser) {
  const currentRef = doc(db, 'users', currentUser.uid);
  const requesterRef = doc(db, 'users', requesterUid);

  await updateDoc(currentRef, {
    friends: arrayUnion(requesterUid),
    friendRequests: arrayRemove(requesterUid)
  });

  await updateDoc(requesterRef, {
    friends: arrayUnion(currentUser.uid)
  });

  alert('Friend request accepted!');
  loadFriendsList(currentUser);
}

async function rejectFriendRequest(requesterUid, currentUser) {
  const currentRef = doc(db, 'users', currentUser.uid);

  await updateDoc(currentRef, {
    friendRequests: arrayRemove(requesterUid)
  });

  alert('Friend request rejected!');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
