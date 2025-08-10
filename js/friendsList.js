import { currentUser, db } from './auth.js';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from './utils.js';
import { loadFriendsList } from './friends.js';

let unsubscribeFriendRequests = null;

export function listenToFriendRequests() {
  if (!currentUser) return;
  if (unsubscribeFriendRequests) unsubscribeFriendRequests();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribeFriendRequests = onSnapshot(userRef, async (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    renderFriendRequests(requests);
  });
}

async function renderFriendRequests(requestUids) {
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
        <img src="${escapeHtml(userData.photo || '')}" alt="photo" />
        <span>${escapeHtml(userData.name || userData.email || 'User')}</span>
      </div>
      <div>
        <button class="acceptBtn">Accept</button>
        <button class="rejectBtn">Reject</button>
      </div>
    `;

    div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
    div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));

    container.appendChild(div);
  }
}

export async function sendFriendRequest(targetUid) {
  if (!currentUser) { alert('Please login first'); return; }
  if (targetUid === currentUser.uid) { alert("You can't send request to yourself!"); return; }

  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(currentUser.uid)
  });
  alert('Friend request sent!');
  loadFriendsList();
  listenToFriendRequests();
}

export async function acceptFriendRequest(requesterUid) {
  if (!currentUser) return;
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
  listenToFriendRequests();
  loadFriendsList();
}

export async function rejectFriendRequest(requesterUid) {
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);

  await updateDoc(currentRef, {
    friendRequests: arrayRemove(requesterUid)
  });

  alert('Friend request rejected!');
  listenToFriendRequests();
}
