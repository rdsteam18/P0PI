// friendRequests.js
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const friendRequestsDiv = document.getElementById('friendRequests');

let unsubscribe = null;

export function listenToFriendRequests() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    friendRequestsDiv.innerHTML = 'No friend requests';
    return;
  }
  if (unsubscribe) unsubscribe();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribe = onSnapshot(userRef, async (docSnap) => {
    if (!docSnap.exists()) { friendRequestsDiv.innerHTML = 'No friend requests'; return; }
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    await renderFriendRequests(requests);
  });
}

export async function renderFriendRequests(requestUids) {
  friendRequestsDiv.innerHTML = '';
  if (!requestUids || requestUids.length === 0) {
    friendRequestsDiv.innerHTML = 'No friend requests';
    return;
  }

  for (const uid of requestUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();

    const div = document.createElement('div');
    div.className = 'friendName';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <img src="${escapeHtml(userData.photo||'')}" alt="photo" />
        <span>${escapeHtml(userData.name||userData.email||'User')}</span>
      </div>
      <div>
        <button class="acceptBtn">Accept</button>
        <button class="rejectBtn">Reject</button>
      </div>
    `;
    div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
    div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));
    friendRequestsDiv.appendChild(div);
  }
}

export async function sendFriendRequest(targetUid) {
  const currentUser = getCurrentUser();
  if (!currentUser) return alert('Please login first');
  if (targetUid === currentUser.uid) return alert("You can't send request to yourself!");
  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, { friendRequests: arrayUnion(currentUser.uid) });
  alert('Friend request sent!');
  // notify friends list to reload
  window.dispatchEvent(new Event('friendsUpdated'));
}

export async function acceptFriendRequest(requesterUid) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  const requesterRef = doc(db, 'users', requesterUid);

  await updateDoc(currentRef, { friends: arrayUnion(requesterUid), friendRequests: arrayRemove(requesterUid) });
  await updateDoc(requesterRef, { friends: arrayUnion(currentUser.uid) });

  alert('Friend request accepted!');
  window.dispatchEvent(new Event('friendsUpdated'));
}

export async function rejectFriendRequest(requesterUid) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const currentRef = doc(db, 'users', currentUser.uid);
  await updateDoc(currentRef, { friendRequests: arrayRemove(requesterUid) });
  alert('Friend request rejected!');
}
