// search.js
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { sendFriendRequest } from "./friendRequests.js";
import { escapeHtml } from "./utils.js";

const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('searchResults');

searchInput.addEventListener('input', async (e) => {
  const raw = e.target.value.trim();
  const searchText = raw.toLowerCase();
  resultsDiv.innerHTML = '';
  if (searchText.length < 2) return;

  const currentUser = getCurrentUser();
  if (!currentUser) { resultsDiv.innerHTML = 'Please login to search.'; return; }

  try {
    // query using nameLower
    const q = query(collection(db, 'users'), where('nameLower', '>=', searchText), where('nameLower', '<=', searchText + '\uf8ff'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) { resultsDiv.innerHTML = 'No users found'; return; }

    // load my data for friends/requests
    const meSnap = await getDoc(doc(db, 'users', currentUser.uid));
    const me = meSnap.data() || {};
    const friends = me.friends || [];
    const incoming = me.friendRequests || [];
    const blocked = me.blockedUsers || [];

    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      if (user.uid === currentUser.uid) return;
      if (blocked.includes(user.uid)) return;

      const alreadyFriend = friends.includes(user.uid);
      const requestSent = incoming.includes(user.uid);

      const div = document.createElement('div');
      div.className = 'friendName';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${escapeHtml(user.photo||'')}" alt="photo" />
          <span>${escapeHtml(user.name||user.email||'User')}</span>
        </div>
        <div>
          <button ${alreadyFriend || requestSent ? 'disabled' : ''} class="sendRequestBtn">
            ${alreadyFriend ? 'Friends' : requestSent ? 'Requested' : 'Send Friend Request'}
          </button>
        </div>
      `;
      if (!alreadyFriend && !requestSent) {
        div.querySelector('.sendRequestBtn').addEventListener('click', () => sendFriendRequest(user.uid));
      }
      resultsDiv.appendChild(div);
    });
  } catch (err) {
    console.error('Search error', err);
    resultsDiv.innerHTML = 'Search failed';
  }
});
