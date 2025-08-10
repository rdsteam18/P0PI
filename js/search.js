
import { currentUser, db } from './auth.js';
import { collection, query, where, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { sendFriendRequest } from './friendRequests.js';
import { escapeHtml } from './utils.js';

const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('searchResults');

searchInput.addEventListener('input', async (e) => {
  const searchTextRaw = e.target.value.trim();
  const searchText = searchTextRaw.toLowerCase();
  resultsDiv.innerHTML = '';

  if (searchText.length < 2) return;

  if (!currentUser) {
    resultsDiv.innerHTML = 'Please login to send friend requests.';
    return;
  }

  // Use 'nameLower' field for case-insensitive search
  const q = query(
    collection(db, 'users'),
    where('nameLower', '>=', searchText),
    where('nameLower', '<=', searchText + '\uf8ff')
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    resultsDiv.innerHTML = 'No users found';
    return;
  }

  const currentUserSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const currentUserData = currentUserSnap.data() || {};
  const friends = currentUserData.friends || [];
  const incomingRequests = currentUserData.friendRequests || [];
  const blockedUsers = currentUserData.blockedUsers || [];

  for (const docSnap of querySnapshot.docs) {
    const user = docSnap.data();
    if (user.uid === currentUser.uid) continue; // skip yourself
    if (blockedUsers.includes(user.uid)) continue; // skip blocked users

    const alreadyFriend = friends.includes(user.uid);
    const requestSent = incomingRequests.includes(user.uid);

    const div = document.createElement('div');
    div.className = 'friendName';
    div.innerHTML = `
      <img src="${escapeHtml(user.photo || '')}" alt="photo" />
      <span>${escapeHtml(user.name || user.email || 'User')}</span>
      <button ${alreadyFriend || requestSent ? 'disabled' : ''} class="sendRequestBtn">
        ${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Send Friend Request'}
      </button>
    `;

    if (!alreadyFriend && !requestSent) {
      div.querySelector('.sendRequestBtn').addEventListener('click', () => sendFriendRequest(user.uid));
    }

    resultsDiv.appendChild(div);
  }
});
