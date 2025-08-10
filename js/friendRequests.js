import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

const friendRequestsDiv = document.getElementById('friendRequests');

export async function sendFriendRequest(targetUid) {
  const currentUser = getCurrentUser();
  if (!currentUser) return alert('Please login first');
  if (targetUid === currentUser.uid) return alert("You can't send request to yourself!");

  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(currentUser.uid)
  });
  alert('Friend request sent!');
  renderFriendRequests();
}

export async function acceptFriendRequest(requesterUid) {
  const currentUser = getCurrentUser();
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
  renderFriendRequests();
  // Refresh friends list too
  import('./friendsList.js').then(mod => mod.loadFriendsList());
}

export async function rejectFriendRequest(requesterUid) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const currentRef = doc(db, 'users', currentUser.uid);
  await updateDoc(currentRef, {
    friendRequests: arrayRemove(requesterUid)
  });
  alert('Friend request rejected!');
  renderFriendRequests();
}

let unsubscribe = null;

export async function renderFriendRequests() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    friendRequestsDiv.innerHTML = 'No friend requests';
    return;
  }
  if (unsubscribe) unsubscribe();

  const userRef = doc(db, 'users', currentUser.uid);
  unsubscribe = onSnapshot(userRef, async (docSnap) => {
    if (!docSnap.exists()) {
      friendRequestsDiv.innerHTML = 'No friend requests';
      return;
    }
    const data = docSnap.data();
    const requests = data.friendRequests || [];
    if (requests.length === 0) {
      friendRequestsDiv.innerHTML = 'No friend requests';
      return;
    }
    friendRequestsDiv.innerHTML = '';

    for (const uid of requests) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) continue;
      const userData = userSnap.data();

      const div = document.createElement('div');
      div.className = 'friendName';
      div.innerHTML = `
        <img src="${escapeHtml(userData.photo || '')}" alt="photo" />
        <span>${escapeHtml(userData.name || userData.email || 'User')}</span>
        <button class="acceptBtn">Accept</button>
        <button class="rejectBtn">Reject</button>
      `;

      div.querySelector('.acceptBtn').addEventListener('click', () => acceptFriendRequest(uid));
      div.querySelector('.rejectBtn').addEventListener('click', () => rejectFriendRequest(uid));

      friendRequestsDiv.appendChild(div);
    }
  });
}
 // ----- FRIEND REQUEST SYSTEM -----

    // Send Friend Request
    async function sendFriendRequest(targetUid) {
      if (!currentUser) { alert('Please login first'); return; }
      if (targetUid === currentUser.uid) { alert("You can't send request to yourself!"); return; }

      const targetRef = doc(db, 'users', targetUid);
      await updateDoc(targetRef, {
        friendRequests: arrayUnion(currentUser.uid)
      });
      alert('Friend request sent!');
      loadFriendsList(); // update friends and requests UI
      listenToFriendRequests();
    }

    // Accept Friend Request
    async function acceptFriendRequest(requesterUid) {
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

    // Reject Friend Request
    async function rejectFriendRequest(requesterUid) {
      if (!currentUser) return;
      const currentRef = doc(db, 'users', currentUser.uid);

      await updateDoc(currentRef, {
        friendRequests: arrayRemove(requesterUid)
      });

      alert('Friend request rejected!');
      listenToFriendRequests();
    }

    // Listen to friend requests realtime
    let unsubscribeFriendRequests = null;
    function listenToFriendRequests() {
      if (!currentUser) return;
      if (unsubscribeFriendRequests) unsubscribeFriendRequests();

      const userRef = doc(db, 'users', currentUser.uid);
      unsubscribeFriendRequests = onSnapshot(userRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const requests = data.friendRequests || [];
        renderFriendRequests(requests);
      });
    }

    // Render friend requests UI
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

        container.appendChild(div);
      }
    }

    // Load friends list UI
    async function loadFriendsList() {
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

    function clearFriendRequestsUI() {
      document.getElementById('friendRequests').innerHTML = 'No friend requests';
    }
    function clearFriendsListUI() {
      document.getElementById('friendsList').innerHTML = 'No friends yet';
    }

    // Search students by name and show “Send Friend Request” button
    document.getElementById('searchInput').addEventListener('input', async (e) => {
      const searchText = e.target.value.trim();
      const resultsDiv = document.getElementById('searchResults');
      resultsDiv.innerHTML = '';
      if (searchText.length < 2) return; // minimum 2 characters

      const q = query(collection(db, 'users'), where('name', '>=', searchText), where('name', '<=', searchText + '\uf8ff'));
      const querySnapshot = await getDocs(q);

      if (!currentUser) {
        resultsDiv.innerHTML = 'Please login to send friend requests.';
        return;
      }

      // Get current user's friend list and requests to avoid duplicates
      const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const currentUserData = currentUserSnap.data() || {};
      const friends = currentUserData.friends || [];
      const sentRequests = []; // optional: you can maintain a sentRequests list if needed
      const incomingRequests = currentUserData.friendRequests || [];

      for (const docSnap of querySnapshot.docs) {
        const user = docSnap.data();
        if (user.uid === currentUser.uid) continue; // skip yourself

        const alreadyFriend = friends.includes(user.uid);
        const requestSent = incomingRequests.includes(user.uid); // If they already requested you (for simplicity)
        // You can add logic for sentRequests if you track it separately

        const div = document.createElement('div');
        div.className = 'friendName';
        div.innerHTML = `
          <img src="${escapeHtml(user.photo||'')}" alt="photo" />
          <span>${escapeHtml(user.name||user.email||'User')}</span>
          <button ${alreadyFriend || requestSent ? 'disabled' : ''} class="sendRequestBtn">${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Send Friend Request'}</button>
        `;

        if (!alreadyFriend && !requestSent) {
          div.querySelector('.sendRequestBtn').addEventListener('click', () => sendFriendRequest(user.uid));
        }

        resultsDiv.appendChild(div);
      }

      if (resultsDiv.innerHTML === '') {
        resultsDiv.innerHTML = 'No users found';
      }
    });
