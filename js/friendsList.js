import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";
import { loadMessagesWithFriend } from "./chat.js";

const friendsListDiv = document.getElementById('friendsList');
const chatFriendNameSpan = document.getElementById('chatFriendName');

export async function loadFriendsList() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    friendsListDiv.innerHTML = 'No friends yet';
    return;
  }

  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) {
    friendsListDiv.innerHTML = 'No friends yet';
    return;
  }
  const data = userSnap.data();
  const friends = data.friends || [];

  if (friends.length === 0) {
    friendsListDiv.innerHTML = 'No friends yet';
    return;
  }

  friendsListDiv.innerHTML = '';
  for (const uid of friends) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();

    const div = document.createElement('div');
    div.className = 'friendName';
    div.style.cursor = 'pointer';
    div.title = 'Click to chat';
    div.innerHTML = `
      <img src="${escapeHtml(userData.photo || '')}" alt="photo" />
      <span>${escapeHtml(userData.name || userData.email || 'User')}</span>
    `;
    div.addEventListener('click', () => {
      chatFriendNameSpan.textContent = userData.name || userData.email || 'User';
      loadMessagesWithFriend(uid);
      document.getElementById('chatSection').style.display = 'block';
    });
    friendsListDiv.appendChild(div);
  }
}
